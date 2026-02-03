import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    startOfDay,
    getBangkokNow,
    calculateLateMinutes,
    calculateLatePenalty
} from "@/lib/date-utils";
import { isWithinGeofence } from "@/lib/geo";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { latitude, longitude, deviceId, method, qrCode } = body;

        if (!latitude || !longitude) {
            return NextResponse.json(
                { error: "กรุณาเปิด GPS เพื่อยืนยันตำแหน่ง" },
                { status: 400 }
            );
        }

        // Get user with station info
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { station: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.station) {
            return NextResponse.json(
                { error: "คุณไม่ได้ถูกกำหนดให้อยู่สถานีใด" },
                { status: 400 }
            );
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
            return NextResponse.json(
                { error: "คุณไม่ได้อยู่ในพื้นที่ของสถานี กรุณาเข้าไปในพื้นที่ก่อนเช็คอิน" },
                { status: 400 }
            );
        }

        // If QR method, validate QR code
        if (method === "QR") {
            if (!qrCode || qrCode !== user.station.qrCode) {
                return NextResponse.json(
                    { error: "QR Code ไม่ถูกต้อง" },
                    { status: 400 }
                );
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
        const today = startOfDay(localNow);

        // Check if already checked in today
        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
        });

        if (existingAttendance?.checkInTime) {
            return NextResponse.json(
                { error: "คุณได้เช็คอินแล้ววันนี้" },
                { status: 400 }
            );
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

        return NextResponse.json({
            success: true,
            data: {
                checkInTime: attendance.checkInTime,
                lateMinutes,
                latePenaltyAmount,
            },
        });
    } catch (error) {
        console.error("Check-in error:", error);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 }
        );
    }
}
