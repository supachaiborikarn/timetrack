/**
 * Seed default permissions and role-permission mappings
 */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Default permissions
const defaultPermissions = [
    // ตารางกะ
    { code: "shift.view", name: "ดูตารางกะ", group: "ตารางกะ", sortOrder: 1 },
    { code: "shift.edit", name: "แก้ไขกะพนักงาน", group: "ตารางกะ", sortOrder: 2 },
    { code: "shift.generate", name: "สร้างกะอัตโนมัติ", group: "ตารางกะ", sortOrder: 3 },
    { code: "shift_type.manage", name: "จัดการประเภทกะ", group: "ตารางกะ", sortOrder: 4 },

    // พนักงาน
    { code: "employee.view", name: "ดูรายชื่อพนักงาน", group: "พนักงาน", sortOrder: 10 },
    { code: "employee.edit", name: "แก้ไขข้อมูลพนักงาน", group: "พนักงาน", sortOrder: 11 },
    { code: "employee.delete", name: "ลบพนักงาน", group: "พนักงาน", sortOrder: 12 },

    // ลงเวลา
    { code: "attendance.view", name: "ดูการลงเวลา", group: "ลงเวลา", sortOrder: 20 },
    { code: "attendance.approve", name: "อนุมัติการลงเวลา", group: "ลงเวลา", sortOrder: 21 },

    // คำขอ
    { code: "request.view", name: "ดูคำขอ", group: "คำขอ", sortOrder: 30 },
    { code: "request.approve", name: "อนุมัติคำขอ", group: "คำขอ", sortOrder: 31 },

    // รายงาน
    { code: "report.view", name: "ดูรายงาน", group: "รายงาน", sortOrder: 40 },
    { code: "report.export", name: "export รายงาน", group: "รายงาน", sortOrder: 41 },

    // สถานี
    { code: "station.view", name: "ดูสถานี", group: "สถานี", sortOrder: 50 },
    { code: "station.edit", name: "แก้ไขสถานี", group: "สถานี", sortOrder: 51 },

    // ตั้งค่า
    { code: "settings.manage", name: "จัดการตั้งค่าระบบ", group: "ตั้งค่า", sortOrder: 60 },

    // สิทธิ์
    { code: "permission.manage", name: "จัดการสิทธิ์ role", group: "สิทธิ์", sortOrder: 70 },
];

// Default role permissions
const defaultRolePermissions: { role: Role; permissions: string[] }[] = [
    {
        role: "ADMIN",
        permissions: [
            "shift.view", "shift.edit", "shift.generate", "shift_type.manage",
            "employee.view", "employee.edit", "employee.delete",
            "attendance.view", "attendance.approve",
            "request.view", "request.approve",
            "report.view", "report.export",
            "station.view", "station.edit",
            "settings.manage",
            "permission.manage",
        ],
    },
    {
        role: "HR",
        permissions: [
            "shift.view", "shift.edit", "shift.generate", "shift_type.manage",
            "employee.view", "employee.edit", "employee.delete",
            "attendance.view", "attendance.approve",
            "request.view", "request.approve",
            "report.view", "report.export",
            "station.view", "station.edit",
        ],
    },
    {
        role: "MANAGER",
        permissions: [
            "shift.view", "shift.edit",
            "employee.view",
            "attendance.view", "attendance.approve",
            "request.view", "request.approve",
            "report.view",
            "station.view",
        ],
    },
    {
        role: "CASHIER",
        permissions: [
            "shift.view", "shift.edit",
            "employee.view",
            "attendance.view", "attendance.approve",
            "request.view", "request.approve",
        ],
    },
    {
        role: "EMPLOYEE",
        permissions: [],
    },
];

async function main() {
    console.log("🔐 Seeding permissions...\n");

    // Create permissions
    for (const perm of defaultPermissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: { name: perm.name, group: perm.group, sortOrder: perm.sortOrder },
            create: perm,
        });
        console.log(`✅ Permission: ${perm.code}`);
    }

    console.log(`\n📋 Created ${defaultPermissions.length} permissions\n`);

    // Get all permissions
    const allPermissions = await prisma.permission.findMany();
    const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

    // Create role permissions
    for (const rolePerms of defaultRolePermissions) {
        // Delete existing role permissions
        await prisma.rolePermission.deleteMany({
            where: { role: rolePerms.role },
        });

        // Create new role permissions
        for (const permCode of rolePerms.permissions) {
            const permId = permissionMap.get(permCode);
            if (permId) {
                await prisma.rolePermission.create({
                    data: {
                        role: rolePerms.role,
                        permissionId: permId,
                    },
                });
            }
        }
        console.log(`✅ Role: ${rolePerms.role} -> ${rolePerms.permissions.length} permissions`);
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
