// Read-only production verification. Does not print employee data or credentials.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('Read-only verification host:', new URL(process.env.DATABASE_URL).hostname);
async function main() {
    const [outlets, registrations, owners, permissions, columns, indexes] = await Promise.all([
        prisma.kebdaoOutlet.count(), prisma.kebdaoRegistration.count(), prisma.kebdaoCodeOwner.count(),
        prisma.permission.findMany({ where: { code: { startsWith: 'kebdao.' } }, select: { code: true, rolePermissions: { select: { role: true } } }, orderBy: { code: 'asc' } }),
        prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'StoredAsset' AND column_name = 'kebdaoRegistrationId'`,
        prisma.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'KebdaoRegistration' AND indexname IN ('KebdaoRegistration_pendingUserId_key', 'KebdaoRegistration_pendingCsrId_key', 'KebdaoRegistration_activeUserId_key')`,
    ]);
    console.log(JSON.stringify({ outlets, registrations, owners, permissions, columns, indexes }, null, 2));
    const expected = { 'kebdao.register': ['EMPLOYEE', 'CASHIER', 'MANAGER', 'HR'], 'kebdao.review': ['CASHIER', 'MANAGER', 'HR'] };
    for (const [code, roles] of Object.entries(expected)) {
        const actual = permissions.find(p => p.code === code)?.rolePermissions.map(p => p.role) || [];
        if (roles.some(role => !actual.includes(role))) throw new Error('Missing grant: ' + code);
    }
    if (columns.length !== 1 || indexes.length !== 3) throw new Error('Schema verification failed');
    console.log('Kebdao schema and permission verification passed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
