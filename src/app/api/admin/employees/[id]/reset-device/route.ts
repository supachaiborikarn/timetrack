import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Check if employee exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const previousDeviceId = existing.deviceId;

        // Reset the deviceId
        await prisma.user.update({
            where: { id },
            data: { deviceId: null },
        });

        await prisma.auditLog.create({
            data: {
                action: "DEVICE_LOCK_RESET",
                entity: "DeviceLock",
                entityId: id,
                userId: session.user.id,
                ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
                userAgent: request.headers.get("user-agent"),
                details: JSON.stringify({
                    targetUserId: id,
                    targetEmployeeId: existing.employeeId,
                    targetName: existing.name,
                    targetNickName: existing.nickName,
                    previousDeviceId,
                }),
            },
        });

        return NextResponse.json({ success: true, message: "Device reset successfully" });
    } catch (error) {
        console.error("Error resetting device:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
