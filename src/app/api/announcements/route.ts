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
        const pinnedOnly = searchParams.get("pinned") === "true";

        // Get user's department
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { departmentId: true },
        });

        const announcements = await prisma.announcement.findMany({
            where: {
                isActive: true,
                ...(pinnedOnly ? { isPinned: true } : {}),
            },
            include: {
                author: {
                    select: {
                        name: true,
                        nickName: true,
                    },
                },
                _count: {
                    select: { comments: true, reads: true },
                },
                reads: {
                    where: { userId: session.user.id },
                    select: { id: true },
                    take: 1,
                },
            },
            orderBy: [
                { isPinned: "desc" },
                { createdAt: "desc" },
            ],
            take: limit,
        });

        // Filter by department targeting
        const filtered = announcements
            .filter((a) => {
                if (!a.targetDepartmentIds) return true; // null = all departments
                try {
                    const targetDepts: string[] = JSON.parse(a.targetDepartmentIds);
                    if (targetDepts.length === 0) return true; // empty = all
                    return currentUser?.departmentId
                        ? targetDepts.includes(currentUser.departmentId)
                        : true;
                } catch {
                    return true;
                }
            })
            .map((a) => ({
                ...a,
                isRead: a.reads.length > 0,
                reads: undefined, // Remove the raw reads data
                readCount: a._count.reads,
            }));

        return NextResponse.json({ announcements: filtered });
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

        const { title, content, isPinned, targetDepartmentIds } = await request.json();

        if (!content) {
            return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        // Only Admin/HR/Manager can pin or target departments
        let canPin = false;
        if (isPinned || (targetDepartmentIds && targetDepartmentIds.length > 0)) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { role: true },
            });
            canPin = ["ADMIN", "HR", "MANAGER"].includes(user?.role || "");
        }

        const announcement = await prisma.announcement.create({
            data: {
                title: title || "ข้อความ",
                content,
                authorId: session.user.id,
                isPinned: canPin ? (isPinned || false) : false,
                targetDepartmentIds:
                    canPin && targetDepartmentIds && targetDepartmentIds.length > 0
                        ? JSON.stringify(targetDepartmentIds)
                        : null,
            },
            include: {
                author: {
                    select: { name: true, nickName: true },
                },
            },
        });

        return NextResponse.json({ announcement }, { status: 201 });
    } catch (error) {
        console.error("Create announcement error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
