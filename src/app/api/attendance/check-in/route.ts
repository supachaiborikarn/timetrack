import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse, errorResponse } from "@/lib/api-utils";
import {
    startOfDayBangkok,
    getBangkokNow,
    getBangkokHour,
    calculateLateMinutes,
    calculateLatePenalty,
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
        const { latitude, longitude, deviceId, method, qrCode } = body;

        if (!latitude || !longitude) {
            return ApiErrors.validation("กรุณาเปิด GPS เพื่อยืนยันตำแหน่ง");
        }

        // Get user with station info
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { station: true },
        });

        if (!user) {
            return ApiErrors.notFound("User");
        }

        if (!user.station) {
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
                "คุณไม่ได้อยู่ในพื้นที่ของสถานี กรุณาเข้าไปในพื้นที่ก่อนเช็คอิน",
                400,
                "INVALID_LOCATION"
            );
        }

        // If QR method, validate QR code
        if (method === "QR") {
            if (!qrCode || qrCode !== user.station.qrCode) {
                return ApiErrors.validation("QR Code ไม่ถูกต้อง");
            }
        }

        // Check device fingerprint (optional strict mode)
        // if (user.deviceId && user.deviceId !== deviceId) {
        //   return NextResponse.json(
        //     { error: "กรุณาใช้อุปกรณ์ที่ลงทะเบียนไว้" },
        //     { status: 400 }
        //   );
        // }

        const localNow = getBangkokNow();

        // Use true UTC for database storage to prevent double-shifting on display
        const utcNow = new Date();
        const today = startOfDayBangkok(); // No arg = uses new Date() internally, avoids double +7h offset

        // CRITICAL FIX: Check for ANY active attendance (not checked out) regardless of date
        // This prevents creating duplicate records if a user scans late (near midnight/next day boundary)
        // or forgets to check out from yesterday.
        const activeAttendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                checkOutTime: null,
            },
            orderBy: { checkInTime: "desc" },
        });

        if (activeAttendance) {
            // Optional: If the active attendance is very old (e.g. > 24 hours), maybe we should auto-close it?
            // For now, simpler is safer: Block new check-in and tell user to check out.
            return errorResponse(
                "คุณยังมีรายการเช็คอินค้างอยู่ กรุณาเช็คเอาต์รายการเดิมก่อน",
                400,
                "ALREADY_CHECKED_IN"
            );
        }

        // Night shift guard: prevent new check-in if there's an open night shift from yesterday
        if (getBangkokHour() < 10) {
            const yesterday = startOfDayBangkok(subDays(new Date(), 1));
            const yesterdayShiftAssignment = await prisma.shiftAssignment.findFirst({
                where: {
                    userId: session.user.id,
                    date: yesterday,
                },
                include: { shift: true },
            });

            if (yesterdayShiftAssignment?.shift.isNightShift) {
                const yesterdayAttendance = await prisma.attendance.findFirst({
                    where: {
                        userId: session.user.id,
                        date: yesterday,
                    },
                });

                if (yesterdayAttendance?.checkInTime && !yesterdayAttendance?.checkOutTime) {
                    return errorResponse(
                        "คุณยังไม่ได้เช็คเอาต์จากกะกลางคืนเมื่อวาน กรุณาเช็คเอาต์ก่อน",
                        400,
                        "NIGHT_SHIFT_NOT_CHECKED_OUT"
                    );
                }
            }
        }

        // Get today's shift to calculate late minutes
        const shiftAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
            include: { shift: true },
        });

        let lateMinutes = 0;
        let latePenaltyAmount = 0;

        if (shiftAssignment) {
            // Use local time for shift comparison
            lateMinutes = calculateLateMinutes(localNow, shiftAssignment.shift.startTime);
            latePenaltyAmount = calculateLatePenalty(lateMinutes);
        }

        // Create or update attendance record
        const attendance = await prisma.attendance.upsert({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: today,
                },
            },
            create: {
                userId: session.user.id,
                date: today,
                checkInTime: utcNow, // Save UTC
                checkInLat: latitude,
                checkInLng: longitude,
                checkInDeviceId: deviceId,
                checkInMethod: method,
                lateMinutes,
                latePenaltyAmount,
                status: "PENDING",
            },
            update: {
                checkInTime: utcNow, // Save UTC
                checkInLat: latitude,
                checkInLng: longitude,
                checkInDeviceId: deviceId,
                checkInMethod: method,
                lateMinutes,
                latePenaltyAmount,
            },
        });

        // Register device if first time
        if (!user.deviceId) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { deviceId },
            });
        }

        return successResponse({
            checkInTime: attendance.checkInTime,
            lateMinutes,
            latePenaltyAmount,
        });
    } catch (error) {
        console.error("Check-in error:", error);
        return ApiErrors.internal("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
}
