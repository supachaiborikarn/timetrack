import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    startOfDay,
    getBangkokNow,
    calculateWorkHours
} from "@/lib/date-utils";
import { isWithinGeofence } from "@/lib/geo";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { latitude, longitude, deviceId, method } = body;

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

        if (!user || !user.station) {
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
                { error: "คุณไม่ได้อยู่ในพื้นที่ของสถานี กรุณาเข้าไปในพื้นที่ก่อนเช็คเอาต์" },
                { status: 400 }
            );
        }

        const now = getBangkokNow();
        const today = startOfDay(now);

        // Get today's attendance
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
        });

        if (!attendance || !attendance.checkInTime) {
            return NextResponse.json(
                { error: "คุณยังไม่ได้เช็คอินวันนี้" },
                { status: 400 }
            );
        }

        if (attendance.checkOutTime) {
            return NextResponse.json(
                { error: "คุณได้เช็คเอาต์แล้ววันนี้" },
                { status: 400 }
            );
        }

        // Get shift for break time calculation
        const shiftAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
            include: { shift: true },
        });

        const breakMinutes = shiftAssignment?.shift.breakMinutes || 60;

        // Calculate work hours
        const { totalHours, overtimeHours } = calculateWorkHours(
            attendance.checkInTime,
            now,
            breakMinutes
        );

        // Update attendance record
        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOutTime: now,
                checkOutLat: latitude,
                checkOutLng: longitude,
                checkOutDeviceId: deviceId,
                checkOutMethod: method,
                actualHours: totalHours,
                overtimeHours: overtimeHours,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                checkOutTime: updatedAttendance.checkOutTime,
                totalHours,
                overtimeHours,
            },
        });
    } catch (error) {
        console.error("Check-out error:", error);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 }
        );
    }
}
