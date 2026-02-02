import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Cache permissions per role for performance
const rolePermissionCache = new Map<Role, Set<string>>();
let cacheExpiry = 0;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Get permissions for a role (cached)
 */
export async function getRolePermissions(role: Role): Promise<Set<string>> {
    const now = Date.now();

    // Check cache
    if (now < cacheExpiry && rolePermissionCache.has(role)) {
        return rolePermissionCache.get(role)!;
    }

    // Fetch from database
    const rolePerms = await prisma.rolePermission.findMany({
        where: { role },
        include: { permission: true },
    });

    const permissions = new Set<string>(rolePerms.map((rp: { permission: { code: string } }) => rp.permission.code));

    // Update cache
    rolePermissionCache.set(role, permissions);
    if (now >= cacheExpiry) {
        cacheExpiry = now + CACHE_TTL_MS;
    }

    return permissions;
}

/**
 * Clear permissions cache (call after updating permissions)
 */
export function clearPermissionCache() {
    rolePermissionCache.clear();
    cacheExpiry = 0;
}

/**
 * Check if a role has a specific permission
 */
export async function hasPermission(role: Role, permissionCode: string): Promise<boolean> {
    // ADMIN always has all permissions
    if (role === "ADMIN") {
        return true;
    }

    const permissions = await getRolePermissions(role);
    return permissions.has(permissionCode);
}

/**
 * Check permission and throw if not allowed
 */
export async function checkPermission(role: Role, permissionCode: string): Promise<void> {
    const allowed = await hasPermission(role, permissionCode);
    if (!allowed) {
        throw new Error(`Permission denied: ${permissionCode}`);
    }
}

/**
 * Get all permissions for a user by session
 */
export async function getUserPermissions(userRole: Role): Promise<string[]> {
    const permissions = await getRolePermissions(userRole);
    return Array.from(permissions);
}

/**
 * Check multiple permissions (returns true if ALL are allowed)
 */
export async function hasAllPermissions(role: Role, permissionCodes: string[]): Promise<boolean> {
    if (role === "ADMIN") return true;

    const permissions = await getRolePermissions(role);
    return permissionCodes.every((code) => permissions.has(code));
}

/**
 * Check multiple permissions (returns true if ANY is allowed)
 */
export async function hasAnyPermission(role: Role, permissionCodes: string[]): Promise<boolean> {
    if (role === "ADMIN") return true;

    const permissions = await getRolePermissions(role);
    return permissionCodes.some((code) => permissions.has(code));
}
