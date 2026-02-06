const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Group by station and shift code
    const assignments = await prisma.shiftAssignment.findMany({
        where: { date: { gte: new Date('2026-02-01') } }, // Filter recent
        include: {
            shift: true,
            user: { include: { station: true } }
        }
    });

    const stats = {};
    assignments.forEach(a => {
        const station = a.user.station?.name || 'Unknown';
        const shift = `${a.shift.code} (${a.shift.breakMinutes}m)`;

        if (!stats[station]) stats[station] = {};
        if (!stats[station][shift]) stats[station][shift] = 0;
        stats[station][shift]++;
    });

    console.log(JSON.stringify(stats, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
