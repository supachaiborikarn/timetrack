import { PrismaClient } from "@prisma/client";
import { differenceInMinutes } from "date-fns";

const prisma = new PrismaClient();
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const apply = process.argv.includes("--apply");

function bangkokDateKey(date: Date): string {
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().split("T")[0];
}

function bangkokHour(date: Date): number {
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).getUTCHours();
}

function formatBangkok(date: Date | null): string | null {
    if (!date) return null;
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().replace("T", " ").slice(0, 16);
}

function parseBangkokMidnight(dateKey: string): Date {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day) - BANGKOK_OFFSET_MS);
}

function shiftEndOnCheckInDate(checkInTime: Date, endTime = "17:00"): Date {
    const [hour, minute] = endTime.split(":").map(Number);
    const bangkokDate = new Date(checkInTime.getTime() + BANGKOK_OFFSET_MS);

    return new Date(
        Date.UTC(
            bangkokDate.getUTCFullYear(),
            bangkokDate.getUTCMonth(),
            bangkokDate.getUTCDate(),
            hour,
            minute,
        ) - BANGKOK_OFFSET_MS,
    );
}

function calculateWorkHours(checkIn: Date, checkOut: Date, breakMinutes = 60) {
    const totalMinutes = differenceInMinutes(checkOut, checkIn) - breakMinutes;
    const regularMinutes = 8 * 60;
    const totalHours = Math.max(0, totalMinutes / 60);
    const overtimeHours = Math.max(0, (totalMinutes - regularMinutes) / 60);

    return {
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
    };
}

function appendNote(note: string | null, added: string): string {
    return [added, note || ""].filter(Boolean).join(" ").trim();
}

async function main() {
    const rows = await prisma.attendance.findMany({
        where: {
            checkInTime: { not: null },
            checkOutTime: { not: null },
            user: {
                department: {
                    OR: [
                        { code: "MAID" },
                        { name: { contains: "แม่บ้าน" } },
                    ],
                },
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    nickName: true,
                    employeeId: true,
                },
            },
        },
        orderBy: { checkInTime: "asc" },
    });

    const suspects = rows.filter((row) => (
        row.checkInTime &&
        row.checkOutTime &&
        bangkokDateKey(row.checkOutTime) > bangkokDateKey(row.checkInTime) &&
        bangkokHour(row.checkOutTime) < 12
    ));

    console.log(`${apply ? "APPLY" : "DRY RUN"}: found ${suspects.length} maid overnight attendance rows`);

    for (const row of suspects) {
        if (!row.checkInTime || !row.checkOutTime) continue;

        const employeeName = row.user.nickName || row.user.name;
        const checkInHour = bangkokHour(row.checkInTime);
        const nextDay = parseBangkokMidnight(bangkokDateKey(row.checkOutTime));
        const shiftAssignment = await prisma.shiftAssignment.findFirst({
            where: { userId: row.userId, date: row.date },
            include: { shift: true },
        });

        console.log([
            employeeName,
            formatBangkok(row.date),
            `in=${formatBangkok(row.checkInTime)}`,
            `out=${formatBangkok(row.checkOutTime)}`,
            `hours=${row.actualHours?.toString() || "-"}`,
        ].join(" | "));

        if (checkInHour >= 15) {
            const nextAttendance = await prisma.attendance.findUnique({
                where: {
                    userId_date: {
                        userId: row.userId,
                        date: nextDay,
                    },
                },
            });

            if (nextAttendance?.checkInTime && nextAttendance.checkOutTime && bangkokHour(nextAttendance.checkInTime) >= 12) {
                const nextHours = calculateWorkHours(
                    row.checkOutTime,
                    nextAttendance.checkOutTime,
                    shiftAssignment?.shift.breakMinutes || 60,
                );

                console.log(`  move morning time to next day check-in: ${formatBangkok(row.checkOutTime)} -> ${formatBangkok(nextAttendance.checkOutTime)} (${nextHours.totalHours}h)`);

                if (apply) {
                    await prisma.attendance.update({
                        where: { id: nextAttendance.id },
                        data: {
                            checkInTime: row.checkOutTime,
                            actualHours: nextHours.totalHours,
                            overtimeHours: nextHours.overtimeHours,
                            note: appendNote(nextAttendance.note, "ระบบย้ายเวลาเช้าจากรายการแม่บ้านข้ามคืน"),
                        },
                    });
                }
            }

            console.log("  close original row as invalid late check-in: 0h");

            if (apply) {
                await prisma.attendance.update({
                    where: { id: row.id },
                    data: {
                        checkOutTime: row.checkInTime,
                        actualHours: 0,
                        overtimeHours: 0,
                        note: appendNote(row.note, "ระบบปิดรายการแม่บ้านข้ามคืนเป็น 0 ชม."),
                    },
                });
            }

            continue;
        }

        const sameDayShiftEnd = shiftEndOnCheckInDate(row.checkInTime, shiftAssignment?.shift.endTime || "17:00");
        const fixedHours = calculateWorkHours(
            row.checkInTime,
            sameDayShiftEnd,
            shiftAssignment?.shift.breakMinutes || 60,
        );

        console.log(`  close at same-day shift end: ${formatBangkok(sameDayShiftEnd)} (${fixedHours.totalHours}h)`);

        if (apply) {
            await prisma.attendance.update({
                where: { id: row.id },
                data: {
                    checkOutTime: sameDayShiftEnd,
                    actualHours: fixedHours.totalHours,
                    overtimeHours: fixedHours.overtimeHours,
                    note: appendNote(row.note, "ระบบแก้รายการแม่บ้านข้ามคืนให้จบตามเวลาเลิกกะ"),
                },
            });
        }
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
