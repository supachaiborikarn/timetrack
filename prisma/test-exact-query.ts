// Test exact query logic matching production code
// Run with: npx ts-node prisma/test-exact-query.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BANGKOK_OFFSET = 7 * 60;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

// Exact copy of production functions
function getBangkokNow(): Date {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + BANGKOK_OFFSET * 60000);
}

function startOfDayBangkok(inputDate?: Date): Date {
    const now = new Date();
    const utcTimestamp = now.getTime();
    const bangkokTimestamp = utcTimestamp + BANGKOK_OFFSET_MS;
    const tempDate = new Date(bangkokTimestamp);
    const year = tempDate.getUTCFullYear();
    const month = tempDate.getUTCMonth();
    const day = tempDate.getUTCDate();
    const midnightBangkokInUTC = Date.UTC(year, month, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

async function test() {
    const now = getBangkokNow();
    const today = startOfDayBangkok(now);

    console.log('=== Function Output ===');
    console.log('Current UTC:', new Date().toISOString());
    console.log('getBangkokNow():', now.toISOString());
    console.log('startOfDayBangkok():', today.toISOString());
    console.log('Today timestamp:', today.getTime());

    // Find อ้อม's attendance
    const user = await prisma.user.findFirst({
        where: { nickName: { contains: 'อ้อม' } }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('\n=== User: ' + user.name + ' ===');

    // Check attendance records
    const allAttendance = await prisma.attendance.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 3
    });

    console.log('\nAll recent attendance:');
    for (const a of allAttendance) {
        console.log(`  date: ${a.date.toISOString()} (timestamp: ${a.date.getTime()})`);
        console.log(`  Match today? ${a.date.getTime() === today.getTime()}`);
    }

    // Try exact query
    console.log('\n=== Prisma Query Test ===');
    const attendance = await prisma.attendance.findFirst({
        where: {
            userId: user.id,
            date: today,
        },
    });

    if (attendance) {
        console.log('✅ FOUND attendance with findFirst({ date: today })');
        console.log('  checkIn:', attendance.checkInTime?.toISOString());
    } else {
        console.log('❌ NOT FOUND with findFirst({ date: today })');

        // Try with raw query
        console.log('\nTrying raw query...');
        const raw = await prisma.$queryRaw`
            SELECT id, date, "checkInTime" FROM "Attendance" 
            WHERE "userId" = ${user.id} 
            ORDER BY date DESC LIMIT 3
        `;
        console.log('Raw query result:', raw);
    }

    await prisma.$disconnect();
}

test().catch(console.error);
