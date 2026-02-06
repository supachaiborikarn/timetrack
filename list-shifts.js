const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const shifts = await prisma.shift.findMany();
    console.log(JSON.stringify(shifts, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
