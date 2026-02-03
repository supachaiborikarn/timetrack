import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Checking User Data ===\n');

    // Check if any user has name "สมชาย" or "Somchai"
    const somchais = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'สมชาย' } },
                { name: { contains: 'Somchai' } }
            ]
        }
    });

    console.log(`Found ${somchais.length} users with "Somchai/สมชาย" in name:`);
    somchais.forEach(console.log);

    // Show first 5 users
    console.log('\n--- First 5 Users ---');
    const users = await prisma.user.findMany({ take: 5 });
    users.forEach(u => {
        console.log(`ID: ${u.id}, Name: ${u.name}, Nick: ${u.nickname}, Real: ${u.realName}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
