const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

// Map Thai day names to day-of-week (0=Sunday)
const dayMap = {
    "อาทิตย์": 0,
    "จันทร์": 1,
    "อังคาร": 2,
    "พุธ": 3,
    "พฤหัส": 4,
    "ศุกร์": 5,
    "เสาร์": 6,
};

// Nickname to name mapping (based on DB lookup)
const nicknameMap = {
    "นัท": "ณัชชา",
    "วุฒิ": "ศราวุฒ",
    "ชล": "ปรีชา",
    "บี": "zow",
    "โบว์": "สุภัสสรา",
    "หญิง": "สุนันทา",
    "มะนาว": "ศิริพร",
    "กราฟ": "จิรวัฒน์",
};

async function main() {
    // Read CSV
    const csv = fs.readFileSync("/Users/benzsuphaudphanich/Desktop/HRpayroll/ready_schedule_std.csv", "utf-8");
    const lines = csv.trim().split("\n").slice(1); // Skip header

    // Parse schedule: { dayOfWeek: [{ nickname, startTime, endTime }] }
    const schedule = {};
    for (const line of lines) {
        if (!line.trim()) continue;
        const [day, , , nickname, startTime, endTime] = line.split(",");
        const dow = dayMap[day];
        if (dow === undefined) continue;
        if (!schedule[dow]) schedule[dow] = [];
        schedule[dow].push({ nickname: nickname.trim(), startTime, endTime });
    }

    console.log("Parsed schedule:", Object.keys(schedule).length, "days");

    // Get all users keyed by partial name match
    const users = await prisma.user.findMany({ where: { isActive: true } });
    const userByNickname = {};
    for (const [nick, namePrefix] of Object.entries(nicknameMap)) {
        const user = users.find((u) => u.name.includes(namePrefix) || (u.nickName && u.nickName.includes(nick)));
        if (user) {
            userByNickname[nick] = user;
            console.log(`Matched: ${nick} => ${user.name}`);
        } else {
            console.log(`NOT FOUND: ${nick}`);
        }
    }

    // Get all shifts keyed by startTime-endTime range
    const shifts = await prisma.shift.findMany();
    const shiftByRange = {};
    for (const s of shifts) {
        const key = `${s.startTime}-${s.endTime}`;
        shiftByRange[key] = s;
    }
    console.log("Available shifts:", Object.keys(shiftByRange).join(", "));

    // Generate all dates in February 2026
    const year = 2026;
    const month = 1; // Feb (0-indexed)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let created = 0;
    let skipped = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        // Store as UTC midnight (same as admin creates on web)
        const dateUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const dow = dateUTC.getUTCDay();

        const daySchedule = schedule[dow];
        if (!daySchedule) continue;

        for (const entry of daySchedule) {
            const user = userByNickname[entry.nickname];
            if (!user) {
                console.log(`Skip: ${entry.nickname} not found`);
                skipped++;
                continue;
            }

            // Match shift by startTime-endTime range
            const shiftKey = `${entry.startTime}-${entry.endTime}`;
            const shift = shiftByRange[shiftKey];
            if (!shift) {
                console.log(`Skip: Shift ${shiftKey} not found`);
                skipped++;
                continue;
            }

            // Check if exists
            const existing = await prisma.shiftAssignment.findFirst({
                where: { userId: user.id, date: dateUTC },
            });

            if (existing) {
                // Update if different
                if (existing.shiftId !== shift.id) {
                    await prisma.shiftAssignment.update({
                        where: { id: existing.id },
                        data: { shiftId: shift.id },
                    });
                    console.log(`Updated: ${user.name} on ${day} Feb => ${shift.name}`);
                    created++;
                }
            } else {
                await prisma.shiftAssignment.create({
                    data: {
                        userId: user.id,
                        shiftId: shift.id,
                        date: dateUTC,
                        isDayOff: false,
                    },
                });
                console.log(`Created: ${user.name} on ${day} Feb => ${shift.name}`);
                created++;
            }
        }
    }

    console.log(`\nDone! Created/Updated: ${created}, Skipped: ${skipped}`);
}

main().finally(() => prisma.$disconnect());
