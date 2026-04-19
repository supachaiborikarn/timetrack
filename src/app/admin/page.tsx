"use client";

// This page renders inside app/admin/layout.tsx which provides the AdminSidebar.
// It is the desktop-first admin dashboard.

import { AdminDashboardView } from "@/components/dashboard/views/AdminDashboardView";

export default function AdminPage() {
    return <AdminDashboardView />;
}
