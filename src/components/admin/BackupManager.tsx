"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Database, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export function BackupManager() {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch("/api/admin/backup");
            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `timetrack-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("ดาวน์โหลดข้อมูล Backup เรียบร้อยแล้ว");
        } catch (error) {
            console.error(error);
            toast.error("ไม่สามารถดาวน์โหลดข้อมูลได้");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card className="border-indigo-100 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-indigo-50/50">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-lg text-slate-800">Data Backup</CardTitle>
                </div>
                <CardDescription>
                    ดาวน์โหลดข้อมูลทั้งหมดในระบบเก็บไว้เป็น JSON ไฟล์
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="space-y-1">
                        <p className="font-medium text-slate-700">Manual Full Backup</p>
                        <p className="text-sm text-slate-500">
                            รวมข้อมูล Users, Shifts, LeaveRequests, และ AuditLogs
                        </p>
                    </div>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isExporting ? (
                            "Preparing..."
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Download JSON
                            </>
                        )}
                    </Button>
                </div>

                <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">คำแนะนำ:</p>
                        <p className="opacity-90 mt-1">
                            ฟีเจอร์นี้เป็นการ Export ข้อมูลแบบ Manual เท่านั้น เพื่อความปลอดภัยสูงสุด ควรเปิดใช้งาน Point-in-Time Recovery (PITR) ที่ผู้ให้บริการ Database (Supabase/Neon) ของคุณด้วย
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
