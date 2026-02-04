import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        // Check if admin
        const role = session?.user?.role;
        if (!role || !["ADMIN", "HR"].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get("limit")) || 50;
        const offset = Number(searchParams.get("offset")) || 0;
        const action = searchParams.get("action");
        const userId = searchParams.get("userId");

        const where: any = {};
        if (action) where.action = action;
        if (userId) where.userId = userId;

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: { name: true, nickName: true, employeeId: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        });

        const total = await prisma.auditLog.count({ where });

        return NextResponse.json({ logs, total });
    } catch (error) {
        console.error("Get audit logs error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
