import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDayBangkok } from "@/lib/date-utils";

const DAILY_NOTIFICATION_TYPES = ["ATTENDANCE_ALERT", "STAFF_SHORTAGE", "ANNOUNCEMENT"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStart = startOfDayBangkok();
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
        OR: [
          { type: { notIn: DAILY_NOTIFICATION_TYPES } },
          {
            type: { in: DAILY_NOTIFICATION_TYPES },
            createdAt: { gte: todayStart },
          },
        ],
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
