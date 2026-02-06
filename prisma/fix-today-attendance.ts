// Script to fix attendance records that were saved with incorrect date due to timezone bug
// Run with: npx ts-node prisma/fix-today-attendance.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bangkok timezone offset
const BANGKOK_OFFSET = 7 * 60; // +7 hours in minutes

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

    // Bangkok midnight in UTC
    const utcMidnight = Date.UTC(year, month, day, 0, 0, 0, 0) - (BANGKOK_OFFSET * 60 * 1000);
    return new Date(utcMidnight);
}

async function fixTodayAttendance() {
    const bangkokNow = getBangkokNow();
    const correctToday = startOfDayBangkok(bangkokNow);

    // Wrong date that might have been saved (yesterday due to UTC confusion)
    const wrongDate = new Date(correctToday);
    wrongDate.setDate(wrongDate.getDate() - 1);

    console.log('Bangkok Now:', bangkokNow.toISOString());
    console.log('Correct today (Bangkok midnight in UTC):', correctToday.toISOString());
    console.log('Wrong date to look for:', wrongDate.toISOString());

    // Find attendance records with wrong date but check-in time is today
    const wrongRecords = await prisma.attendance.findMany({
        where: {
            date: wrongDate,
            checkInTime: {
                gte: correctToday,  // Check-in time is actually today
            }
        },
        include: {
            user: {
                select: { name: true, employeeId: true }
            }
        }
    });

    console.log(`\nFound ${wrongRecords.length} records to fix:`);

    for (const record of wrongRecords) {
        console.log(`- ${record.user.name} (${record.user.employeeId}): Check-in at ${record.checkInTime?.toISOString()}`);
    }

    if (wrongRecords.length === 0) {
        console.log('\nNo records need fixing!');

        // Also check if there are any records for today already
        const todayRecords = await prisma.attendance.findMany({
            where: { date: correctToday },
            include: { user: { select: { name: true } } }
        });
        console.log(`\nRecords for today (${correctToday.toISOString()}): ${todayRecords.length}`);
        todayRecords.forEach(r => console.log(`- ${r.user.name}`));

        return;
    }

    // Fix the records
    console.log('\nFixing records...');

    for (const record of wrongRecords) {
        // Check if there's already a record for today
        const existingToday = await prisma.attendance.findFirst({
            where: {
                userId: record.userId,
                date: correctToday,
            }
        });

        if (existingToday) {
            console.log(`⚠️  ${record.user.name} already has attendance for today, skipping...`);
            continue;
        }

        // Update the date to correct date
        await prisma.attendance.update({
            where: { id: record.id },
            data: { date: correctToday }
        });

        console.log(`✅ Fixed ${record.user.name} - date updated to ${correctToday.toISOString()}`);
    }

    console.log('\nDone!');
}

fixTodayAttendance()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
