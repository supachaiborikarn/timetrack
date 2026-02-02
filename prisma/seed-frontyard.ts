/**
 * Seed script for Front Yard employees at วัชรเกียรติออยล์
 * Based on ready_schedule_std.csv
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// พนักงานหน้าลานจาก CSV
const frontYardEmployees = [
    { nickname: "นัท", employeeId: "WK-FY001", phone: "0899990001", shiftPattern: "05:30" },
    { nickname: "วุฒิ", employeeId: "WK-FY002", phone: "0899990002", shiftPattern: "06:00" },
    { nickname: "ชล", employeeId: "WK-FY003", phone: "0899990003", shiftPattern: "06:30" },
    { nickname: "บี", employeeId: "WK-FY004", phone: "0899990004", shiftPattern: "07:00" },
    { nickname: "โบว์", employeeId: "WK-FY005", phone: "0899990005", shiftPattern: "07:30" },
    { nickname: "หญิง", employeeId: "WK-FY006", phone: "0899990006", shiftPattern: "09:00" },
    { nickname: "มะนาว", employeeId: "WK-FY007", phone: "0899990007", shiftPattern: "09:00" },
    { nickname: "กราฟ", employeeId: "WK-FY008", phone: "0899990008", shiftPattern: "09:00" },
];

async function main() {
    console.log("🌱 Seeding Front Yard employees for วัชรเกียรติออยล์...\n");

    // หา station วัชรเกียรติออยล์
    const station = await prisma.station.findFirst({
        where: { code: "WKO" },
    });

    if (!station) {
        console.error("❌ Station วัชรเกียรติออยล์ (WKO) not found!");
        console.log("Please run main seed first: npx prisma db seed");
        return;
    }

    console.log(`✅ Found station: ${station.name}`);

    // หาแผนกหน้าลาน
    const fuelDept = await prisma.department.findFirst({
        where: {
            stationId: station.id,
            code: "FUEL",
        },
    });

    if (!fuelDept) {
        console.error("❌ FUEL department not found!");
        return;
    }

    console.log(`✅ Found department: ${fuelDept.name}`);

    // สร้าง users
    let created = 0;
    let skipped = 0;

    for (const emp of frontYardEmployees) {
        // เช็คว่ามีอยู่แล้วหรือไม่
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { employeeId: emp.employeeId },
                    { phone: emp.phone },
                ],
            },
        });

        if (existing) {
            console.log(`⏭️  Skipped ${emp.nickname} (already exists)`);
            skipped++;
            continue;
        }

        // สร้าง PIN จาก shift pattern (เช่น 05:30 -> 053053)
        const pinDigits = emp.shiftPattern.replace(":", "");
        const pin = pinDigits + pinDigits.slice(0, 2);
        const hashedPin = await bcrypt.hash(pin, 10);

        await prisma.user.create({
            data: {
                employeeId: emp.employeeId,
                name: emp.nickname,
                phone: emp.phone,
                pin: hashedPin,
                role: Role.EMPLOYEE,
                stationId: station.id,
                departmentId: fuelDept.id,
                hourlyRate: 65, // อัตราหน้าลาน
                dailyRate: 520, // 8 ชม.
                otRateMultiplier: 1.5,
            },
        });

        console.log(`✅ Created: ${emp.nickname} (${emp.employeeId}) - PIN: ${pin}`);
        created++;
    }

    console.log(`\n🎉 Done! Created ${created} employees, skipped ${skipped}`);
    console.log("\n📝 Credentials:");
    console.log("   Phone: 089999000X (X = 1-8)");
    console.log("   PIN: Based on shift time (e.g., 053053 for 05:30 shift)");
    console.log("\n   Example logins:");
    frontYardEmployees.forEach((emp, i) => {
        const pinDigits = emp.shiftPattern.replace(":", "");
        const pin = pinDigits + pinDigits.slice(0, 2);
        console.log(`   ${emp.nickname}: ${emp.phone} / ${pin}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
