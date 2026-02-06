const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find benz user
    const user = await prisma.user.findFirst({
        where: { name: { contains: 'benz' } },
        include: { station: true }
    });

    if (!user) {
        console.log('User benz not found');
        return;
    }

    console.log('User:', user.name, user.id, 'Station:', user.station?.name);

    // Get today's attendance - use Bangkok timezone start of day
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const now = new Date();
    const bangkokNow = new Date(now.getTime() + bangkokOffset);
    const startOfDay = new Date(bangkokNow);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const today = new Date(startOfDay.getTime() - bangkokOffset);

    console.log('Querying for date >=', today.toISOString());

    const att = await prisma.attendance.findFirst({
        where: { userId: user.id, date: { gte: today } }
    });

    console.log('Attendance:', JSON.stringify(att, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
