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
