const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = "cml6cv8uy000713l7zocqn0fn"; // User ID for Wan

    console.log("Investigating Schedule vs Attendance for User: Wan (ID: " + userId + ")");

    // Check Shift Assignments
    const startDate = new Date('2026-02-15T00:00:00Z');
    const endDate = new Date('2026-02-21T00:00:00Z');

    console.log(`\n--- Shift Assignments (Feb 15 - Feb 20) ---`);
    const shifts = await prisma.shiftAssignment.findMany({
        where: {
            userId: userId,
            date: {
                gte: startDate,
                lt: endDate
            }
        },
        include: {
            shift: true
        },
        orderBy: {
            date: 'asc'
        }
    });

    if (shifts.length === 0) {
        console.log("No shift assignments found.");
    } else {
        shifts.forEach(sa => {
            console.log(`  Work Date (DB): ${sa.date.toISOString()}`);
            console.log(`  Shift: ${sa.shift.name}`);
            console.log(`  Time: ${sa.shift.startTime} - ${sa.shift.endTime}`);
            console.log(`  Night Shift: ${sa.shift.isNightShift}`);
            console.log(`-----------------------------------------------`);
        });
    }

    // Check Attendance
    console.log(`\n--- Attendance Records (Feb 15 - Feb 20) ---`);
    const attendance = await prisma.attendance.findMany({
        where: {
            userId: userId,
            date: {
                gte: startDate,
                lt: endDate
            }
        },
        orderBy: {
            date: 'asc'
        }
    });

    if (attendance.length === 0) {
        console.log("No attendance records found.");
    } else {
        attendance.forEach(att => {
            console.log(`  Work Date (DB): ${att.date.toISOString()}`);
            console.log(`  Check-in (UTC): ${att.checkInTime ? att.checkInTime.toISOString() : 'MISSING'}`);
            // Check-in in BKK
            const bkkTime = att.checkInTime ? new Date(att.checkInTime.getTime() + 7 * 60 * 60 * 1000).toISOString().replace('Z', '') : 'MISSING';
            console.log(`  Check-in (BKK): ${bkkTime}`);
            console.log(`  Status: ${att.status}`);
            console.log(`-----------------------------------------------`);
        });
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
