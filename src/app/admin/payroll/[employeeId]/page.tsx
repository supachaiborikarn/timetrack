"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Loader2,
    User,
    Calendar,
    DollarSign,
    Clock,
    RotateCcw,
    CheckCircle2,
    Edit2,
    Users,
} from "lucide-react";
import { format, getBangkokNow, startOfMonth, endOfMonth } from "@/lib/date-utils";
import { toast } from "sonner";

interface DailyRecord {
    date: string;
    dayOfWeek: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    actualHours: number | null;
    breakMinutes: number | null;
    lateMinutes: number | null;
    latePenalty: number;
    isLatePenaltyOverridden: boolean;
    dailyWage: number;
    isWageOverridden: boolean;
    otHours: number;
    otAmount: number;
    isOTOverridden: boolean;
    adjustment: number;
    note: string | null;
    total: number;
    absentColleagues: { name: string; nickName: string | null }[];
}

interface EmployeePayrollData {
    employee: {
        id: string;
        name: string;
        employeeId: string;
        station: string;
        department: string;
        defaultDailyRate: number;
        hourlyRate: number;
        otMultiplier: number;
    };
    dailyRecords: DailyRecord[];
    summary: {
        totalDays: number;
        workDays: number;
        totalWage: number;
        totalOT: number;
        totalLatePenalty: number;
        totalAdjustment: number;
        grandTotal: number;
    };
}

type EditField = "wage" | "ot" | "checkIn" | "checkOut" | "latePenalty" | "adjustment";

export default function EmployeePayrollDetailPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const searchParams = useSearchParams();
    const employeeId = params.employeeId as string;

    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(
        searchParams.get("startDate") || format(startOfMonth(now), "yyyy-MM-dd")
    );
    const [endDate, setEndDate] = useState(
        searchParams.get("endDate") || format(endOfMonth(now), "yyyy-MM-dd")
    );
    const [data, setData] = useState<EmployeePayrollData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [editingCell, setEditingCell] = useState<{ date: string; field: EditField } | null>(null);
    const [editValue, setEditValue] = useState("");
    const [savingDate, setSavingDate] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!employeeId) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                userId: employeeId,
                startDate,
                endDate,
            });
            const res = await fetch(`/api/admin/payroll/employee-daily?${params}`);
            if (res.ok) {
                const json = await res.json();
                setData(json.data);
                const workDays = json.data?.summary?.workDays || 0;
                toast.success(`โหลดข้อมูลสำเร็จ(${workDays} วันทำงาน)`);
            } else {
                toast.error("ไม่สามารถโหลดข้อมูลได้");
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setIsLoading(false);
        }
    }, [employeeId, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Helper to convert ISO string to HH:mm format
    const isoToTimeInput = (isoString: string | null): string => {
        if (!isoString) return "";
        const date = new Date(isoString);
        return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")} `;
    };

    const handleStartEdit = (date: string, field: EditField, currentValue: number | string | null) => {
        setEditingCell({ date, field });
        if (field === "checkIn" || field === "checkOut") {
            setEditValue(typeof currentValue === "string" ? isoToTimeInput(currentValue) : "");
        } else {
            setEditValue((currentValue ?? 0).toString());
        }
    };

    // Helper to update a single record in state (optimistic update)
    const updateLocalRecord = (date: string, updates: Partial<DailyRecord>) => {
        if (!data) return;

        const updatedRecords = data.dailyRecords.map(record =>
            record.date === date ? { ...record, ...updates } : record
        );

        // Recalculate summary
        const summary = {
            totalDays: updatedRecords.length,
            workDays: updatedRecords.filter(d => d.checkInTime).length,
            totalWage: updatedRecords.reduce((sum, d) => sum + d.dailyWage, 0),
            totalOT: updatedRecords.reduce((sum, d) => sum + d.otAmount, 0),
            totalLatePenalty: updatedRecords.reduce((sum, d) => sum + d.latePenalty, 0),
            totalAdjustment: updatedRecords.reduce((sum, d) => sum + d.adjustment, 0),
            grandTotal: updatedRecords.reduce((sum, d) => sum + d.total, 0),
        };

        setData({ ...data, dailyRecords: updatedRecords, summary });
    };

    const handleSaveEdit = async () => {
        if (!editingCell || !data) return;
        const { date, field } = editingCell;
        setSavingDate(date);

        try {
            if (field === "checkIn" || field === "checkOut") {
                // Call time update API
                const payload: Record<string, unknown> = {
                    userId: employeeId,
                    date,
                };
                if (field === "checkIn") {
                    payload.checkInTime = editValue || null;
                } else {
                    payload.checkOutTime = editValue || null;
                }

                const res = await fetch("/api/admin/attendance/update-time", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    const json = await res.json();
                    const result = json.data;
                    // Optimistic update for time
                    const record = data.dailyRecords.find(r => r.date === date);
                    if (record) {
                        const actualHours = result.actualHours ?? record.actualHours;
                        const normalHoursPerDay = 10.5;
                        const otHours = actualHours && actualHours > normalHoursPerDay
                            ? actualHours - normalHoursPerDay : 0;
                        const otAmount = record.isOTOverridden
                            ? record.otAmount
                            : otHours * data.employee.hourlyRate * data.employee.otMultiplier;
                        const dailyWage = record.isWageOverridden
                            ? record.dailyWage
                            : (result.checkInTime ? data.employee.defaultDailyRate : 0);
                        const total = dailyWage + otAmount - record.latePenalty;

                        updateLocalRecord(date, {
                            checkInTime: result.checkInTime,
                            checkOutTime: result.checkOutTime,
                            actualHours,
                            otHours: Math.round(otHours * 100) / 100,
                            otAmount: Math.round(otAmount * 100) / 100,
                            dailyWage,
                            total: Math.round(total * 100) / 100,
                        });
                    }
                }
            } else {
                // Wage/OT/latePenalty/adjustment override
                const payload: Record<string, unknown> = {
                    userId: employeeId,
                    date,
                };

                const numValue = parseFloat(editValue) || 0;
                if (field === "wage") {
                    payload.overrideDailyWage = numValue;
                } else if (field === "ot") {
                    payload.overrideOT = numValue;
                } else if (field === "latePenalty") {
                    payload.overrideLatePenalty = numValue;
                } else if (field === "adjustment") {
                    payload.adjustment = numValue;
                }

                const res = await fetch("/api/admin/payroll/employee-daily", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    const record = data.dailyRecords.find(r => r.date === date);
                    if (record) {
                        const updatedRecord = { ...record };
                        if (field === "wage") {
                            updatedRecord.dailyWage = numValue;
                            updatedRecord.isWageOverridden = true;
                        } else if (field === "ot") {
                            updatedRecord.otAmount = numValue;
                            updatedRecord.isOTOverridden = true;
                        } else if (field === "latePenalty") {
                            updatedRecord.latePenalty = numValue;
                            updatedRecord.isLatePenaltyOverridden = true;
                        } else if (field === "adjustment") {
                            updatedRecord.adjustment = numValue;
                        }
                        updatedRecord.total = Math.round(
                            (updatedRecord.dailyWage + updatedRecord.otAmount - updatedRecord.latePenalty + updatedRecord.adjustment) * 100
                        ) / 100;
                        updateLocalRecord(date, updatedRecord);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setEditingCell(null);
            setSavingDate(null);
        }
    };

    const handleResetOverride = async (date: string) => {
        setSavingDate(date);
        try {
            const params = new URLSearchParams({ userId: employeeId, date });
            await fetch(`/api/admin/payroll/employee-daily?${params}`, {
                method: "DELETE",
            });
            await fetchData();
        } catch (error) {
            console.error("Failed to reset:", error);
        } finally {
            setSavingDate(null);
        }
    };

    const formatTime = (isoString: string | null) => {
        if (!isoString) return "-";
        return new Date(isoString).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("th-TH", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 border-b border-slate-700 px-4 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                            <a href="/admin/payroll">
                                <ChevronLeft className="w-5 h-5" />
                            </a>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-white">
                                {data?.employee.name || "กำลังโหลด..."}
                            </h1>
                            <p className="text-sm text-slate-400">
                                {data?.employee.employeeId} • {data?.employee.department}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white w-36"
                        />
                        <span className="text-slate-400">-</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white w-36"
                        />
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={fetchData}
                            disabled={isLoading}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            โหลด
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4">
                {/* Employee Info Card */}
                {data && (
                    <Card className="bg-slate-800/50 border-slate-700 mb-4">
                        <CardContent className="py-4">
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-400" />
                                    <span className="text-slate-400">สถานี:</span>
                                    <span className="text-white">{data.employee.station}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                    <span className="text-slate-400">ค่าแรง/วัน:</span>
                                    <span className="text-green-400 font-bold">
                                        ฿{formatCurrency(data.employee.defaultDailyRate)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-purple-400" />
                                    <span className="text-slate-400">OT x{data.employee.otMultiplier}:</span>
                                    <span className="text-purple-400">
                                        ฿{formatCurrency(data.employee.hourlyRate)}/ชม.
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600 text-slate-300 ml-auto"
                                    asChild
                                >
                                    <a href={`/admin/employees?edit=${data.employee.id}`}>
                                        แก้ไขข้อมูลพนักงาน
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Summary Cards */}
                {data && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="py-4 text-center">
                                <p className="text-2xl font-bold text-blue-400">{data.summary.workDays}</p>
                                <p className="text-xs text-slate-400">วันทำงาน</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="py-4 text-center">
                                <p className="text-2xl font-bold text-green-400">
                                    ฿{formatCurrency(data.summary.totalWage)}
                                </p>
                                <p className="text-xs text-slate-400">ค่าแรงรวม</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="py-4 text-center">
                                <p className="text-2xl font-bold text-purple-400">
                                    ฿{formatCurrency(data.summary.totalOT)}
                                </p>
                                <p className="text-xs text-slate-400">OT รวม</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="py-4 text-center">
                                <p className="text-2xl font-bold text-red-400">
                                    -฿{formatCurrency(data.summary.totalLatePenalty)}
                                </p>
                                <p className="text-xs text-slate-400">หักสาย</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="py-4 text-center">
                                <p className={`text - 2xl font - bold ${data.summary.totalAdjustment >= 0 ? 'text-amber-400' : 'text-red-400'} `}>
                                    {data.summary.totalAdjustment >= 0 ? '+' : ''}฿{formatCurrency(data.summary.totalAdjustment)}
                                </p>
                                <p className="text-xs text-slate-400">ปรับเงิน</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
                            <CardContent className="py-4 text-center">
                                <p className="text-2xl font-bold text-white">
                                    ฿{formatCurrency(data.summary.grandTotal)}
                                </p>
                                <p className="text-xs text-green-200">รวมสุทธิ</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Daily Table */}
                {data && (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                ตารางรายวัน
                            </CardTitle>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700">
                                        <TableHead className="text-slate-300">วันที่</TableHead>
                                        <TableHead className="text-slate-300">วัน</TableHead>
                                        <TableHead className="text-slate-300 text-center">เข้า</TableHead>
                                        <TableHead className="text-slate-300 text-center">ออก</TableHead>
                                        <TableHead className="text-slate-300 text-center">ชม.</TableHead>
                                        <TableHead className="text-slate-300 text-center">พัก</TableHead>
                                        <TableHead className="text-slate-300 text-center">OT (ชม.)</TableHead>
                                        <TableHead className="text-slate-300 text-center w-28">ค่าแรง/วัน</TableHead>
                                        <TableHead className="text-slate-300 text-center w-28">ค่า OT</TableHead>
                                        <TableHead className="text-slate-300 text-center w-28">หักสาย</TableHead>
                                        <TableHead className="text-slate-300 text-center w-28">ปรับเงิน</TableHead>
                                        <TableHead className="text-slate-300 text-right">รวม</TableHead>
                                        <TableHead className="text-slate-300 text-center w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.dailyRecords.map((record) => {
                                        const isWeekend = ["เสาร์", "อาทิตย์"].includes(record.dayOfWeek);
                                        const hasOverride = record.isWageOverridden || record.isOTOverridden || record.isLatePenaltyOverridden || record.adjustment !== 0;
                                        const isSaving = savingDate === record.date;

                                        return (
                                            <TableRow
                                                key={record.date}
                                                className={`border - slate - 700 ${isWeekend ? "bg-slate-800/30" : ""} `}
                                            >
                                                <TableCell className="text-slate-400 font-mono text-sm">
                                                    {record.date.slice(5)}
                                                </TableCell>
                                                <TableCell className={`${isWeekend ? "text-red-400" : "text-slate-300"} `}>
                                                    <div className="flex items-center gap-1">
                                                        {record.dayOfWeek}
                                                        {record.absentColleagues.length > 0 && (
                                                            <span
                                                                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full"
                                                            >
                                                                <Users className="w-3 h-3 shrink-0" />
                                                                {record.absentColleagues.map(c => c.nickName || c.name).join(", ")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                {/* Check-in Cell - Editable */}
                                                <TableCell className="text-center">
                                                    {editingCell?.date === record.date && editingCell?.field === "checkIn" ? (
                                                        <Input
                                                            type="time"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleSaveEdit}
                                                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                                            className="w-24 bg-slate-700 border-cyan-500 text-white text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartEdit(record.date, "checkIn", record.checkInTime)}
                                                            className="px-2 py-1 rounded hover:bg-slate-700 text-white flex items-center justify-center gap-1 w-full group"
                                                            disabled={isSaving}
                                                        >
                                                            {formatTime(record.checkInTime)}
                                                            <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition" />
                                                        </button>
                                                    )}
                                                </TableCell>
                                                {/* Check-out Cell - Editable */}
                                                <TableCell className="text-center">
                                                    {editingCell?.date === record.date && editingCell?.field === "checkOut" ? (
                                                        <Input
                                                            type="time"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleSaveEdit}
                                                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                                            className="w-24 bg-slate-700 border-cyan-500 text-white text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartEdit(record.date, "checkOut", record.checkOutTime)}
                                                            className="px-2 py-1 rounded hover:bg-slate-700 text-white flex items-center justify-center gap-1 w-full group"
                                                            disabled={isSaving}
                                                        >
                                                            {formatTime(record.checkOutTime)}
                                                            <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition" />
                                                        </button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center text-blue-400">
                                                    {record.actualHours?.toFixed(1) || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-cyan-400">
                                                    {record.breakMinutes != null ? `${record.breakMinutes} น.` : "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-purple-400">
                                                    {record.otHours > 0 ? record.otHours.toFixed(1) : "-"}
                                                </TableCell>

                                                {/* Wage Cell - Editable */}
                                                <TableCell className="text-center">
                                                    {editingCell?.date === record.date && editingCell?.field === "wage" ? (
                                                        <Input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleSaveEdit}
                                                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                                            className="w-24 bg-slate-700 border-amber-500 text-white text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartEdit(record.date, "wage", record.dailyWage)}
                                                            className={`px - 2 py - 1 rounded hover: bg - slate - 700 w - full ${record.isWageOverridden
                                                                ? "text-amber-400 font-bold bg-amber-500/10"
                                                                : "text-green-400"
                                                                } `}
                                                            disabled={isSaving}
                                                        >
                                                            {record.dailyWage > 0 ? formatCurrency(record.dailyWage) : "-"}
                                                        </button>
                                                    )}
                                                </TableCell>

                                                {/* OT Cell - Editable */}
                                                <TableCell className="text-center">
                                                    {editingCell?.date === record.date && editingCell?.field === "ot" ? (
                                                        <Input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleSaveEdit}
                                                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                                            className="w-24 bg-slate-700 border-amber-500 text-white text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartEdit(record.date, "ot", record.otAmount)}
                                                            className={`px - 2 py - 1 rounded hover: bg - slate - 700 w - full ${record.isOTOverridden
                                                                ? "text-amber-400 font-bold bg-amber-500/10"
                                                                : "text-purple-400"
                                                                } `}
                                                            disabled={isSaving}
                                                        >
                                                            {record.otAmount > 0 ? formatCurrency(record.otAmount) : "-"}
                                                        </button>
                                                    )}
                                                </TableCell>

                                                {/* Late Penalty Cell - Editable */}
                                                <TableCell className="text-center">
                                                    {editingCell?.date === record.date && editingCell?.field === "latePenalty" ? (
                                                        <Input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleSaveEdit}
                                                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                                            className="w-24 bg-slate-700 border-red-500 text-white text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartEdit(record.date, "latePenalty", record.latePenalty)}
                                                            className={`px - 2 py - 1 rounded hover: bg - slate - 700 w - full ${record.isLatePenaltyOverridden
                                                                ? "text-amber-400 font-bold bg-amber-500/10"
                                                                : "text-red-400"
                                                                } `}
                                                            disabled={isSaving}
                                                        >
                                                            {record.latePenalty > 0 ? `- ${formatCurrency(record.latePenalty)} ` : "-"}
                                                        </button>
                                                    )}
                                                </TableCell>

                                                {/* Adjustment Cell - Editable */}
                                                <TableCell className="text-center">
                                                    {editingCell?.date === record.date && editingCell?.field === "adjustment" ? (
                                                        <Input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleSaveEdit}
                                                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                                            className="w-24 bg-slate-700 border-amber-500 text-white text-center"
                                                            placeholder="0"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartEdit(record.date, "adjustment", record.adjustment)}
                                                            className={`px - 2 py - 1 rounded hover: bg - slate - 700 w - full ${record.adjustment > 0 ? "text-amber-400 font-bold bg-amber-500/10"
                                                                : record.adjustment < 0 ? "text-red-400 font-bold bg-red-500/10"
                                                                    : "text-slate-500"
                                                                } `}
                                                            disabled={isSaving}
                                                        >
                                                            {record.adjustment !== 0 ? (record.adjustment > 0 ? `+ ${formatCurrency(record.adjustment)} ` : formatCurrency(record.adjustment)) : "-"}
                                                        </button>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right text-white font-bold">
                                                    {record.total > 0 ? formatCurrency(record.total) : record.total < 0 ? formatCurrency(record.total) : "-"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {hasOverride && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-slate-400 hover:text-red-400"
                                                            onClick={() => handleResetOverride(record.date)}
                                                            disabled={isSaving}
                                                            title="รีเซ็ตกลับค่าเริ่มต้น"
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <RotateCcw className="w-3 h-3" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}

                {/* Empty State */}
                {!data && !isLoading && (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="py-12 text-center">
                            <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">ไม่พบข้อมูลพนักงาน</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
