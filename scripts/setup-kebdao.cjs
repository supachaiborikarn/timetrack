// Prints the exact setup plan without connecting unless --apply is provided.
require('dotenv').config();
const plan = [
    ['kebdao.register', 'ลงทะเบียนรหัส Kebdao', ['EMPLOYEE', 'CASHIER', 'MANAGER', 'HR']],
    ['kebdao.review', 'ตรวจสอบรหัส Kebdao', ['CASHIER', 'MANAGER', 'HR']],
];
console.log('Host:', process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : '(not configured)');
console.log('Add Kebdao register/review permissions. Station IDs are derived from the canonical VGCloud site-code mapping in application code.');
console.table(plan.map(([code, name, roles]) => ({ code, name, roles: roles.join(', ') })));
if (!process.argv.includes('--apply')) {
    console.log('Preview only. Use --apply only after production host confirmation.');
} else {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.$transaction(async tx => {
        for (const [code, name, roles] of plan) {
            const permission = await tx.permission.upsert({ where: { code }, create: { code, name, group: 'Kebdao' }, update: {} });
            for (const role of roles) await tx.rolePermission.upsert({ where: { role_permissionId: { role, permissionId: permission.id } }, create: { role, permissionId: permission.id }, update: {} });
        }
    }).then(() => console.log('Kebdao permissions ready.')).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
