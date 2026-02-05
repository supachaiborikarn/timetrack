import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBangkokNow, startOfDay } from "@/lib/date-utils";

// This endpoint can be called by:
// 1. Vercel Cron Jobs (recommended for production)
// 2. External cron service
// 3. Manual trigger by admin

export async function GET(request: NextRequest) {
    try {
        // Optional: Verify cron secret for security
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        // If CRON_SECRET is set, require it for cron calls
        // Skip check for local development
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            // Allow admin manual trigger via query param
            const { searchParams } = new URL(request.url);
            const manualTrigger = searchParams.get("manual");
            if (!manualTrigger) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

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

// Also support POST for flexibility
export async function POST(request: NextRequest) {
    return GET(request);
}
