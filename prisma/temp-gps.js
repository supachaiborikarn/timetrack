const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const station = await prisma.station.findFirst({
        where: { name: { contains: 'ศุภชัย' } },
    });

    if (!station) {
        console.log('❌ ไม่พบสถานีศุภชัย');
        return;
    }

    const updated = await prisma.station.update({
        where: { id: station.id },
        data: {
            latitude: 16.436274,
            longitude: 99.511791,
        },
    });
    console.log('✅ Updated:', updated.name);
    console.log('   Latitude:', updated.latitude.toString());
    console.log('   Longitude:', updated.longitude.toString());
}

main().finally(() => prisma.$disconnect());
