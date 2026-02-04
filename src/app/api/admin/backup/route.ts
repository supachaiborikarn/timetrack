import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        // Check if admin
        const role = session?.user?.role;
        if (!role || !["ADMIN", "HR"].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch critical data
        const [users, shifts, leaveRequests, auditLogs] = await Promise.all([
            prisma.user.findMany({ select: { id: true, employeeId: true, name: true, role: true, departmentId: true } }),
            prisma.shift.findMany({ where: { startTime: { gte: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString() } } }), // Last 2 months
            prisma.leave.findMany({ where: { startDate: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } } }), // Last 6 months
            prisma.auditLog.findMany({ take: 1000, orderBy: { createdAt: 'desc' } })
        ]);

        const backupData = {
            timestamp: new Date().toISOString(),
            exportedBy: session.user.id,
            stats: {
                users: users.length,
                shifts: shifts.length,
                leaveRequests: leaveRequests.length,
                auditLogs: auditLogs.length
            },
            data: {
                users,
                shifts,
                leaveRequests,
                auditLogs
            }
        };

        // Log this export action
        if (session.user?.id) {
            await logActivity(session.user.id, "EXPORT", "Backup", "Full system backup manual export");
        }

        return new NextResponse(JSON.stringify(backupData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="timetrack-backup-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });

    } catch (error) {
        console.error("Backup error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
