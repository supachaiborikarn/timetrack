import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse, errorResponse } from "@/lib/api-utils";
import {
    startOfDayBangkok,
    getBangkokNow,
    calculateWorkHours,
} from "@/lib/date-utils";
import { calculateDistance } from "@/lib/geo";
import { getTimeTrackSettings } from "@/lib/server/system-settings";
import { verifyAndSyncUserDevice } from "@/lib/server/device-lock";
import {
    isHousekeepingOvernightAttendance,
    resolveHousekeepingOvernightClose,
} from "@/lib/attendance-rules";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return ApiErrors.unauthorized();
        }

        const body = await request.json();
        const { latitude, longitude, deviceId, legacyDeviceId, method, qrCode } = body;

        if (!latitude || !longitude) {
            return ApiErrors.validation("กรุณาเปิด GPS เพื่อยืนยันตำแหน่ง");
        }

        // Get user with station info
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { station: true, department: true },
        });

        if (!user || !user.station) {
            return ApiErrors.validation("คุณไม่ได้ถูกกำหนดให้อยู่สถานีใด");
        }

        const deviceLock = await verifyAndSyncUserDevice(user, { deviceId, legacyDeviceId });
        if (!deviceLock.ok) {
            return errorResponse(deviceLock.error, 400, deviceLock.code);
        }

        // CROSS-STATION CHECK-OUT: Validate GPS location against ANY active station
        const activeStations = await prisma.station.findMany({
            where: { isActive: true },
        });

        let isValidLocation = false;
        let ownDistance = Infinity;
        let checkOutStation: typeof activeStations[0] | null = null;
        let minDistance = Infinity;

        for (const station of activeStations) {
            const distance = calculateDistance(
                { latitude, longitude },
                {
                    latitude: Number(station.latitude),
                    longitude: Number(station.longitude)
                }
            );

            // Keep track of distance to own station for better error message
            if (station.id === user.station.id) {
                ownDistance = distance;
            }

            if (distance <= station.radius) {
                isValidLocation = true;
                if (distance < minDistance) {
                    minDistance = distance;
                    checkOutStation = station;
                }
            }
        }

        if (!isValidLocation || !checkOutStation) {
            return errorResponse(
                `คุณไม่ได้อยู่ในพื้นที่ของสถานีใดเลย (ปั๊มต้นสังกัดห่าง ${ownDistance === Infinity ? 'N/A' : Math.round(ownDistance)} เมตร)`,
                400,
                "INVALID_LOCATION"
            );
        }

        // Validate QR code against the station they are checking out at
        if (method === "QR") {
            if (!qrCode || qrCode !== checkOutStation.qrCode) {
                return ApiErrors.validation(`กรุณาสแกน QR Code ของสาขา ${checkOutStation.name} เพื่อเช็คเอาต์`);
            }
        }

        const localNow = getBangkokNow();
        const fullUtcNow = new Date(); // True UTC
        const today = startOfDayBangkok(); // No arg = uses new Date() internally, avoids double +7h offset
        const runtimeSettings = await getTimeTrackSettings();
        const configuredAutoCheckOutHours = Math.max(runtimeSettings.autoCheckOutHours, 8);

        // CRITICAL FIX: Find ANY active attendance (not checked out) regardless of date
        // This ensures check-out works even if the date boundary was crossed weirdly
        // or if it's a night shift from yesterday.
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                checkOutTime: null,
            },
            orderBy: { checkInTime: "desc" },
        });

        const attendanceDate = attendance ? attendance.date : today;

        if (!attendance || !attendance.checkInTime) {
            return errorResponse(
                "คุณยังไม่ได้เช็คอินวันนี้",
                400,
                "NOT_CHECKED_IN"
            );
        }

        if (attendance.checkOutTime) {
            return errorResponse(
                "คุณได้เช็คเอาต์แล้ววันนี้",
                400,
                "ALREADY_CHECKED_OUT"
            );
        }

        // Get shift for break time calculation (use the correct date)
        const shiftAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId: session.user.id,
                date: attendanceDate,
            },
            include: { shift: true },
        });

        const breakMinutes = shiftAssignment?.shift.breakMinutes || 60;

        if (isHousekeepingOvernightAttendance({
            checkInTime: attendance.checkInTime,
            referenceTime: fullUtcNow,
            department: user.department,
            shift: shiftAssignment?.shift,
        })) {
            const fixed = resolveHousekeepingOvernightClose(
                attendance.checkInTime,
                fullUtcNow,
                shiftAssignment?.shift,
            );

            const updatedAttendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkOutTime: fixed.checkOutTime,
                    checkOutLat: latitude,
                    checkOutLng: longitude,
                    checkOutDeviceId: deviceLock.deviceId,
                    checkOutMethod: "AUTO_MAID_NO_NIGHT",
                    checkOutStationId: checkOutStation?.id || null,
                    actualHours: fixed.actualHours,
                    overtimeHours: fixed.overtimeHours,
                    note: `ระบบปิดรายการแม่บ้านข้ามคืน เพราะแผนกแม่บ้านไม่มีกะกลางคืน ${attendance.note || ""}`.trim(),
                },
            });

            return successResponse({
                checkOutTime: updatedAttendance.checkOutTime,
                totalHours: fixed.actualHours,
                overtimeHours: fixed.overtimeHours,
                corrected: true,
            });
        }

        // Handle legacy time format check (transition period)
        // If checkInTime is seemingly in the future relative to UTC (e.g., stored as BKK time),
        // we use localNow (BKK time) for calculation to match the legacy format.
        // Otherwise, we use true UTC.
        let calculationEndTime = fullUtcNow;
        if (attendance.checkInTime > fullUtcNow) {
            calculationEndTime = localNow;
        }

        // Calculate work hours
        // Calculate work hours
        // Safety check: If duration is absurdly long (> 24 hours), likely a forgotten checkout
        // Cap it at standard shift (12 hours) to prevent massive OT and errors
        const durationHours = (calculationEndTime.getTime() - attendance.checkInTime.getTime()) / (1000 * 60 * 60);
        let finalTotalHours = 0;
        let finalOvertimeHours = 0;
        let finalCheckOutTime = fullUtcNow; // Default to now

        if (durationHours > configuredAutoCheckOutHours * 2) {
            finalTotalHours = configuredAutoCheckOutHours;
            finalOvertimeHours = Math.max(0, configuredAutoCheckOutHours - 8);
            finalCheckOutTime = new Date(
                attendance.checkInTime.getTime() + configuredAutoCheckOutHours * 60 * 60 * 1000,
            );
        } else {
            const { totalHours, overtimeHours } = calculateWorkHours(
                attendance.checkInTime,
                calculationEndTime,
                breakMinutes
            );
            finalTotalHours = totalHours;
            finalOvertimeHours = overtimeHours;
        }

        // Update attendance record
        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime: finalCheckOutTime,
                checkOutLat: latitude,
                checkOutLng: longitude,
                checkOutDeviceId: deviceLock.deviceId,
                checkOutMethod: method,
                checkOutStationId: checkOutStation?.id || null,
                actualHours: finalTotalHours,
                overtimeHours: finalOvertimeHours,
            },
        });

        return successResponse({
            checkOutTime: updatedAttendance.checkOutTime,
            totalHours: finalTotalHours,
            overtimeHours: finalOvertimeHours,
        });
    } catch (error) {
        console.error("Check-out error:", error);
        return ApiErrors.internal("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
}
