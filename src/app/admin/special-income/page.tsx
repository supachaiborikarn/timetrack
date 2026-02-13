"use client";

import { useState, useEffect, useCallback } from "react";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Loader2,
    TrendingUp,
    DollarSign,
    Users,
    CheckCircle2,
    Clock,
    Pencil,
    Trash2,
    Check,
    Search,
    Percent,
    Gift,
    HandCoins,
    MoreHorizontal,
    CalendarDays,
    Save,
    ListFilter,
    LayoutList,
} from "lucide-react";
import { format, getBangkokNow, startOfMonth, endOfMonth, addDays } from "@/lib/date-utils";

// Types
interface Station {
    id: string;
    name: string;
}

interface Employee {
    id: string;
    name: string;
    employeeId: string;
    nickName?: string;
    role: string;
    station?: { id: string; name: string };
    department?: { id: string; name: string };
    stationId?: string;
}

interface SpecialIncomeRecord {
    id: string;
    userId: string;
    date: string;
    shiftId?: string;
    stationId?: string;
    type: string;
    description?: string;
    salesAmount?: number;
    percentage?: number;
    amount: number;
    status: string;
    approvedBy?: string;
    approvedAt?: string;
    createdBy: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        employeeId: string;
        nickName?: string;
        station?: { id: string; name: string };
        department?: { id: string; name: string };
    };
}

interface Summary {
    totalRecords: number;
    totalAmount: number;
    totalSalesCommission: number;
    totalBonus: number;
    totalTip: number;
    totalOther: number;
    uniqueEmployees: number;
    pendingCount: number;
    approvedCount: number;
    paidCount: number;
}

// Daily entry state per employee
interface DailyEntry {
    salesAmount: string;
    percentage: string;
    amount: string;
    description: string;
    existingId?: string; // if already has a record for this date
    existingStatus?: string;
}

const TYPE_OPTIONS = [
    { value: "SALES_COMMISSION", label: "เปอร์เซ็นต์ขาย", icon: Percent, color: "text-blue-400" },
    { value: "BONUS", label: "โบนัส", icon: Gift, color: "text-amber-400" },
    { value: "TIP", label: "ทิป", icon: HandCoins, color: "text-green-400" },
    { value: "OTHER", label: "อื่นๆ", icon: MoreHorizontal, color: "text-slate-400" },
];

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
    PENDING: { label: "รออนุมัติ", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    APPROVED: { label: "อนุมัติแล้ว", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    PAID: { label: "จ่ายแล้ว", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export default function SpecialIncomePage() {
    const { data: session, status } = useSession();
    const [stations, setStations] = useState<Station[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [records, setRecords] = useState<SpecialIncomeRecord[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // View mode: "daily" (daily entry) or "list" (all records)
    const [viewMode, setViewMode] = useState<"daily" | "list">("daily");

    // Daily Entry controls
    const now = getBangkokNow();
    const [selectedDate, setSelectedDate] = useState(format(now, "yyyy-MM-dd"));
    const [selectedStation, setSelectedStation] = useState("all");

    // Daily view date range filter
    const [dailyRangeStart, setDailyRangeStart] = useState(format(now, "yyyy-MM-dd"));
    const [dailyRangeEnd, setDailyRangeEnd] = useState(format(now, "yyyy-MM-dd"));
    const [dailyRangeMode, setDailyRangeMode] = useState<"day" | "week" | "month" | "payroll" | "custom">("day");

    // Daily entries: { [userId]: DailyEntry }
    const [dailyEntries, setDailyEntries] = useState<Record<string, DailyEntry>>({});
    const [changedEntries, setChangedEntries] = useState<Set<string>>(new Set());

    // List view filters
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
    const [searchQuery, setSearchQuery] = useState("");

    // Modals
    const [addOtherModalOpen, setAddOtherModalOpen] = useState(false);
    const [addOtherForm, setAddOtherForm] = useState({
        userId: "",
        type: "BONUS" as string,
        amount: "",
        description: "",
    });
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchStations();
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (viewMode === "daily") {
            fetchDailyRecords();
        } else {
            fetchAllRecords();
        }
    }, [viewMode, dailyRangeStart, dailyRangeEnd, selectedStation, startDate, endDate, filterType, filterStatus]);

    const fetchStations = async () => {
        try {
            const res = await fetch("/api/admin/stations");
            if (res.ok) {
                const data = await res.json();
                setStations(data.stations || []);
            }
        } catch (err) {
            console.error("Failed to fetch stations:", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch("/api/admin/employees");
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.employees || data || []);
            }
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        }
    };

    const fetchDailyRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                startDate: dailyRangeStart,
                endDate: dailyRangeEnd,
                ...(selectedStation !== "all" && { stationId: selectedStation }),
            });

            const res = await fetch(`/api/admin/special-income?${params}`);
            if (res.ok) {
                const data = await res.json();
                const dayRecords: SpecialIncomeRecord[] = data.records || [];

                // Populate daily entries from existing records (for single day mode)
                const entries: Record<string, DailyEntry> = {};
                if (dailyRangeMode === "day") {
                    for (const rec of dayRecords) {
                        if (rec.type === "SALES_COMMISSION") {
                            entries[rec.userId] = {
                                salesAmount: rec.salesAmount ? String(rec.salesAmount) : "",
                                percentage: rec.percentage ? String(rec.percentage) : "",
                                amount: String(rec.amount),
                                description: rec.description || "",
                                existingId: rec.id,
                                existingStatus: rec.status,
                            };
                        }
                    }
                }
                setDailyEntries(entries);
                setChangedEntries(new Set());
                setRecords(dayRecords);
                setSummary(data.summary);
            }
        } catch (err) {
            console.error("Failed to fetch daily records:", err);
        } finally {
            setIsLoading(false);
        }
    }, [dailyRangeStart, dailyRangeEnd, selectedStation, dailyRangeMode]);

    const fetchAllRecords = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                ...(selectedStation !== "all" && { stationId: selectedStation }),
                ...(filterType !== "all" && { type: filterType }),
                ...(filterStatus !== "all" && { status: filterStatus }),
            });

            const res = await fetch(`/api/admin/special-income?${params}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
                setSummary(data.summary);
            }
        } catch (err) {
            console.error("Failed to fetch records:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Get clerks (CASHIER only) for the selected station
    const clerks = employees.filter((emp) => {
        if (emp.role !== "CASHIER") return false;
        if (selectedStation === "all") return true;
        return emp.stationId === selectedStation || emp.station?.id === selectedStation;
    });

    // Update a daily entry
    const updateEntry = (userId: string, field: keyof DailyEntry, value: string) => {
        setDailyEntries(prev => {
            const entry = prev[userId] || { salesAmount: "", percentage: "", amount: "", description: "" };
            const updated = { ...entry, [field]: value };

            // Auto-calculate amount from salesAmount × percentage
            if (field === "salesAmount" || field === "percentage") {
                const sales = parseFloat(field === "salesAmount" ? value : updated.salesAmount);
                const pct = parseFloat(field === "percentage" ? value : updated.percentage);
                if (!isNaN(sales) && !isNaN(pct)) {
                    updated.amount = ((sales * pct) / 100).toFixed(2);
                }
            }

            return { ...prev, [userId]: updated };
        });
        setChangedEntries(prev => new Set(prev).add(userId));
    };

    // Save all changed daily entries
    const saveAllEntries = async () => {
        if (changedEntries.size === 0) return;

        setIsSaving(true);
        try {
            let savedCount = 0;
            let errorCount = 0;

            for (const userId of changedEntries) {
                const entry = dailyEntries[userId];
                if (!entry || !entry.amount || parseFloat(entry.amount) === 0) continue;

                const payload = {
                    userId,
                    date: selectedDate,
                    stationId: selectedStation !== "all" ? selectedStation : null,
                    type: "SALES_COMMISSION",
                    description: entry.description || null,
                    salesAmount: entry.salesAmount || null,
                    percentage: entry.percentage || null,
                    amount: entry.amount,
                };

                let res;
                if (entry.existingId) {
                    // Update existing
                    res = await fetch(`/api/admin/special-income/${entry.existingId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                } else {
                    // Create new
                    res = await fetch("/api/admin/special-income", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                }

                if (res.ok) {
                    savedCount++;
                } else {
                    errorCount++;
                }
            }

            if (errorCount > 0) {
                alert(`บันทึกสำเร็จ ${savedCount} รายการ, ล้มเหลว ${errorCount} รายการ`);
            }

            // Refresh data
            fetchDailyRecords();
        } catch (err) {
            console.error("Failed to save entries:", err);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsSaving(false);
        }
    };

    // Add other type income (bonus, tip, etc.)
    const handleAddOther = async () => {
        if (!addOtherForm.userId || !addOtherForm.amount) {
            alert("กรุณาเลือกพนักงานและกรอกจำนวนเงิน");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/special-income", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: addOtherForm.userId,
                    date: selectedDate,
                    stationId: selectedStation !== "all" ? selectedStation : null,
                    type: addOtherForm.type,
                    description: addOtherForm.description || null,
                    amount: addOtherForm.amount,
                }),
            });

            if (res.ok) {
                setAddOtherModalOpen(false);
                setAddOtherForm({ userId: "", type: "BONUS", amount: "", description: "" });
                if (viewMode === "daily") fetchDailyRecords();
                else fetchAllRecords();
            } else {
                alert("เกิดข้อผิดพลาด");
            }
        } catch (err) {
            console.error("Failed to add:", err);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await fetch(`/api/admin/special-income/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "APPROVED" }),
            });
            if (viewMode === "daily") fetchDailyRecords();
            else fetchAllRecords();
        } catch (err) {
            console.error("Failed to approve:", err);
        }
    };

    const handleApproveAll = async () => {
        const pendingRecords = records.filter(r => r.status === "PENDING");
        if (pendingRecords.length === 0) return;

        setIsSaving(true);
        try {
            for (const rec of pendingRecords) {
                await fetch(`/api/admin/special-income/${rec.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "APPROVED" }),
                });
            }
            if (viewMode === "daily") fetchDailyRecords();
            else fetchAllRecords();
        } catch (err) {
            console.error("Failed to approve all:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await fetch(`/api/admin/special-income/${deleteId}`, { method: "DELETE" });
            if (viewMode === "daily") fetchDailyRecords();
            else fetchAllRecords();
        } catch (err) {
            console.error("Failed to delete:", err);
        } finally {
            setDeleteId(null);
        }
    };

    // Date navigation (for single day mode)
    const goToPreviousDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        const dateStr = format(d, "yyyy-MM-dd");
        setSelectedDate(dateStr);
        setDailyRangeStart(dateStr);
        setDailyRangeEnd(dateStr);
        setDailyRangeMode("day");
    };

    const goToNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        const dateStr = format(d, "yyyy-MM-dd");
        setSelectedDate(dateStr);
        setDailyRangeStart(dateStr);
        setDailyRangeEnd(dateStr);
        setDailyRangeMode("day");
    };

    const goToToday = () => {
        const dateStr = format(now, "yyyy-MM-dd");
        setSelectedDate(dateStr);
        setDailyRangeStart(dateStr);
        setDailyRangeEnd(dateStr);
        setDailyRangeMode("day");
    };

    // Range presets
    const setRangePreset = (mode: "day" | "week" | "month" | "payroll") => {
        setDailyRangeMode(mode);
        const today = getBangkokNow();
        if (mode === "day") {
            const dateStr = format(today, "yyyy-MM-dd");
            setSelectedDate(dateStr);
            setDailyRangeStart(dateStr);
            setDailyRangeEnd(dateStr);
        } else if (mode === "week") {
            const dayOfWeek = today.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(today);
            monday.setDate(today.getDate() + mondayOffset);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            setDailyRangeStart(format(monday, "yyyy-MM-dd"));
            setDailyRangeEnd(format(sunday, "yyyy-MM-dd"));
        } else if (mode === "month") {
            setDailyRangeStart(format(startOfMonth(today), "yyyy-MM-dd"));
            setDailyRangeEnd(format(endOfMonth(today), "yyyy-MM-dd"));
        } else if (mode === "payroll") {
            // Payroll period: 26th of previous month to 25th of current month
            const currentDay = today.getDate();
            let payrollStart: Date;
            let payrollEnd: Date;
            if (currentDay >= 26) {
                payrollStart = new Date(today.getFullYear(), today.getMonth(), 26);
                payrollEnd = new Date(today.getFullYear(), today.getMonth() + 1, 25);
            } else {
                payrollStart = new Date(today.getFullYear(), today.getMonth() - 1, 26);
                payrollEnd = new Date(today.getFullYear(), today.getMonth(), 25);
            }
            setDailyRangeStart(format(payrollStart, "yyyy-MM-dd"));
            setDailyRangeEnd(format(payrollEnd, "yyyy-MM-dd"));
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const formatThaiDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const formatShortDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });

    // Calculate daily total
    const dailyTotal = Object.values(dailyEntries).reduce((sum, e) => {
        const amount = parseFloat(e.amount) || 0;
        return sum + amount;
    }, 0);

    const pendingCount = records.filter(r => r.status === "PENDING").length;

    // Filtered records for list view
    const filteredRecords = searchQuery
        ? records.filter(r =>
            r.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.user.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : records;

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <a href="/admin">
                            <ChevronLeft className="w-5 h-5" />
                        </a>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                            รายได้พิเศษ
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            ลงเปอร์เซ็นต์ขายรายวัน / โบนัส / ทิป
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        <Button
                            variant={viewMode === "daily" ? "default" : "ghost"}
                            size="sm"
                            className={`rounded-none ${viewMode === "daily" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
                            onClick={() => setViewMode("daily")}
                        >
                            <CalendarDays className="w-4 h-4 mr-1.5" />
                            รายวัน
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="sm"
                            className={`rounded-none ${viewMode === "list" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
                            onClick={() => setViewMode("list")}
                        >
                            <LayoutList className="w-4 h-4 mr-1.5" />
                            รายการทั้งหมด
                        </Button>
                    </div>
                </div>
            </div>

            {/* ============ DAILY VIEW ============ */}
            {viewMode === "daily" && (
                <>
                    {/* Controls: Date Range + Station */}
                    <Card className="border-border">
                        <CardContent className="py-4 space-y-3">
                            {/* Row 1: Range presets + Station + Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Range presets */}
                                <div className="flex border border-border rounded-lg overflow-hidden">
                                    <Button
                                        variant={dailyRangeMode === "day" ? "default" : "ghost"}
                                        size="sm"
                                        className={`rounded-none text-xs ${dailyRangeMode === "day" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                                        onClick={() => setRangePreset("day")}
                                    >
                                        วันนี้
                                    </Button>
                                    <Button
                                        variant={dailyRangeMode === "week" ? "default" : "ghost"}
                                        size="sm"
                                        className={`rounded-none text-xs ${dailyRangeMode === "week" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                                        onClick={() => setRangePreset("week")}
                                    >
                                        สัปดาห์นี้
                                    </Button>
                                    <Button
                                        variant={dailyRangeMode === "month" ? "default" : "ghost"}
                                        size="sm"
                                        className={`rounded-none text-xs ${dailyRangeMode === "month" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                                        onClick={() => setRangePreset("month")}
                                    >
                                        เดือนนี้
                                    </Button>
                                    <Button
                                        variant={dailyRangeMode === "payroll" ? "default" : "ghost"}
                                        size="sm"
                                        className={`rounded-none text-xs ${dailyRangeMode === "payroll" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                                        onClick={() => setRangePreset("payroll")}
                                    >
                                        รอบเงินเดือน
                                    </Button>
                                    <Button
                                        variant={dailyRangeMode === "custom" ? "default" : "ghost"}
                                        size="sm"
                                        className={`rounded-none text-xs ${dailyRangeMode === "custom" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                                        onClick={() => setDailyRangeMode("custom")}
                                    >
                                        กำหนดเอง
                                    </Button>
                                </div>

                                <div className="h-8 w-px bg-border hidden md:block" />

                                {/* Station */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">สถานี:</span>
                                    <Select value={selectedStation} onValueChange={setSelectedStation}>
                                        <SelectTrigger className="w-36">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">ทุกสถานี</SelectItem>
                                            {stations.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex-1" />

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAddOtherModalOpen(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        โบนัส/ทิป
                                    </Button>
                                    {pendingCount > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                                            onClick={handleApproveAll}
                                            disabled={isSaving}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            อนุมัติทั้งหมด ({pendingCount})
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Date controls */}
                            <div className="flex flex-wrap items-center gap-3">
                                {dailyRangeMode === "day" ? (
                                    /* Single day navigation */
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" onClick={goToPreviousDay} className="h-8 w-8">
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <div className="text-center">
                                            <Input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => {
                                                    setSelectedDate(e.target.value);
                                                    setDailyRangeStart(e.target.value);
                                                    setDailyRangeEnd(e.target.value);
                                                }}
                                                className="text-center font-medium w-40"
                                            />
                                        </div>
                                        <Button variant="outline" size="icon" onClick={goToNextDay} className="h-8 w-8">
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                        <span className="text-xs text-muted-foreground">{formatThaiDate(selectedDate)}</span>
                                    </div>
                                ) : (
                                    /* Date range */
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">ตั้งแต่:</span>
                                        <Input
                                            type="date"
                                            value={dailyRangeStart}
                                            onChange={(e) => {
                                                setDailyRangeStart(e.target.value);
                                                if (dailyRangeMode !== "custom") setDailyRangeMode("custom");
                                            }}
                                            className="w-36"
                                        />
                                        <span className="text-sm text-muted-foreground">ถึง:</span>
                                        <Input
                                            type="date"
                                            value={dailyRangeEnd}
                                            onChange={(e) => {
                                                setDailyRangeEnd(e.target.value);
                                                if (dailyRangeMode !== "custom") setDailyRangeMode("custom");
                                            }}
                                            className="w-36"
                                        />
                                        <span className="text-xs text-muted-foreground">(
                                            {formatThaiDate(dailyRangeStart)}
                                            {dailyRangeStart !== dailyRangeEnd && ` — ${formatThaiDate(dailyRangeEnd)}`}
                                            )</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="border-border bg-gradient-to-br from-emerald-500/10 to-transparent">
                            <CardContent className="py-3 flex items-center gap-3">
                                <DollarSign className="w-8 h-8 text-emerald-500 shrink-0" />
                                <div>
                                    <p className="text-xl font-bold text-emerald-500">
                                        ฿{formatCurrency(dailyRangeMode === "day" ? dailyTotal : (summary?.totalAmount || 0))}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {dailyRangeMode === "day" ? "รวมวันนี้" : "รวมช่วงที่เลือก"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border">
                            <CardContent className="py-3 flex items-center gap-3">
                                <Users className="w-8 h-8 text-purple-400 shrink-0" />
                                <div>
                                    <p className="text-xl font-bold text-purple-400">
                                        {dailyRangeMode === "day" ? clerks.length : (summary?.uniqueEmployees || 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {dailyRangeMode === "day" ? "เสมียน" : "พนักงาน"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border">
                            <CardContent className="py-3 flex items-center gap-3">
                                <Percent className="w-8 h-8 text-blue-400 shrink-0" />
                                <div>
                                    <p className="text-xl font-bold text-blue-400">
                                        {dailyRangeMode === "day"
                                            ? Object.values(dailyEntries).filter(e => parseFloat(e.amount) > 0).length
                                            : (summary?.totalRecords || 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {dailyRangeMode === "day" ? "ลงข้อมูลแล้ว" : "รายการทั้งหมด"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border">
                            <CardContent className="py-3 flex items-center gap-3">
                                <Clock className="w-8 h-8 text-yellow-400 shrink-0" />
                                <div>
                                    <p className="text-xl font-bold text-yellow-400">{pendingCount}</p>
                                    <p className="text-xs text-muted-foreground">รออนุมัติ</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* === Single day: Inline entry table === */}
                    {dailyRangeMode === "day" && (
                        <>
                            <Card className="border-border">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Percent className="w-4 h-4 text-blue-400" />
                                            เปอร์เซ็นต์ขายประจำวัน
                                            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                        </CardTitle>
                                        <Button
                                            onClick={saveAllEntries}
                                            disabled={changedEntries.size === 0 || isSaving}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            size="sm"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-1.5" />
                                            )}
                                            บันทึก {changedEntries.size > 0 ? `(${changedEntries.size})` : ""}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-8">#</TableHead>
                                                <TableHead className="min-w-[150px]">พนักงาน</TableHead>
                                                <TableHead className="w-[140px] text-right">ยอดขาย (฿)</TableHead>
                                                <TableHead className="w-[100px] text-center">% เปอร์เซ็นต์</TableHead>
                                                <TableHead className="w-[140px] text-right">จำนวนเงิน (฿)</TableHead>
                                                <TableHead className="min-w-[160px]">หมายเหตุ</TableHead>
                                                <TableHead className="w-[80px] text-center">สถานะ</TableHead>
                                                <TableHead className="w-[70px] text-center">จัดการ</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clerks.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                        <p>ไม่พบเสมียนในสถานีที่เลือก</p>
                                                        <p className="text-xs mt-1">กรุณาเลือกสถานี หรือตรวจสอบข้อมูลพนักงาน</p>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                clerks.map((emp, index) => {
                                                    const entry = dailyEntries[emp.id] || { salesAmount: "", percentage: "", amount: "", description: "" };
                                                    const hasExisting = !!entry.existingId;
                                                    const isChanged = changedEntries.has(emp.id);
                                                    const hasAmount = parseFloat(entry.amount) > 0;

                                                    return (
                                                        <TableRow
                                                            key={emp.id}
                                                            className={`
                                                                ${isChanged ? "bg-emerald-500/5" : ""}
                                                                ${hasExisting && !isChanged ? "bg-blue-500/5" : ""}
                                                            `}
                                                        >
                                                            <TableCell className="text-muted-foreground text-xs">
                                                                {index + 1}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${hasExisting ? "bg-emerald-500" : "bg-slate-600"}`} />
                                                                    <div>
                                                                        <p className="font-medium text-sm">
                                                                            {emp.nickName || emp.name}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {emp.employeeId}
                                                                            {emp.station && ` • ${emp.station.name}`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={entry.salesAmount}
                                                                    onChange={(e) => updateEntry(emp.id, "salesAmount", e.target.value)}
                                                                    className="text-right h-8 text-sm"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={entry.percentage}
                                                                    onChange={(e) => updateEntry(emp.id, "percentage", e.target.value)}
                                                                    className="text-center h-8 text-sm"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={entry.amount}
                                                                    onChange={(e) => updateEntry(emp.id, "amount", e.target.value)}
                                                                    className={`text-right h-8 text-sm font-bold ${hasAmount ? "text-emerald-500" : ""}`}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    placeholder="หมายเหตุ..."
                                                                    value={entry.description}
                                                                    onChange={(e) => updateEntry(emp.id, "description", e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {entry.existingStatus ? (
                                                                    <Badge variant="outline" className={`text-[10px] ${STATUS_BADGES[entry.existingStatus]?.color || ""}`}>
                                                                        {STATUS_BADGES[entry.existingStatus]?.label || entry.existingStatus}
                                                                    </Badge>
                                                                ) : hasAmount ? (
                                                                    <span className="text-[10px] text-muted-foreground">ใหม่</span>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {entry.existingId && entry.existingStatus === "PENDING" && (
                                                                    <div className="flex gap-0.5 justify-center">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-green-400 hover:text-green-300 h-7 w-7 p-0"
                                                                            onClick={() => handleApprove(entry.existingId!)}
                                                                            title="อนุมัติ"
                                                                        >
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                                                                            onClick={() => setDeleteId(entry.existingId!)}
                                                                            title="ลบ"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {/* Daily total footer */}
                                {clerks.length > 0 && (
                                    <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-muted/30">
                                        <span className="text-sm font-medium text-muted-foreground">รวมทั้งวัน</span>
                                        <span className="text-lg font-bold text-emerald-500">฿{formatCurrency(dailyTotal)}</span>
                                    </div>
                                )}
                            </Card>

                            {/* Other income for this day (if any) */}
                            {records.filter(r => r.type !== "SALES_COMMISSION").length > 0 && (
                                <Card className="border-border">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Gift className="w-4 h-4 text-amber-400" />
                                            โบนัส / ทิป / อื่นๆ วันนี้
                                        </CardTitle>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>พนักงาน</TableHead>
                                                    <TableHead>ประเภท</TableHead>
                                                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                                                    <TableHead>รายละเอียด</TableHead>
                                                    <TableHead className="text-center">สถานะ</TableHead>
                                                    <TableHead className="text-center w-20">จัดการ</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {records.filter(r => r.type !== "SALES_COMMISSION").map(rec => (
                                                    <TableRow key={rec.id}>
                                                        <TableCell className="font-medium text-sm">{rec.user.name}</TableCell>
                                                        <TableCell>
                                                            <span className={`text-sm ${TYPE_OPTIONS.find(t => t.value === rec.type)?.color || ""}`}>
                                                                {TYPE_OPTIONS.find(t => t.value === rec.type)?.label || rec.type}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-emerald-500">
                                                            ฿{formatCurrency(Number(rec.amount))}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{rec.description || "-"}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className={STATUS_BADGES[rec.status]?.color || ""}>
                                                                {STATUS_BADGES[rec.status]?.label || rec.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex gap-0.5 justify-center">
                                                                {rec.status === "PENDING" && (
                                                                    <Button
                                                                        variant="ghost" size="sm"
                                                                        className="text-green-400 h-7 w-7 p-0"
                                                                        onClick={() => handleApprove(rec.id)}
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost" size="sm"
                                                                    className="text-red-400 h-7 w-7 p-0"
                                                                    onClick={() => setDeleteId(rec.id)}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
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

                    {/* === Range mode: Records table === */}
                    {dailyRangeMode !== "day" && (
                        <Card className="border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-blue-400" />
                                        รายการรายได้พิเศษ
                                        {records.length > 0 && (
                                            <Badge variant="outline" className="text-xs">{records.length} รายการ</Badge>
                                        )}
                                        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">วันที่</TableHead>
                                            <TableHead className="min-w-[130px]">พนักงาน</TableHead>
                                            <TableHead>ประเภท</TableHead>
                                            <TableHead className="text-right">ยอดขาย</TableHead>
                                            <TableHead className="text-center">%</TableHead>
                                            <TableHead className="text-right">จำนวนเงิน</TableHead>
                                            <TableHead className="text-center">สถานะ</TableHead>
                                            <TableHead>รายละเอียด</TableHead>
                                            <TableHead className="text-center w-20">จัดการ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {records.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                                    {isLoading ? (
                                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                                    ) : (
                                                        <div>
                                                            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                            <p>ไม่มีข้อมูลในช่วงที่เลือก</p>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            records.map((rec) => (
                                                <TableRow key={rec.id}>
                                                    <TableCell className="text-sm whitespace-nowrap">{formatShortDate(rec.date)}</TableCell>
                                                    <TableCell>
                                                        <p className="font-medium text-sm">{rec.user.name}</p>
                                                        <p className="text-xs text-muted-foreground">{rec.user.employeeId}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`text-sm ${TYPE_OPTIONS.find(t => t.value === rec.type)?.color || ""}`}>
                                                            {TYPE_OPTIONS.find(t => t.value === rec.type)?.label || rec.type}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {rec.salesAmount ? `฿${formatCurrency(Number(rec.salesAmount))}` : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm">
                                                        {rec.percentage ? `${Number(rec.percentage)}%` : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-500">
                                                        ฿{formatCurrency(Number(rec.amount))}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={STATUS_BADGES[rec.status]?.color || ""}>
                                                            {STATUS_BADGES[rec.status]?.label || rec.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                                                        {rec.description || "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-0.5 justify-center">
                                                            {rec.status === "PENDING" && (
                                                                <Button variant="ghost" size="sm" className="text-green-400 h-7 w-7 p-0" onClick={() => handleApprove(rec.id)}>
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="sm" className="text-red-400 h-7 w-7 p-0" onClick={() => setDeleteId(rec.id)}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Range total footer */}
                            {records.length > 0 && (
                                <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-muted/30">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        รวม {records.length} รายการ
                                    </span>
                                    <span className="text-lg font-bold text-emerald-500">
                                        ฿{formatCurrency(summary?.totalAmount || 0)}
                                    </span>
                                </div>
                            )}
                        </Card>
                    )}
                </>
            )}

            {/* ============ LIST VIEW ============ */}
            {viewMode === "list" && (
                <>
                    {/* Filters */}
                    <Card className="border-border">
                        <CardContent className="py-4">
                            <div className="flex flex-wrap items-end gap-3">
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
                                    <Select value={selectedStation} onValueChange={setSelectedStation}>
                                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">ทั้งหมด</SelectItem>
                                            {stations.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">ประเภท</label>
                                    <Select value={filterType} onValueChange={setFilterType}>
                                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">ทั้งหมด</SelectItem>
                                            {TYPE_OPTIONS.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">สถานะ</label>
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">ทั้งหมด</SelectItem>
                                            <SelectItem value="PENDING">รออนุมัติ</SelectItem>
                                            <SelectItem value="APPROVED">อนุมัติแล้ว</SelectItem>
                                            <SelectItem value="PAID">จ่ายแล้ว</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">ค้นหา</label>
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                                        <Input
                                            placeholder="ชื่อ..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8 w-36"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Card className="border-border bg-gradient-to-br from-emerald-500/10 to-transparent">
                                <CardContent className="py-3 text-center">
                                    <p className="text-xl font-bold text-emerald-500">฿{formatCurrency(summary.totalAmount)}</p>
                                    <p className="text-xs text-muted-foreground">รวมทั้งหมด</p>
                                </CardContent>
                            </Card>
                            <Card className="border-border">
                                <CardContent className="py-3 text-center">
                                    <p className="text-xl font-bold text-blue-400">฿{formatCurrency(summary.totalSalesCommission)}</p>
                                    <p className="text-xs text-muted-foreground">เปอร์เซ็นต์ขาย</p>
                                </CardContent>
                            </Card>
                            <Card className="border-border">
                                <CardContent className="py-3 text-center">
                                    <p className="text-xl font-bold text-purple-400">{summary.uniqueEmployees}</p>
                                    <p className="text-xs text-muted-foreground">พนักงาน</p>
                                </CardContent>
                            </Card>
                            <Card className="border-border">
                                <CardContent className="py-3 text-center">
                                    <p className="text-xl font-bold">{summary.totalRecords}</p>
                                    <p className="text-xs text-muted-foreground">รายการ</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* All records table */}
                    <Card className="border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>รายการรายได้พิเศษ</span>
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            </CardTitle>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>วันที่</TableHead>
                                        <TableHead>พนักงาน</TableHead>
                                        <TableHead>ประเภท</TableHead>
                                        <TableHead className="text-right">ยอดขาย</TableHead>
                                        <TableHead className="text-center">%</TableHead>
                                        <TableHead className="text-right">จำนวนเงิน</TableHead>
                                        <TableHead className="text-center">สถานะ</TableHead>
                                        <TableHead>รายละเอียด</TableHead>
                                        <TableHead className="text-center w-24">จัดการ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRecords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                                {isLoading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                                ) : (
                                                    <div>
                                                        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                        <p>ไม่มีข้อมูล</p>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRecords.map((rec) => (
                                            <TableRow key={rec.id}>
                                                <TableCell className="text-sm whitespace-nowrap">{formatShortDate(rec.date)}</TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-sm">{rec.user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{rec.user.employeeId}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`text-sm ${TYPE_OPTIONS.find(t => t.value === rec.type)?.color || ""}`}>
                                                        {TYPE_OPTIONS.find(t => t.value === rec.type)?.label || rec.type}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {rec.salesAmount ? `฿${formatCurrency(Number(rec.salesAmount))}` : "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-sm">
                                                    {rec.percentage ? `${Number(rec.percentage)}%` : "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-emerald-500">
                                                    ฿{formatCurrency(Number(rec.amount))}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={STATUS_BADGES[rec.status]?.color || ""}>
                                                        {STATUS_BADGES[rec.status]?.label || rec.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                                                    {rec.description || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-0.5 justify-center">
                                                        {rec.status === "PENDING" && (
                                                            <Button variant="ghost" size="sm" className="text-green-400 h-7 w-7 p-0" onClick={() => handleApprove(rec.id)}>
                                                                <Check className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" className="text-red-400 h-7 w-7 p-0" onClick={() => setDeleteId(rec.id)}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </>
            )}

            {/* Add Bonus/Tip Modal */}
            <Dialog open={addOtherModalOpen} onOpenChange={setAddOtherModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-amber-400" />
                            เพิ่มโบนัส / ทิป / อื่นๆ
                        </DialogTitle>
                        <DialogDescription>
                            วันที่ {formatThaiDate(selectedDate)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">พนักงาน <span className="text-red-500">*</span></label>
                            <Select value={addOtherForm.userId || "none"} onValueChange={(v) => setAddOtherForm(prev => ({ ...prev, userId: v === "none" ? "" : v }))}>
                                <SelectTrigger><SelectValue placeholder="เลือกพนักงาน" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">เลือกพนักงาน</SelectItem>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.employeeId} - {emp.name} {emp.nickName ? `(${emp.nickName})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">ประเภท</label>
                            <Select value={addOtherForm.type} onValueChange={(v) => setAddOtherForm(prev => ({ ...prev, type: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BONUS">โบนัส</SelectItem>
                                    <SelectItem value="TIP">ทิป</SelectItem>
                                    <SelectItem value="OTHER">อื่นๆ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">จำนวนเงิน (฿) <span className="text-red-500">*</span></label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={addOtherForm.amount}
                                onChange={(e) => setAddOtherForm(prev => ({ ...prev, amount: e.target.value }))}
                                className="text-lg font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">รายละเอียด</label>
                            <Input
                                placeholder="เช่น โบนัสพิเศษ, ทิปจากลูกค้า..."
                                value={addOtherForm.description}
                                onChange={(e) => setAddOtherForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOtherModalOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleAddOther} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700">
                            {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
                            เพิ่ม
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                        <AlertDialogDescription>
                            ต้องการลบรายการรายได้พิเศษนี้หรือไม่?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">ลบ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
