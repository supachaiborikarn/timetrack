import { NextRequest, NextResponse } from "next/server";
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
import { calculateDistance } from "@/lib/geo";

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
        const distance = calculateDistance(
            { latitude, longitude },
            {
                latitude: Number(user.station.latitude),
                longitude: Number(user.station.longitude)
            }
        );

        const isWithinRadius = distance <= user.station.radius;

        if (!isWithinRadius) {
            return NextResponse.json({
                error: `คุณอยู่นอกพื้นที่ (${Math.round(distance)} เมตร / ${user.station.radius} เมตร)`,
                errorCode: "INVALID_LOCATION",
                distance,
                allowedRadius: user.station.radius
            }, { status: 400 });
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

        // Check for ANY active attendance (not checked out) regardless of date
        const activeAttendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                checkOutTime: null,
            },
            orderBy: { checkInTime: "desc" },
        });

        if (activeAttendance) {
            const hoursSinceCheckIn = activeAttendance.checkInTime
                ? (Date.now() - new Date(activeAttendance.checkInTime).getTime()) / (1000 * 60 * 60)
                : 999;

            // Check if the active record's shift is a night shift (may work up to 24h)
            const activeShift = await prisma.shiftAssignment.findFirst({
                where: {
                    userId: session.user.id,
                    date: activeAttendance.date,
                },
                include: { shift: true },
            });
            const isNightShift = activeShift?.shift?.isNightShift ?? false;
            const autoCloseThreshold = isNightShift ? 26 : 14;
            const autoCloseHours = isNightShift ? 24 : 12;

            if (hoursSinceCheckIn >= autoCloseThreshold) {
                // Auto-close: set checkout to checkIn + max shift hours
                const autoCheckOut = new Date(new Date(activeAttendance.checkInTime!).getTime() + autoCloseHours * 60 * 60 * 1000);
                await prisma.attendance.update({
                    where: { id: activeAttendance.id },
                    data: {
                        checkOutTime: autoCheckOut,
                        actualHours: autoCloseHours,
                        note: `ระบบปิดอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน ${autoCloseThreshold} ชม.) ${activeAttendance.note || ""}`.trim(),
                    },
                });
            } else {
                return errorResponse(
                    "คุณยังมีรายการเช็คอินค้างอยู่ กรุณาเช็คเอาต์รายการเดิมก่อน",
                    400,
                    "ALREADY_CHECKED_IN"
                );
            }
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
