import { PrismaClient, StationType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Adding new stations...");

    const stationsData = [
        {
            name: "แก๊สพงษ์อนันต์",
            code: "PAP_GAS",
            type: StationType.GAS_STATION,
            address: "แก๊สพงษ์อนันต์",
            latitude: 13.7580, // Using same lat/long as main station for now
            longitude: 100.5650,
            radius: 100,
            qrCode: "PAP-GAS-2026",
            departments: [
                { code: "FUEL", name: "หน้าลาน", isFrontYard: true },
                { code: "CLERK", name: "เสมียน", isFrontYard: false },
                { code: "MAID", name: "แม่บ้าน", isFrontYard: false },
            ]
        },
        {
            name: "แก๊สศุภชัย",
            code: "SPC_GAS",
            type: StationType.GAS_STATION,
            address: "แก๊สศุภชัย",
            latitude: 13.8200, // Using same lat/long as main station for now
            longitude: 100.5650,
            radius: 100,
            qrCode: "SPC-GAS-2026",
            departments: [
                { code: "FUEL", name: "หน้าลาน", isFrontYard: true },
                { code: "CLERK", name: "เสมียน", isFrontYard: false },
                { code: "MAID", name: "แม่บ้าน", isFrontYard: false },
            ]
        }
    ];

    for (const s of stationsData) {
        // Upsert station
        const station = await prisma.station.upsert({
            where: { code: s.code },
            update: {},
            create: {
                name: s.name,
                code: s.code,
                type: s.type,
                address: s.address,
                latitude: s.latitude,
                longitude: s.longitude,
                radius: s.radius,
                qrCode: s.qrCode,
            },
        });

        console.log(`✅ Station ${station.name} (${station.code}) ready.`);

        // Create departments
        for (const d of s.departments) {
            await prisma.department.upsert({
                where: {
                    stationId_code: {
                        stationId: station.id,
                        code: d.code,
                    }
                },
                update: {},
                create: {
                    name: d.name,
                    code: d.code,
                    isFrontYard: d.isFrontYard,
                    stationId: station.id,
                },
            });
        }
        console.log(`   - Departments ensured.`);
    }

    console.log("🎉 All new stations added successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
