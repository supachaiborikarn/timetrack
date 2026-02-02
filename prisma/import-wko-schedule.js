const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const prisma = new PrismaClient();

// Thai day mapping
const dayMap = {
    'จันทร์': 1, 'อังคาร': 2, 'พุธ': 3, 'พฤหัส': 4,
    'ศุกร์': 5, 'เสาร์': 6, 'อาทิตย์': 0
};

async function main() {
    console.log('📅 Creating shift assignments for February 2026...\n');

    // Read CSV
    const csv = fs.readFileSync('/Users/benzsuphaudphanich/Desktop/HRpayroll/ready_schedule_std.csv', 'utf-8');
    const lines = csv.trim().split('\n').slice(1);

    // Get all WKO users
    const users = await prisma.user.findMany({
        where: { employeeId: { startsWith: 'WKO' } }
    });
    const userMap = {};
    for (const u of users) {
        userMap[u.name] = u.id;
    }
    console.log('👤 Found', users.length, 'users');

    // Get all WKO shifts
    const shifts = await prisma.shift.findMany({
        where: { id: { startsWith: 'shift-wko' } }
    });
    const shiftMap = {};
    for (const s of shifts) {
        const range = `${s.startTime}-${s.endTime}`;
        shiftMap[range] = s.id;
    }
    console.log('⏰ Found', shifts.length, 'shifts');

    // Parse schedule by employee and day
    const scheduleByEmployee = {};
    for (const line of lines) {
        const parts = line.split(',');
        const day = parts[0];
        const name = parts[3];
        const shiftRange = parts[6];

        if (!scheduleByEmployee[name]) {
            scheduleByEmployee[name] = {};
        }
        scheduleByEmployee[name][dayMap[day]] = shiftRange;
    }

    // February 2026 dates
    const startDate = new Date('2026-02-01');
    const endDate = new Date('2026-02-28');
    let count = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split('T')[0];

        for (const [name, schedule] of Object.entries(scheduleByEmployee)) {
            if (schedule[dayOfWeek]) {
                const shiftRange = schedule[dayOfWeek];
                const userId = userMap[name];
                const shiftId = shiftMap[shiftRange];

                if (userId && shiftId) {
                    try {
                        await prisma.shiftAssignment.upsert({
                            where: {
                                userId_date: { userId, date: new Date(dateStr) }
                            },
                            update: { shiftId },
                            create: {
                                userId,
                                shiftId,
                                date: new Date(dateStr),
                            },
                        });
                        count++;
                        if (count % 50 === 0) {
                            console.log(`  ... ${count} assignments created`);
                        }
                    } catch (e) {
                        console.log('Error:', name, dateStr, e.message);
                    }
                }
            }
        }
    }

    console.log(`\n✅ Created ${count} shift assignments for February 2026`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
