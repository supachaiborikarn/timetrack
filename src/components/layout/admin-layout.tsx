"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const { data: session, status } = useSession();
    const [pendingCount, setPendingCount] = useState(0);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        // Fetch pending approvals count
        const fetchPendingCount = async () => {
            try {
                const res = await fetch("/api/admin/dashboard");
                if (res.ok) {
                    const data = await res.json();
                    setPendingCount(data.stats?.pendingApprovals || 0);
                }
            } catch (error) {
                console.error("Failed to fetch pending count:", error);
            }
        };

        if (session?.user?.id) {
            fetchPendingCount();
            // Refresh every 60 seconds
            const interval = setInterval(fetchPendingCount, 60000);
            return () => clearInterval(interval);
        }
    }, [session?.user?.id]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminSidebar pendingCount={pendingCount} />

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
