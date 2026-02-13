import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse, errorResponse } from "@/lib/api-utils";
import {
    startOfDayBangkok,
    getBangkokNow,
    getBangkokHour,
    calculateWorkHours,
    subDays
} from "@/lib/date-utils";
import { isWithinGeofence } from "@/lib/geo";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return ApiErrors.unauthorized();
        }

        const body = await request.json();
        const { latitude, longitude, deviceId, method } = body;

        if (!latitude || !longitude) {
            return ApiErrors.validation("กรุณาเปิด GPS เพื่อยืนยันตำแหน่ง");
        }

        // Get user with station info
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { station: true },
        });

        if (!user || !user.station) {
            return ApiErrors.validation("คุณไม่ได้ถูกกำหนดให้อยู่สถานีใด");
        }

        // Validate GPS location
        const isWithinRadius = isWithinGeofence(
            { latitude, longitude },
            {
                latitude: Number(user.station.latitude),
                longitude: Number(user.station.longitude)
            },
            user.station.radius
        );

        if (!isWithinRadius) {
            return errorResponse(
                "คุณไม่ได้อยู่ในพื้นที่ของสถานี กรุณาเข้าไปในพื้นที่ก่อนเช็คเอาต์",
                400,
                "INVALID_LOCATION"
            );
        }

        const localNow = getBangkokNow();
        const fullUtcNow = new Date(); // True UTC
        const today = startOfDayBangkok(); // No arg = uses new Date() internally, avoids double +7h offset

        // CRITICAL FIX: Find ANY active attendance (not checked out) regardless of date
        // This ensures check-out works even if the date boundary was crossed weirdly
        // or if it's a night shift from yesterday.
        let attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                checkOutTime: null,
            },
            orderBy: { checkInTime: "desc" },
        });

        let attendanceDate = attendance ? attendance.date : today;

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

        // Handle legacy time format check (transition period)
        // If checkInTime is seemingly in the future relative to UTC (e.g., stored as BKK time),
        // we use localNow (BKK time) for calculation to match the legacy format.
        // Otherwise, we use true UTC.
        let calculationEndTime = fullUtcNow;
        if (attendance.checkInTime > fullUtcNow) {
            calculationEndTime = localNow;
        }

        // Calculate work hours
        const { totalHours, overtimeHours } = calculateWorkHours(
            attendance.checkInTime,
            calculationEndTime,
            breakMinutes
        );

        // Update attendance record
        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime: fullUtcNow, // Always save true UTC from now on
                checkOutLat: latitude,
                checkOutLng: longitude,
                checkOutDeviceId: deviceId,
                checkOutMethod: method,
                actualHours: totalHours,
                overtimeHours: overtimeHours,
            },
        });

        return successResponse({
            checkOutTime: updatedAttendance.checkOutTime,
            totalHours,
            overtimeHours,
        });
    } catch (error) {
        console.error("Check-out error:", error);
        return ApiErrors.internal("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
}
