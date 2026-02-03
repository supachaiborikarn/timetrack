import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                name: true,
                employeeId: true,
                password: true,
                role: true
            },
            orderBy: { name: 'asc' }
        });

        console.log("=== CHECKING PASSWORDS ===\n");

        const defaultPassword = '1234';
        const notDefault: string[] = [];
        const hasDefault: string[] = [];

        for (const user of users) {
            const isDefault = await bcrypt.compare(defaultPassword, user.password);
            if (isDefault) {
                hasDefault.push(user.name);
            } else {
                notDefault.push(`${user.name} (${user.employeeId}) - ${user.role}`);
            }
        }

        console.log(`Users with password "1234": ${hasDefault.length}`);
        console.log(`Users with OTHER password: ${notDefault.length}\n`);

        if (notDefault.length > 0) {
            console.log("=== Users with NON-DEFAULT password ===");
            notDefault.forEach(u => console.log(`  - ${u}`));
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
