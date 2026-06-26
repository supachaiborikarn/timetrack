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
import { generatePayslipPDF } from "@/lib/pdf-generator";
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
        advanceDeduction: number;
        otherExpenses: number;
        socialSecurity: number;
        totalDeductions: number;
        adjustment: number;
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
        totalLatePenalty: number;
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

    // Filters — read from URL params, fallback to defaults
    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(searchParams.get("startDate") || format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || format(endOfMonth(now), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState(searchParams.get("stationId") || "all");
    const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") || "all");
    const [normalHoursPerDay, setNormalHoursPerDay] = useState(searchParams.get("normalHours") || "10.5");

    // Sync filters to URL
    const updateURL = useCallback((overrides?: Record<string, string>) => {
        const params = new URLSearchParams();
        const values = {
            startDate,
            endDate,
            stationId,
            departmentId,
            normalHours: normalHoursPerDay,
            ...overrides,
        };
        if (values.startDate) params.set("startDate", values.startDate);
        if (values.endDate) params.set("endDate", values.endDate);
        if (values.stationId && values.stationId !== "all") params.set("stationId", values.stationId);
        if (values.departmentId && values.departmentId !== "all") params.set("departmentId", values.departmentId);
        if (values.normalHours && values.normalHours !== "10.5") params.set("normalHours", values.normalHours);
        router.replace(`/admin/payroll?${params.toString()}`, { scroll: false });
    }, [startDate, endDate, stationId, departmentId, normalHoursPerDay, router]);

    // Bonus amounts per employee (manually entered)
    const [bonusAmounts, setBonusAmounts] = useState<Record<string, number>>({});

    // Get filtered departments based on selected station
    const filteredDepartments = stationId === "all"
        ? stations.flatMap(s => s.departments)
        : stations.find(s => s.id === stationId)?.departments || [];

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
                normalHoursPerDay,
                ...(stationId !== "all" && { stationId }),
                ...(departmentId !== "all" && { departmentId }),
            });

            const [payrollRes, overlapRes] = await Promise.all([
                fetch(`/api/admin/payroll?${params}`),
                fetch(`/api/admin/payroll/absence-overlaps?startDate=${startDate}&endDate=${endDate}${stationId !== "all" ? `&stationId=${stationId}` : ""}`),
            ]);

            if (payrollRes.ok) {
                const data = await payrollRes.json();
                setPayrollData(data);
            }
            if (overlapRes.ok) {
                const data = await overlapRes.json();
                setAbsenceOverlaps(data.overlaps || []);
            }
        } catch (error) {
            console.error("Failed to calculate payroll:", error);
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
            normalHoursPerDay,
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">คำนวณเงินเดือน</h1>
                    <p className="text-muted-foreground">คำนวณค่าแรงรายวัน</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={!payrollData}
                    >
                        <Download className="w-4 h-4 mr-2" />
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
                                if (res.ok) alert("ปิดงวดบัญชีเรียบร้อย ✅");
                                else alert("เกิดข้อผิดพลาด");
                            } catch {
                                alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
                            }
                        }}
                    >
                        <DollarSign className="w-4 h-4 mr-2" />
                        ปิดงวดบัญชี
                    </Button>
                </div>
            </div>
            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">ช่วงเวลา</label>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-xs" onClick={setPayrollPeriod}>
                                    รอบเงินเดือน (26-25)
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs" onClick={setThisMonth}>
                                    เดือนนี้
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs" onClick={setLastMonth}>
                                    เดือนก่อน
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">เริ่มต้น</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-36"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">สิ้นสุด</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-36"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">สถานี</label>
                            <Select value={stationId} onValueChange={handleStationChange}>
                                <SelectTrigger className="w-40">
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
                            <label className="text-xs text-muted-foreground">แผนก</label>
                            <Select value={departmentId} onValueChange={setDepartmentId}>
                                <SelectTrigger className="w-40">
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
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">ชม.ปกติ/วัน</label>
                            <Input
                                type="number"
                                step="0.5"
                                value={normalHoursPerDay}
                                onChange={(e) => setNormalHoursPerDay(e.target.value)}
                                className="w-20"
                            />
                        </div>
                        <Button
                            onClick={calculatePayroll}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                            คำนวณ
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            {payrollData && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="py-4 text-center">
                                <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-foreground">{payrollData.summary.totalEmployees}</p>
                                <p className="text-xs text-muted-foreground">พนักงาน</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4 text-center">
                                <Clock className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-foreground">{(payrollData.summary.totalHours || 0).toFixed(0)}</p>
                                <p className="text-xs text-muted-foreground">ชม.รวม • {formatWorkDays(payrollData.summary.totalWorkDays)} วัน</p>
                            </CardContent>
                        </Card>
                        <Card className={absenceOverlaps.length > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
                            <CardContent className="py-4 text-center">
                                <AlertTriangle className={`w-6 h-6 mx-auto mb-2 ${absenceOverlaps.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                <p className={`text-2xl font-bold ${absenceOverlaps.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{absenceOverlaps.length}</p>
                                <p className="text-xs text-muted-foreground">วันหยุดซ้ำกัน</p>
                            </CardContent>
                        </Card>
                        <Card className="border-primary/50 bg-primary/5">
                            <CardContent className="py-4 text-center">
                                <DollarSign className="w-6 h-6 text-primary mx-auto mb-2" />
                                <p className="text-2xl font-bold text-foreground">฿{formatCurrency(adjustedGrandTotal)}</p>
                                <p className="text-xs text-muted-foreground">ค่าแรงรวม (รวมพิเศษ)</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown - Income */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">฿{formatCurrency(payrollData.summary.totalRegularPay)}</p>
                                <p className="text-xs text-muted-foreground">ค่าแรง</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">+฿{formatCurrency(totalBonus)}</p>
                                <p className="text-xs text-muted-foreground">เงินพิเศษรวม</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-lg font-bold text-red-600 dark:text-red-400">-฿{formatCurrency(payrollData.summary.totalDeductions)}</p>
                                <p className="text-xs text-muted-foreground">รวมหักทั้งหมด</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown - Deductions */}
                    <div className="grid grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="py-3 text-center">
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">-฿{formatCurrency(payrollData.summary.totalLatePenalty)}</p>
                                <p className="text-xs text-muted-foreground">หักสาย</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-3 text-center">
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">-฿{formatCurrency(payrollData.summary.totalAdvanceDeduction)}</p>
                                <p className="text-xs text-muted-foreground">หักเบิกล่วงหน้า</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-3 text-center">
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">-฿{formatCurrency(payrollData.summary.totalOtherExpenses)}</p>
                                <p className="text-xs text-muted-foreground">ค่าใช้จ่ายอื่นๆ</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-3 text-center">
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">-฿{formatCurrency(payrollData.summary.totalSocialSecurity)}</p>
                                <p className="text-xs text-muted-foreground">ประกันสังคม</p>
                            </CardContent>
                        </Card>
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
                                        <TableHead className="text-right text-red-600 dark:text-red-400">หักสาย</TableHead>
                                        <TableHead className="text-right text-red-600 dark:text-red-400">เบิกล่วงหน้า</TableHead>
                                        <TableHead className="text-right text-red-600 dark:text-red-400">ค่าใช้จ่ายอื่นๆ</TableHead>
                                        <TableHead className="text-right text-red-600 dark:text-red-400">ประกันสังคม</TableHead>
                                        <TableHead className="text-center">เงินพิเศษ</TableHead>
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
                                                <TableCell className="text-right text-red-600 dark:text-red-400">{emp.latePenalty > 0 ? `-฿${formatCurrency(emp.latePenalty)}` : '-'}</TableCell>
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
                                                            await fetch("/api/admin/advances", {
                                                                method: "PATCH",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ userId: emp.id, month: m, year: y, amount: val }),
                                                            });
                                                            toast.success(`บันทึกหักเบิกล่วงหน้า: ฿${val}`);
                                                            calculatePayroll();
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
                                                            await fetch("/api/admin/payroll/employee-daily", {
                                                                method: "PATCH",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ userId: emp.id, otherExpenses: val }),
                                                            });
                                                            toast.success(`บันทึกค่าใช้จ่ายอื่นๆ: ฿${val}`);
                                                            calculatePayroll();
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
                                                            await fetch("/api/admin/payroll/employee-daily", {
                                                                method: "PATCH",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ 
                                                                    userId: emp.id, 
                                                                    totalAdjustment: val,
                                                                    startDate,
                                                                    endDate
                                                                }),
                                                            });
                                                            toast.success(`บันทึกเงินพิเศษ: ฿${val}`);
                                                            calculatePayroll();
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
                                                            onClick={() => {
                                                                const bonus = bonusAmounts[emp.id] || 0;
                                                                const totalPay = emp.totalPay - (emp.adjustment || 0) + bonus;

                                                                const payslipObj = {
                                                                    user: {
                                                                        name: emp.nickName ? `${emp.name} (${emp.nickName})` : emp.name,
                                                                        employeeId: emp.employeeId,
                                                                        department: { name: emp.department },
                                                                        bankName: emp.bankName,
                                                                        bankAccountNumber: emp.bankAccountNumber
                                                                    },
                                                                    period: {
                                                                        startDate: startDate,
                                                                        endDate: endDate,
                                                                        name: "Period"
                                                                    },
                                                                    createdAt: new Date().toISOString(),
                                                                    basePay: emp.regularPay,
                                                                    overtimePay: emp.overtimePay,
                                                                    latePenalty: emp.latePenalty,
                                                                    advanceDeduct: emp.advanceDeduction,
                                                                    otherDeduct: emp.otherExpenses,
                                                                    socialSecurity: emp.socialSecurity,
                                                                    netPay: totalPay,
                                                                    bonus: bonus
                                                                };

                                                                try {
                                                                    generatePayslipPDF(payslipObj, { name: "TimeTrack Company" });
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
                                                                    if (res.ok) toast.success(`ปิดงวด ${emp.name} เรียบร้อย ✅`);
                                                                    else toast.error("เกิดข้อผิดพลาด");
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
