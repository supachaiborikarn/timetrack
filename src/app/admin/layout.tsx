"use client";

import { useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

// Roles that always have admin access
const ADMIN_ROLES = ["ADMIN", "HR", "MANAGER", "CASHIER"];

// Permissions that grant access to specific admin pages
const PERMISSION_PAGE_MAP: Record<string, string[]> = {
    "/admin/shifts": ["shift.view", "shift.edit"],
    "/admin/attendance": ["attendance.view"],
    "/admin/approvals": ["request.approve", "attendance.approve"],
};

export default function AdminLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState(0);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);

    useEffect(() => {
        // Fetch pending approvals count and user permissions
        const fetchData = async (light = false) => {
            try {
                const dashboardUrl = light ? "/api/admin/dashboard?light=true" : "/api/admin/dashboard";
                const [dashboardRes, permRes] = await Promise.all([
                    fetch(dashboardUrl),
                    light ? Promise.resolve(null) : fetch("/api/user/permissions"),
                ]);

                if (dashboardRes.ok) {
                    const data = await dashboardRes.json();
                    setPendingCount(data.stats?.pendingApprovals || 0);
                }

                if (permRes && permRes.ok) {
                    const permData = await permRes.json();
                    setUserPermissions(permData.permissions || []);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setPermissionsLoaded(true);
            }
        };

        if (session?.user?.id) {
            fetchData(false); // Full fetch on initial load
            // Refresh every 5 minutes with light mode (counts only)
            const interval = setInterval(() => fetchData(true), 300000);
            return () => clearInterval(interval);
        } else {
            setPermissionsLoaded(true);
        }
    }, [session?.user?.id]);

    if (status === "loading" || !permissionsLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const userRole = session?.user?.role || "EMPLOYEE";

    // Check if user has access
    const hasAdminRole = ADMIN_ROLES.includes(userRole);

    // For EMPLOYEE role, check if they have permissions for the current page
    let hasPermissionAccess = false;
    if (!hasAdminRole && userRole === "EMPLOYEE") {
        // Check if current path matches any permission-gated pages
        for (const [pagePath, requiredPerms] of Object.entries(PERMISSION_PAGE_MAP)) {
            if (pathname.startsWith(pagePath)) {
                hasPermissionAccess = requiredPerms.some(perm => userPermissions.includes(perm));
                break;
            }
        }
        // Also allow access to main /admin page if they have any admin permissions
        if (pathname === "/admin" && userPermissions.length > 0) {
            hasPermissionAccess = true;
        }
    }

    if (!session || !session.user || (!hasAdminRole && !hasPermissionAccess)) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminSidebar pendingCount={pendingCount} userPermissions={userPermissions} />

            {/* Main Content */}
            <main
                className={cn(
                    "min-h-screen transition-all duration-200",
                    "pt-14 lg:pt-0", // Mobile: offset for fixed header
                    "lg:ml-64" // Desktop: offset for sidebar (default expanded)
                )}
            >
                <div className="p-4 lg:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}

