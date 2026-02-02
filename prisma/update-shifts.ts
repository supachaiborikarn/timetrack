/**
 * Update shift types to match the front yard schedule
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// กะที่ต้องการตาม CSV
const desiredShifts = [
    { code: "A", name: "กะ A (05:30-17:30)", startTime: "05:30", endTime: "17:30", sortOrder: 1 },
    { code: "B", name: "กะ B (06:00-18:00)", startTime: "06:00", endTime: "18:00", sortOrder: 2 },
    { code: "C", name: "กะ C (06:30-18:30)", startTime: "06:30", endTime: "18:30", sortOrder: 3 },
    { code: "D", name: "กะ D (07:00-19:00)", startTime: "07:00", endTime: "19:00", sortOrder: 4 },
    { code: "E", name: "กะ E (07:30-19:30)", startTime: "07:30", endTime: "19:30", sortOrder: 5 },
    { code: "F", name: "กะ F (08:00-20:00)", startTime: "08:00", endTime: "20:00", sortOrder: 6 },
    { code: "G", name: "กะ G (09:00-21:00)", startTime: "09:00", endTime: "21:00", sortOrder: 7 },
];

async function main() {
    console.log("🔄 Updating shift types for หน้าลาน...\n");

    for (const shift of desiredShifts) {
        // เช็คว่ามีกะนี้อยู่หรือยัง
        const existing = await prisma.shift.findUnique({
            where: { code: shift.code },
        });

        if (existing) {
            // อัปเดตกะที่มีอยู่
            await prisma.shift.update({
                where: { code: shift.code },
                data: {
                    name: shift.name,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    sortOrder: shift.sortOrder,
                    breakMinutes: 60,
                },
            });
            console.log(`✅ Updated: ${shift.code} -> ${shift.startTime}-${shift.endTime}`);
        } else {
            // สร้างกะใหม่
            await prisma.shift.create({
                data: {
                    code: shift.code,
                    name: shift.name,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    sortOrder: shift.sortOrder,
                    breakMinutes: 60,
                },
            });
            console.log(`➕ Created: ${shift.code} -> ${shift.startTime}-${shift.endTime}`);
        }
    }

    console.log("\n🎉 Done! Shift types updated.");

    // แสดงรายการกะทั้งหมด
    const allShifts = await prisma.shift.findMany({
        orderBy: { sortOrder: "asc" },
        where: { isActive: true },
    });

    console.log("\n📋 Current shift types:");
    for (const s of allShifts) {
        console.log(`   ${s.code}: ${s.startTime}-${s.endTime} (${s.name})`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
