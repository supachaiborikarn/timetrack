"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { isAdminRole } from "@/lib/admin-access";
import { freeTierIntervals } from "@/lib/free-tier";

export default function AdminLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const [pendingCount, setPendingCount] = useState(0);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);

    useEffect(() => {
        if (!session?.user?.id) {
            return;
        }

        let isActive = true;

        const fetchPendingCount = async () => {
            try {
                const dashboardRes = await fetch("/api/admin/dashboard?light=true");
                if (dashboardRes.ok) {
                    const data = await dashboardRes.json();
                    if (isActive) {
                        setPendingCount(data.stats?.pendingApprovals || 0);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch pending approvals:", error);
            }
        };

        const fetchPermissions = async () => {
            try {
                const permRes = await fetch("/api/user/permissions");
                if (permRes.ok) {
                    const permData = await permRes.json();
                    if (isActive) {
                        setUserPermissions(permData.permissions || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch permissions:", error);
            }
        };

        // Sidebar metadata should load in the background so admin pages never block on it.
        void fetchPendingCount();
        void fetchPermissions();

        const refreshPendingCountIfVisible = () => {
            if (document.visibilityState === "visible") {
                void fetchPendingCount();
            }
        };

        const interval = setInterval(
            refreshPendingCountIfVisible,
            freeTierIntervals.adminPendingPoll,
        );

        document.addEventListener("visibilitychange", refreshPendingCountIfVisible);

        return () => {
            isActive = false;
            clearInterval(interval);
            document.removeEventListener("visibilitychange", refreshPendingCountIfVisible);
        };
    }, [session?.user?.id]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const userRole = session?.user?.role || "EMPLOYEE";

    if (!session || !session.user || !isAdminRole(userRole)) {
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
