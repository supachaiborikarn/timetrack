import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Add a comment to an announcement
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: "กรุณากรอกความคิดเห็น" }, { status: 400 });
        }

        // Check if announcement exists
        const announcement = await prisma.announcement.findUnique({
            where: { id: params.id }
        });

        if (!announcement) {
            return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });
        }

        const comment = await prisma.comment.create({
            data: {
                content: content.trim(),
                authorId: session.user.id,
                announcementId: params.id
            },
            include: {
                author: {
                    select: { name: true, nickName: true, image: true }
                }
            }
        });

        return NextResponse.json({ success: true, comment });
    } catch (error) {
        console.error("Error creating comment:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
