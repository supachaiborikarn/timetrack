
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
            name: true,
            employeeId: true,
            username: true,
            phone: true,
            role: true,
            email: true,
        },
        orderBy: {
            employeeId: 'asc',
        },
    });

    console.log('--- Valid Login Identifiers (Active Users) ---');
    users.forEach((u: any) => {
        const identifiers = [u.name, u.employeeId, u.username, u.phone, u.email].filter(Boolean);
        console.log(`Role: ${u.role} | Name: ${u.name} | Identifiers: ${identifiers.join(' / ')}`);
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
