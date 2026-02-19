const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stationName = 'วัชรเกียรติออยล์';
    const newRadius = 150;

    console.log(`Updating radius for station: ${stationName} to ${newRadius}m`);

    const station = await prisma.station.findFirst({
        where: { name: stationName }
    });

    if (!station) {
        console.log(`Station '${stationName}' not found.`);
        return;
    }

    console.log(`Current radius: ${station.radius}m`);

    const updated = await prisma.station.update({
        where: { id: station.id },
        data: { radius: newRadius }
    });

    console.log(`Updated radius: ${updated.radius}m`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
