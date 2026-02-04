import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get("limit")) || 20;

        const announcements = await prisma.announcement.findMany({
            where: { isActive: true },
            include: {
                author: {
                    select: {
                        name: true,
                        nickName: true,
                    },
                },
                _count: {
                    select: { comments: true },
                },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        return NextResponse.json({ announcements });
    } catch (error) {
        console.error("Get announcements error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only Admin/HR/Manager can post? Or everyone?
        // Let's allow everyone for "Team Chat" feel, or restrict "Announcements" to admin.
        // Requirement says "Team Chat / Announcements".
        // Let's simple check: everyone can post?
        // For now, allow everyone.

        const { title, content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        const announcement = await prisma.announcement.create({
            data: {
                title: title || "ข้อความ",
                content,
                authorId: session.user.id,
            },
            include: {
                author: {
                    select: { name: true, nickName: true }
                }
            }
        });

        return NextResponse.json({ announcement }, { status: 201 });
    } catch (error) {
        console.error("Create announcement error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
