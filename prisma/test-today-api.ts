// Test the exact same logic as /api/attendance/today
// Run with: npx ts-node prisma/test-today-api.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BANGKOK_OFFSET = 7 * 60;

function getBangkokNow(): Date {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + BANGKOK_OFFSET * 60000);
}

function startOfDayBangkok(date?: Date): Date {
    const bangkokNow = date || getBangkokNow();
    const year = bangkokNow.getFullYear();
    const month = bangkokNow.getMonth();
    const day = bangkokNow.getDate();
    const utcMidnight = Date.UTC(year, month, day, 0, 0, 0, 0) - (BANGKOK_OFFSET * 60 * 1000);
    return new Date(utcMidnight);
}

async function testForUser(userId: string, userName: string) {
    const now = getBangkokNow();
    const today = startOfDayBangkok(now);

    console.log(`\n=== Testing for ${userName} ===`);
    console.log(`Bangkok Now: ${now.toISOString()}`);
    console.log(`Today (Bangkok midnight): ${today.toISOString()}`);

    // Exact same query as API
    const attendance = await prisma.attendance.findFirst({
        where: {
            userId: userId,
            date: today,
        },
    });

    if (attendance) {
        console.log('✅ FOUND attendance:');
        console.log(`   checkInTime: ${attendance.checkInTime?.toISOString()}`);
        console.log(`   checkOutTime: ${attendance.checkOutTime?.toISOString()}`);
    } else {
        console.log('❌ NO attendance found for this date!');

        // Check what dates exist for this user
        const allRecords = await prisma.attendance.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' },
            take: 3
        });

        console.log('Recent records for this user:');
        for (const r of allRecords) {
            console.log(`   date: ${r.date.toISOString()}, checkIn: ${r.checkInTime?.toISOString()}`);
        }
    }
}

async function main() {
    // Find เผือก and อ้อม
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { nickName: { contains: 'เผือก' } },
                { nickName: { contains: 'อ้อม' } },
            ]
        }
    });

    for (const user of users) {
        await testForUser(user.id, `${user.name} (${user.nickName})`);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
