const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const perms = await prisma.permission.findMany();
    console.log('=== All Permissions ===');
    console.log(JSON.stringify(perms, null, 2));

    const rolePerms = await prisma.rolePermission.findMany({
        include: { permission: true }
    });
    console.log('\n=== Role Permissions ===');
    console.log(JSON.stringify(rolePerms, null, 2));

    await prisma.$disconnect();
}

main().catch(console.error);
