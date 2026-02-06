// Script to search for users by partial name and check attendance
// Run with: npx ts-node prisma/search-users.ts

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

async function search() {
    const correctToday = startOfDayBangkok();
    console.log('Correct Today:', correctToday.toISOString());

    // Search for users with nickName or name containing search terms
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'เผือก', mode: 'insensitive' } },
                { nickName: { contains: 'เผือก', mode: 'insensitive' } },
                { name: { contains: 'อ้อม', mode: 'insensitive' } },
                { nickName: { contains: 'อ้อม', mode: 'insensitive' } },
            ]
        },
        select: { id: true, name: true, nickName: true, employeeId: true }
    });

    console.log('\nFound', users.length, 'users');

    for (const user of users) {
        console.log(`\n${user.name} (${user.nickName || 'no nickname'}) - ${user.employeeId}`);

        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: user.id,
                date: correctToday
            }
        });

        if (attendance) {
            console.log(`  ✅ Has attendance for today: checkIn=${attendance.checkInTime?.toISOString()}`);
        } else {
            console.log(`  ❌ NO attendance for today!`);

            // Check if they have attendance with wrong date
            const allRecent = await prisma.attendance.findMany({
                where: { userId: user.id },
                orderBy: { checkInTime: 'desc' },
                take: 3
            });

            console.log('  Recent records:');
            for (const r of allRecent) {
                console.log(`    date=${r.date.toISOString()}, checkIn=${r.checkInTime?.toISOString()}`);
            }
        }
    }

    // List all users who checked in today (based on checkInTime, not date)
    console.log('\n\n=== All users who checked in TODAY by checkInTime ===');
    const todayStart = correctToday;
    const todayEnd = new Date(correctToday.getTime() + 24 * 60 * 60 * 1000);

    const checkedInToday = await prisma.attendance.findMany({
        where: {
            checkInTime: {
                gte: todayStart,
                lt: todayEnd
            }
        },
        include: { user: { select: { name: true, nickName: true, employeeId: true } } }
    });

    console.log(`Found ${checkedInToday.length} users who checked in today:`);
    for (const r of checkedInToday) {
        const dateMatch = r.date.getTime() === correctToday.getTime() ? '✅' : '❌ WRONG DATE';
        console.log(`${dateMatch} ${r.user.name} (${r.user.nickName || '-'}) date=${r.date.toISOString()}`);
    }

    await prisma.$disconnect();
}

search().catch(console.error);
