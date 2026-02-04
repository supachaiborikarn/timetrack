"use client";

import { useSession } from "next-auth/react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { BackupManager } from "@/components/admin/BackupManager";
import { ShieldCheck, History, Database } from "lucide-react";

export default function SecurityPage() {
    const { data: session } = useSession();

    if (!session?.user?.role || !["ADMIN", "HR"].includes(session.user.role)) {
        return <div className="text-center mt-20">Access Denied</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-24">
            <div className="p-4 border-b bg-white">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Security & Reliability</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-6xl mx-auto p-6 space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-indigo-600" />
                        Security & Reliability Center
                    </h1>
                    <p className="text-slate-500">
                        ตรวจสอบประวัติการใช้งานและสำรองข้อมูลระบบ
                    </p>
                </div>

                <Tabs defaultValue="audit" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="audit" className="gap-2">
                            <History className="w-4 h-4" /> Audit Logs
                        </TabsTrigger>
                        <TabsTrigger value="backup" className="gap-2">
                            <Database className="w-4 h-4" /> Data Backup
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="audit" className="mt-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-slate-800">System Audit Logs</h2>
                                <p className="text-sm text-slate-500">รายการกิจกรรมทั้งหมดที่เกิดขึ้นในระบบ</p>
                            </div>
                            <AuditLogViewer />
                        </div>
                    </TabsContent>

                    <TabsContent value="backup" className="mt-6 space-y-6">
                        <BackupManager />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
