import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { isHousekeepingDepartment } from "@/lib/attendance-rules";
import { InvalidAttendanceTimeError, recalculateAttendanceTimes } from "@/lib/attendance-edit";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseRequestedTime(value: unknown, date: string): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) throw new Error("INVALID_TIME");
    const parsed = new Date(`${date}T${value}:00+07:00`);
    if (Number.isNaN(parsed.getTime())) throw new Error("INVALID_TIME");
    return parsed;
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) return ApiErrors.unauthorized();

        const body = await request.json();
        const { userId, note } = body;
        const date = typeof body.date === "string" ? body.date.split("T")[0] : "";
        if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return ApiErrors.validation("userId and a valid date are required");
        }

        let requestedCheckIn: Date | null | undefined;
        let requestedCheckOut: Date | null | undefined;
        try {
            requestedCheckIn = parseRequestedTime(body.checkInTime, date);
            requestedCheckOut = parseRequestedTime(body.checkOutTime, date);
        } catch {
            return ApiErrors.validation("รูปแบบเวลาต้องเป็น HH:mm");
        }

        const dateObj = parseDateStringToBangkokMidnight(date);
        const dayEnd = new Date(dateObj.getTime() + DAY_MS - 1);
        const [targetUser, shiftAssignment, existingRecords] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, employeeId: true, department: { select: { code: true, name: true } } },
            }),
            prisma.shiftAssignment.findFirst({
                where: { userId, date: dateObj },
                include: { shift: true },
            }),
            prisma.attendance.findMany({
                where: { userId, date: { gte: dateObj, lte: dayEnd } },
                include: { user: { select: { name: true, employeeId: true } } },
                orderBy: [{ date: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
            }),
        ]);
        if (!targetUser) return ApiErrors.notFound("Employee not found");

        const attendance = existingRecords[0] || null;
        const oldCheckInTime = attendance?.checkInTime?.toISOString() || null;
        const oldCheckOutTime = attendance?.checkOutTime?.toISOString() || null;
        const invalidOvernightMessage = isHousekeepingDepartment(targetUser.department)
            ? "แม่บ้านไม่มีเวรกลางคืน กรุณาใส่เวลาเข้าออกในวันเดียวกัน"
            : "เวลาออกน้อยกว่าเวลาเข้าได้เฉพาะกะกลางคืน";

        let recalculated;
        try {
            recalculated = recalculateAttendanceTimes({
                date,
                existingCheckIn: attendance?.checkInTime || null,
                existingCheckOut: attendance?.checkOutTime || null,
                requestedCheckIn,
                requestedCheckOut,
                breakMinutes: shiftAssignment?.shift.breakMinutes ?? 60,
                shiftStart: shiftAssignment?.shift.startTime,
                canCrossMidnight: shiftAssignment?.shift.isNightShift === true,
            });
        } catch (error) {
            if (error instanceof InvalidAttendanceTimeError) return ApiErrors.validation(invalidOvernightMessage);
            throw error;
        }

        const saved = await prisma.$transaction(async (tx) => {
            const data = {
                date: dateObj,
                checkInTime: recalculated.checkInTime,
                checkOutTime: recalculated.checkOutTime,
                actualHours: recalculated.actualHours,
                overtimeHours: recalculated.overtimeHours,
                lateMinutes: recalculated.lateMinutes,
                latePenaltyAmount: recalculated.latePenaltyAmount,
                status: "APPROVED" as const,
                note: note === undefined ? attendance?.note : String(note || ""),
                ...(requestedCheckIn !== undefined && { checkInMethod: recalculated.checkInTime ? "ADMIN_EDIT" : null }),
                ...(requestedCheckOut !== undefined && { checkOutMethod: recalculated.checkOutTime ? "ADMIN_EDIT" : null }),
            };
            const updated = attendance
                ? await tx.attendance.update({ where: { id: attendance.id }, data })
                : await tx.attendance.create({ data: { userId, ...data } });
            await tx.auditLog.create({
                data: {
                    action: attendance ? "UPDATE" : "CREATE",
                    entity: "Attendance",
                    entityId: updated.id,
                    details: JSON.stringify({
                        employeeId: targetUser.employeeId,
                        employeeName: targetUser.name,
                        date,
                        oldCheckInTime,
                        oldCheckOutTime,
                        newCheckInTime: updated.checkInTime?.toISOString() || null,
                        newCheckOutTime: updated.checkOutTime?.toISOString() || null,
                        actualHours: updated.actualHours?.toString() || null,
                    }),
                    userId: session.user.id,
                },
            });
            return updated;
        });

        return successResponse({
            id: saved.id,
            date: saved.date.toISOString(),
            checkInTime: saved.checkInTime?.toISOString() || null,
            checkOutTime: saved.checkOutTime?.toISOString() || null,
            actualHours: saved.actualHours == null ? null : Number(saved.actualHours),
            overtimeHours: saved.overtimeHours == null ? null : Number(saved.overtimeHours),
            lateMinutes: saved.lateMinutes,
            latePenaltyAmount: Number(saved.latePenaltyAmount || 0),
        });
    } catch (error) {
        console.error("Error updating attendance time:", error);
        return ApiErrors.internal();
    }
}
