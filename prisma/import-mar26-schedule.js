const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
function parseDateStringToBangkokMidnight(dateStr) {
    const simpleDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [year, month, day] = simpleDate.split("-").map(Number);
    const midnightBangkokInUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

const userMapping = {
    'หญิง': 'cml5g20im0022ua4780xu5bou',
    'มะนาว': 'cml5g22hz002gua47temxhj1t',
    'เม': 'cmm00natp00012j2m8dnmj87l',
    'ชล': 'cml6ctv0x0007uqrgprf5lu7c',
    'โบว์': 'cml5g1xzx001oua47iy5u23oh',
    'บี': 'cml5g1vmh001aua47rlxc2pr1',
    'วุฒิ': 'cml5g1qzg000iua472zcpgugd',
    'กราฟ': 'cml5g289u003uua47ulssk26x',
};

const shiftMapping = {
    1: 'cml66dlkw000013mitod5upug', // 5:30
    2: 'cml66dlno000113mih77suyuc', // 6:00
    3: 'cml66dlp1000213mi39m55khx', // 6:30
    4: 'cml66dlqb000313mi4rwg7lgc', // 7:00
    5: 'cml66dlrp000413miapldg649', // 7:30
    6: 'cml66dluc000613miw0vgbha7', // 8:00
    7: 'cml66dlsx000513miz5zih4e0', // 9:00
};

const dayMap = {
    'จันทร์': 1, 'อังคาร': 2, 'พุธ': 3, 'พฤหัส': 4,
    'ศุกร์': 5, 'เสาร์': 6, 'อาทิตย์': 0
};

function splitCsvValues(line) {
    const output = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            output.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    output.push(current.trim());
    return output;
}

async function main() {
    console.log('📅 Repairing shift assignments for March 2026...\n');

    // 1. DELETE badly formatted dates inserted earlier (which hit local UTC boundaries instead of Bangkok offset)
    const delRes = await prisma.shiftAssignment.deleteMany({
        where: {
            date: {
                gte: new Date('2026-03-01T00:00:00Z'),
                lte: new Date('2026-03-31T00:00:00Z')
            }
        }
    });
    console.log(`🗑️ Deleted ${delRes.count} wrongly formatted records.`);

    // Read CSV for re-insertion
    const csv = fs.readFileSync('/Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack/มีนา69.csv', 'utf-8');
    const lines = csv.trim().split('\n').filter(l => l.trim() !== '').slice(1);

    const scheduleTemplate = {};
    for (let i = 0; i <= 6; i++) {
        scheduleTemplate[i] = {};
    }

    for (const line of lines) {
        const parts = splitCsvValues(line);
        const dayStr = parts[0].replace(/\s+/g, '');
        const dayOfWeek = dayMap[dayStr];

        if (dayOfWeek === undefined) continue;

        for (let col = 1; col <= 7; col++) {
            const val = parts[col];
            if (!val) continue;

            const names = val.split(',').map(n => n.trim()).filter(n => n !== '');
            for (const name of names) {
                if (userMapping[name]) {
                    scheduleTemplate[dayOfWeek][name] = shiftMapping[col];
                }
            }
        }
    }

    let count = 0;

    // Build standard date index and apply
    for (let day = 1; day <= 31; day++) {
        // Construct the date string (e.g. "2026-03-01")
        const dateStr = `2026-03-${day.toString().padStart(2, '0')}`;
        // IMPORTANT: Use the Bangkok Midnight format
        const bangkokDate = parseDateStringToBangkokMidnight(dateStr);

        // Let's get the standard day of week in Bangkok. Mar 1 2026 is Sunday (0).
        // Since we know the logical date in Bangkok, we can use standard JS Date to find the weekday 
        // by parsing the string as local without shifting it.
        const logicalDate = new Date(2026, 2, day); // 2026-03-day locally
        const dayOfWeek = logicalDate.getDay();

        const daySchedule = scheduleTemplate[dayOfWeek] || {};

        for (const [name, shiftId] of Object.entries(daySchedule)) {
            const userId = userMapping[name];
            if (userId && shiftId) {
                try {
                    await prisma.shiftAssignment.upsert({
                        where: {
                            userId_date: { userId, date: bangkokDate }
                        },
                        update: { shiftId, isDayOff: false },
                        create: {
                            userId,
                            shiftId,
                            date: bangkokDate,
                            isDayOff: false
                        },
                    });
                    count++;
                } catch (e) {
                    console.log('Error:', name, dateStr, e.message);
                }
            }
        }
    }

    console.log(`\n✅ Created ${count} shift assignments for March 2026 (using Bangkok timestamps!)`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
