import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, parseReviewPeriodDate } from "@/lib/customer-feedback/access";
import { monthsBefore, RESPONSE_RETENTION_MONTHS } from "@/lib/customer-feedback/retention";
import { startOfDayBangkok } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") === "true";

        const where: Prisma.ReviewPeriodWhereInput = {};
        if (activeOnly) {
            where.isActive = true;
        }

        const periods = await prisma.reviewPeriod.findMany({
            where,
            orderBy: { startDate: "desc" },
        });

        return NextResponse.json({ periods });
    } catch (error) {
        console.error("Get review periods error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { title, startDate, endDate } = body;

        if (typeof title !== "string" || !title.trim() || !startDate || !endDate) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }
        if (title.trim().length > 120) return NextResponse.json({ error: "ชื่อรอบยาวเกิน 120 ตัวอักษร" }, { status: 400 });
        const parsedStart = parseReviewPeriodDate(startDate, "startDate");
        if (!parsedStart.ok) return NextResponse.json({ error: parsedStart.message }, { status: 400 });
        const parsedEnd = parseReviewPeriodDate(endDate, "endDate");
        if (!parsedEnd.ok) return NextResponse.json({ error: parsedEnd.message }, { status: 400 });
        if (parsedStart.value.dayStart.getTime() > parsedEnd.value.dayStart.getTime()) {
            return NextResponse.json({ error: "startDate ต้องไม่อยู่หลัง endDate" }, { status: 400 });
        }
        const oldestAvailableDay = startOfDayBangkok(monthsBefore(new Date(), RESPONSE_RETENTION_MONTHS));
        if (parsedStart.value.dayStart < oldestAvailableDay) {
            return NextResponse.json(
                { error: `สร้างรอบย้อนหลังได้ไม่เกิน ${RESPONSE_RETENTION_MONTHS} เดือน เพราะข้อมูลรายพนักงานก่อนหน้านั้นหมดอายุแล้ว` },
                { status: 400 }
            );
        }

        const period = await prisma.reviewPeriod.create({
            data: {
                title: title.trim(),
                startDate: parsedStart.value.dayStart,
                endDate: parsedEnd.value.dayStart,
                isActive: true,
            },
        });

        return NextResponse.json({ period }, { status: 201 });
    } catch (error) {
        console.error("Create review period error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
