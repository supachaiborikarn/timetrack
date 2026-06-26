import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getBangkokNow, startOfDay } from "@/lib/date-utils";

// This endpoint can be called by:
// 1. GET from Vercel Cron Jobs / external cron with `Authorization: Bearer <CRON_SECRET>`
// 2. POST from a logged-in ADMIN/HR user for manual runs
//
// SECURITY: there is intentionally NO query-param bypass. A previous
// `?manual=1` shortcut allowed anyone to approve all attendance without auth.

const APPROVER_ROLES = ["ADMIN", "HR"];

function hasValidCronSecret(request: NextRequest): boolean {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function hasManualAccess(): Promise<boolean> {
    const session = await auth();

    return (
        !!session?.user?.id &&
        APPROVER_ROLES.includes(session.user.role)
    );
}

async function approvePendingAttendance() {
    try {
        const now = getBangkokNow();
        const today = startOfDay(now);

        // Auto-approve all PENDING attendance records from YESTERDAY or earlier
        // This ensures we don't auto-approve today's records that might still need review
        const result = await prisma.attendance.updateMany({
            where: {
                status: "PENDING",
                date: {
                    lt: today, // Only records before today
                },
            },
            data: {
                status: "APPROVED",
                approvedAt: now,
                note: "อนุมัติอัตโนมัติโดยระบบ",
            },
        });

        console.log(`[Auto-Approve] Approved ${result.count} attendance records at ${now.toISOString()}`);

        return NextResponse.json({
            success: true,
            message: `อนุมัติอัตโนมัติ ${result.count} รายการ`,
            approvedCount: result.count,
            timestamp: now.toISOString(),
        });

    } catch (error) {
        console.error("Auto-approve error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    if (!hasValidCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return approvePendingAttendance();
}

export async function POST(request: NextRequest) {
    if (!hasValidCronSecret(request) && !(await hasManualAccess())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return approvePendingAttendance();
}
