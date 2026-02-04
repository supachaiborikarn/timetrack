import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                employeeId: true,
                name: true,
                password: true,
                pin: true,
                role: true,
                phone: true
            },
            take: 10 // Check first 10 to check patterns
        });

        console.log(`Checking credentials for ${users.length} users...`);

        const passwords = ['1234', '123456', 'admin', 'password'];
        const pins = ['123456', '000000', '111111'];

        for (const user of users) {
            console.log(`\nUser: ${user.name} (${user.role})`);

            // Check Password
            if (user.password) {
                let foundPass = false;
                for (const p of passwords) {
                    if (await bcrypt.compare(p, user.password)) {
                        console.log(`  ✅ Password matches: "${p}"`);
                        foundPass = true;
                        break;
                    }
                }
                if (!foundPass) console.log(`  ❌ Password does NOT match common defaults (${passwords.join(', ')})`);
            } else {
                console.log(`  ⚠️ No password set`);
            }

            // Check PIN
            if (user.pin) {
                let foundPin = false;
                for (const p of pins) {
                    if (await bcrypt.compare(p, user.pin)) {
                        console.log(`  ✅ PIN matches: "${p}"`);
                        foundPin = true;
                        break;
                    }
                }
                if (!foundPin) console.log(`  ❌ PIN does NOT match common defaults (${pins.join(', ')})`);
            } else {
                console.log(`  ⚠️ No PIN set`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
