import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runDueAttendanceAlerts } from "@/lib/attendance-alerts";

export const dynamic = "force-dynamic";

function hasValidCronSecret(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function hasManualAccess(): Promise<boolean> {
    const session = await auth();
    return Boolean(session?.user?.id && ["ADMIN", "HR"].includes(session.user.role));
}

async function run() {
    try {
        const result = await runDueAttendanceAlerts();
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("Attendance alert cron failed:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    if (!hasValidCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return run();
}

export async function POST(request: NextRequest) {
    if (!hasValidCronSecret(request) && !(await hasManualAccess())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return run();
}
