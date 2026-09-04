"use client";

import { useSession } from "next-auth/react";
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
        <div className="space-y-6 max-w-6xl mx-auto font-sans pb-12">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.06)] text-zinc-950 dark:text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">SECURITY & RELIABILITY CENTER</p>
                            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">ความปลอดภัย & ประวัติกิจกรรมระบบ</h1>
                            <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5">
                                ตรวจสอบประวัติการใช้งาน (Audit Logs) และบริหารจัดการสำรองฐานข้อมูล
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="audit" className="w-full space-y-4">
                <div className="overflow-x-auto pb-1">
                    <TabsList className="tt-retro-control inline-flex min-w-max p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-700/20 dark:border-white/15 h-auto">
                        <TabsTrigger value="audit" className="gap-2 rounded-lg px-4 py-1.5 text-xs font-bold data-[state=active]:bg-[#fbbf24] data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm transition-all">
                            <History className="w-4 h-4" /> Audit Logs
                        </TabsTrigger>
                        <TabsTrigger value="backup" className="gap-2 rounded-lg px-4 py-1.5 text-xs font-bold data-[state=active]:bg-[#fbbf24] data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm transition-all">
                            <Database className="w-4 h-4" /> Data Backup
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="audit" className="mt-4">
                    <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-6 shadow-[0_2px_0_rgba(0,0,0,0.05)] bg-card">
                        <div className="mb-6">
                            <h2 className="text-lg font-black text-foreground">System Audit Logs</h2>
                            <p className="text-xs text-muted-foreground">รายการกิจกรรมทั้งหมดที่เกิดขึ้นในระบบ</p>
                        </div>
                        <AuditLogViewer />
                    </div>
                </TabsContent>

                <TabsContent value="backup" className="mt-4">
                    <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-6 shadow-[0_2px_0_rgba(0,0,0,0.05)] bg-card">
                        <div className="mb-6">
                            <h2 className="text-lg font-black text-foreground">Database Backup & Recovery</h2>
                            <p className="text-xs text-muted-foreground">ดาวน์โหลดหรือสำรองข้อมูลฉุกเฉิน</p>
                        </div>
                        <BackupManager />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
