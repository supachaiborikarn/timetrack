/**
 * Fix: Re-assign shifts for February 2026 using ONLY shifts A-G
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Map เวลาเริ่มงาน -> รหัสกะ
const timeToShiftCode: { [key: string]: string } = {
    "05:30": "A",
    "06:00": "B",
    "06:30": "C",
    "07:00": "D",
    "07:30": "E",
    "08:00": "F",
    "09:00": "G",
};

// วันในสัปดาห์ -> index (0=อาทิตย์)
const dayMap: { [key: string]: number } = {
    "อาทิตย์": 0,
    "จันทร์": 1,
    "อังคาร": 2,
    "พุธ": 3,
    "พฤหัส": 4,
    "ศุกร์": 5,
    "เสาร์": 6,
};

// ชื่อ -> employeeId
const nameToId: { [key: string]: string } = {
    "นัท": "WK-FY001",
    "วุฒิ": "WK-FY002",
    "ชล": "WK-FY003",
    "บี": "WK-FY004",
    "โบว์": "WK-FY005",
    "หญิง": "WK-FY006",
    "มะนาว": "WK-FY007",
    "กราฟ": "WK-FY008",
};

// ตารางกะจาก CSV
const scheduleData: { [day: string]: { name: string; startTime: string }[] } = {
    "จันทร์": [
        { name: "นัท", startTime: "05:30" },
        { name: "วุฒิ", startTime: "06:00" },
        { name: "ชล", startTime: "06:30" },
        { name: "บี", startTime: "07:00" },
        { name: "โบว์", startTime: "07:30" },
        { name: "หญิง", startTime: "09:00" },
        { name: "มะนาว", startTime: "09:00" },
    ],
    "อังคาร": [
        { name: "วุฒิ", startTime: "05:30" },
        { name: "ชล", startTime: "06:00" },
        { name: "บี", startTime: "06:30" },
        { name: "โบว์", startTime: "07:30" },
        { name: "หญิง", startTime: "09:00" },
        { name: "กราฟ", startTime: "09:00" },
    ],
    "พุธ": [
        { name: "นัท", startTime: "05:30" },
        { name: "วุฒิ", startTime: "06:00" },
        { name: "บี", startTime: "06:30" },
        { name: "โบว์", startTime: "07:00" },
        { name: "กราฟ", startTime: "08:00" },
        { name: "หญิง", startTime: "09:00" },
        { name: "มะนาว", startTime: "09:00" },
    ],
    "พฤหัส": [
        { name: "นัท", startTime: "05:30" },
        { name: "วุฒิ", startTime: "06:00" },
        { name: "ชล", startTime: "06:30" },
        { name: "บี", startTime: "07:00" },
        { name: "โบว์", startTime: "08:00" },
        { name: "กราฟ", startTime: "09:00" },
        { name: "มะนาว", startTime: "09:00" },
    ],
    "ศุกร์": [
        { name: "นัท", startTime: "05:30" },
        { name: "วุฒิ", startTime: "06:00" },
        { name: "ชล", startTime: "06:30" },
        { name: "โบว์", startTime: "07:00" },
        { name: "กราฟ", startTime: "08:00" },
        { name: "หญิง", startTime: "09:00" },
        { name: "มะนาว", startTime: "09:00" },
    ],
    "เสาร์": [
        { name: "นัท", startTime: "05:30" },
        { name: "ชล", startTime: "06:00" },
        { name: "บี", startTime: "06:30" },
        { name: "โบว์", startTime: "07:00" },
        { name: "กราฟ", startTime: "08:00" },
        { name: "หญิง", startTime: "09:00" },
        { name: "มะนาว", startTime: "09:00" },
    ],
    "อาทิตย์": [
        { name: "นัท", startTime: "05:30" },
        { name: "วุฒิ", startTime: "06:00" },
        { name: "ชล", startTime: "06:30" },
        { name: "บี", startTime: "07:00" },
        { name: "กราฟ", startTime: "08:00" },
        { name: "หญิง", startTime: "09:00" },
        { name: "มะนาว", startTime: "09:00" },
    ],
};

async function main() {
    console.log("🔄 Fixing shift assignments for February 2026...\n");

    // ดึง users
    const users = await prisma.user.findMany({
        where: { employeeId: { in: Object.values(nameToId) } },
    });
    console.log(`✅ Found ${users.length} front yard employees`);

    // ดึงเฉพาะกะ A-G
    const allowedShiftCodes = ["A", "B", "C", "D", "E", "F", "G"];
    const shifts = await prisma.shift.findMany({
        where: { code: { in: allowedShiftCodes } },
    });
    console.log(`✅ Found ${shifts.length} front yard shifts (A-G)`);

    const shiftByCode = new Map<string, typeof shifts[0]>();
    for (const shift of shifts) {
        shiftByCode.set(shift.code, shift);
    }

    // Verify all shifts exist
    for (const code of allowedShiftCodes) {
        if (!shiftByCode.has(code)) {
            console.error(`❌ Shift ${code} not found!`);
            return;
        }
        console.log(`   ${code}: ${shiftByCode.get(code)!.startTime}-${shiftByCode.get(code)!.endTime}`);
    }

    // Map employeeId -> userId
    const userByEmployeeId = new Map<string, string>();
    for (const user of users) {
        userByEmployeeId.set(user.employeeId, user.id);
    }

    // ลบ assignments เดิม
    const year = 2026;
    const month = 2;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const daysInMonth = endOfMonth.getDate();

    const deleted = await prisma.shiftAssignment.deleteMany({
        where: {
            userId: { in: users.map((u) => u.id) },
            date: { gte: startOfMonth, lte: endOfMonth },
        },
    });
    console.log(`\n🗑️  Deleted ${deleted.count} existing assignments`);

    // สร้างใหม่
    let created = 0;
    let dayOffs = 0;

    // หากะแรก (A) สำหรับใช้กับวันหยุด
    const defaultShift = shiftByCode.get("A")!;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        const dayName = Object.entries(dayMap).find(([, idx]) => idx === dayOfWeek)?.[0];
        if (!dayName) continue;

        const scheduleForDay = scheduleData[dayName] || [];

        for (const name of Object.keys(nameToId)) {
            const employeeId = nameToId[name];
            const userId = userByEmployeeId.get(employeeId);
            if (!userId) continue;

            const scheduleItem = scheduleForDay.find((s) => s.name === name);

            if (scheduleItem) {
                // หารหัสกะจากเวลาเริ่มงาน
                const shiftCode = timeToShiftCode[scheduleItem.startTime];
                const shift = shiftByCode.get(shiftCode);

                if (shift) {
                    await prisma.shiftAssignment.create({
                        data: {
                            userId,
                            shiftId: shift.id,
                            date,
                            isDayOff: false,
                        },
                    });
                    created++;
                } else {
                    console.log(`⚠️ Shift not found for ${name} at ${scheduleItem.startTime}`);
                }
            } else {
                // วันหยุด
                await prisma.shiftAssignment.create({
                    data: {
                        userId,
                        shiftId: defaultShift.id,
                        date,
                        isDayOff: true,
                    },
                });
                dayOffs++;
            }
        }
    }

    console.log(`\n🎉 Done!`);
    console.log(`   Working days: ${created}`);
    console.log(`   Day offs: ${dayOffs}`);
    console.log(`   Total: ${created + dayOffs}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
