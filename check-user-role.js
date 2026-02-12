const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'Paeng', mode: 'insensitive' } },
                { name: { contains: 'แป้ง', mode: 'insensitive' } },
                { username: { contains: 'Paeng', mode: 'insensitive' } },
                { username: { contains: 'แป้ง', mode: 'insensitive' } },
            ]
        },
        select: {
            id: true,
            name: true,
            username: true,
            role: true,
            employeeId: true
        }
    });

    console.log('Found users:', JSON.stringify(users, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
