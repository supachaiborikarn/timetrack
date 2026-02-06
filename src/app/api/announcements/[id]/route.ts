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
                }
            }
        });

        if (!announcement) {
            return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });
        }

        return NextResponse.json({ announcement });
    } catch (error) {
        console.error("Error fetching announcement:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
