/**
 * Additive seed for the "รับสมัครงาน" (Job Application) permission group.
 *
 * Unlike seed-permissions.ts, this script never deletes existing RolePermission
 * rows — the live DB's role permissions have drifted from the hardcoded defaults
 * in seed-permissions.ts (customized via /admin/permissions), so a full reseed
 * would silently revert those customizations. This script only upserts the new
 * Permission rows and adds the new application.* grants; it is safe to re-run.
 */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const applicationPermissions = [
    { code: "application.view", name: "ดูใบสมัครงาน", group: "รับสมัครงาน", sortOrder: 80 },
    { code: "application.review", name: "คัดกรอง/เปลี่ยนสถานะใบสมัคร", group: "รับสมัครงาน", sortOrder: 81 },
    { code: "application.view_sensitive", name: "ดูเลขบัตร ปชช./สำเนาเอกสาร", group: "รับสมัครงาน", sortOrder: 82 },
    { code: "application.hire", name: "จ้างผู้สมัครเป็นพนักงาน", group: "รับสมัครงาน", sortOrder: 83 },
    { code: "application.delete", name: "ลบใบสมัครถาวร", group: "รับสมัครงาน", sortOrder: 84 },
];

const grants: { role: Role; codes: string[] }[] = [
    { role: "ADMIN", codes: ["application.view", "application.review", "application.view_sensitive", "application.hire", "application.delete"] },
    { role: "HR", codes: ["application.view", "application.review", "application.view_sensitive", "application.hire"] },
    { role: "MANAGER", codes: ["application.view", "application.review"] },
];

async function main() {
    console.log("🔐 Seeding application permissions (additive)...\n");

    for (const perm of applicationPermissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: { name: perm.name, group: perm.group, sortOrder: perm.sortOrder },
            create: perm,
        });
        console.log(`✅ Permission: ${perm.code}`);
    }

    const allPermissions = await prisma.permission.findMany({
        where: { code: { in: applicationPermissions.map((p) => p.code) } },
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
