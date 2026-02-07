import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";

// PATCH: Update attendance check-in/check-out times
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return ApiErrors.unauthorized();
        }

        const body = await request.json();
        const { userId, date, checkInTime, checkOutTime, note } = body;

        if (!userId || !date) {
            return ApiErrors.validation("userId and date are required");
        }

        const dateObj = new Date(date);

        // Find existing attendance or create new one
        let attendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: dateObj,
                },
            },
            include: {
                user: {
                    select: { name: true, employeeId: true }
                }
            }
        });

        // Store old values for audit log
        const oldCheckInTime = attendance?.checkInTime?.toISOString() || null;
        const oldCheckOutTime = attendance?.checkOutTime?.toISOString() || null;

        // Prepare update data
        const updateData: Record<string, unknown> = {};

        if (checkInTime !== undefined) {
            if (checkInTime === null || checkInTime === "") {
                updateData.checkInTime = null;
            } else {
                // Construct ISO string with +07:00 offset to ensure correct absolute time
                // Format: YYYY-MM-DDTHH:mm:00+07:00
                const dateTimeStr = `${date}T${checkInTime}:00+07:00`;
                updateData.checkInTime = new Date(dateTimeStr);
                updateData.checkInMethod = "ADMIN_EDIT";
            }
        }

        if (checkOutTime !== undefined) {
            if (checkOutTime === null || checkOutTime === "") {
                updateData.checkOutTime = null;
            } else {
                // Construct ISO string with +07:00 offset
                const dateTimeStr = `${date}T${checkOutTime}:00+07:00`;
                updateData.checkOutTime = new Date(dateTimeStr);
                updateData.checkOutMethod = "ADMIN_EDIT";
            }
        }

        if (note !== undefined) {
            updateData.note = note;
        }

        // Calculate actual hours if both times are set
        if (updateData.checkInTime && updateData.checkOutTime) {
            const inTime = updateData.checkInTime as Date;
            const outTime = updateData.checkOutTime as Date;
            const diffMs = outTime.getTime() - inTime.getTime();
            const actualHours = diffMs / (1000 * 60 * 60);
            updateData.actualHours = Math.max(0, actualHours);
        } else if (attendance) {
            // Recalculate with existing values if only one time changed
            const inTime = (updateData.checkInTime as Date | undefined) || attendance.checkInTime;
            const outTime = (updateData.checkOutTime as Date | undefined) || attendance.checkOutTime;
            if (inTime && outTime) {
                const diffMs = outTime.getTime() - inTime.getTime();
                const actualHours = diffMs / (1000 * 60 * 60);
                updateData.actualHours = Math.max(0, actualHours);
            }
        }

        const isCreating = !attendance;

        if (attendance) {
            // Update existing attendance
            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: updateData,
                include: {
                    user: {
                        select: { name: true, employeeId: true }
                    }
                }
            });
        } else {
            // Create new attendance record
            attendance = await prisma.attendance.create({
                data: {
                    userId,
                    date: dateObj,
                    ...(updateData as object),
                },
                include: {
                    user: {
                        select: { name: true, employeeId: true }
                    }
                }
            });
        }

        // Create Audit Log
        const changes: string[] = [];
        if (checkInTime !== undefined) {
            const newCheckIn = attendance.checkInTime?.toISOString() || null;
            changes.push(`เวลาเข้า: ${oldCheckInTime || "-"} → ${newCheckIn || "-"}`);
        }
        if (checkOutTime !== undefined) {
            const newCheckOut = attendance.checkOutTime?.toISOString() || null;
            changes.push(`เวลาออก: ${oldCheckOutTime || "-"} → ${newCheckOut || "-"}`);
        }

        await prisma.auditLog.create({
            data: {
                action: isCreating ? "CREATE" : "UPDATE",
                entity: "Attendance",
                entityId: attendance.id,
                details: JSON.stringify({
                    employeeId: attendance.user.employeeId,
                    employeeName: attendance.user.name,
                    date: date,
                    changes: changes,
                    oldCheckInTime,
                    oldCheckOutTime,
                    newCheckInTime: attendance.checkInTime?.toISOString() || null,
                    newCheckOutTime: attendance.checkOutTime?.toISOString() || null,
                }),
                userId: session.user.id,
            },
        });

        return successResponse({
            id: attendance.id,
            date: attendance.date.toISOString(),
            checkInTime: attendance.checkInTime?.toISOString() || null,
            checkOutTime: attendance.checkOutTime?.toISOString() || null,
            actualHours: attendance.actualHours ? Number(attendance.actualHours) : null,
        });
    } catch (error) {
        console.error("Error updating attendance time:", error);
        return ApiErrors.internal();
    }
}
