/**
 * Additive seed for the "ที่พักคนงาน" permissions.
 *
 * Additive for the same reason as the other seed-*-permissions scripts: the live
 * DB's role permissions have been customized through /admin/permissions, so a full
 * reseed would silently revert them. Safe to re-run.
 */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const housingPermissions = [
    { code: "housing.view", name: "ดูข้อมูลที่พักคนงาน", group: "ที่พักคนงาน", sortOrder: 100 },
    { code: "housing.manage", name: "แก้ไขที่พัก/ค่าที่พัก", group: "ที่พักคนงาน", sortOrder: 101 },
];

// MANAGER can see and update their own branch's roster (the API scopes them), but
// the allowance rate and the payout run stay with ADMIN/HR — it is money.
const grants: { role: Role; codes: string[] }[] = [
    { role: "ADMIN", codes: ["housing.view", "housing.manage"] },
    { role: "HR", codes: ["housing.view", "housing.manage"] },
    { role: "MANAGER", codes: ["housing.view"] },
];

async function main() {
    console.log("🔐 Seeding housing permissions (additive)...\n");

    for (const perm of housingPermissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: { name: perm.name, group: perm.group, sortOrder: perm.sortOrder },
            create: perm,
        });
        console.log(`✅ Permission: ${perm.code}`);
    }

    const allPermissions = await prisma.permission.findMany({
        where: { code: { in: housingPermissions.map((p) => p.code) } },
    });
    const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

    for (const grant of grants) {
        const existing = await prisma.rolePermission.findMany({
            where: { role: grant.role, permission: { code: { in: grant.codes } } },
            include: { permission: true },
        });
        const existingCodes = new Set(existing.map((rp) => rp.permission.code));

        for (const code of grant.codes) {
            if (existingCodes.has(code)) continue;
            const permissionId = permissionMap.get(code);
            if (!permissionId) continue;
            await prisma.rolePermission.create({ data: { role: grant.role, permissionId } });
        }
        console.log(`✅ Role: ${grant.role} -> granted [${grant.codes.join(", ")}]`);
    }

    console.log("\n🎉 Done!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
