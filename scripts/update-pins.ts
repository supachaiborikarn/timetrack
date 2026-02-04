
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log("Starting PIN update...");

    const users = await prisma.user.findMany({
        where: {
            isActive: true,
        },
        select: {
            id: true,
            name: true,
            employeeId: true,
            pin: true
        }
    });

    console.log(`Checking ${users.length} active users...`);

    const newPinHash = await bcrypt.hash('123456', 10);
    const updatedUsers = [];
    const failedUsers = [];

    for (const user of users) {
        let isMatch = false;

        // Check if PIN matches '1234'
        if (user.pin === '1234') {
            isMatch = true;
        } else if (user.pin.startsWith('$2')) {
            // It's a hash, compare it
            isMatch = await bcrypt.compare('1234', user.pin);
        }

        if (isMatch) {
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { pin: newPinHash }
                });
                updatedUsers.push(`${user.name} (${user.employeeId})`);
                process.stdout.write('.');
            } catch (err) {
                console.error(`\nFailed to update ${user.name}:`, err);
                failedUsers.push(user.name);
            }
        }
    }

    console.log("\n\n=== UPDATE COMPLETE ===");
    console.log(`Updated ${updatedUsers.length} users:`);
    updatedUsers.forEach(u => console.log(`- ${u}`));

    if (failedUsers.length > 0) {
        console.log(`\nFailed to update: ${failedUsers.join(', ')}`);
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
