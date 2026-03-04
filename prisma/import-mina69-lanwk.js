/**
 * Import March 2569 (2026) shift schedule for หน้าลานวัชรเกียรติ
 * Source: มีนา69.csv
 * 
 * CSV format:
 * ,5.30,6.00,6.30,7.00,7.30,8.00,9.00,หยุด
 * จันทร์,หญิง,เม,,มะนาว,ชล,,บี/วุฒิ,กราฟ
 * ...
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function parseDateStringToBangkokMidnight(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const midnightBangkokInUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

// mapping ชื่อเล่น → userId (เหมือนกับสคริปต์เดิม)
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

// mapping ลำดับ column → shiftId
const shiftMapping = {
    1: 'cml66dlkw000013mitod5upug', // 05:30
    2: 'cml66dlno000113mih77suyuc', // 06:00
    3: 'cml66dlp1000213mi39m55khx', // 06:30
    4: 'cml66dlqb000313mi4rwg7lgc', // 07:00
    5: 'cml66dlrp000413miapldg649', // 07:30
    6: 'cml66dluc000613miw0vgbha7', // 08:00
    7: 'cml66dlsx000513miz5zih4e0', // 09:00
};

// mapping ชื่อวัน → dayOfWeek (0=อาทิตย์, 1=จันทร์ ...)
const dayMap = {
    'จันทร์': 1,
    'อังคาร': 2,
    'พุธ': 3,
    'พฤหัส': 4,
    'ศุกร์': 5,
    'เสาร์': 6,
    'อาทิตย์': 0,
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
    console.log('📅 Importing March 2026 (มีนา 2569) schedule for หน้าลานวัชรเกียรติ...\n');

    // ลบข้อมูลเดิมเดือนมีนา 2026
    const delRes = await prisma.shiftAssignment.deleteMany({
        where: {
            date: {
                gte: new Date('2026-03-01T00:00:00Z'),
                lte: new Date('2026-03-31T17:00:00Z'),
            },
            user: {
                id: {
                    in: Object.values(userMapping),
                },
            },
        },
    });
    console.log(`🗑️  Deleted ${delRes.count} existing March 2026 records for หน้าลาน staff.`);

    // อ่าน CSV
    const csvPath = '/Users/benzsuphaudphanich/Desktop/HRpayroll/มีนา69.csv';
    const csv = fs.readFileSync(csvPath, 'utf-8');

    // skip header row (row 0), process rows 1-7
    const lines = csv.trim().split('\n').filter(l => l.trim() !== '').slice(1);

    // scheduleTemplate[dayOfWeek][name] = shiftId
    const scheduleTemplate = {};
    for (let i = 0; i <= 6; i++) scheduleTemplate[i] = {};

    // dayOffTemplate[dayOfWeek] = [name, ...] (คนที่หยุดวันนั้น)
    const dayOffTemplate = {};
    for (let i = 0; i <= 6; i++) dayOffTemplate[i] = [];

    for (const line of lines) {
        const parts = splitCsvValues(line);
        if (parts.length === 0) continue;

        const dayStr = parts[0].replace(/\s+/g, '');
        const dayOfWeek = dayMap[dayStr];
        if (dayOfWeek === undefined) {
            console.log(`⚠️  Unknown day: "${parts[0]}" — skipping`);
            continue;
        }

        // columns 1-7 = กะ (เวลาเริ่ม), column 8 = หยุด
        for (let col = 1; col <= 7; col++) {
            const val = parts[col];
            if (!val) continue;
            const names = val.split(',').map(n => n.trim()).filter(n => n !== '');
            for (const name of names) {
                if (userMapping[name]) {
                    scheduleTemplate[dayOfWeek][name] = shiftMapping[col];
                } else {
                    console.log(`⚠️  Unknown staff: "${name}" (day ${dayStr}, col ${col})`);
                }
            }
        }

        // column 8 = หยุด
        const dayOffVal = parts[8];
        if (dayOffVal) {
            const names = dayOffVal.split(',').map(n => n.trim()).filter(n => n !== '');
            for (const name of names) {
                if (userMapping[name]) {
                    dayOffTemplate[dayOfWeek].push(name);
                }
            }
        }
    }

    console.log('\n📋 Schedule template parsed:');
    for (const [dow, sched] of Object.entries(scheduleTemplate)) {
        const dayName = Object.entries(dayMap).find(([k, v]) => v == dow)?.[0] ?? dow;
        const entries = Object.entries(sched).map(([n, s]) => {
            const shiftNum = Object.entries(shiftMapping).find(([k, v]) => v === s)?.[0];
            const times = ['', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '09:00'];
            return `${n}@${times[shiftNum]}`;
        }).join(', ');
        const offs = dayOffTemplate[dow]?.join(', ') || '-';
        console.log(`   ${dayName}: ${entries || '(ไม่มีข้อมูล)'} | หยุด: ${offs}`);
    }

    // insert กะสำหรับทุกวันในเดือนมีนา 2026
    let countShift = 0;
    let countDayOff = 0;

    for (let day = 1; day <= 31; day++) {
        const dateStr = `2026-03-${day.toString().padStart(2, '0')}`;
        const bangkokDate = parseDateStringToBangkokMidnight(dateStr);
        const logicalDate = new Date(2026, 2, day); // March = month index 2
        const dayOfWeek = logicalDate.getDay();

        // assign shifts
        const daySchedule = scheduleTemplate[dayOfWeek] || {};
        for (const [name, shiftId] of Object.entries(daySchedule)) {
            const userId = userMapping[name];
            if (!userId || !shiftId) continue;
            try {
                await prisma.shiftAssignment.upsert({
                    where: { userId_date: { userId, date: bangkokDate } },
                    update: { shiftId, isDayOff: false },
                    create: { userId, shiftId, date: bangkokDate, isDayOff: false },
                });
                countShift++;
            } catch (e) {
                console.log(`❌ Error (${name}, ${dateStr}): ${e.message}`);
            }
        }

        // assign day-off
        const offs = dayOffTemplate[dayOfWeek] || [];
        for (const name of offs) {
            const userId = userMapping[name];
            if (!userId) continue;
            // หา shiftId แรกที่มีในระบบ (ใส่ shiftId อะไรก็ได้ แต่ isDayOff = true)
            const anyShiftId = 'cml66dlkw000013mitod5upug'; // 05:30
            try {
                await prisma.shiftAssignment.upsert({
                    where: { userId_date: { userId, date: bangkokDate } },
                    update: { isDayOff: true, shiftId: anyShiftId },
                    create: { userId, shiftId: anyShiftId, date: bangkokDate, isDayOff: true },
                });
                countDayOff++;
            } catch (e) {
                console.log(`❌ Error day-off (${name}, ${dateStr}): ${e.message}`);
            }
        }
    }

    console.log(`\n✅ Done!`);
    console.log(`   📌 Shift assignments: ${countShift}`);
    console.log(`   🏖️  Day-off assignments: ${countDayOff}`);
    console.log(`   Total: ${countShift + countDayOff} records for March 2026`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
