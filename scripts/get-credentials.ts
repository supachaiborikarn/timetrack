
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            name: true,
            employeeId: true,
            pin: true,
            role: true,
            username: true,
            isActive: true, // Only active users usually matter, but let's see all
        },
        orderBy: {
            employeeId: 'asc',
        },
    });

    console.log('--- Employee Credentials ---');
    console.log('Name | Employee ID | PIN | Role | Username | Status');
    console.log('------------------------------------------------------------');
    users.forEach((u: any) => {
        console.log(`${u.name} | ${u.employeeId} | ${u.pin} | ${u.role} | ${u.username || '-'} | ${u.isActive ? 'Active' : 'Inactive'}`);
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
