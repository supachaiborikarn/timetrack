const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const updatedUser = await prisma.user.update({
        where: { name: 'ณัฐณิชา' }, // Assuming unique name or use ID if available
        data: { role: 'CASHIER' }
    });

    console.log('Updated user:', updatedUser);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
