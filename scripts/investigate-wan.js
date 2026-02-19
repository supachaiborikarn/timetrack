const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = "cml6cv8uy000713l7zocqn0fn"; // User ID for Wan

    console.log("Investigating logs for User: Wan (ID: " + userId + ")");

    // Check Audit Logs
    console.log(`\nAudit Logs (Last 50):`);
    const logs = await prisma.auditLog.findMany({
        where: {
            userId: userId
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 50
    });

    if (logs.length === 0) {
        console.log("No audit logs found.");
    } else {
        logs.forEach(log => {
            console.log(`  [${log.createdAt.toISOString()}] Action: ${log.action}, Entity: ${log.entity}, Details: ${log.details || 'N/A'}`);
        });
    }

    // Check Attendance for wider range (Last 7 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`\nAttendance records (Last 7 days):`);
    const attendance = await prisma.attendance.findMany({
        where: {
            userId: userId,
            date: {
                gte: startDate
            }
        },
        orderBy: {
            date: 'desc' // Most recent first
        }
    });

    if (attendance.length === 0) {
        console.log("No attendance records found in the last 7 days.");
    } else {
        attendance.forEach(att => {
            console.log(`--------------------------------------------------`);
            console.log(`  Date (Work Date): ${att.date.toISOString().split('T')[0]}`);
            console.log(`  ID: ${att.id}`);
            console.log(`  Check-in: ${att.checkInTime ? att.checkInTime.toISOString() : 'MISSING'}`);
            console.log(`  Check-out: ${att.checkOutTime ? att.checkOutTime.toISOString() : 'MISSING'}`);
            console.log(`  Status: ${att.status}`);
            console.log(`  Created At: ${att.createdAt.toISOString()}`);
            console.log(`  Updated At: ${att.updatedAt.toISOString()}`);
        });
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
