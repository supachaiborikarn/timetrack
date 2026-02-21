import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Get list of users who read this announcement (admin/manager only)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check user role
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        if (!user || !["ADMIN", "HR", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        const reads = await prisma.announcementRead.findMany({
            where: { announcementId: id },
            select: {
                userId: true,
                readAt: true,
            },
            orderBy: { readAt: "asc" },
        });

        // Get user names
        const userIds = reads.map((r: { userId: string }) => r.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, nickName: true, departmentId: true },
        });

        const userMap = new Map(users.map((u) => [u.id, u]));

        const readDetails = reads.map((r: { userId: string; readAt: Date }) => ({
            userId: r.userId,
            readAt: r.readAt,
            name: userMap.get(r.userId)?.name || "Unknown",
            nickName: userMap.get(r.userId)?.nickName || null,
        }));

        return NextResponse.json({ reads: readDetails, totalReads: reads.length });
    } catch (error) {
        console.error("Error fetching announcement reads:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
