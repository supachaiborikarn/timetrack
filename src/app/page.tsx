"use client";

import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { EmployeeDashboardView } from "@/components/dashboard/views/EmployeeDashboardView";
import { AdminHomeView } from "@/components/dashboard/views/AdminHomeView";

export default function Home() {
    const { data: session, status } = useSession();

    const isAdminOrManager = ["ADMIN", "HR", "MANAGER"].includes(session?.user?.role || "");

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (status === "authenticated" && isAdminOrManager) {
        return <AdminHomeView />;
    }

    return <EmployeeDashboardView />;
}
