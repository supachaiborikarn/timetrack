/**
 * Additive seed for the "เสียงลูกค้า" (customer feedback) permissions.
 *
 * Additive for the same reason as the other seed-*-permissions scripts: the live
 * DB's role permissions may have been customized through /admin/permissions, so a
 * full reseed would silently revert them. Safe to re-run.
 */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const customerFeedbackPermissions = [
    { code: "customer_feedback.view_dashboard", name: "ดู Dashboard เสียงลูกค้า", group: "เสียงลูกค้า", sortOrder: 102 },
    { code: "customer_feedback.view_response", name: "ดูคำตอบและข้อความดิบของลูกค้า", group: "เสียงลูกค้า", sortOrder: 103 },
    { code: "customer_feedback.view_incident", name: "ดูรายละเอียดเหตุเร่งด่วน", group: "เสียงลูกค้า", sortOrder: 104 },
    { code: "customer_feedback.self_view", name: "ดูผลสรุปความคิดเห็นลูกค้าของตนเอง", group: "เสียงลูกค้า", sortOrder: 105 },
    { code: "customer_feedback.review_request", name: "ส่งและดูคำขอทบทวนของตนเอง", group: "เสียงลูกค้า", sortOrder: 106 },
    { code: "customer_feedback.review_request_manage", name: "ดูและปิดคำขอทบทวน", group: "เสียงลูกค้า", sortOrder: 107 },
    { code: "customer_feedback.manage", name: "สร้าง ปิด หมุน และพิมพ์ QR เสียงลูกค้า", group: "เสียงลูกค้า", sortOrder: 108 },
    { code: "customer_feedback.case_manage", name: "รับงาน มอบหมาย และปิดเคส", group: "เสียงลูกค้า", sortOrder: 109 },
    { code: "customer_feedback.export", name: "Export ข้อมูลเสียงลูกค้า", group: "เสียงลูกค้า", sortOrder: 110 },
    { code: "customer_feedback.view_contact", name: "เปิดดูข้อมูลติดต่อกลับ", group: "เสียงลูกค้า", sortOrder: 111 },
    { code: "customer_feedback.moderate", name: "ติดธง ซ่อน หรือคืนคำตอบ", group: "เสียงลูกค้า", sortOrder: 112 },
];

// MANAGER ถูกจำกัด stationId ฝั่ง API ทุก endpoint
const grants: { role: Role; codes: string[] }[] = [
    {
        role: "ADMIN",
        codes: customerFeedbackPermissions.map((p) => p.code),
    },
    {
        role: "HR",
        codes: customerFeedbackPermissions
            .filter((p) => p.code !== "customer_feedback.self_view" && p.code !== "customer_feedback.review_request")
            .map((p) => p.code),
    },
    {
        role: "MANAGER",
        codes: [
            "customer_feedback.view_dashboard",
            "customer_feedback.view_response",
            "customer_feedback.view_incident",
            "customer_feedback.case_manage",
        ],
    },
    {
        role: "EMPLOYEE",
        codes: ["customer_feedback.self_view", "customer_feedback.review_request"],
    },
];

async function main() {
    console.log("🔐 Seeding customer feedback permissions (additive)...\n");

    for (const perm of customerFeedbackPermissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: { name: perm.name, group: perm.group, sortOrder: perm.sortOrder },
            create: perm,
        });
        console.log(`✅ Permission: ${perm.code}`);
    }

    const allPermissions = await prisma.permission.findMany({
        where: { code: { in: customerFeedbackPermissions.map((p) => p.code) } },
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
