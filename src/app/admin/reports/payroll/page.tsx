"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
    Download,
    Loader2,
    PieChart,
    Building2,
} from "lucide-react";
import { format, getBangkokNow, startOfMonth, endOfMonth } from "@/lib/date-utils";

interface PayrollEmployee {
    id: string;
    name: string;
    employeeId: string;
    station: string;
    department: string;
    workDays: number;
    totalPay: number;
    regularPay: number;
    overtimePay: number;
    latePenalty: number;
    earlyLeavePenalty: number;
    advanceDeduction: number;
    otherExpenses: number;
    socialSecurity: number;
    totalDeductions: number;
}

interface PayrollSummary {
    totalEmployees: number;
    totalRegularPay: number;
    totalOvertimePay: number;
    totalLatePenalty: number;
    totalEarlyLeavePenalty: number;
    totalAdvanceDeduction: number;
    totalOtherExpenses: number;
    totalSocialSecurity: number;
    totalDeductions: number;
    grandTotal: number;
    ssoRate: number;
    ssoMax: number;
}

interface PayrollSummaryData {
    employees: PayrollEmployee[];
    summary: PayrollSummary;
}

export default function PayrollReportPage() {
    const { data: session, status } = useSession();
    const [reportData, setReportData] = useState<PayrollSummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [stations, setStations] = useState<{ id: string; name: string }[]>([]);

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
            const res = await fetch(`/api/admin/payroll?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data);
            }
        } catch (error) {
            console.error("Failed to fetch payroll report:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = (type: 'excel' | 'pdf') => {
        if (type === 'excel') {
            const params = new URLSearchParams({
                startDate,
                endDate,
                ...(stationId !== "all" && { stationId }),
            });
            window.open(`/api/admin/payroll/export?${params}`, "_blank");
        } else {
            alert("PDF Export for full report coming soon");
        }
    };

    const fmtMoney = (val: number) => {
        if (val === 0) return "-";
        return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    if (status === "loading") return <div className="p-8 text-center">Loading...</div>;
    if (!session || !["ADMIN", "HR"].includes(session.user.role)) redirect("/");

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 bg-zinc-950 text-white p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.2)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <PieChart className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbf24]">PAYROLL ANALYTICS</p>
                            <h1 className="text-xl sm:text-2xl font-black text-white">รายงานสรุปเงินเดือน</h1>
                            <p className="text-zinc-400 text-xs mt-0.5">ภาพรวมรายจ่ายเงินเดือนแยกตามแผนกและประเภทการจ่าย</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button
                            variant="secondary"
                            onClick={() => handleExport('excel')}
                            disabled={!reportData}
                            className="tt-retro-control bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl font-bold h-10 transition-all text-xs"
                        >
                            <Download className="w-4 h-4 mr-1.5" /> Excel
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!confirm("ยืนยันการปิดงวดบัญชี? ข้อมูลจะถูกบันทึกสำหรับพนักงาน")) return;
                                try {
                                    const res = await fetch("/api/admin/payroll/finalize", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ startDate, endDate, stationId: stationId === "all" ? undefined : stationId })
                                    });
                                    const response = await res.json().catch(() => null);
                                    if (res.ok) alert(response?.status === "FINALIZED" ? "ปิดงวดบัญชีเรียบร้อย" : "บันทึกรายการที่กรองไว้แล้ว");
                                    else alert(response?.error || "เกิดข้อผิดพลาด");
                                } catch {
                                    alert("Failed to connect");
                                }
                            }}
                            disabled={!reportData}
                            className="tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/30 h-10 transition-all text-xs shadow-sm"
                        >
                            <Building2 className="w-4 h-4 mr-1.5" /> ปิดงวดบัญชี
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
                            <Button size="sm" variant="outline" className="tt-retro-control text-xs font-bold rounded-xl h-9" onClick={() => {
                                setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
                                setEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
                            }}>เดือนนี้</Button>
                            <Button size="sm" variant="outline" className="tt-retro-control text-xs font-bold rounded-xl h-9" onClick={() => {
                                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                setStartDate(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
                                setEndDate(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
                            }}>เดือนก่อน</Button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">เริ่มต้น</label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 h-9 rounded-xl font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-700/30" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">สิ้นสุด</label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 h-9 rounded-xl font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-700/30" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">สถานี</label>
                        <Select value={stationId} onValueChange={setStationId}>
                            <SelectTrigger className="w-44 h-9 rounded-xl font-bold bg-white dark:bg-zinc-900 border-zinc-700/30"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={generateReport} disabled={isLoading} className="tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/30 h-9 px-4 text-xs shadow-sm">
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PieChart className="w-4 h-4 mr-2" />}
                        ดูรายงาน
                    </Button>
                </div>
            </div>

            {/* Content */}
            {reportData ? (
                <>
                    {/* KPI Cards - Row 1: Income */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-xs font-bold text-zinc-500 mb-1">ค่าแรงปกติ</p>
                            <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">฿{reportData.summary.totalRegularPay.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-xs font-bold text-zinc-500 mb-1">ค่าล่วงเวลา (OT)</p>
                            <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">฿{reportData.summary.totalOvertimePay.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-xs font-bold text-zinc-500 mb-1">รวมหักทั้งหมด</p>
                            <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">-฿{reportData.summary.totalDeductions.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">ยอดจ่ายสุทธิ</p>
                            <p className="text-2xl font-black font-mono text-zinc-950 dark:text-white">฿{reportData.summary.grandTotal.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* KPI Cards - Row 2: Deduction breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-[11px] font-bold text-zinc-500 mb-1">หักสาย</p>
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{reportData.summary.totalLatePenalty.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-[11px] font-bold text-zinc-500 mb-1">หักกลับก่อนเกณฑ์</p>
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{reportData.summary.totalEarlyLeavePenalty.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-[11px] font-bold text-zinc-500 mb-1">หักเบิกล่วงหน้า</p>
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{reportData.summary.totalAdvanceDeduction.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-[11px] font-bold text-zinc-500 mb-1">ค่าใช้จ่ายอื่นๆ</p>
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{reportData.summary.totalOtherExpenses.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-[11px] font-bold text-zinc-500 mb-1">ประกันสังคม</p>
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{reportData.summary.totalSocialSecurity.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-[11px] font-bold text-zinc-500 mb-1">พนักงาน</p>
                            <p className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">{reportData.summary.totalEmployees} คน</p>
                        </div>
                    </div>

                    {/* SSO Info */}
                    <p className="text-xs text-muted-foreground">
                        * ประกันสังคม: {(reportData.summary.ssoRate * 100).toFixed(0)}% ของค่าแรงจริง สูงสุด {reportData.summary.ssoMax.toLocaleString()} บาท/เดือน
                    </p>

                    {/* Table */}
                    <Card>
                        <CardHeader><CardTitle>รายละเอียดรายบุคคล</CardTitle></CardHeader>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>พนักงาน</TableHead>
                                        <TableHead>แผนก</TableHead>
                                        <TableHead className="text-right">ค่าแรงปกติ</TableHead>
                                        <TableHead className="text-right">OT</TableHead>
                                        <TableHead className="text-right text-red-400">หักสาย</TableHead>
                                        <TableHead className="text-right text-red-400">กลับก่อน</TableHead>
                                        <TableHead className="text-right text-red-400">หักเบิกล่วงหน้า</TableHead>
                                        <TableHead className="text-right text-red-400">ค่าใช้จ่ายอื่นๆ</TableHead>
                                        <TableHead className="text-right text-red-400">ประกันสังคม</TableHead>
                                        <TableHead className="text-right text-red-500 font-semibold">รวมหัก</TableHead>
                                        <TableHead className="text-right font-bold text-green-600">สุทธิ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.employees.map((emp) => (
                                        <TableRow key={emp.id}>
                                            <TableCell>
                                                <div className="font-medium">{emp.name}</div>
                                                <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                                            </TableCell>
                                            <TableCell>{emp.department}</TableCell>
                                            <TableCell className="text-right text-blue-600">{fmtMoney(emp.regularPay)}</TableCell>
                                            <TableCell className="text-right text-purple-600">{fmtMoney(emp.overtimePay)}</TableCell>
                                            <TableCell className="text-right text-red-400">{emp.latePenalty > 0 ? `-${fmtMoney(emp.latePenalty)}` : '-'}</TableCell>
                                            <TableCell className="text-right text-red-400">{emp.earlyLeavePenalty > 0 ? `-${fmtMoney(emp.earlyLeavePenalty)}` : '-'}</TableCell>
                                            <TableCell className="text-right text-red-400">{emp.advanceDeduction > 0 ? `-${fmtMoney(emp.advanceDeduction)}` : '-'}</TableCell>
                                            <TableCell className="text-right text-red-400">{emp.otherExpenses > 0 ? `-${fmtMoney(emp.otherExpenses)}` : '-'}</TableCell>
                                            <TableCell className="text-right text-red-400">{emp.socialSecurity > 0 ? `-${fmtMoney(emp.socialSecurity)}` : '-'}</TableCell>
                                            <TableCell className="text-right text-red-500 font-semibold">{emp.totalDeductions > 0 ? `-${fmtMoney(emp.totalDeductions)}` : '-'}</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">{fmtMoney(emp.totalPay)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </>
            ) : (
                <div className="text-center py-12 text-muted-foreground">เลือกช่วงเวลาเพื่อดูรายงาน</div>
            )}
        </div>
    );
}
