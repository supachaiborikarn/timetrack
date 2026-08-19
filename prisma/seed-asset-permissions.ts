/**
 * Additive seed for the "เอกสารพนักงาน" (employee document vault) permissions.
 *
 * Additive for the same reason as seed-application-permissions.ts: the live DB's
 * role permissions have been customized through /admin/permissions and drifted
 * from the defaults in seed-permissions.ts, so a full reseed would silently
 * revert those. This script only upserts the new Permission rows and adds the new
 * grants; it is safe to re-run.
 */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const documentPermissions = [
    { code: "employee_document.view", name: "ดูเอกสารพนักงาน", group: "เอกสารพนักงาน", sortOrder: 90 },
    { code: "employee_document.manage", name: "อัปโหลด/ลบเอกสารพนักงาน", group: "เอกสารพนักงาน", sortOrder: 91 },
    { code: "employee_document.view_sensitive", name: "ดูเอกสารอ่อนไหว (บัตร ปชช./พาสปอร์ต/บัญชีธนาคาร)", group: "เอกสารพนักงาน", sortOrder: 92 },
];

// MANAGER gets the non-sensitive view only, and the API scopes them to their own
// station — the same split the job-application permissions already use.
const grants: { role: Role; codes: string[] }[] = [
    { role: "ADMIN", codes: ["employee_document.view", "employee_document.manage", "employee_document.view_sensitive"] },
    { role: "HR", codes: ["employee_document.view", "employee_document.manage", "employee_document.view_sensitive"] },
    { role: "MANAGER", codes: ["employee_document.view"] },
];

async function main() {
    console.log("🔐 Seeding employee document permissions (additive)...\n");

    for (const perm of documentPermissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: { name: perm.name, group: perm.group, sortOrder: perm.sortOrder },
            create: perm,
        });
        console.log(`✅ Permission: ${perm.code}`);
    }

    const allPermissions = await prisma.permission.findMany({
        where: { code: { in: documentPermissions.map((p) => p.code) } },
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
