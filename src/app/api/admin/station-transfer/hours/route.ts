import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { startOfDayBangkok } from "@/lib/date-utils";

interface StationHours {
    stationId: string;
    stationName: string;
    startTime: string;
    endTime: string | null;
    hours: number;
}

// GET: Calculate hours per station for an employee on a specific date
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return ApiErrors.unauthorized();

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(user.role)) {
            return ApiErrors.forbidden();
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const date = searchParams.get("date");

        if (!userId) {
            return ApiErrors.validation("กรุณาระบุ userId");
        }

        const queryDate = date ? new Date(date) : new Date();
        const startOfDay = startOfDayBangkok(queryDate);

        // Get attendance for the date
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: startOfDay,
            },
            include: {
                checkInStation: { select: { id: true, name: true } },
                checkOutStation: { select: { id: true, name: true } },
            },
        });

        if (!attendance || !attendance.checkInTime) {
            return successResponse({ stationHours: [], totalHours: 0 });
        }

        // Get all transfers for this attendance
        const transfers = await prisma.stationTransfer.findMany({
            where: {
                userId,
                attendanceId: attendance.id,
            },
            include: {
                fromStation: { select: { id: true, name: true } },
                toStation: { select: { id: true, name: true } },
            },
            orderBy: { transferTime: "asc" },
        });

        const stationHours: StationHours[] = [];
        const checkInTime = attendance.checkInTime;
        const checkOutTime = attendance.checkOutTime || new Date(); // use now if not checked out

        if (transfers.length === 0) {
            // No transfers — all hours at check-in station
            const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            stationHours.push({
                stationId: attendance.checkInStation?.id || "unknown",
                stationName: attendance.checkInStation?.name || "ไม่ระบุ",
                startTime: checkInTime.toISOString(),
                endTime: attendance.checkOutTime?.toISOString() || null,
                hours: Math.round(hours * 100) / 100,
            });
        } else {
            // First segment: check-in → first transfer
            const firstTransfer = transfers[0];
            const firstHours = (firstTransfer.transferTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            stationHours.push({
                stationId: firstTransfer.fromStation.id,
                stationName: firstTransfer.fromStation.name,
                startTime: checkInTime.toISOString(),
                endTime: firstTransfer.transferTime.toISOString(),
                hours: Math.round(firstHours * 100) / 100,
            });

            // Middle segments: transfer N → transfer N+1
            for (let i = 0; i < transfers.length - 1; i++) {
                const current = transfers[i];
                const next = transfers[i + 1];
                const segHours = (next.transferTime.getTime() - current.transferTime.getTime()) / (1000 * 60 * 60);
                stationHours.push({
                    stationId: current.toStation.id,
                    stationName: current.toStation.name,
                    startTime: current.transferTime.toISOString(),
                    endTime: next.transferTime.toISOString(),
                    hours: Math.round(segHours * 100) / 100,
                });
            }

            // Last segment: last transfer → check-out
            const lastTransfer = transfers[transfers.length - 1];
            const lastHours = (checkOutTime.getTime() - lastTransfer.transferTime.getTime()) / (1000 * 60 * 60);
            stationHours.push({
                stationId: lastTransfer.toStation.id,
                stationName: lastTransfer.toStation.name,
                startTime: lastTransfer.transferTime.toISOString(),
                endTime: attendance.checkOutTime?.toISOString() || null,
                hours: Math.round(lastHours * 100) / 100,
            });
        }

        const totalHours = stationHours.reduce((sum, s) => sum + s.hours, 0);

        return successResponse({
            stationHours,
            totalHours: Math.round(totalHours * 100) / 100,
            hasCheckedOut: !!attendance.checkOutTime,
        });
    } catch (error) {
        console.error("Station hours error:", error);
        return ApiErrors.internal();
    }
}
