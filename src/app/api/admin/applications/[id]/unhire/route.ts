import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { removeEmployeeAccount } from "@/lib/employee-removal";
import { logActivity } from "@/lib/logger";
import type { Role } from "@prisma/client";

const PURGE_DAYS = 180;

/**
 * Undoes a hire — for the case where someone was taken on but never actually started.
 * The employee account is removed (or deactivated if it already has records) and the
 * application returns to REJECTED so it can then be deleted like any other.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        // Undoing a hire is the mirror of making one, so it takes the same permission.
        if (!(await hasPermission(role, "application.hire"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const application = await prisma.jobApplication.findUnique({
            where: { id },
            include: { hiredUser: { select: { id: true, employeeId: true, name: true } } },
        });
        if (!application) return NextResponse.json({ error: "ไม่พบใบสมัคร" }, { status: 404 });
        if (application.status !== "HIRED") {
            return NextResponse.json({ error: "ใบสมัครนี้ไม่ได้อยู่ในสถานะจ้างงาน" }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const reason = String(body.reason ?? "").trim().slice(0, 500);
        if (!reason) return NextResponse.json({ error: "กรุณาระบุเหตุผล เช่น ไม่มาทำงาน" }, { status: 400 });

        // The account may already be gone (or was never linked, for applications affected by the
        // earlier non-atomic hire), in which case there is simply nothing to remove.
        let accountDeleted = false;
        let keptBecause: string[] = [];
        if (application.hiredUser) {
            const result = await removeEmployeeAccount(application.hiredUser.id);
            accountDeleted = result.deleted;
            keptBecause = result.activity.map((a) => `${a.label} ${a.count} รายการ`);
        }

        await prisma.jobApplication.update({
            where: { id },
            data: {
                status: "REJECTED",
                rejectReason: reason,
                hiredUserId: null,
                hiredAt: null,
                reviewedById: session.user.id,
                reviewedAt: new Date(),
                purgeAfter: new Date(Date.now() + PURGE_DAYS * 24 * 60 * 60 * 1000),
            },
        });

        await logActivity(
            session.user.id,
            "UNHIRE",
            "JobApplication",
            `ยกเลิกการจ้าง ${application.refCode}${application.hiredUser ? ` (${application.hiredUser.employeeId})` : ""}: ${reason}`
                + (application.hiredUser ? ` — บัญชีพนักงาน${accountDeleted ? "ถูกลบ" : "ถูกปิดใช้งาน"}` : ""),
            id
        );

        return NextResponse.json({
            success: true,
            hadAccount: Boolean(application.hiredUser),
            accountDeleted,
            keptBecause,
        });
    } catch (error) {
        console.error("Error undoing hire:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
