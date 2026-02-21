import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Get a single announcement with comments
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const announcement = await prisma.announcement.findUnique({
            where: { id },
            include: {
                author: {
                    select: { name: true, nickName: true }
                },
                comments: {
                    include: {
                        author: {
                            select: { name: true, nickName: true }
                        }
                    },
                    orderBy: { createdAt: "asc" }
                },
                _count: {
                    select: { reads: true }
                },
                reads: {
                    select: {
                        userId: true,
                        readAt: true,
                    },
                    orderBy: { readAt: "asc" }
                }
            }
        });

        if (!announcement) {
            return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });
        }

        // Fetch user details for the reads
        const userIds = announcement.reads.map((r: { userId: string }) => r.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, nickName: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));

        const enrichedAnnouncement = {
            ...announcement,
            reads: announcement.reads.map((r: { userId: string; readAt: Date }) => ({
                userId: r.userId,
                readAt: r.readAt,
                name: userMap.get(r.userId)?.name || "Unknown",
                nickName: userMap.get(r.userId)?.nickName || null,
            })),
            totalReads: announcement._count.reads,
        };

        return NextResponse.json({ announcement: enrichedAnnouncement });
    } catch (error) {
        console.error("Error fetching announcement:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}

// PUT: Update an announcement
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Check if announcement exists
        const existing = await prisma.announcement.findUnique({
            where: { id },
            select: { authorId: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });
        }

        // Check permission: author or admin/HR/manager
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        const isAuthor = existing.authorId === session.user.id;
        const isPrivileged = ["ADMIN", "HR", "MANAGER"].includes(user?.role || "");

        if (!isAuthor && !isPrivileged) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไข" }, { status: 403 });
        }

        const { title, content, isPinned, targetDepartmentIds } = await request.json();

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;

        // Only privileged users can change pin/department targeting
        if (isPrivileged) {
            if (isPinned !== undefined) updateData.isPinned = isPinned;
            if (targetDepartmentIds !== undefined) {
                updateData.targetDepartmentIds =
                    targetDepartmentIds && targetDepartmentIds.length > 0
                        ? JSON.stringify(targetDepartmentIds)
                        : null;
            }
        }

        const updated = await prisma.announcement.update({
            where: { id },
            data: updateData,
            include: {
                author: {
                    select: { name: true, nickName: true },
                },
            },
        });

        return NextResponse.json({ announcement: updated });
    } catch (error) {
        console.error("Error updating announcement:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}

// DELETE: Delete an announcement
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const existing = await prisma.announcement.findUnique({
            where: { id },
            select: { authorId: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        const isAuthor = existing.authorId === session.user.id;
        const isPrivileged = ["ADMIN", "HR", "MANAGER"].includes(user?.role || "");

        if (!isAuthor && !isPrivileged) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ลบ" }, { status: 403 });
        }

        await prisma.announcement.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting announcement:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
