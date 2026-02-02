import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, clearPermissionCache } from "@/lib/permissions";
import { Role } from "@prisma/client";

// GET - Get all permissions grouped
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user can manage permissions
        const canManage = await hasPermission(session.user.role as Role, "permission.manage");

        const permissions = await prisma.permission.findMany({
            orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
        });

        // Get role permissions
        const rolePermissions = await prisma.rolePermission.findMany({
            include: { permission: true },
        });

        // Build role -> permissions map
        const rolePermsMap: Record<string, string[]> = {};
        for (const rp of rolePermissions) {
            if (!rolePermsMap[rp.role]) {
                rolePermsMap[rp.role] = [];
            }
            rolePermsMap[rp.role].push(rp.permission.code);
        }

        // Group permissions
        const groups: Record<string, typeof permissions> = {};
        for (const p of permissions) {
            if (!groups[p.group]) {
                groups[p.group] = [];
            }
            groups[p.group].push(p);
        }

        return NextResponse.json({
            permissions,
            groups,
            rolePermissions: rolePermsMap,
            roles: ["ADMIN", "HR", "MANAGER", "CASHIER", "EMPLOYEE"],
            canManage,
        });
    } catch (error) {
        console.error("Error fetching permissions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Update role permissions
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check permission
        const canManage = await hasPermission(session.user.role as Role, "permission.manage");
        if (!canManage) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const body = await request.json();
        const { role, permissions } = body as { role: Role; permissions: string[] };

        if (!role || !Array.isArray(permissions)) {
            return NextResponse.json({ error: "Missing role or permissions" }, { status: 400 });
        }

        // Cannot modify ADMIN permissions
        if (role === "ADMIN") {
            return NextResponse.json({ error: "Cannot modify ADMIN permissions" }, { status: 400 });
        }

        // Get permission IDs
        const permissionRecords = await prisma.permission.findMany({
            where: { code: { in: permissions } },
        });
        const permissionIds = permissionRecords.map((p) => p.id);

        // Delete existing role permissions
        await prisma.rolePermission.deleteMany({
            where: { role },
        });

        // Create new role permissions
        await prisma.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
                role,
                permissionId,
            })),
        });

        // Clear cache
        clearPermissionCache();

        return NextResponse.json({
            success: true,
            message: `อัปเดตสิทธิ์ ${role} สำเร็จ (${permissions.length} สิทธิ์)`,
        });
    } catch (error) {
        console.error("Error updating permissions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
