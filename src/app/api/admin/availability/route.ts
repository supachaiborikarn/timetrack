import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Get availability overview for all employees (admin view)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admin/hr/manager can access
        if (!["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
        const stationId = searchParams.get("stationId");

        // Get start and end of month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Get manager's station for filtering (if manager role)
        let stationFilter: { stationId?: string } = {};
        if (session.user.role === "MANAGER") {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { stationId: true },
            });
            if (user?.stationId) {
                stationFilter = { stationId: user.stationId };
            }
        } else if (stationId) {
            stationFilter = { stationId };
        }

        // Get employees with their availability
        const employees = await prisma.user.findMany({
            where: {
                isActive: true,
                employeeStatus: "ACTIVE",
                role: "EMPLOYEE",
                ...stationFilter,
            },
            select: {
                id: true,
                name: true,
                employeeId: true,
                department: { select: { name: true } },
                station: { select: { name: true } },
            },
            orderBy: [{ station: { name: "asc" } }, { name: "asc" }],
        });

        // Get all availability for the month
        const availability = await prisma.employeeAvailability.findMany({
            where: {
                userId: { in: employees.map((e) => e.id) },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // Transform to employee-centric view
        const employeeAvailability = employees.map((emp) => {
            const empAvail = availability.filter((a) => a.userId === emp.id);
            const availMap: Record<string, string> = {};
            empAvail.forEach((a) => {
                const dateKey = a.date.toISOString().split("T")[0];
                availMap[dateKey] = a.status;
            });

            // Count statistics
            const available = empAvail.filter((a) => a.status === "AVAILABLE").length;
            const unavailable = empAvail.filter((a) => a.status === "UNAVAILABLE").length;
            const preferredOff = empAvail.filter((a) => a.status === "PREFERRED_OFF").length;

            return {
                ...emp,
                availability: availMap,
                stats: { available, unavailable, preferredOff },
            };
        });

        // Get stations for filter dropdown
        const stations = await prisma.station.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({
            month,
            year,
            employees: employeeAvailability,
            stations,
        });
    } catch (error) {
        console.error("Error fetching admin availability:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
