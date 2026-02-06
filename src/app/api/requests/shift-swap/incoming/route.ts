import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: List incoming shift swap requests for current user
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requests = await prisma.shiftSwap.findMany({
            where: {
                targetId: session.user.id,
            },
            include: {
                requester: {
                    select: { name: true, nickName: true, employeeId: true }
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Error fetching incoming swaps:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
