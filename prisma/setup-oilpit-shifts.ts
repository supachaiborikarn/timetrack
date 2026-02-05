import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🔧 Setting up oil pit (บ่อถ่าย) shifts...\n");

    // 1. Create or update OIL_WEEKDAY shift (Mon-Sat 08:00-17:00)
    const oilWeekday = await prisma.shift.upsert({
        where: { code: "OIL_WD" },
        update: {
            name: "กะบ่อถ่าย จันทร์-เสาร์ (08:00-17:00)",
            startTime: "08:00",
            endTime: "17:00",
            breakMinutes: 60,
        },
        create: {
            code: "OIL_WD",
            name: "กะบ่อถ่าย จันทร์-เสาร์ (08:00-17:00)",
            startTime: "08:00",
            endTime: "17:00",
            breakMinutes: 60,
            sortOrder: 110,
        },
    });
    console.log(`✅ Created/Updated shift: ${oilWeekday.name}`);

    // 2. Create or update OIL_SUNDAY shift (Sun 08:00-16:00)
    const oilSunday = await prisma.shift.upsert({
        where: { code: "OIL_SUN" },
        update: {
            name: "กะบ่อถ่าย อาทิตย์ (08:00-16:00)",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 60,
        },
        create: {
            code: "OIL_SUN",
            name: "กะบ่อถ่าย อาทิตย์ (08:00-16:00)",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 60,
            sortOrder: 111,
        },
    });
    console.log(`✅ Created/Updated shift: ${oilSunday.name}`);

    // 3. Find all departments with code OIL_PIT or name containing บ่อถ่าย
    const oilPitDepts = await prisma.department.findMany({
        where: {
            OR: [
                { code: "OIL_PIT" },
                { name: { contains: "บ่อถ่าย" } },
            ],
        },
    });
    console.log(`\n📦 Found ${oilPitDepts.length} oil pit departments`);

    // 4. Link shifts to departments
    for (const dept of oilPitDepts) {
        // Remove existing department-shift links for this department
        await prisma.departmentShift.deleteMany({
            where: { departmentId: dept.id },
        });

        // Add new links
        await prisma.departmentShift.createMany({
            data: [
                { departmentId: dept.id, shiftId: oilWeekday.id },
                { departmentId: dept.id, shiftId: oilSunday.id },
            ],
        });
        console.log(`   Linked shifts to department: ${dept.name}`);
    }

    // 5. Find all employees in oil pit departments
    const oilPitEmployees = await prisma.user.findMany({
        where: {
            departmentId: { in: oilPitDepts.map((d) => d.id) },
        },
        select: {
            id: true,
            name: true,
            nickName: true,
            employeeId: true,
        },
    });
    console.log(`\n👷 Found ${oilPitEmployees.length} employees in oil pit departments`);

    // 6. Create shift assignments for the current month and next month
    const today = new Date();
    const year = today.getFullYear();
    const currentMonth = today.getMonth();

    // Function to create shift assignments for a month
    async function createMonthAssignments(monthIndex: number) {
        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 0);
        const monthName = monthStart.toLocaleDateString("th-TH", { month: "long" });

        console.log(`\n📅 Creating shift assignments for ${monthName}...`);

        let created = 0;
        for (let day = 1; day <= monthEnd.getDate(); day++) {
            const date = new Date(year, monthIndex, day);
            const isSunday = date.getDay() === 0;
            const shiftId = isSunday ? oilSunday.id : oilWeekday.id;

            for (const emp of oilPitEmployees) {
                // Check if assignment already exists
                const existing = await prisma.shiftAssignment.findFirst({
                    where: {
                        userId: emp.id,
                        date: date,
                    },
                });

                if (!existing) {
                    await prisma.shiftAssignment.create({
                        data: {
                            userId: emp.id,
                            shiftId: shiftId,
                            date: date,
                        },
                    });
                    created++;
                }
            }
        }
        console.log(`   Created ${created} new shift assignments for ${monthName}`);
    }

    // Create assignments for current and next month
    await createMonthAssignments(currentMonth);
    await createMonthAssignments(currentMonth + 1);

    console.log("\n🎉 Oil pit shifts setup completed!");
    console.log("\n📋 Summary:");
    console.log(`   - กะจันทร์-เสาร์: ${oilWeekday.startTime}-${oilWeekday.endTime}`);
    console.log(`   - กะอาทิตย์: ${oilSunday.startTime}-${oilSunday.endTime}`);
    console.log(`   - พนักงานทั้งหมด: ${oilPitEmployees.length} คน`);
}

main()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
