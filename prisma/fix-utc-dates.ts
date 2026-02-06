// Script to fix attendance records that were saved with UTC midnight instead of Bangkok midnight
// Run with: npx ts-node prisma/fix-utc-dates.ts

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

    // Bangkok midnight in UTC = 17:00 previous day UTC
    const utcMidnight = Date.UTC(year, month, day, 0, 0, 0, 0) - (BANGKOK_OFFSET * 60 * 1000);
    return new Date(utcMidnight);
}

async function fixUtcDates() {
    const bangkokNow = getBangkokNow();
    console.log('Bangkok Now:', bangkokNow.toISOString());

    const correctToday = startOfDayBangkok(bangkokNow);
    console.log('Correct today (Bangkok midnight):', correctToday.toISOString());

    // The wrong UTC midnight that was used
    const wrongUtcMidnight = new Date(Date.UTC(
        bangkokNow.getFullYear(),
        bangkokNow.getMonth(),
        bangkokNow.getDate(),
        0, 0, 0, 0
    ));
    console.log('Wrong UTC midnight:', wrongUtcMidnight.toISOString());

    // Find records with wrong date (UTC midnight instead of Bangkok midnight)
    const wrongRecords = await prisma.attendance.findMany({
        where: {
            date: wrongUtcMidnight,
        },
        include: {
            user: { select: { name: true, employeeId: true } }
        }
    });

    console.log(`\nFound ${wrongRecords.length} records with wrong UTC midnight date:`);

    for (const record of wrongRecords) {
        console.log(`- ${record.user.name} (${record.user.employeeId})`);
    }

    if (wrongRecords.length === 0) {
        console.log('\nNo records need fixing!');
        return;
    }

    // Check if Bangkok midnight check-in time makes sense
    // i.e., check-in was between Bangkok midnight and now
    console.log('\n--- Fixing records ---');

    for (const record of wrongRecords) {
        // Check if there's already a record with correct date
        const existing = await prisma.attendance.findFirst({
            where: {
                userId: record.userId,
                date: correctToday,
            }
        });

        if (existing && existing.id !== record.id) {
            console.log(`⚠️  ${record.user.name}: Already has correct record, skipping...`);
            continue;
        }

        // Update to correct Bangkok date
        await prisma.attendance.update({
            where: { id: record.id },
            data: { date: correctToday }
        });

        console.log(`✅ ${record.user.name}: Fixed date from UTC midnight to Bangkok midnight`);
    }

    console.log('\nDone! Verifying...');

    // Verify
    const verifyRecords = await prisma.attendance.findMany({
        where: { date: correctToday },
        include: { user: { select: { name: true } } }
    });

    console.log(`\nRecords now with correct Bangkok date: ${verifyRecords.length}`);
}

fixUtcDates()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
