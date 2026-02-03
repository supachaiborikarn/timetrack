
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for users...');
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            username: true,
            phone: true,
            role: true,
            pin: true, // We can't read the hash back to plaintext, but we can verify it exists
        }
    });

    console.log('Found users:', users.length);
    users.forEach(u => {
        console.log(`- Name: "${u.name}", Username: "${u.username}", Phone: "${u.phone}", Role: ${u.role}`);
    });

    // Try to find "กราฟ"
    const keyword = "กราฟ";
    const targetUser = users.find(u =>
        u.name === keyword ||
        u.username === keyword ||
        u.phone === keyword
    );

    if (targetUser) {
        console.log(`\nFound target user: ${targetUser.name}`);

        // Hash 123456
        const hashedPin = await bcrypt.hash("123456", 10);

        // Update PIN
        await prisma.user.update({
            where: { id: targetUser.id },
            data: { pin: hashedPin }
        });
        console.log(`Updated PIN for ${targetUser.name} to "123456"`);

        // Test comparison
        const match = await bcrypt.compare("123456", hashedPin);
        console.log(`Self-verification of PIN "123456": ${match ? 'MATCH' : 'FAIL'}`);

    } else {
        console.log(`\nUser matching "${keyword}" not found.`);
        // Search for partial match
        const partial = users.find(u => u.name.includes(keyword));
        if (partial) {
            console.log(`Did you mean: "${partial.name}"?`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
