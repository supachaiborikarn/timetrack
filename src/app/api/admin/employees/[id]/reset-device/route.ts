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

        // Reset the deviceId
        await prisma.user.update({
            where: { id },
            data: { deviceId: null },
        });

        return NextResponse.json({ success: true, message: "Device reset successfully" });
    } catch (error) {
        console.error("Error resetting device:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
