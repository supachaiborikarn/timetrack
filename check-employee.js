const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find employee 'เมย์' or by ID EMPABC9E (from screenshot)
    const user = await prisma.user.findFirst({
        where: { OR: [{ name: { contains: 'เมย์' } }, { employeeId: 'EMPABC9E' }] },
        include: { station: true }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User:', user.name, user.employeeId);

    // Get today's attendance (use Bangkok date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const att = await prisma.attendance.findFirst({
        where: { userId: user.id, date: { gte: today } }
    });

    console.log('Attendance:', JSON.stringify(att, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
