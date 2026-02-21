import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Mark announcement as read by current user
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Upsert - create if not exists, do nothing if already read
        const read = await prisma.announcementRead.upsert({
            where: {
                announcementId_userId: {
                    announcementId: id,
                    userId: session.user.id,
                },
            },
            update: {}, // Already read, no update needed
            create: {
                announcementId: id,
                userId: session.user.id,
            },
        });

        return NextResponse.json({ success: true, read });
    } catch (error) {
        console.error("Error marking announcement as read:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
