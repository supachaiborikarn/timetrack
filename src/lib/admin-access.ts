const ADMIN_ROLES = ["ADMIN", "HR", "MANAGER", "CASHIER"] as const;

export type AdminRole = typeof ADMIN_ROLES[number];

export interface AdminAccessItem {
    href: string;
    roles?: string[];
    requiredPermissions?: string[];
}

export function isAdminRole(role: string): role is AdminRole {
    return ADMIN_ROLES.includes(role as AdminRole);
}

export function canAccessAdminNavItem(
    item: AdminAccessItem,
    userRole: string,
    userPermissions: string[],
) {
    if (!isAdminRole(userRole)) {
        return false;
    }

    if (!item.roles && !item.requiredPermissions) {
        return true;
    }

    if (item.roles?.includes(userRole)) {
        return true;
    }

    if (item.requiredPermissions?.some((permission) => userPermissions.includes(permission))) {
        return true;
    }

    return false;
}
