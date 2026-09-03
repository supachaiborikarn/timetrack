"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    Calculator,
    Loader2,
    Users,
    Clock,
    DollarSign,
    Eye,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";
import { format, getBangkokNow, startOfMonth, endOfMonth } from "@/lib/date-utils";
import { formatWorkDays } from "@/lib/payroll-day";
import { generatePayslipPDF } from "@/lib/payroll-pdf-download";
import {
    DEFAULT_PAYROLL_DOCUMENT_SETTINGS,
    type PayrollDocumentSettings,
} from "@/lib/payroll-document-settings";
import { toast } from "sonner";

interface Department {
    id: string;
    name: string;
    code: string;
}

interface Station {
    id: string;
    name: string;
    departments: Department[];
}

interface PayrollData {
    employees: Array<{
        id: string;
        name: string;
        nickName: string | null;
        employeeId: string;
        station: string;
        department: string;
        dailyRate: number;
        workDays: number;
        fullDayCount: number;
        halfDayCount: number;
        totalHours: number;
        regularPay: number;
        overtimePay: number;
        latePenalty: number;
        earlyLeavePenalty: number;
        advanceDeduction: number;
        otherExpenses: number;
        socialSecurity: number;
        totalDeductions: number;
        adjustment: number;
        specialIncome: number;
        totalEarnings: number;
        totalPay: number;
        bankName?: string | null;
        bankAccountNumber?: string | null;
    }>;
    summary: {
        totalEmployees: number;
        totalWorkDays: number;
        totalHours: number;
        totalRegularPay: number;
        totalOvertimePay: number;
        totalAdjustment: number;
        totalSpecialIncome: number;
        totalLatePenalty: number;
        totalEarlyLeavePenalty: number;
        totalAdvanceDeduction: number;
        totalOtherExpenses: number;
        totalSocialSecurity: number;
        totalDeductions: number;
        grandTotal: number;
    };
}

interface AbsenceOverlap {
    date: string;
    stationId: string;
    stationName: string;
    absentEmployees: {
        id: string;
        name: string;
        nickName: string | null;
        employeeId: string;
        reason: "DAY_OFF" | "APPROVED_LEAVE" | "ABSENT";
    }[];
}

export default function PayrollPage() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [stations, setStations] = useState<Station[]>([]);
    const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [absenceOverlaps, setAbsenceOverlaps] = useState<AbsenceOverlap[]>([]);
    const [documentSettings, setDocumentSettings] = useState<PayrollDocumentSettings>(
        DEFAULT_PAYROLL_DOCUMENT_SETTINGS,
    );

    // Filters — read from URL params, fallback to defaults
    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(searchParams.get("startDate") || format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || format(endOfMonth(now), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState(searchParams.get("stationId") || "all");
    const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") || "all");

    // Sync filters to URL
    const updateURL = useCallback((overrides?: Record<string, string>) => {
        const params = new URLSearchParams();
        const values = {
            startDate,
            endDate,
            stationId,
            departmentId,
            ...overrides,
        };
        if (values.startDate) params.set("startDate", values.startDate);
        if (values.endDate) params.set("endDate", values.endDate);
        if (values.stationId && values.stationId !== "all") params.set("stationId", values.stationId);
        if (values.departmentId && values.departmentId !== "all") params.set("departmentId", values.departmentId);
        router.replace(`/admin/payroll?${params.toString()}`, { scroll: false });
    }, [startDate, endDate, stationId, departmentId, router]);

    // Bonus amounts per employee (manually entered)
    const [bonusAmounts, setBonusAmounts] = useState<Record<string, number>>({});

    // Get filtered departments based on selected station
    const filteredDepartments = stationId === "all"
        ? stations.flatMap(s => s.departments)
        : stations.find(s => s.id === stationId)?.departments || [];

    useEffect(() => {
        fetchStations();
        fetch("/api/admin/settings/payroll-documents")
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (data?.settings) setDocumentSettings(data.settings);
            })
            .catch((error) => console.error("Failed to load payroll document settings:", error));
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

    // Reset department when station changes
    const handleStationChange = (value: string) => {
        setStationId(value);
        setDepartmentId("all"); // Reset department when station changes
    };

    // Initialize bonus amounts from database when payrollData loads
    useEffect(() => {
        if (payrollData) {
            const newBonus: Record<string, number> = {};
            payrollData.employees.forEach((emp) => {
                if (emp.adjustment) {
                    newBonus[emp.id] = emp.adjustment;
                }
            });
            setBonusAmounts(newBonus);
        }
    }, [payrollData]);

    // Handle bonus amount change
    const handleBonusChange = (employeeId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setBonusAmounts((prev) => ({
            ...prev,
            [employeeId]: numValue,
        }));
    };

    // Calculate total bonus dynamically from local state
    const totalBonus = Object.values(bonusAmounts).reduce((sum, val) => sum + val, 0);

    // Calculate adjusted grand total:
    // payrollData.summary.grandTotal already includes all the saved adjustments.
    // We need to subtract the DB adjustments and add our local bonusAmounts state to reflect current edits.
    const dbTotalAdjustment = payrollData?.employees.reduce((sum, emp) => sum + (emp.adjustment || 0), 0) || 0;
    const adjustedGrandTotal = payrollData
        ? payrollData.summary.grandTotal - dbTotalAdjustment + totalBonus
        : 0;

    const calculatePayroll = async () => {
        setIsLoading(true);
        // Save filters to URL so refresh restores them
        updateURL();
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                ...(stationId !== "all" && { stationId }),
                ...(departmentId !== "all" && { departmentId }),
            });

            const overlapParams = new URLSearchParams({
                startDate,
                endDate,
                ...(stationId !== "all" && { stationId }),
                ...(departmentId !== "all" && { departmentId }),
            });

            const [payrollRes, overlapRes] = await Promise.all([
                fetch(`/api/admin/payroll?${params}`),
                fetch(`/api/admin/payroll/absence-overlaps?${overlapParams}`),
            ]);

            if (payrollRes.ok) {
                const data = await payrollRes.json();
                setPayrollData(data);
            } else {
                setPayrollData(null);
                toast.error("คำนวณเงินเดือนไม่สำเร็จ");
            }
            if (overlapRes.ok) {
                const data = await overlapRes.json();
                setAbsenceOverlaps(data.overlaps || []);
            }
        } catch (error) {
            console.error("Failed to calculate payroll:", error);
            setPayrollData(null);
            toast.error("เชื่อมต่อระบบเงินเดือนไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-calculate on mount if URL has filter params (page refresh)
    const hasUrlParams = searchParams.has("startDate");
    useEffect(() => {
        if (hasUrlParams && stations.length > 0) {
            calculatePayroll();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasUrlParams, stations.length]);

    const handleExport = () => {
        const params = new URLSearchParams({
            startDate,
            endDate,
            ...(stationId !== "all" && { stationId }),
            ...(departmentId !== "all" && { departmentId }),
        });
        window.open(`/api/admin/payroll/export?${params}`, "_blank");
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

    // Payroll period preset (26th to 25th) — เลือกงวดที่เพิ่งปิด
    const setPayrollPeriod = () => {
        const day = now.getDate();
        let periodStart, periodEnd;

        if (day >= 26) {
            // วันที่ 26+ → งวดที่เพิ่งปิด: 26 เดือนก่อน ถึง 25 เดือนนี้
            periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 26);
            periodEnd = new Date(now.getFullYear(), now.getMonth(), 25);
        } else {
            // วันที่ 1-25 → งวดที่เพิ่งปิด: 26 สองเดือนก่อน ถึง 25 เดือนก่อน
            periodStart = new Date(now.getFullYear(), now.getMonth() - 2, 26);
            periodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 25);
        }

        setStartDate(format(periodStart, "yyyy-MM-dd"));
        setEndDate(format(periodEnd, "yyyy-MM-dd"));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 bg-zinc-950 text-white p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.2)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbf24]">FINANCIAL OPERATIONS</p>
                            <h1 className="text-xl sm:text-2xl font-black text-white">คำนวณเงินเดือน</h1>
                            <p className="text-zinc-400 text-xs mt-0.5">คำนวณค่าแรงรายวัน ตรวจสอบรายได้พิเศษ และจัดการรอบบัญชี</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button
                            variant="secondary"
                            onClick={handleExport}
                            disabled={!payrollData}
                            className="tt-retro-control bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl font-bold h-10 transition-all text-xs"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            Export Excel
                        </Button>
                        <Button
                            disabled={!payrollData}
                            onClick={async () => {
                                if (!confirm("ยืนยันการปิดงวดบัญชี? ข้อมูลจะถูกบันทึกสำหรับพนักงานทุกคน")) return;
                                try {
                                    const res = await fetch("/api/admin/payroll/finalize", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            startDate,
                                            endDate,
                                            stationId: stationId === "all" ? undefined : stationId,
                                            departmentId: departmentId === "all" ? undefined : departmentId,
                                        }),
                                    });
                                    const response = await res.json().catch(() => null);
                                    if (res.ok) {
                                        alert(response?.status === "FINALIZED" ? "ปิดงวดบัญชีเรียบร้อย" : "บันทึกรายการที่กรองไว้แล้ว");
                                    } else alert(response?.error || "เกิดข้อผิดพลาด");
                                } catch {
                                    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
                                }
                            }}
                            className="tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/30 h-10 transition-all text-xs shadow-sm"
                        >
                            <DollarSign className="w-4 h-4 mr-1" />
                            ปิดงวดบัญชี
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
                            <Button size="sm" variant="outline" className="tt-retro-control text-xs font-bold rounded-xl h-9" onClick={setPayrollPeriod}>
                                รอบเงินเดือน (26-25)
                            </Button>
                            <Button size="sm" variant="outline" className="tt-retro-control text-xs font-bold rounded-xl h-9" onClick={setThisMonth}>
                                เดือนนี้
                            </Button>
                            <Button size="sm" variant="outline" className="tt-retro-control text-xs font-bold rounded-xl h-9" onClick={setLastMonth}>
                                เดือนก่อน
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
                        <Select value={stationId} onValueChange={handleStationChange}>
                            <SelectTrigger className="w-40 h-9 rounded-xl font-bold bg-white dark:bg-zinc-900 border-zinc-700/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                {stations.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">แผนก</label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                            <SelectTrigger className="w-40 h-9 rounded-xl font-bold bg-white dark:bg-zinc-900 border-zinc-700/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                {filteredDepartments.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                        {d.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={calculatePayroll}
                        disabled={isLoading}
                        className="tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/30 h-9 px-4 text-xs shadow-sm"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                        คำนวณ
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            {payrollData && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1.5" />
                            <p className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">{payrollData.summary.totalEmployees}</p>
                            <p className="text-xs font-bold text-zinc-500">พนักงาน</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
                            <p className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">{(payrollData.summary.totalHours || 0).toFixed(2)}</p>
                            <p className="text-xs font-bold text-zinc-500">ชม.รวม • {formatWorkDays(payrollData.summary.totalWorkDays)} วัน</p>
                        </div>
                        <div className={`tt-paper-card tt-instrument-frame rounded-2xl border p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)] ${absenceOverlaps.length > 0 ? "border-amber-500/50 bg-amber-500/10" : "border-zinc-700/30 dark:border-white/15"}`}>
                            <AlertTriangle className={`w-6 h-6 mx-auto mb-1.5 ${absenceOverlaps.length > 0 ? 'text-[#fbbf24]' : 'text-zinc-400'}`} />
                            <p className={`text-2xl font-black font-mono ${absenceOverlaps.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-400'}`}>{absenceOverlaps.length}</p>
                            <p className="text-xs font-bold text-zinc-500">วันหยุดซ้ำกัน</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <DollarSign className="w-6 h-6 text-[#fbbf24] mx-auto mb-1.5" />
                            <p className="text-2xl font-black font-mono text-zinc-950 dark:text-white">฿{formatCurrency(adjustedGrandTotal)}</p>
                            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">ค่าแรงรวม (รวมพิเศษ)</p>
                        </div>
                    </div>

                    {/* Breakdown - Income */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">฿{formatCurrency(payrollData.summary.totalRegularPay)}</p>
                            <p className="text-xs font-bold text-zinc-500">ค่าแรง</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">+฿{formatCurrency(payrollData.summary.totalSpecialIncome)}</p>
                            <p className="text-xs font-bold text-zinc-500">รายได้พิเศษอนุมัติ</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">+฿{formatCurrency(totalBonus)}</p>
                            <p className="text-xs font-bold text-zinc-500">โบนัส/ปรับเงิน</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">-฿{formatCurrency(payrollData.summary.totalDeductions)}</p>
                            <p className="text-xs font-bold text-zinc-500">รวมหักทั้งหมด</p>
                        </div>
                    </div>

                    {/* Breakdown - Deductions */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{formatCurrency(payrollData.summary.totalLatePenalty)}</p>
                            <p className="text-[11px] font-bold text-zinc-500">หักสาย</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{formatCurrency(payrollData.summary.totalEarlyLeavePenalty)}</p>
                            <p className="text-[11px] font-bold text-zinc-500">หักกลับก่อนเกณฑ์</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{formatCurrency(payrollData.summary.totalAdvanceDeduction)}</p>
                            <p className="text-[11px] font-bold text-zinc-500">หักเบิกล่วงหน้า</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{formatCurrency(payrollData.summary.totalOtherExpenses)}</p>
                            <p className="text-[11px] font-bold text-zinc-500">ค่าใช้จ่ายอื่นๆ</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">-฿{formatCurrency(payrollData.summary.totalSocialSecurity)}</p>
                            <p className="text-[11px] font-bold text-zinc-500">ประกันสังคม</p>
                        </div>
                    </div>

                    {/* Employee Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">รายละเอียดตามพนักงาน</CardTitle>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>รหัส</TableHead>
                                        <TableHead>ชื่อ</TableHead>
                                        <TableHead>แผนก</TableHead>
                                        <TableHead className="text-center">วัน</TableHead>
                                        <TableHead className="text-center">ชม.รวม</TableHead>
                                        <TableHead className="text-right">ค่าแรง</TableHead>
                                        <TableHead className="text-right">รายได้พิเศษ</TableHead>
                                        <TableHead className="text-right text-red-600 dark:text-red-400">หักสาย</TableHead>
                                        <TableHead className="text-right text-red-600 dark:text-red-400">กลับก่อน</TableHead>
                                        <TableHead className="text-right text-red-600 dark:text-red-400">เบิกล่วงหน้า</TableHead>
                                        <TableHead className="text-right text-red-600 dark:text-red-400">ค่าใช้จ่ายอื่นๆ</TableHead>
                                        <TableHead className="text-right text-red-600 dark:text-red-400">ประกันสังคม</TableHead>
                                        <TableHead className="text-center">โบนัส/ปรับเงิน</TableHead>
                                        <TableHead className="text-right">รวมสุทธิ</TableHead>
                                        <TableHead className="text-center w-20"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payrollData.employees.map((emp) => {
                                        const empBonus = bonusAmounts[emp.id] || 0;
                                        // emp.totalPay already includes emp.adjustment from the database
                                        const empGrandTotal = emp.totalPay - (emp.adjustment || 0) + empBonus;
                                        return (
                                            <TableRow key={emp.id}>
                                                <TableCell className="text-muted-foreground">{emp.employeeId}</TableCell>
                                                <TableCell className="font-medium text-foreground">
                                                    {emp.name}{emp.nickName ? ` (${emp.nickName})` : ""}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{emp.department}</TableCell>
                                                <TableCell className="text-center text-foreground">
                                                    <div>{formatWorkDays(emp.workDays)}</div>
                                                    {emp.halfDayCount > 0 && (
                                                        <div className="text-[10px] text-amber-600 dark:text-amber-400">ครึ่ง {emp.halfDayCount}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center text-blue-600 dark:text-blue-400">{emp.totalHours.toFixed(1)}</TableCell>
                                                <TableCell className="text-right text-blue-600 dark:text-blue-400">฿{formatCurrency(emp.regularPay)}</TableCell>
                                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{emp.specialIncome > 0 ? `+฿${formatCurrency(emp.specialIncome)}` : '-'}</TableCell>
                                                <TableCell className="text-right text-red-600 dark:text-red-400">{emp.latePenalty > 0 ? `-฿${formatCurrency(emp.latePenalty)}` : '-'}</TableCell>
                                                <TableCell className="text-right text-red-600 dark:text-red-400">{emp.earlyLeavePenalty > 0 ? `-฿${formatCurrency(emp.earlyLeavePenalty)}` : '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="100"
                                                        defaultValue={emp.advanceDeduction || ""}
                                                        placeholder="0"
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            if (val === (emp.advanceDeduction || 0)) return;
                                                            const m = endDate.split("-")[1];
                                                            const y = endDate.split("-")[0];
                                                            try {
                                                                const res = await fetch("/api/admin/advances", {
                                                                    method: "PATCH",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ userId: emp.id, month: m, year: y, amount: val }),
                                                                });
                                                                if (!res.ok) throw new Error("SAVE_FAILED");
                                                                toast.success(`บันทึกหักเบิกล่วงหน้า: ฿${val}`);
                                                            } catch {
                                                                toast.error("บันทึกยอดเบิกล่วงหน้าไม่สำเร็จ");
                                                            }
                                                            await calculatePayroll();
                                                        }}
                                                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                                        className="w-24 text-red-600 dark:text-red-400 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="100"
                                                        defaultValue={emp.otherExpenses || ""}
                                                        placeholder="0"
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            if (val === (emp.otherExpenses || 0)) return;
                                                            try {
                                                                const res = await fetch("/api/admin/payroll/employee-daily", {
                                                                    method: "PATCH",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ userId: emp.id, otherExpenses: val, startDate, endDate }),
                                                                });
                                                                if (!res.ok) throw new Error("SAVE_FAILED");
                                                                toast.success(`บันทึกค่าใช้จ่ายอื่นๆ: ฿${val}`);
                                                            } catch {
                                                                toast.error("บันทึกค่าใช้จ่ายอื่นไม่สำเร็จ");
                                                            }
                                                            await calculatePayroll();
                                                        }}
                                                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                                        className="w-24 text-red-600 dark:text-red-400 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-red-600 dark:text-red-400">{emp.socialSecurity > 0 ? `-฿${formatCurrency(emp.socialSecurity)}` : '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="100"
                                                        value={bonusAmounts[emp.id] !== undefined ? bonusAmounts[emp.id] : ""}
                                                        onChange={(e) => handleBonusChange(emp.id, e.target.value)}
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            if (val === (emp.adjustment || 0)) return;
                                                            try {
                                                                const res = await fetch("/api/admin/payroll/employee-daily", {
                                                                    method: "PATCH",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({
                                                                        userId: emp.id,
                                                                        totalAdjustment: val,
                                                                        startDate,
                                                                        endDate
                                                                    }),
                                                                });
                                                                if (!res.ok) throw new Error("SAVE_FAILED");
                                                                toast.success(`บันทึกเงินพิเศษ: ฿${val}`);
                                                            } catch {
                                                                toast.error("บันทึกเงินพิเศษไม่สำเร็จ");
                                                            }
                                                            await calculatePayroll();
                                                        }}
                                                        placeholder="0"
                                                        className="w-24 text-amber-600 dark:text-amber-400 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-green-600 dark:text-green-400">฿{formatCurrency(empGrandTotal)}</TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-blue-600 dark:text-blue-400 hover:bg-accent"
                                                            asChild
                                                        >
                                                            <Link href={`/admin/payroll/${emp.id}?startDate=${startDate}&endDate=${endDate}`}>
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                ดูรายวัน
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-orange-600 dark:text-orange-400 hover:bg-accent"
                                                            onClick={async () => {
                                                                const bonus = bonusAmounts[emp.id] || 0;
                                                                const totalPay = emp.totalPay - (emp.adjustment || 0) + bonus;

                                                                const payslipObj = {
                                                                    user: {
                                                                        name: emp.nickName ? `${emp.name} (${emp.nickName})` : emp.name,
                                                                        employeeId: emp.employeeId,
                                                                        department: { name: emp.department },
                                                                        station: { name: emp.station },
                                                                        bankName: emp.bankName,
                                                                        bankAccountNumber: emp.bankAccountNumber
                                                                    },
                                                                    period: {
                                                                        startDate: startDate,
                                                                        endDate: endDate,
                                                                        payDate: endDate,
                                                                        name: `Payroll ${endDate.slice(5, 7)}/${endDate.slice(0, 4)}`,
                                                                    },
                                                                    createdAt: new Date().toISOString(),
                                                                    workDays: emp.workDays,
                                                                    totalHours: emp.totalHours,
                                                                    dailyRate: emp.dailyRate,
                                                                    basePay: emp.regularPay,
                                                                    overtimePay: emp.overtimePay,
                                                                    latePenalty: emp.latePenalty,
                                                                    advanceDeduct: emp.advanceDeduction,
                                                                    otherDeduct: emp.otherExpenses,
                                                                    socialSecurity: emp.socialSecurity,
                                                                    adjustment: bonus,
                                                                    specialIncome: emp.specialIncome,
                                                                    netPay: totalPay,
                                                                };

                                                                try {
                                                                    await generatePayslipPDF(payslipObj, documentSettings);
                                                                } catch (err) {
                                                                    console.error("PDF generation error:", err);
                                                                    alert("ไม่สามารถสร้าง PDF ได้: " + (err instanceof Error ? err.message : "Unknown error"));
                                                                }
                                                            }}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-amber-600 dark:text-amber-400 hover:bg-accent"
                                                            title="ปิดงวดคนนี้"
                                                            onClick={async () => {
                                                                if (!confirm(`ยืนยันการปิดงวดบัญชีสำหรับ ${emp.name}?`)) return;
                                                                try {
                                                                    const res = await fetch("/api/admin/payroll/finalize", {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ startDate, endDate, userId: emp.id }),
                                                                    });
                                                                    if (res.ok) toast.success(`บันทึกงวดของ ${emp.name} เรียบร้อย`);
                                                                    else toast.error((await res.json().catch(() => null))?.error || "เกิดข้อผิดพลาด");
                                                                } catch { toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
                                                            }}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>

                    {/* Absence Overlaps */}
                    {absenceOverlaps.length > 0 && (
                        <Card className="border-amber-500/40">
                            <CardHeader>
                                <CardTitle className="text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    วันหยุดซ้ำกัน ({absenceOverlaps.length} วัน)
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">วันที่มีพนักงาน 2 คนขึ้นไปหยุดพร้อมกันในสถานีเดียวกัน</p>
                            </CardHeader>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>วันที่</TableHead>
                                            <TableHead>สถานี</TableHead>
                                            <TableHead>พนักงานที่หยุด</TableHead>
                                            <TableHead className="text-center">จำนวน</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {absenceOverlaps.map((overlap, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium text-foreground">
                                                    {new Date(overlap.date).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{overlap.stationName}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {overlap.absentEmployees.map((emp) => (
                                                            <Badge key={emp.id} variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 text-xs">
                                                                {emp.nickName || emp.name}
                                                                {emp.reason === "DAY_OFF" ? " · หยุด" : emp.reason === "APPROVED_LEAVE" ? " · ลา" : " · ขาด"}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className="bg-amber-500 text-white border-transparent">
                                                        {overlap.absentEmployees.length} คน
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {!payrollData && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Calculator className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground">เลือกช่วงเวลาและกด &quot;คำนวณ&quot;</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
