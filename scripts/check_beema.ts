import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Checking Specific User ===\n');

    // Check user with phone 0633863049
    const userByPhone = await prisma.user.findFirst({
        where: { phone: '0633863049' }
    });

    if (userByPhone) {
        console.log('Found by phone 0633863049:');
        console.log(userByPhone);
    } else {
        console.log('Not found by phone 0633863049');
    }

    // Check user "beema"
    const userByName = await prisma.user.findFirst({
        where: { name: 'beema' }
    });

    if (userByName) {
        console.log('\nFound by name "beema":');
        console.log(userByName);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
