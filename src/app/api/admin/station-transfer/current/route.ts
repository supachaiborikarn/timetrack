import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { startOfDayBangkok } from "@/lib/date-utils";

// GET: Get current station for all active front-yard employees
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return ApiErrors.unauthorized();

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(user.role)) {
            return ApiErrors.forbidden();
        }

        const today = startOfDayBangkok();

        // Get all active front-yard employees who checked in today
        const attendances = await prisma.attendance.findMany({
            where: {
                date: today,
                checkInTime: { not: null },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        nickName: true,
                        employeeId: true,
                        stationId: true,
                        station: { select: { id: true, name: true } },
                        department: { select: { name: true, isFrontYard: true } },
                    },
                },
                checkInStation: { select: { id: true, name: true } },
                transfers: {
                    orderBy: { transferTime: "desc" },
                    take: 1,
                    include: {
                        toStation: { select: { id: true, name: true } },
                    },
                },
            },
        });

        const employeeLocations = attendances.map((att) => {
            const lastTransfer = att.transfers[0];
            const currentStation = lastTransfer
                ? lastTransfer.toStation
                : att.checkInStation;

            const isAtHomeStation = currentStation?.id === att.user.stationId;

            return {
                userId: att.user.id,
                name: att.user.name,
                nickName: att.user.nickName,
                employeeId: att.user.employeeId,
                department: att.user.department?.name || "ไม่ระบุ",
                isFrontYard: att.user.department?.isFrontYard || false,
                homeStation: att.user.station,
                checkInStation: att.checkInStation,
                currentStation: currentStation,
                isAtHomeStation,
                hasTransferred: !!lastTransfer,
                checkedIn: !!att.checkInTime,
                checkedOut: !!att.checkOutTime,
                checkInTime: att.checkInTime?.toISOString(),
                checkOutTime: att.checkOutTime?.toISOString(),
                transferCount: att.transfers.length,
            };
        });

        // Group by station for the "live map" view
        const stations = await prisma.station.findMany({
            where: { isActive: true },
            select: { id: true, name: true, code: true },
        });

        const stationMap = stations.map((station) => ({
            ...station,
            employees: employeeLocations.filter(
                (e) => e.currentStation?.id === station.id && !e.checkedOut
            ),
        }));

        return successResponse({
            employees: employeeLocations,
            stationMap,
        });
    } catch (error) {
        console.error("Current station error:", error);
        return ApiErrors.internal();
    }
}
