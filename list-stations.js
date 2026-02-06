const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stations = await prisma.station.findMany();
    console.log(JSON.stringify(stations, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
