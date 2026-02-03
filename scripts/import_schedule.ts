import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const thaiDays: Record<string, number> = {
    'จันทร์': 1,
    'อังคาร': 2,
    'พุธ': 3,
    'พฤหัส': 4,
    'ศุกร์': 5,
    'เสาร์': 6,
    'อาทิตย์': 0
};

async function main() {
    try {
        console.log("Reading CSV...");
        const csvPath = path.join(process.cwd(), 'ai_ready_schedule_std.csv');
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('day'));

        console.log(`Found ${lines.length} schedule rules.`);

        // Fetch users
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users in DB.`);

        // Helper to find user
        const findUser = (name: string) => {
            const normalized = name.replace(/\s+/g, '').toLowerCase();
            return users.find(u => u.name.replace(/\s+/g, '').toLowerCase().includes(normalized));
        };

        // Fetch shifts
        const dbShifts = await prisma.shift.findMany();
        let shifts = [...dbShifts];

        // Process lines
        const scheduleRules = [];

        for (const line of lines) {
            const parts = line.split(',');
            if (parts.length < 7) continue;

            const [dayStr, _st, _hrs, name, startStd, endStd, _range] = parts;
            const dayOfWeek = thaiDays[dayStr.trim()];

            if (dayOfWeek === undefined) {
                console.warn(`Unknown day: ${dayStr}`);
                continue;
            }

            const user = findUser(name.trim());
            if (!user) {
                console.warn(`User not found: ${name}`);
                continue;
            }

            // Find or create shift
            let shift = shifts.find(s => s.startTime === startStd && s.endTime === endStd);
            if (!shift) {
                console.log(`Creating new shift: ${startStd}-${endStd}`);
                const code = `S-${startStd.replace(':', '')}`;
                shift = await prisma.shift.create({
                    data: {
                        name: `Standard ${startStd}`,
                        code: code,
                        startTime: startStd,
                        endTime: endStd
                    }
                });
                shifts.push(shift);
            }

            scheduleRules.push({
                userId: user.id,
                dayOfWeek,
                shiftId: shift.id,
                userName: user.name,
                dayName: dayStr
            });
        }

        console.log(`Parsed ${scheduleRules.length} valid rules.`);

        // Generate schedule for CURRENT MONTH (Feb 2026)
        // Or maybe Feb and Mar? Let's do Feb 2026.
        const year = 2026;
        const month = 1; // Feb (0-indexed) -> 1
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        console.log(`Generating schedule for Feb ${year}...`);

        let count = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dayIdx = date.getDay(); // 0=Sun

            // Find rules matching this day
            const rules = scheduleRules.filter(r => r.dayOfWeek === dayIdx);

            for (const rule of rules) {
                // Upsert
                await prisma.shiftAssignment.upsert({
                    where: {
                        userId_date: {
                            userId: rule.userId,
                            date: date
                        }
                    },
                    update: {
                        shiftId: rule.shiftId,
                        isDayOff: false
                    },
                    create: {
                        userId: rule.userId,
                        date: date,
                        shiftId: rule.shiftId,
                        isDayOff: false
                    }
                });
                count++;
            }
        }

        console.log(`Successfully assigned ${count} shifts.`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
