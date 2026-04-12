import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse, errorResponse } from "@/lib/api-utils";
import { startOfDayBangkok } from "@/lib/date-utils";
import { calculateDistance } from "@/lib/geo";

// POST: Employee self-transfer by scanning QR at a different station
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return ApiErrors.unauthorized();

        const { latitude, longitude, qrCode } = await request.json();

        if (!latitude || !longitude) {
            return ApiErrors.validation("กรุณาเปิด GPS เพื่อยืนยันตำแหน่ง");
        }

        if (!qrCode) {
            return ApiErrors.validation("กรุณาสแกน QR Code ของสาขาที่ต้องการย้าย");
        }

        // Find station matching QR code
        const activeStations = await prisma.station.findMany({
            where: { isActive: true },
        });

        // Find closest station within radius
        let targetStation = null;
        let minDistance = Infinity;

        for (const station of activeStations) {
            const distance = calculateDistance(
                { latitude, longitude },
                {
                    latitude: Number(station.latitude),
                    longitude: Number(station.longitude),
                }
            );

            if (distance <= station.radius && distance < minDistance) {
                minDistance = distance;
                targetStation = station;
            }
        }

        if (!targetStation) {
            return errorResponse("คุณไม่ได้อยู่ในพื้นที่ของสาขาใดเลย", 400, "INVALID_LOCATION");
        }

        // Validate QR code matches the target station
        if (qrCode !== targetStation.qrCode) {
            return ApiErrors.validation(`QR Code ไม่ตรงกับสาขา ${targetStation.name}`);
        }

        // Get today's active attendance
        const today = startOfDayBangkok();
        let attendance = await prisma.attendance.findFirst({
            where: { userId: session.user.id, date: today },
        });

        if (!attendance) {
            attendance = await prisma.attendance.findFirst({
                where: { userId: session.user.id, checkOutTime: null },
                orderBy: { checkInTime: "desc" },
            });
        }

        if (!attendance || !attendance.checkInTime) {
            return errorResponse("คุณยังไม่ได้เช็คอินวันนี้ กรุณาเช็คอินก่อน", 400, "NOT_CHECKED_IN");
        }

        if (attendance.checkOutTime) {
            return errorResponse("คุณเช็คเอาท์แล้ววันนี้", 400, "ALREADY_CHECKED_OUT");
        }

        // Determine "from" station
        const lastTransfer = await prisma.stationTransfer.findFirst({
            where: {
                userId: session.user.id,
                attendanceId: attendance.id,
            },
            orderBy: { transferTime: "desc" },
        });

        const fromStationId = lastTransfer?.toStationId || attendance.checkInStationId;

        if (!fromStationId) {
            return errorResponse("ไม่สามารถระบุสาขาต้นทางได้", 400);
        }

        if (fromStationId === targetStation.id) {
            return errorResponse("คุณอยู่ที่สาขานี้อยู่แล้ว", 400, "SAME_STATION");
        }

        // Create transfer
        const transfer = await prisma.stationTransfer.create({
            data: {
                userId: session.user.id,
                attendanceId: attendance.id,
                fromStationId,
                toStationId: targetStation.id,
                transferTime: new Date(),
                reason: "ย้ายด้วยตัวเอง (สแกน QR)",
                method: "SELF_QR",
                createdBy: session.user.id,
            },
            include: {
                fromStation: { select: { name: true } },
                toStation: { select: { name: true } },
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: "SELF_STATION_TRANSFER",
                entity: "StationTransfer",
                entityId: transfer.id,
                userId: session.user.id,
                details: `ย้ายตัวเอง จาก ${transfer.fromStation.name} → ${transfer.toStation.name}`,
            },
        });

        return successResponse({
            from: transfer.fromStation.name,
            to: transfer.toStation.name,
            time: transfer.transferTime,
        });
    } catch (error) {
        console.error("Self station transfer error:", error);
        return ApiErrors.internal("เกิดข้อผิดพลาดในการย้ายสาขา");
    }
}
