// Check latest attendance records
// Run with: npx ts-node prisma/check-attendance.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    // Get latest 10 attendance records
    const records = await prisma.attendance.findMany({
        orderBy: { checkInTime: 'desc' },
        take: 15,
        include: { user: { select: { name: true, employeeId: true } } }
    });

    console.log('Latest 15 attendance records:\n');
    records.forEach(r => {
        console.log(`${r.user.name} (${r.user.employeeId}):`);
        console.log(`  date      = ${r.date.toISOString()}`);
        console.log(`  checkIn   = ${r.checkInTime?.toISOString() || 'null'}`);
        console.log(`  checkOut  = ${r.checkOutTime?.toISOString() || 'null'}`);
        console.log('');
    });

    await prisma.$disconnect();
}
check();
