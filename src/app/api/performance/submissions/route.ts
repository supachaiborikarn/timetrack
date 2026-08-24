import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewPeriodDayBounds } from "@/lib/customer-feedback/access";

class InactiveEmployeeError extends Error {}
class InvalidReviewPeriodError extends Error {}
class ReviewPeriodOutsideWindowError extends Error {}

async function isActiveEmployee(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true, employeeStatus: true },
    });
    return Boolean(user?.isActive && user.employeeStatus === "ACTIVE");
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!(await isActiveEmployee(session.user.id))) {
            return NextResponse.json({ error: "บัญชีพนักงานถูกปิดใช้งาน" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get("periodId");

        if (!periodId) {
            return NextResponse.json({ error: "Period ID required" }, { status: 400 });
        }

        // Get my submission
        const submission = await prisma.reviewSubmission.findUnique({
            where: {
                employeeId_periodId: {
                    employeeId: session.user.id,
                    periodId,
                },
            },
            include: {
                period: true,
            }
        });

        return NextResponse.json({ submission });
    } catch (error) {
        console.error("Get review submission error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json()) as { periodId?: unknown; selfReview?: unknown };
        const { periodId, selfReview } = body;

        if (typeof periodId !== "string" || !periodId.trim() || periodId.length > 100) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }
        if (typeof selfReview !== "string" || !selfReview.trim() || selfReview.trim().length > 10_000) {
            return NextResponse.json({ error: "แบบประเมินตนเองต้องยาว 1–10,000 ตัวอักษร" }, { status: 400 });
        }

        const now = new Date();
        const normalizedPeriodId = periodId.trim();
        const submission = await prisma.$transaction(async (tx) => {
            // ใช้ User -> ReviewPeriod เพื่อให้ปิดบัญชีหรือปิดรอบแทรกระหว่างตรวจและสร้างไม่ได้
            await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${session.user.id} FOR UPDATE`);
            const user = await tx.user.findUnique({
                where: { id: session.user.id },
                select: { isActive: true, employeeStatus: true },
            });
            if (!user?.isActive || user.employeeStatus !== "ACTIVE") throw new InactiveEmployeeError();

            await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ReviewPeriod" WHERE "id" = ${normalizedPeriodId} FOR UPDATE`);
            const period = await tx.reviewPeriod.findUnique({ where: { id: normalizedPeriodId } });
            if (!period || !period.isActive || period.closedAt) throw new InvalidReviewPeriodError();
            const periodStart = reviewPeriodDayBounds(period.startDate).dayStart;
            const periodEndExclusive = reviewPeriodDayBounds(period.endDate).nextDayStart;
            if (now < periodStart || now >= periodEndExclusive) throw new ReviewPeriodOutsideWindowError();

            // แบบประเมินตนเองส่งได้ครั้งเดียวให้ตรงกับหน้าจอและกันแก้ย้อนหลังผ่าน API
            return tx.reviewSubmission.create({
                data: {
                    employeeId: session.user.id,
                    periodId: normalizedPeriodId,
                    selfReview: selfReview.trim(),
                    status: "SUBMITTED",
                    submittedAt: now,
                },
            });
        });

        return NextResponse.json({ submission });
    } catch (error) {
        if (error instanceof InactiveEmployeeError) {
            return NextResponse.json({ error: "บัญชีพนักงานถูกปิดใช้งาน" }, { status: 403 });
        }
        if (error instanceof InvalidReviewPeriodError) {
            return NextResponse.json({ error: "Invalid review period" }, { status: 400 });
        }
        if (error instanceof ReviewPeriodOutsideWindowError) {
            return NextResponse.json({ error: "รอบประเมินยังไม่เปิดรับหรือหมดเวลาแล้ว" }, { status: 400 });
        }
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return NextResponse.json({ error: "ส่งแบบประเมินตนเองของรอบนี้แล้ว" }, { status: 409 });
        }
        console.error("Submit review error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
