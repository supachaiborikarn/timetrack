import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Fixing admin username...");

        // Find the admin user (usually ADM001 or by role)
        const admin = await prisma.user.findFirst({
            where: {
                OR: [
                    { employeeId: 'ADM001' },
                    { role: 'ADMIN' }
                ]
            }
        });

        if (!admin) {
            console.error("❌ Admin user not found!");
            return;
        }

        console.log(`Found admin: ${admin.name} (${admin.employeeId})`);

        // Update username to 'admin'
        const updated = await prisma.user.update({
            where: { id: admin.id },
            data: {
                username: 'admin'
            }
        });

        console.log(`✅ Updated username to: '${updated.username}'`);
        console.log("You can now login with username: 'admin' and password: '123456'");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
