import { PrismaClient, Role, StationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // ==================== CLEAN UP ====================
    await prisma.shiftAssignment.deleteMany();
    await prisma.departmentShift.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.user.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.department.deleteMany();
    await prisma.station.deleteMany();

    // ==================== STATIONS (3 สถานี) ====================
    const stations = await Promise.all([
        prisma.station.create({
            data: {
                name: "วัชรเกียรติออยล์",
                code: "WKO",
                type: StationType.GAS_STATION,
                address: "วัชรเกียรติออยล์",
                latitude: 13.7563,
                longitude: 100.5018,
                radius: 100,
                qrCode: "WKO-2026",
            },
        }),
        prisma.station.create({
            data: {
                name: "พงษ์อนันต์ปิโตรเลียม",
                code: "PAP",
                type: StationType.GAS_STATION,
                address: "พงษ์อนันต์ปิโตรเลียม",
                latitude: 13.7580,
                longitude: 100.5650,
                radius: 100,
                qrCode: "PAP-2026",
            },
        }),
        prisma.station.create({
            data: {
                name: "ศุภชัยบริการ",
                code: "SPC",
                type: StationType.GAS_STATION,
                address: "ศุภชัยบริการ",
                latitude: 13.8200,
                longitude: 100.5650,
                radius: 100,
                qrCode: "SPC-2026",
            },
        }),
    ]);

    console.log(`✅ Created ${stations.length} stations`);

    // ==================== SHIFTS ====================
    // กะหน้าลาน: ทุก 30 นาที ตั้งแต่ 05:30-09:00
    const fuelShifts: { code: string; start: string; end: string }[] = [];
    let shiftCode = "A";
    for (let h = 5; h <= 9; h++) {
        for (const m of [0, 30]) {
            if (h === 5 && m === 0) continue; // Start from 05:30
            const startHour = h.toString().padStart(2, "0");
            const startMin = m.toString().padStart(2, "0");
            const endHour = (h + 11).toString().padStart(2, "0");
            const endMin = m.toString().padStart(2, "0");

            fuelShifts.push({
                code: shiftCode,
                start: `${startHour}:${startMin}`,
                end: `${endHour}:${endMin}`,
            });
            shiftCode = String.fromCharCode(shiftCode.charCodeAt(0) + 1);
        }
    }

    const shifts = await Promise.all([
        // หน้าลาน shifts
        ...fuelShifts.map((s, i) =>
            prisma.shift.create({
                data: {
                    code: s.code,
                    name: `กะ ${s.code} (${s.start}-${s.end})`,
                    startTime: s.start,
                    endTime: s.end,
                    breakMinutes: 60,
                    sortOrder: i,
                },
            })
        ),
        // ร้านกาแฟ / แม่บ้าน / เสมียน / จิปาถะ
        prisma.shift.create({
            data: {
                code: "CAFE",
                name: "กะร้านกาแฟ/ทั่วไป (07:00-17:00)",
                startTime: "07:00",
                endTime: "17:00",
                breakMinutes: 60,
                sortOrder: 100,
            },
        }),
        // บ่อถ่าย
        prisma.shift.create({
            data: {
                code: "OIL",
                name: "กะบ่อถ่าย (08:00-17:00)",
                startTime: "08:00",
                endTime: "17:00",
                breakMinutes: 60,
                sortOrder: 101,
            },
        }),
        // ล้างรถ
        prisma.shift.create({
            data: {
                code: "WASH",
                name: "กะล้างรถ (08:00-18:00)",
                startTime: "08:00",
                endTime: "18:00",
                breakMinutes: 60,
                sortOrder: 102,
            },
        }),
        // แก๊ส
        prisma.shift.create({
            data: {
                code: "GAS",
                name: "กะแก๊ส (06:00-18:00)",
                startTime: "06:00",
                endTime: "18:00",
                breakMinutes: 60,
                sortOrder: 103,
            },
        }),
    ]);

    console.log(`✅ Created ${shifts.length} shifts`);

    // Get shift maps
    const shiftMap = Object.fromEntries(shifts.map((s) => [s.code, s]));
    const fuelShiftIds = fuelShifts.map((s) => shiftMap[s.code].id);

    // ==================== DEPARTMENTS PER STATION ====================

    // วัชรเกียรติออยล์: หน้าลาน, เสมียน, ร้านกาแฟ, บ่อถ่ายน้ำมัน, แม่บ้าน, จิปาถะ
    const wkoDeptsData = [
        { code: "FUEL", name: "หน้าลาน", isFrontYard: true },
        { code: "CLERK", name: "เสมียน", isFrontYard: false },
        { code: "CAFE", name: "ร้านกาแฟ", isFrontYard: false },
        { code: "OIL_PIT", name: "บ่อถ่ายน้ำมัน", isFrontYard: false },
        { code: "MAID", name: "แม่บ้าน", isFrontYard: false },
        { code: "MISC", name: "จิปาถะ", isFrontYard: false },
    ];

    // พงษ์อนันต์ปิโตรเลียม: หน้าลาน, แก๊ส, เสมียน, ร้านกาแฟ, ล้างรถ, แม่บ้าน
    const papDeptsData = [
        { code: "FUEL", name: "หน้าลาน", isFrontYard: true },
        { code: "GAS", name: "แก๊ส", isFrontYard: false },
        { code: "CLERK", name: "เสมียน", isFrontYard: false },
        { code: "CAFE", name: "ร้านกาแฟ", isFrontYard: false },
        { code: "CAR_WASH", name: "ล้างรถ", isFrontYard: false },
        { code: "MAID", name: "แม่บ้าน", isFrontYard: false },
    ];

    // ศุภชัยบริการ: หน้าลาน, เสมียน, แก๊ส, ร้านกาแฟ, แม่บ้าน
    const spcDeptsData = [
        { code: "FUEL", name: "หน้าลาน", isFrontYard: true },
        { code: "CLERK", name: "เสมียน", isFrontYard: false },
        { code: "GAS", name: "แก๊ส", isFrontYard: false },
        { code: "CAFE", name: "ร้านกาแฟ", isFrontYard: false },
        { code: "MAID", name: "แม่บ้าน", isFrontYard: false },
    ];

    const allDepartments: { id: string; code: string; stationId: string }[] = [];

    // Create departments for วัชรเกียรติออยล์
    for (const deptData of wkoDeptsData) {
        const dept = await prisma.department.create({
            data: {
                name: deptData.name,
                code: deptData.code,
                stationId: stations[0].id,
                isFrontYard: deptData.isFrontYard,
            },
        });
        allDepartments.push({ id: dept.id, code: dept.code, stationId: stations[0].id });
    }

    // Create departments for พงษ์อนันต์ปิโตรเลียม
    for (const deptData of papDeptsData) {
        const dept = await prisma.department.create({
            data: {
                name: deptData.name,
                code: deptData.code,
                stationId: stations[1].id,
                isFrontYard: deptData.isFrontYard,
            },
        });
        allDepartments.push({ id: dept.id, code: dept.code, stationId: stations[1].id });
    }

    // Create departments for ศุภชัยบริการ
    for (const deptData of spcDeptsData) {
        const dept = await prisma.department.create({
            data: {
                name: deptData.name,
                code: deptData.code,
                stationId: stations[2].id,
                isFrontYard: deptData.isFrontYard,
            },
        });
        allDepartments.push({ id: dept.id, code: dept.code, stationId: stations[2].id });
    }

    console.log(`✅ Created ${allDepartments.length} departments`);

    // ==================== DEPARTMENT-SHIFT LINKING ====================
    for (const dept of allDepartments) {
        let shiftIds: string[] = [];

        switch (dept.code) {
            case "FUEL":
                shiftIds = fuelShiftIds;
                break;
            case "CLERK":
            case "CAFE":
            case "MAID":
            case "MISC":
                shiftIds = [shiftMap["CAFE"].id];
                break;
            case "OIL_PIT":
                shiftIds = [shiftMap["OIL"].id];
                break;
            case "CAR_WASH":
                shiftIds = [shiftMap["WASH"].id];
                break;
            case "GAS":
                shiftIds = [shiftMap["GAS"].id];
                break;
        }

        for (const shiftId of shiftIds) {
            await prisma.departmentShift.create({
                data: {
                    departmentId: dept.id,
                    shiftId,
                },
            });
        }
    }

    console.log("✅ Created department-shift links");

    // ==================== USERS ====================
    const hashedAdminPass = await bcrypt.hash("admin123", 10);
    const hashedManagerPass = await bcrypt.hash("manager123", 10);
    const hashedPin = await bcrypt.hash("123456", 10);

    // Admin user
    await prisma.user.create({
        data: {
            employeeId: "ADM001",
            name: "ผู้ดูแลระบบ",
            email: "admin@supachai.com",
            phone: "0800000001",
            pin: hashedPin,
            password: hashedAdminPass,
            role: Role.ADMIN,
            hourlyRate: 0,
            baseSalary: 30000,
        },
    });

    // Manager for each station
    await prisma.user.create({
        data: {
            employeeId: "MGR001",
            name: "ผู้จัดการวัชรเกียรติ",
            email: "manager.wko@supachai.com",
            phone: "0800000002",
            pin: hashedPin,
            password: hashedManagerPass,
            role: Role.MANAGER,
            stationId: stations[0].id,
            hourlyRate: 0,
            baseSalary: 25000,
        },
    });

    await prisma.user.create({
        data: {
            employeeId: "MGR002",
            name: "ผู้จัดการพงษ์อนันต์",
            email: "manager.pap@supachai.com",
            phone: "0800000003",
            pin: hashedPin,
            password: hashedManagerPass,
            role: Role.MANAGER,
            stationId: stations[1].id,
            hourlyRate: 0,
            baseSalary: 25000,
        },
    });

    await prisma.user.create({
        data: {
            employeeId: "MGR003",
            name: "ผู้จัดการศุภชัย",
            email: "manager.spc@supachai.com",
            phone: "0800000004",
            pin: hashedPin,
            password: hashedManagerPass,
            role: Role.MANAGER,
            stationId: stations[2].id,
            hourlyRate: 0,
            baseSalary: 25000,
        },
    });

    // Sample employees (3 per station)
    const employeeNames = [
        "วิชัย ใจดี", "สมศรี มั่นคง", "ประสิทธิ์ แข็งแกร่ง",
        "มานะ อดทน", "สุนีย์ รอบคอบ", "ธนา เจริญ",
        "กัญญา สดใส", "พิชัย ฉลาด", "รัตนา อ่อนโยน",
    ];

    let empIndex = 0;
    for (let stationIdx = 0; stationIdx < stations.length; stationIdx++) {
        const station = stations[stationIdx];
        const stationDepts = allDepartments.filter((d) => d.stationId === station.id);

        for (let i = 0; i < 3; i++) {
            const deptIdx = i % stationDepts.length;
            const dept = stationDepts[deptIdx];

            await prisma.user.create({
                data: {
                    employeeId: `EMP${(empIndex + 1).toString().padStart(3, "0")}`,
                    name: employeeNames[empIndex % employeeNames.length],
                    phone: `081${(1111111 + empIndex).toString()}`,
                    pin: hashedPin,
                    role: Role.EMPLOYEE,
                    stationId: station.id,
                    departmentId: dept.id,
                    hourlyRate: dept.code === "FUEL" ? 65 : 60,
                    otRateMultiplier: dept.code === "FUEL" ? 1.5 : 1.0,
                },
            });
            empIndex++;
        }
    }

    console.log(`✅ Created ${empIndex + 4} users (1 admin, 3 managers, ${empIndex} employees)`);

    console.log("\n🎉 Seeding completed!");
    console.log("\n📝 Login credentials:");
    console.log("   Admin: admin@supachai.com / admin123");
    console.log("   Manager WKO: manager.wko@supachai.com / manager123");
    console.log("   Manager PAP: manager.pap@supachai.com / manager123");
    console.log("   Manager SPC: manager.spc@supachai.com / manager123");
    console.log("   Employee: 0811111111 / PIN: 123456");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
