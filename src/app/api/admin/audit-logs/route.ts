import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        const role = session?.user?.role;
        if (!role || !["ADMIN"].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get("limit")) || 50;
        const page = Number(searchParams.get("page")) || 1;
        const offset = (page - 1) * limit;
        const action = searchParams.get("action");
        const entity = searchParams.get("entity");
        const userId = searchParams.get("userId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        if (action && action !== "all") where.action = action;
        if (entity && entity !== "all") where.entity = entity;
        if (userId && userId !== "all") where.userId = userId;
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(`${endDate}T23:59:59.999Z`),
            };
        }

        const [logs, total, actions, entities, users] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, nickName: true, employeeId: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            prisma.auditLog.count({ where }),
            prisma.auditLog.findMany({
                distinct: ["action"],
                select: { action: true },
            }),
            prisma.auditLog.findMany({
                distinct: ["entity"],
                select: { entity: true },
            }),
            prisma.user.findMany({
                where: { role: { in: ["ADMIN", "HR"] } },
                select: { id: true, name: true, employeeId: true },
            }),
        ]);

        return NextResponse.json({
            logs: logs.map((log) => ({
                ...log,
                details: log.details ? JSON.parse(log.details) : null,
                createdAt: log.createdAt.toISOString(),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            filters: {
                actions: actions.map((a) => a.action),
                entities: entities.map((e) => e.entity),
                users,
            },
        });
    } catch (error) {
        console.error("Get audit logs error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
