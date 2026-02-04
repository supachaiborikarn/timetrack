
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log("Starting PIN Audit...");

    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, employeeId: true, pin: true }
    });

    console.log(`Auditing ${users.length} active users...`);

    let count1234 = 0;
    let count123456 = 0;
    let countOther = 0;
    const users1234 = [];

    // The known hash for '123456' found in DB
    const hash123456 = '$2b$10$tojiG3vQX3UXLAuqoz2Roe3/kA8XVrCZp8qnwOO6BnjjZSUwcl2uK';

    for (const user of users) {
        let is1234 = false;
        let is123456 = false;

        // Optimized check: if hash matches known hash, it's 123456
        if (user.pin === hash123456) {
            is123456 = true;
        } else {
            // Fallback to compare
            if (await bcrypt.compare('123456', user.pin)) {
                is123456 = true;
            } else if (await bcrypt.compare('1234', user.pin)) {
                is1234 = true;
            }
        }

        if (is123456) {
            count123456++;
        } else if (is1234) {
            count1234++;
            users1234.push(`${user.name} (${user.employeeId})`);
        } else {
            countOther++;
            // console.log(`Other PIN: ${user.name} (${user.employeeId})`);
        }
    }

    console.log("\n=== AUDIT RESULTS ===");
    console.log(`Total Active Users: ${users.length}`);
    console.log(`PIN '123456': ${count123456}`);
    console.log(`PIN '1234': ${count1234}`);
    console.log(`Other: ${countOther}`);

    if (users1234.length > 0) {
        console.log("\nUsers with PIN '1234':");
        users1234.forEach(u => console.log(`- ${u}`));
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
