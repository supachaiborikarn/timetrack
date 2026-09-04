"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    FileSpreadsheet,
    FileText,
    Loader2,
    TrendingUp,
    Clock,
    Users,
    AlertTriangle,
    Timer,
    DollarSign,
} from "lucide-react";
import { format, getBangkokNow, subDays, startOfMonth, endOfMonth } from "@/lib/date-utils";
import { formatWorkDays } from "@/lib/payroll-day";

interface Station {
    id: string;
    name: string;
}

interface ReportData {
    employees: Array<{
        id: string;
        name: string;
        employeeId: string;
        station: string;
        department: string;
        workDays: number;
        totalHours: number;
        overtimeHours: number;
        lateDays: number;
        latePenalty: number;
    }>;
    summary: {
        totalEmployees: number;
        totalWorkDays: number;
        totalHours: number;
        totalOT: number;
        totalLateDays: number;
        totalLatePenalty: number;
    };
}

export default function ReportsPage() {
    const { data: session, status } = useSession();
    const [stations, setStations] = useState<Station[]>([]);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState("all");

    useEffect(() => {
        fetchStations();
    }, []);

    const fetchStations = async () => {
        try {
            const res = await fetch("/api/admin/stations");
            if (res.ok) {
                const data = await res.json();
                setStations(data.stations || []);
            }
        } catch (error) {
            console.error("Failed to fetch stations:", error);
        }
    };

    const generateReport = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                ...(stationId !== "all" && { stationId }),
            });

            const res = await fetch(`/api/admin/reports?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data);
            }
        } catch (error) {
            console.error("Failed to generate report:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams({
            startDate,
            endDate,
            ...(stationId !== "all" && { stationId }),
            format: "xlsx",
        });
        window.open(`/api/admin/reports/export?${params}`, "_blank");
    };

    const handleExportPDF = () => {
        const params = new URLSearchParams({
            startDate,
            endDate,
            ...(stationId !== "all" && { stationId }),
            format: "pdf",
        });
        window.open(`/api/admin/reports/export?${params}`, "_blank");
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
        redirect("/");
    }

    // Quick date presets
    const setThisMonth = () => {
        setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
    };

    const setLastMonth = () => {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        setStartDate(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
    };

    const setLast7Days = () => {
        setStartDate(format(subDays(now, 7), "yyyy-MM-dd"));
        setEndDate(format(now, "yyyy-MM-dd"));
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.06)] text-zinc-950 dark:text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">EXECUTIVE AUDIT & INTELLIGENCE</p>
                            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">รายงานสรุปเวลาทำงาน & ค่าแรง</h1>
                            <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5">สรุปชั่วโมงทำงาน, ทำงานล่วงเวลา (OT) และค่าปรับตามรอบบัญชี</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button
                            variant="secondary"
                            onClick={handleExportExcel}
                            disabled={!reportData}
                            className="tt-retro-control bg-zinc-900/5 hover:bg-zinc-900/10 text-zinc-900 border-zinc-700/20 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20 rounded-xl font-bold h-10 transition-all text-xs"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                            Excel
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleExportPDF}
                            disabled={!reportData}
                            className="tt-retro-control bg-zinc-900/5 hover:bg-zinc-900/10 text-zinc-900 border-zinc-700/20 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20 rounded-xl font-bold h-10 transition-all text-xs"
                        >
                            <FileText className="w-4 h-4 mr-1.5" />
                            PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">ช่วงเวลาด่วน</label>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="tt-retro-control text-xs font-bold rounded-xl h-9" onClick={setThisMonth}>
                                เดือนนี้
                            </Button>
                            <Button size="sm" variant="outline" className="tt-retro-control text-xs font-bold rounded-xl h-9" onClick={setLastMonth}>
                                เดือนก่อน
                            </Button>
                            <Button size="sm" variant="outline" className="tt-retro-control text-xs font-bold rounded-xl h-9" onClick={setLast7Days}>
                                7 วัน
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">เริ่มต้น</label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-36 h-9 rounded-xl font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-700/30"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">สิ้นสุด</label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-36 h-9 rounded-xl font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-700/30"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">สถานี</label>
                        <Select value={stationId} onValueChange={setStationId}>
                            <SelectTrigger className="w-44 h-9 rounded-xl font-bold bg-white dark:bg-zinc-900 border-zinc-700/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกสถานี</SelectItem>
                                {stations.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={generateReport}
                        disabled={isLoading}
                        className="tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/30 h-9 px-4 text-xs shadow-sm"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                        สร้างรายงาน
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            {reportData && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-400 grid place-items-center shrink-0 font-black">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">พนักงาน</p>
                                    <p className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">{reportData.summary.totalEmployees}</p>
                                </div>
                            </div>
                        </div>

                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 grid place-items-center shrink-0 font-black">
                                    <Clock className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">วันทำงาน</p>
                                    <p className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">{formatWorkDays(reportData.summary.totalWorkDays)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 grid place-items-center shrink-0 font-black">
                                    <Timer className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">ชม.รวม</p>
                                    <p className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">{reportData.summary.totalHours.toFixed(0)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-400 grid place-items-center shrink-0 font-black">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">OT รวม</p>
                                    <p className="text-2xl font-black font-mono text-purple-700 dark:text-purple-400">{reportData.summary.totalOT.toFixed(0)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 grid place-items-center shrink-0 font-black">
                                    <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">วันมาสาย</p>
                                    <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{reportData.summary.totalLateDays}</p>
                                </div>
                            </div>
                        </div>

                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400 grid place-items-center shrink-0 font-black">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">หักสายรวม</p>
                                    <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">฿{reportData.summary.totalLatePenalty.toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Employee Table */}
                    <Card className="overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg">รายละเอียดตามพนักงาน</CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รหัส</TableHead>
                                    <TableHead>ชื่อ</TableHead>
                                    <TableHead className="hidden md:table-cell">สถานี</TableHead>
                                    <TableHead className="hidden lg:table-cell">แผนก</TableHead>
                                    <TableHead className="text-center">วันทำงาน</TableHead>
                                    <TableHead className="text-center hidden sm:table-cell">ชม.รวม</TableHead>
                                    <TableHead className="text-center hidden sm:table-cell">OT</TableHead>
                                    <TableHead className="text-center">สาย</TableHead>
                                    <TableHead className="text-right">หักสาย</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.employees.map((emp) => (
                                    <TableRow key={emp.id}>
                                        <TableCell className="text-muted-foreground">{emp.employeeId}</TableCell>
                                        <TableCell className="font-medium">{emp.name}</TableCell>
                                        <TableCell className="text-muted-foreground hidden md:table-cell">{emp.station}</TableCell>
                                        <TableCell className="text-muted-foreground hidden lg:table-cell">{emp.department}</TableCell>
                                        <TableCell className="text-center">{formatWorkDays(emp.workDays)}</TableCell>
                                        <TableCell className="text-center text-blue-500 hidden sm:table-cell">{emp.totalHours.toFixed(1)}</TableCell>
                                        <TableCell className="text-center text-purple-500 hidden sm:table-cell">{emp.overtimeHours.toFixed(1)}</TableCell>
                                        <TableCell className="text-center text-orange-500">{emp.lateDays}</TableCell>
                                        <TableCell className="text-right text-red-500">฿{emp.latePenalty.toFixed(0)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}

            {!reportData && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">เลือกช่วงเวลาและกด &quot;สร้างรายงาน&quot;</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
