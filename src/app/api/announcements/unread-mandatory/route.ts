import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { departmentId: true },
        });

        // Cutoff date: 2026-04-25 00:00:00 GMT+7 (which is 2026-04-24T17:00:00.000Z)
        const cutoffDate = new Date("2026-04-24T17:00:00.000Z");

        // Fetch announcements created after cutoff
        const recentAnnouncements = await prisma.announcement.findMany({
            where: {
                isActive: true,
                createdAt: {
                    gte: cutoffDate,
                },
            },
            include: {
                reads: {
                    where: { userId: session.user.id },
                    select: { id: true },
                    take: 1,
                },
                author: {
                    select: { name: true, nickName: true, photoUrl: true }
                }
            },
            orderBy: { createdAt: "asc" }, // Show oldest unread first
        });

        // Filter out read ones and by department
        const unreadMandatory = recentAnnouncements.filter((a) => {
            // If already read, skip
            if (a.reads.length > 0) return false;

            // Check department targeting
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
        });

        // We only return the first unread announcement to process one by one
        const nextAnnouncement = unreadMandatory.length > 0 ? unreadMandatory[0] : null;

        if (nextAnnouncement) {
            return NextResponse.json({
                announcement: {
                    ...nextAnnouncement,
                    reads: undefined,
                }
            });
        }

        return NextResponse.json({ announcement: null });
    } catch (error) {
        console.error("Get unread mandatory announcements error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
