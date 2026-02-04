
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find the station
    const station = await prisma.station.findFirst({
        where: {
            name: {
                contains: 'วัชรเกียรติ'
            }
        }
    });

    if (!station) {
        console.error('Station not found');
        return;
    }

    const users = await prisma.user.findMany({
        where: {
            isActive: true,
            stationId: station.id
        },
        select: {
            name: true,
            nickName: true,
            employeeId: true,
            username: true,
            phone: true,
            role: true,
        },
        orderBy: {
            employeeId: 'asc',
        },
    });

    console.log('--- Watcharakiat Oil Employees with Nicknames ---');
    users.forEach((u: any) => {
        console.log(`Role: ${u.role} | Name: ${u.name} | Nickname: ${u.nickName || '-'} | ID: ${u.employeeId} | Phone: ${u.phone || '-'} | Username: ${u.username || '-'}`);
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
