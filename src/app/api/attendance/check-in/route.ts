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
import { getTimeTrackSettings } from "@/lib/server/system-settings";

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
            return ApiErrors.validation("คุณไม่ได้ถูกกำหนดให้อยู่ในระบบสถานี");
        }

        // CROSS-STATION CHECK-IN: Find closest station among ALL active stations
        const activeStations = await prisma.station.findMany({
            where: { isActive: true },
        });

        let closestStation = null;
        let minDistance = Infinity;

        for (const station of activeStations) {
            const distance = calculateDistance(
                { latitude, longitude },
                {
                    latitude: Number(station.latitude),
                    longitude: Number(station.longitude)
                }
            );

            if (distance <= station.radius && distance < minDistance) {
                minDistance = distance;
                closestStation = station;
            }
        }

        if (!closestStation) {
            // Check distance to OWN station to display helpful error message
            const ownDistance = calculateDistance(
                { latitude, longitude },
                {
                    latitude: Number(user.station.latitude),
                    longitude: Number(user.station.longitude)
                }
            );

            // Log the failure
            await prisma.auditLog.create({
                data: {
                    action: "CHECK_IN_FAILED",
                    entity: "Attendance",
                    userId: session.user.id,
                    details: `Location invalid for any station. Nearest was own: ${Math.round(ownDistance)}m (Allowed: ${user.station.radius}m). Lat/Lng: ${latitude},${longitude}`,
                }
            });

            return NextResponse.json({
                error: `คุณอยู่นอกพื้นที่ของทุกสาขา (ปั๊มต้นสังกัดห่าง ${Math.round(ownDistance)} เมตร)`,
                errorCode: "INVALID_LOCATION",
                distance: ownDistance,
                allowedRadius: user.station.radius
            }, { status: 400 });
        }

        // Always validate QR code with the station they are ACTUALLY checking in at
        if (!qrCode || qrCode !== closestStation.qrCode) {
            return ApiErrors.validation(`กรุณาสแกน QR Code ของสาขา ${closestStation.name} เพื่อเช็คอิน`);
        }

        // Check device fingerprint (strict mode enabled to prevent buddy punching)
        if (user.deviceId && user.deviceId !== deviceId) {
          return ApiErrors.validation("กรุณาใช้อุปกรณ์ที่ลงทะเบียนไว้เท่านั้น (ห้ามเช็คอินแทนกัน)");
        }

        const localNow = getBangkokNow();
        const runtimeSettings = await getTimeTrackSettings();
        const configuredAutoCheckOutHours = Math.max(runtimeSettings.autoCheckOutHours, 1);

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

            // For night shifts: threshold 26h, auto-close at 24h after check-in
            // For regular shifts: threshold 16h (12h shift + 4h buffer), auto-close at shift endTime
            const autoCloseThreshold = isNightShift
                ? Math.max(configuredAutoCheckOutHours, 24) + 2
                : configuredAutoCheckOutHours + 4;

            // Calculate auto-close time from actual shift endTime if available
            let autoCheckOutTime: Date;
            let autoCloseHours: number;

            if (activeShift?.shift) {
                const shift = activeShift.shift;
                if (isNightShift) {
                    // Night shift: cap at 24h after check-in
                    autoCloseHours = 24;
                    autoCheckOutTime = new Date(new Date(activeAttendance.checkInTime!).getTime() + 24 * 60 * 60 * 1000);
                } else {
                    // Regular shift: use actual shift end time on the same day as check-in
                    const checkInDate = new Date(activeAttendance.checkInTime!);
                    const [endHour, endMin] = shift.endTime.split(":").map(Number);
                    // Convert checkInDate to Bangkok date for constructing endTime
                    const bkkCheckInOffset = checkInDate.getTime() + 7 * 60 * 60 * 1000;
                    const bkkDate = new Date(bkkCheckInOffset);
                    const bkkYear = bkkDate.getUTCFullYear();
                    const bkkMonth = bkkDate.getUTCMonth();
                    const bkkDay = bkkDate.getUTCDate();
                    // Build shift end as Bangkok time then convert to UTC
                    const shiftEndBKK = new Date(Date.UTC(bkkYear, bkkMonth, bkkDay, endHour, endMin, 0) - 7 * 60 * 60 * 1000);
                    // If shift end is before check-in (shouldn't happen for non-night), add 1 day
                    autoCheckOutTime = shiftEndBKK > new Date(activeAttendance.checkInTime!)
                        ? shiftEndBKK
                        : new Date(shiftEndBKK.getTime() + 24 * 60 * 60 * 1000);
                    autoCloseHours = (autoCheckOutTime.getTime() - new Date(activeAttendance.checkInTime!).getTime()) / (1000 * 60 * 60);
                }
            } else {
                // No shift assignment found – use admin-configured fallback
                autoCloseHours = configuredAutoCheckOutHours;
                autoCheckOutTime = new Date(
                    new Date(activeAttendance.checkInTime!).getTime() + configuredAutoCheckOutHours * 60 * 60 * 1000,
                );
            }

            if (hoursSinceCheckIn >= autoCloseThreshold) {
                // Auto-close: set checkout to calculated shift end time
                await prisma.attendance.update({
                    where: { id: activeAttendance.id },
                    data: {
                        checkOutTime: autoCheckOutTime,
                        actualHours: Math.max(0, autoCloseHours),
                        note: `ระบบปิดเวลาออกอัตโนมัติ (ไม่ได้เช็คเอาต์เกิน ${autoCloseThreshold} ชม.) ${activeAttendance.note || ""}`.trim(),
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
            if (lateMinutes <= runtimeSettings.lateThresholdMinutes) {
                lateMinutes = 0;
            }
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
                checkInStationId: closestStation.id,
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
                checkInStationId: closestStation.id,
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
