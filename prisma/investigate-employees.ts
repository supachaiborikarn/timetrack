// Script to investigate specific employee attendance records
// Run with: npx ts-node prisma/investigate-employees.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bangkok timezone offset
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

async function investigate() {
    const bangkokNow = getBangkokNow();
    const correctToday = startOfDayBangkok(bangkokNow);

    console.log('Bangkok Now:', bangkokNow.toISOString());
    console.log('Correct Today (Bangkok midnight):', correctToday.toISOString());

    // Search for เผือก and อ้อม
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'เผือก' } },
                { name: { contains: 'อ้อม' } },
            ]
        },
        select: { id: true, name: true, employeeId: true }
    });

    console.log('\nFound', users.length, 'users matching search');

    for (const user of users) {
        console.log('\n========================================');
        console.log(`${user.name} (${user.employeeId})`);
        console.log('========================================');

        // Get all their recent attendance records
        const records = await prisma.attendance.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' },
            take: 5
        });

        console.log(`Found ${records.length} recent attendance records:`);

        for (const r of records) {
            const dateMatch = r.date.getTime() === correctToday.getTime() ? '✅ MATCHES TODAY' : '❌ WRONG DATE';
            console.log(`  date: ${r.date.toISOString()} ${dateMatch}`);
            console.log(`  checkIn: ${r.checkInTime?.toISOString() || 'null'}`);
            console.log(`  checkOut: ${r.checkOutTime?.toISOString() || 'null'}`);
            console.log('');
        }
    }

    // Also show what date values exist in the database for today
    console.log('\n========================================');
    console.log('ALL UNIQUE DATES in database for recent records:');
    console.log('========================================');

    const allRecords = await prisma.attendance.findMany({
        where: {
            date: {
                gte: new Date(correctToday.getTime() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
            }
        },
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'desc' }
    });

    for (const r of allRecords) {
        const matchToday = r.date.getTime() === correctToday.getTime() ? '(correct Bangkok today)' : '';
        console.log(`  ${r.date.toISOString()} ${matchToday}`);
    }

    await prisma.$disconnect();
}

investigate().catch(console.error);
