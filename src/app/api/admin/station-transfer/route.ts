import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse, errorResponse } from "@/lib/api-utils";
import { startOfDayBangkok, getBangkokNow } from "@/lib/date-utils";

// POST: Manager creates a station transfer for an employee
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return ApiErrors.unauthorized();

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || !["ADMIN", "HR", "MANAGER"].includes(user.role)) {
            return ApiErrors.forbidden();
        }

        const { userId, toStationId, reason } = await request.json();

        if (!userId || !toStationId) {
            return ApiErrors.validation("กรุณาระบุพนักงานและสาขาปลายทาง");
        }

        // Get target employee
        const employee = await prisma.user.findUnique({
            where: { id: userId },
            include: { station: true },
        });

        if (!employee) return ApiErrors.notFound("Employee");

        // Get today's active attendance
        const today = startOfDayBangkok();
        let attendance = await prisma.attendance.findFirst({
            where: { userId, date: today },
        });

        // Also check for any active (unchecked-out) attendance
        if (!attendance) {
            attendance = await prisma.attendance.findFirst({
                where: { userId, checkOutTime: null },
                orderBy: { checkInTime: "desc" },
            });
        }

        // Determine the "from" station: last transfer today, or checkInStation, or assigned station
        let fromStationId: string | null = null;

        if (attendance) {
            // Check if there's already a transfer today
            const lastTransfer = await prisma.stationTransfer.findFirst({
                where: {
                    userId,
                    attendanceId: attendance.id,
                },
                orderBy: { transferTime: "desc" },
            });

            fromStationId = lastTransfer?.toStationId || attendance.checkInStationId;
        }

        if (!fromStationId) {
            fromStationId = employee.stationId;
        }

        if (!fromStationId) {
            return errorResponse("ไม่สามารถระบุสาขาต้นทางได้", 400);
        }

        if (fromStationId === toStationId) {
            return errorResponse("สาขาต้นทางและปลายทางเป็นสาขาเดียวกัน", 400);
        }

        // Validate toStation exists
        const toStation = await prisma.station.findUnique({ where: { id: toStationId } });
        if (!toStation) return ApiErrors.notFound("Station");

        const now = getBangkokNow();

        const transfer = await prisma.stationTransfer.create({
            data: {
                userId,
                attendanceId: attendance?.id,
                fromStationId,
                toStationId,
                transferTime: new Date(), // UTC
                reason,
                method: "MANAGER",
                createdBy: session.user.id,
            },
            include: {
                fromStation: { select: { name: true } },
                toStation: { select: { name: true } },
                user: { select: { name: true, employeeId: true } },
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: "STATION_TRANSFER",
                entity: "StationTransfer",
                entityId: transfer.id,
                userId: session.user.id,
                details: `ย้าย ${transfer.user.name} จาก ${transfer.fromStation.name} → ${transfer.toStation.name}${reason ? ` (${reason})` : ""}`,
            },
        });

        return successResponse({
            transfer: {
                id: transfer.id,
                employee: transfer.user.name,
                from: transfer.fromStation.name,
                to: transfer.toStation.name,
                time: transfer.transferTime,
                reason: transfer.reason,
            },
        });
    } catch (error) {
        console.error("Station transfer error:", error);
        return ApiErrors.internal("เกิดข้อผิดพลาดในการย้ายสาขา");
    }
}

// GET: List station transfers
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return ApiErrors.unauthorized();

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(user.role)) {
            return ApiErrors.forbidden();
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get("date");

        // Default to today
        const queryDate = date ? new Date(date) : new Date();
        const startOfDay = startOfDayBangkok(queryDate);
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        const transfers = await prisma.stationTransfer.findMany({
            where: {
                transferTime: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
            include: {
                user: {
                    select: {
                        name: true,
                        employeeId: true,
                        nickName: true,
                        department: { select: { name: true } },
                        station: { select: { name: true } },
                    },
                },
                fromStation: { select: { id: true, name: true } },
                toStation: { select: { id: true, name: true } },
            },
            orderBy: { transferTime: "desc" },
        });

        return successResponse({ transfers });
    } catch (error) {
        console.error("Get transfers error:", error);
        return ApiErrors.internal();
    }
}
