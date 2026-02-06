// Final fix script to ensure ALL attendance records for today have correct date
// Run with: npx ts-node prisma/fix-all-today.ts

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

async function fixAll() {
    const correctToday = startOfDayBangkok();
    const todayEnd = new Date(correctToday.getTime() + 24 * 60 * 60 * 1000);

    console.log('Correct Today (Bangkok):', correctToday.toISOString());
    console.log('Today End:', todayEnd.toISOString());

    // Find all attendance where checkInTime is today but date is WRONG
    const wrongRecords = await prisma.attendance.findMany({
        where: {
            checkInTime: {
                gte: correctToday,
                lt: todayEnd
            },
            NOT: {
                date: correctToday
            }
        },
        include: { user: { select: { name: true, nickName: true } } }
    });

    console.log(`\nFound ${wrongRecords.length} records with wrong date:`);

    for (const r of wrongRecords) {
        console.log(`- ${r.user.name} (${r.user.nickName}): date=${r.date.toISOString()}`);

        // Check if there's already a record for this user with correct date
        const existing = await prisma.attendance.findFirst({
            where: {
                userId: r.userId,
                date: correctToday,
                id: { not: r.id }
            }
        });

        if (existing) {
            console.log(`  ⚠️ Already has correct record, deleting wrong one...`);
            await prisma.attendance.delete({ where: { id: r.id } });
        } else {
            console.log(`  ✅ Fixing date...`);
            await prisma.attendance.update({
                where: { id: r.id },
                data: { date: correctToday }
            });
        }
    }

    console.log('\nDone!');

    // Verify
    const finalCount = await prisma.attendance.count({
        where: { date: correctToday }
    });
    console.log(`Total attendance records for today: ${finalCount}`);

    await prisma.$disconnect();
}

fixAll().catch(console.error);
