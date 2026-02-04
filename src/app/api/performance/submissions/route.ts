import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        const { periodId, selfReview } = await request.json();

        if (!periodId || !selfReview) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Check period validity
        const period = await prisma.reviewPeriod.findUnique({ where: { id: periodId } });
        if (!period || !period.isActive) {
            return NextResponse.json({ error: "Invalid review period" }, { status: 400 });
        }

        // Upsert submission
        const submission = await prisma.reviewSubmission.upsert({
            where: {
                employeeId_periodId: {
                    employeeId: session.user.id,
                    periodId,
                },
            },
            update: {
                selfReview,
                status: "SUBMITTED",
                submittedAt: new Date(),
            },
            create: {
                employeeId: session.user.id,
                periodId,
                selfReview,
                status: "SUBMITTED",
                submittedAt: new Date(),
            },
        });

        return NextResponse.json({ submission });
    } catch (error) {
        console.error("Submit review error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
