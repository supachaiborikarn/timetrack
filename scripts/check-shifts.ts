
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const departments = await prisma.department.findMany({
        where: { name: { contains: 'กาแฟ' } },
        include: { station: true }
    });

    const shifts = await prisma.shift.findMany();

    console.log('--- Departments ---');
    departments.forEach((d: any) => console.log(`ID: ${d.id} | Name: ${d.name} | Station: ${d.station.name}`));

    console.log('\n--- Existing Shifts ---');
    shifts.forEach((s: any) => console.log(`ID: ${s.id} | Name: ${s.name} | Code: ${s.code} | Time: ${s.startTime}-${s.endTime}`));
}

main().finally(() => prisma.$disconnect());
