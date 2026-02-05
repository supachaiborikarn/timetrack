"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
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
    ChevronLeft,
    Download,
    Calculator,
    Loader2,
    Users,
    Clock,
    DollarSign,
    TrendingUp,
} from "lucide-react";
import { format, getBangkokNow, startOfMonth, endOfMonth } from "@/lib/date-utils";

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
        employeeId: string;
        station: string;
        department: string;
        dailyRate: number;
        normalHoursPerDay: number;
        // Calculated
        workDays: number;
        totalHours: number;
        regularHours: number;
        overtimeHours: number;
        // Amounts
        regularPay: number;
        overtimePay: number;
        latePenalty: number;
        totalPay: number;
    }>;
    summary: {
        totalEmployees: number;
        totalWorkDays: number;
        totalRegularHours: number;
        totalOvertimeHours: number;
        totalRegularPay: number;
        totalOvertimePay: number;
        totalLatePenalty: number;
        grandTotal: number;
    };
}

export default function PayrollPage() {
    const { data: session, status } = useSession();
    const [stations, setStations] = useState<Station[]>([]);
    const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState("all");
    const [departmentId, setDepartmentId] = useState("all");
    const [normalHoursPerDay, setNormalHoursPerDay] = useState("10.5");

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

    // Handle bonus amount change
    const handleBonusChange = (employeeId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setBonusAmounts(prev => ({
            ...prev,
            [employeeId]: numValue
        }));
    };

    // Calculate total bonus
    const totalBonus = Object.values(bonusAmounts).reduce((sum, val) => sum + val, 0);

    // Calculate adjusted grand total
    const adjustedGrandTotal = payrollData
        ? payrollData.summary.grandTotal + totalBonus
        : 0;

    const calculatePayroll = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                normalHoursPerDay,
                ...(stationId !== "all" && { stationId }),
                ...(departmentId !== "all" && { departmentId }),
            });

            const res = await fetch(`/api/admin/payroll?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPayrollData(data);
            }
        } catch (error) {
            console.error("Failed to calculate payroll:", error);
        } finally {
            setIsLoading(false);
        }
    };

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
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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

    // Payroll period preset (26th to 25th)
    const setPayrollPeriod = () => {
        const day = now.getDate();
        let periodStart, periodEnd;

        if (day >= 26) {
            // 26th of current month to 25th of next month
            periodStart = new Date(now.getFullYear(), now.getMonth(), 26);
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 25);
        } else {
            // 26th of previous month to 25th of current month
            periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 26);
            periodEnd = new Date(now.getFullYear(), now.getMonth(), 25);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 border-b border-slate-700 px-4 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                            <a href="/admin">
                                <ChevronLeft className="w-5 h-5" />
                            </a>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-white">คำนวณเงินเดือน</h1>
                            <p className="text-sm text-slate-400">คำนวณค่าแรง ชั่วโมงปกติ และ OT</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                        onClick={handleExport}
                        disabled={!payrollData}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4">
                {/* Filters */}
                <Card className="bg-slate-800/50 border-slate-700 mb-6">
                    <CardContent className="py-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">ช่วงเวลา</label>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="border-slate-600 text-xs" onClick={setPayrollPeriod}>
                                        รอบเงินเดือน (26-25)
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-slate-600 text-xs" onClick={setThisMonth}>
                                        เดือนนี้
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-slate-600 text-xs" onClick={setLastMonth}>
                                        เดือนก่อน
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">เริ่มต้น</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-slate-700 border-slate-600 text-white w-36"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">สิ้นสุด</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-slate-700 border-slate-600 text-white w-36"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">สถานี</label>
                                <Select value={stationId} onValueChange={handleStationChange}>
                                    <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
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
                                <label className="text-xs text-slate-400">แผนก</label>
                                <Select value={departmentId} onValueChange={setDepartmentId}>
                                    <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
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
                                <label className="text-xs text-slate-400">ชม.ปกติ/วัน</label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={normalHoursPerDay}
                                    onChange={(e) => setNormalHoursPerDay(e.target.value)}
                                    className="bg-slate-700 border-slate-600 text-white w-20"
                                />
                            </div>
                            <Button
                                className="bg-green-600 hover:bg-green-700"
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="py-4 text-center">
                                    <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-white">{payrollData.summary.totalEmployees}</p>
                                    <p className="text-xs text-slate-400">พนักงาน</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="py-4 text-center">
                                    <Clock className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-white">{payrollData.summary.totalRegularHours.toFixed(0)}</p>
                                    <p className="text-xs text-slate-400">ชม.ปกติ</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="py-4 text-center">
                                    <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-purple-400">{payrollData.summary.totalOvertimeHours.toFixed(1)}</p>
                                    <p className="text-xs text-slate-400">ชม. OT</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
                                <CardContent className="py-4 text-center">
                                    <DollarSign className="w-6 h-6 text-white mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-white">฿{formatCurrency(adjustedGrandTotal)}</p>
                                    <p className="text-xs text-green-200">ค่าแรงรวม (รวมพิเศษ)</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="py-4 text-center">
                                    <p className="text-lg font-bold text-blue-400">฿{formatCurrency(payrollData.summary.totalRegularPay)}</p>
                                    <p className="text-xs text-slate-400">ค่าแรงปกติ</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="py-4 text-center">
                                    <p className="text-lg font-bold text-purple-400">฿{formatCurrency(payrollData.summary.totalOvertimePay)}</p>
                                    <p className="text-xs text-slate-400">ค่า OT</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="py-4 text-center">
                                    <p className="text-lg font-bold text-amber-400">+฿{formatCurrency(totalBonus)}</p>
                                    <p className="text-xs text-slate-400">เงินพิเศษรวม</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="py-4 text-center">
                                    <p className="text-lg font-bold text-red-400">-฿{formatCurrency(payrollData.summary.totalLatePenalty)}</p>
                                    <p className="text-xs text-slate-400">หักสาย</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Employee Table */}
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">รายละเอียดตามพนักงาน</CardTitle>
                            </CardHeader>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-700">
                                            <TableHead className="text-slate-300">รหัส</TableHead>
                                            <TableHead className="text-slate-300">ชื่อ</TableHead>
                                            <TableHead className="text-slate-300">แผนก</TableHead>
                                            <TableHead className="text-slate-300 text-center">วัน</TableHead>
                                            <TableHead className="text-slate-300 text-center">ชม.ปกติ</TableHead>
                                            <TableHead className="text-slate-300 text-center">OT</TableHead>
                                            <TableHead className="text-slate-300 text-right">ค่าแรงปกติ</TableHead>
                                            <TableHead className="text-slate-300 text-right">ค่า OT</TableHead>
                                            <TableHead className="text-slate-300 text-right">หักสาย</TableHead>
                                            <TableHead className="text-slate-300 text-center">เงินพิเศษ</TableHead>
                                            <TableHead className="text-slate-300 text-right">รวมสุทธิ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payrollData.employees.map((emp) => {
                                            const empBonus = bonusAmounts[emp.id] || 0;
                                            const empGrandTotal = emp.totalPay + empBonus;
                                            return (
                                                <TableRow key={emp.id} className="border-slate-700">
                                                    <TableCell className="text-slate-400">{emp.employeeId}</TableCell>
                                                    <TableCell className="text-white font-medium">{emp.name}</TableCell>
                                                    <TableCell className="text-slate-400">{emp.department}</TableCell>
                                                    <TableCell className="text-center text-white">{emp.workDays}</TableCell>
                                                    <TableCell className="text-center text-blue-400">{emp.regularHours.toFixed(1)}</TableCell>
                                                    <TableCell className="text-center text-purple-400">{emp.overtimeHours.toFixed(1)}</TableCell>
                                                    <TableCell className="text-right text-blue-400">฿{formatCurrency(emp.regularPay)}</TableCell>
                                                    <TableCell className="text-right text-purple-400">฿{formatCurrency(emp.overtimePay)}</TableCell>
                                                    <TableCell className="text-right text-red-400">-฿{formatCurrency(emp.latePenalty)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="100"
                                                            value={bonusAmounts[emp.id] || ""}
                                                            onChange={(e) => handleBonusChange(emp.id, e.target.value)}
                                                            placeholder="0"
                                                            className="w-24 bg-slate-700 border-slate-600 text-amber-400 text-center"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right text-green-400 font-bold">฿{formatCurrency(empGrandTotal)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </>
                )}

                {!payrollData && (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="py-12 text-center">
                            <Calculator className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">เลือกช่วงเวลาและกด "คำนวณ"</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div >
    );
}
