import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { startNewRecruitmentCycle } from "@/lib/recruitment-cycles";
import { logActivity } from "@/lib/logger";
import type { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role as Role;
    if (!(await hasPermission(role, "job_opening.manage"))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { label?: unknown } | null;
    const label = typeof body?.label === "string" ? body.label.trim().slice(0, 80) : undefined;
    const state = await startNewRecruitmentCycle(label);

    await logActivity(
        session.user.id,
        "UPDATE",
        "SystemConfig",
        `เปิดรอบรับสมัครใหม่: ${state.current.label}`,
        state.current.id
    );

    return NextResponse.json({
        ok: true,
        current: state.current,
        cycles: state.cycles,
    });
}
