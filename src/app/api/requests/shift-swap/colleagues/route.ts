import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get colleagues from same station for shift swap
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current user's station
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user?.stationId) {
            return NextResponse.json({ colleagues: [] });
        }

        // Get colleagues from same station
        const colleagues = await prisma.user.findMany({
            where: {
                stationId: user.stationId,
                isActive: true,
                role: "EMPLOYEE",
                id: { not: session.user.id },
            },
            include: {
                department: { select: { name: true } },
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({
            colleagues: colleagues.map((c) => ({
                id: c.id,
                name: c.name,
                employeeId: c.employeeId,
                department: c.department?.name || "-",
            })),
        });
    } catch (error) {
        console.error("Error fetching colleagues:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
