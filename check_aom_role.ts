import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Finding Aom ---');
    const aoms = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'Aom', mode: 'insensitive' } },
                { name: { contains: 'อ้อม', mode: 'insensitive' } },
                { nickName: { contains: 'Aom', mode: 'insensitive' } },
                { nickName: { contains: 'อ้อม', mode: 'insensitive' } }
            ]
        },
        select: { id: true, name: true, nickName: true, role: true, employeeId: true }
    });
    console.log('Users found:', JSON.stringify(aoms, null, 2));

    console.log('--- Listing CASHIERs ---');
    try {
        // @ts-ignore
        const cashiers = await prisma.user.findMany({
            where: { role: 'CASHIER' },
            select: { name: true, nickName: true }
        });
        console.log('Cashiers:', JSON.stringify(cashiers, null, 2));
    } catch (e) {
        console.log("Error querying CASHIER role, trying another way...");
        // Maybe role is not CASHIER?
        const roles = await prisma.user.groupBy({
            by: ['role'],
            _count: true
        });
        console.log("Roles distribution:", roles);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
