"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    ChevronRight,
    Download,
    RefreshCw,
    Loader2,
    Calendar,
    CalendarDays,
    LayoutGrid,
    Users,
    Trash2,
    Copy,
    ClipboardPaste,
    Check,
    X,
    MoreHorizontal,
    Edit,
    Plus,
    Zap,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import { QuickAssignPanel } from "@/components/shifts/quick-assign-panel";
import { RowQuickFill } from "@/components/shifts/row-quick-fill";
import { ShiftTemplateManager } from "@/components/shifts/shift-template-manager";
import { ShiftCalendarView } from "@/components/shifts/shift-calendar-view";
import { getShiftPastelColor, dayOffPastelColor, defaultPastelColor } from "@/lib/pastel-colors";

interface Station {
    id: string;
    name: string;
    code: string;
}

interface Shift {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
}


interface ScheduleEmployee {
    employee: {
        id: string;
        name: string;
        nickName: string | null;
        employeeId: string;
        department: string;
        departmentCode: string;
    };
    schedule: Record<string, { shiftId: string; shiftCode: string; isDayOff: boolean } | null>;
}

interface ScheduleData {
    month: number;
    year: number;
    daysInMonth: number;
    shifts: Shift[];
    scheduleData: ScheduleEmployee[];
}

interface SelectedCell {
    userId: string;
    userName: string;
    date: string;
    hasShift: boolean;
}



export default function ShiftManagementPage() {
    const { data: session, status } = useSession();
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStationId, setSelectedStationId] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Selection state for bulk operations
    const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [copiedCells, setCopiedCells] = useState<{ userId: string; date: string; shiftId: string; isDayOff: boolean }[]>([]);

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingCell, setEditingCell] = useState<{
        userId: string;
        userName: string;
        date: string;
        currentShiftId: string | null;
        isDayOff: boolean;
    } | null>(null);
    const [selectedShiftId, setSelectedShiftId] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    // Bulk assign dialog
    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkShiftId, setBulkShiftId] = useState<string>("");

    // Quick Assign Panel
    const [quickAssignOpen, setQuickAssignOpen] = useState(false);

    // Template Manager
    const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

    // View mode toggle
    const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

    const months = [
        { value: 1, label: "มกราคม" },
        { value: 2, label: "กุมภาพันธ์" },
        { value: 3, label: "มีนาคม" },
        { value: 4, label: "เมษายน" },
        { value: 5, label: "พฤษภาคม" },
        { value: 6, label: "มิถุนายน" },
        { value: 7, label: "กรกฎาคม" },
        { value: 8, label: "สิงหาคม" },
        { value: 9, label: "กันยายน" },
        { value: 10, label: "ตุลาคม" },
        { value: 11, label: "พฤศจิกายน" },
        { value: 12, label: "ธันวาคม" },
    ];

    const years = [2025, 2026, 2027];

    useEffect(() => {
        fetchStations();
    }, []);

    useEffect(() => {
        if (selectedStationId) {
            fetchSchedule();
        }
    }, [selectedStationId, selectedMonth, selectedYear]);

    const fetchStations = async () => {
        try {
            const res = await fetch("/api/admin/stations");
            if (res.ok) {
                const data = await res.json();
                setStations(data.stations || []);
                if (data.stations?.length > 0) {
                    setSelectedStationId(data.stations[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch stations:", error);
        }
    };

    const fetchSchedule = async () => {
        if (!selectedStationId) return;
        setIsLoading(true);
        try {
            const res = await fetch(
                `/api/admin/schedule?stationId=${selectedStationId}&month=${selectedMonth}&year=${selectedYear}`
            );
            if (res.ok) {
                const data = await res.json();
                setScheduleData(data);
            }
        } catch (error) {
            console.error("Failed to fetch schedule:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoGenerate = async () => {
        if (!selectedStationId) return;
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stationId: selectedStationId,
                    month: selectedMonth,
                    year: selectedYear,
                    pattern: { rotation: "monthly" },
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("สร้างตารางกะสำเร็จ", {
                    description: `สร้างแล้ว ${data.count} รายการ`,
                });
                fetchSchedule();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = () => {
        if (!selectedStationId) return;
        window.open(
            `/api/admin/schedule/export?stationId=${selectedStationId}&month=${selectedMonth}&year=${selectedYear}`,
            "_blank"
        );
    };

    const handleCellClick = (
        userId: string,
        userName: string,
        date: string,
        currentShiftId: string | null,
        isDayOff: boolean,
        event: React.MouseEvent
    ) => {
        // Shift+Click for multi-select
        if (event.shiftKey || isSelectionMode) {
            const cellKey = `${userId}-${date}`;
            const exists = selectedCells.find((c) => `${c.userId}-${c.date}` === cellKey);

            if (exists) {
                setSelectedCells(selectedCells.filter((c) => `${c.userId}-${c.date}` !== cellKey));
            } else {
                setSelectedCells([...selectedCells, { userId, userName, date, hasShift: !!currentShiftId }]);
            }
            return;
        }

        // Normal click - open edit dialog
        setEditingCell({ userId, userName, date, currentShiftId, isDayOff });
        setSelectedShiftId(isDayOff ? "DAYOFF" : (currentShiftId || ""));
        setEditDialogOpen(true);
    };

    const handleSaveShift = async () => {
        if (!editingCell) return;
        setIsSaving(true);

        try {
            const isDayOff = selectedShiftId === "DAYOFF";
            const shiftId = isDayOff
                ? (scheduleData?.shifts[0]?.id || "")
                : selectedShiftId;

            const res = await fetch("/api/admin/schedule", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: editingCell.userId,
                    date: editingCell.date,
                    shiftId,
                    isDayOff,
                }),
            });

            if (res.ok) {
                toast.success("บันทึกสำเร็จ");
                setEditDialogOpen(false);
                fetchSchedule();
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteShift = async () => {
        if (!editingCell) return;
        setIsSaving(true);

        try {
            const res = await fetch("/api/admin/schedule", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: editingCell.userId,
                    date: editingCell.date,
                }),
            });

            if (res.ok) {
                toast.success("ลบสำเร็จ");
                setEditDialogOpen(false);
                fetchSchedule();
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedCells.length === 0) return;

        try {
            const res = await fetch("/api/admin/schedule", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignments: selectedCells.map((c) => ({ userId: c.userId, date: c.date })),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message);
                setSelectedCells([]);
                fetchSchedule();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const handleBulkAssign = async () => {
        if (selectedCells.length === 0 || !bulkShiftId) return;

        const isDayOff = bulkShiftId === "DAYOFF";
        const shiftId = isDayOff ? scheduleData?.shifts[0]?.id : bulkShiftId;

        try {
            const res = await fetch("/api/admin/schedule/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "assign",
                    assignments: selectedCells.map((c) => ({
                        userId: c.userId,
                        date: c.date,
                        shiftId,
                        isDayOff,
                    })),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message);
                setBulkAssignOpen(false);
                setSelectedCells([]);
                fetchSchedule();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const handleCopySelected = () => {
        if (!scheduleData) return;

        const copies = selectedCells
            .map((cell) => {
                const employee = scheduleData.scheduleData.find((e) => e.employee.id === cell.userId);
                if (!employee) return null;
                const assignment = employee.schedule[cell.date];
                if (!assignment) return null;
                return {
                    userId: cell.userId,
                    date: cell.date,
                    shiftId: assignment.shiftId,
                    isDayOff: assignment.isDayOff,
                };
            })
            .filter(Boolean) as typeof copiedCells;

        setCopiedCells(copies);
        toast.success(`คัดลอก ${copies.length} รายการ`);
    };

    const clearSelection = () => {
        setSelectedCells([]);
        setIsSelectionMode(false);
    };

    const getShiftColor = (code: string) => {
        const color = getShiftPastelColor(code);
        return color;
    };

    const isCellSelected = (userId: string, date: string) => {
        return selectedCells.some((c) => c.userId === userId && c.date === date);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">จัดการตารางกะ</h1>
                    <p className="text-muted-foreground">ตั้งค่าและสร้างตารางกะรายเดือน</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "table"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            ตาราง
                        </button>
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "calendar"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <CalendarDays className="w-4 h-4" />
                            ปฏิทิน
                        </button>
                    </div>
                    <Button
                        onClick={() => setQuickAssignOpen(true)}
                        disabled={!scheduleData}
                        className="bg-yellow-600 hover:bg-yellow-700"
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        จัดกะเร็ว
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setTemplateManagerOpen(true)}
                        disabled={!scheduleData}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Templates
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={!scheduleData}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        onClick={handleAutoGenerate}
                        disabled={isGenerating || !selectedStationId}
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        สร้างอัตโนมัติ
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-4">
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <Select
                                value={selectedMonth.toString()}
                                onValueChange={(v) => setSelectedMonth(parseInt(v))}
                            >
                                <SelectTrigger className="w-32 bg-muted border-input">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {months.map((m) => (
                                        <SelectItem key={m.value} value={m.value.toString()}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(v) => setSelectedYear(parseInt(v))}
                            >
                                <SelectTrigger className="w-24 bg-muted border-input">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {years.map((y) => (
                                        <SelectItem key={y} value={y.toString()}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <Select
                                value={selectedStationId}
                                onValueChange={setSelectedStationId}
                            >
                                <SelectTrigger className="w-48 bg-muted border-input">
                                    <SelectValue placeholder="เลือกสถานี" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {stations.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {scheduleData && (
                            <div className="ml-auto text-sm text-muted-foreground">
                                {scheduleData.scheduleData.length} พนักงาน
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Selection Toolbar */}
            {selectedCells.length > 0 && (
                <Card className="bg-blue-900/30 border-blue-500/50 mb-4">
                    <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-blue-400" />
                                <span className="text-blue-300">
                                    เลือก {selectedCells.length} รายการ
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-blue-500 text-blue-300 hover:bg-blue-900/50"
                                    onClick={() => setBulkAssignOpen(true)}
                                >
                                    <Edit className="w-4 h-4 mr-1" />
                                    กำหนดกะ
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-500 text-green-300 hover:bg-green-900/50"
                                    onClick={handleCopySelected}
                                >
                                    <Copy className="w-4 h-4 mr-1" />
                                    คัดลอก
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500 text-red-300 hover:bg-red-900/50"
                                    onClick={handleBulkDelete}
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    ลบ
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-muted-foreground"
                                    onClick={clearSelection}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Shift Legend */}
            {scheduleData && (
                <Card className="bg-card border-border mb-4">
                    <CardContent className="py-3">
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-muted-foreground text-sm mr-2">กะ:</span>
                            {scheduleData.shifts.map((shift) => {
                                const color = getShiftColor(shift.code);
                                return (
                                    <span
                                        key={shift.id}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}
                                    >
                                        {shift.code}: {shift.startTime}-{shift.endTime}
                                    </span>
                                );
                            })}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${dayOffPastelColor.bg} ${dayOffPastelColor.text} ${dayOffPastelColor.border}`}>
                                X: วันหยุด
                            </span>
                            <div className="ml-auto text-xs text-muted-foreground">
                                💡 Shift+คลิก เพื่อเลือกหลายช่อง
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Schedule View */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : scheduleData && viewMode === "calendar" ? (
                <ShiftCalendarView scheduleData={scheduleData} />
            ) : scheduleData ? (
                <Card className="bg-card border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border">
                                    <TableHead className="text-foreground sticky left-0 bg-card z-10 min-w-[150px]">
                                        พนักงาน
                                    </TableHead>
                                    <TableHead className="text-foreground min-w-[80px]">แผนก</TableHead>
                                    {Array.from({ length: scheduleData.daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const date = new Date(selectedYear, selectedMonth - 1, day);
                                        const dayOfWeek = date.getDay();
                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                        return (
                                            <TableHead
                                                key={i}
                                                className={`text-center p-1 min-w-[36px] ${isWeekend ? "text-rose-400 bg-amber-50/40 dark:bg-amber-900/5" : "text-foreground"
                                                    }`}
                                            >
                                                {day}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scheduleData.scheduleData.map((row) => (
                                    <TableRow key={row.employee.id} className="border-border">
                                        <TableCell className="sticky left-0 bg-card z-10 font-medium text-foreground">
                                            <RowQuickFill
                                                employee={{
                                                    id: row.employee.id,
                                                    name: row.employee.name,
                                                    nickName: row.employee.nickName,
                                                    employeeId: row.employee.employeeId,
                                                    department: row.employee.department,
                                                    schedule: row.schedule,
                                                }}
                                                allEmployees={scheduleData.scheduleData.map((r) => ({
                                                    id: r.employee.id,
                                                    name: r.employee.name,
                                                    nickName: r.employee.nickName,
                                                    employeeId: r.employee.employeeId,
                                                    department: r.employee.department,
                                                    schedule: r.schedule,
                                                }))}
                                                shifts={scheduleData.shifts}
                                                selectedMonth={selectedMonth}
                                                selectedYear={selectedYear}
                                                daysInMonth={scheduleData.daysInMonth}
                                                onSuccess={fetchSchedule}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {row.employee.department}
                                        </TableCell>
                                        {Array.from({ length: scheduleData.daysInMonth }, (_, i) => {
                                            const day = i + 1;
                                            const dateKey = `${selectedYear}-${selectedMonth.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                                            const assignment = row.schedule[dateKey];
                                            const isSelected = isCellSelected(row.employee.id, dateKey);
                                            const date = new Date(selectedYear, selectedMonth - 1, day);
                                            const dayOfWeek = date.getDay();
                                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                            return (
                                                <TableCell
                                                    key={day}
                                                    className={`text-center p-1 cursor-pointer transition-all ${isSelected
                                                        ? "bg-blue-100/60 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-600"
                                                        : isWeekend
                                                            ? "bg-amber-50/40 dark:bg-amber-900/5 hover:bg-amber-100/50 dark:hover:bg-amber-900/10"
                                                            : "hover:bg-muted/50"
                                                        }`}
                                                    onClick={(e) =>
                                                        handleCellClick(
                                                            row.employee.id,
                                                            row.employee.name,
                                                            dateKey,
                                                            assignment?.shiftId || null,
                                                            assignment?.isDayOff || false,
                                                            e
                                                        )
                                                    }
                                                >
                                                    {assignment ? (
                                                        (() => {
                                                            const color = assignment.isDayOff ? dayOffPastelColor : getShiftColor(assignment.shiftCode);
                                                            return (
                                                                <span
                                                                    className={`inline-block px-1.5 py-0.5 rounded-md text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}
                                                                >
                                                                    {assignment.isDayOff ? "X" : assignment.shiftCode}
                                                                </span>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="inline-block w-7 h-7 rounded text-xs leading-7 text-muted-foreground/40 hover:bg-muted/50 hover:text-muted-foreground">
                                                            <Plus className="w-3 h-3 inline-block" />
                                                        </span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            ) : (
                <Card className="bg-card border-border">
                    <CardContent className="py-12 text-center">
                        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-muted-foreground">เลือกสถานีและเดือนเพื่อดูตารางกะ</p>
                    </CardContent>
                </Card>
            )}

            {/* Edit Shift Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            แก้ไขกะ - {editingCell?.userName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-3">
                            วันที่: {editingCell?.date}
                        </p>
                        <Select
                            value={selectedShiftId}
                            onValueChange={setSelectedShiftId}
                        >
                            <SelectTrigger className="w-full bg-muted border-input">
                                <SelectValue placeholder="เลือกกะ" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="DAYOFF">
                                    <span className="flex items-center gap-2">
                                        <span className={`w-4 h-4 rounded border ${dayOffPastelColor.bg} ${dayOffPastelColor.border}`}></span>
                                        วันหยุด (X)
                                    </span>
                                </SelectItem>
                                {scheduleData?.shifts.map((shift) => {
                                    const color = getShiftColor(shift.code);
                                    return (
                                        <SelectItem key={shift.id} value={shift.id}>
                                            <span className="flex items-center gap-2">
                                                <span className={`w-4 h-4 rounded border ${color.bg} ${color.border}`}></span>
                                                {shift.code}: {shift.startTime}-{shift.endTime}
                                            </span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="flex gap-2">
                        {editingCell?.currentShiftId && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteShift}
                                disabled={isSaving}
                                className="mr-auto"
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                ลบ
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => setEditDialogOpen(false)}
                            className="border-input text-foreground"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleSaveShift}
                            disabled={isSaving || !selectedShiftId}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Assign Dialog */}
            <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            กำหนดกะพร้อมกัน ({selectedCells.length} รายการ)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={bulkShiftId} onValueChange={setBulkShiftId}>
                            <SelectTrigger className="w-full bg-muted border-input">
                                <SelectValue placeholder="เลือกกะ" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="DAYOFF">
                                    <span className="flex items-center gap-2">
                                        <span className={`w-4 h-4 rounded border ${dayOffPastelColor.bg} ${dayOffPastelColor.border}`}></span>
                                        วันหยุด (X)
                                    </span>
                                </SelectItem>
                                {scheduleData?.shifts.map((shift) => {
                                    const color = getShiftColor(shift.code);
                                    return (
                                        <SelectItem key={shift.id} value={shift.id}>
                                            <span className="flex items-center gap-2">
                                                <span className={`w-4 h-4 rounded border ${color.bg} ${color.border}`}></span>
                                                {shift.code}: {shift.startTime}-{shift.endTime}
                                            </span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setBulkAssignOpen(false)}
                            className="border-input text-foreground"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleBulkAssign}
                            disabled={!bulkShiftId}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            กำหนดกะ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quick Assign Panel */}
            {scheduleData && (
                <QuickAssignPanel
                    open={quickAssignOpen}
                    onOpenChange={setQuickAssignOpen}
                    employees={scheduleData.scheduleData.map((row) => ({
                        id: row.employee.id,
                        name: row.employee.name,
                        nickName: row.employee.nickName,
                        employeeId: row.employee.employeeId,
                        department: row.employee.department,
                    }))}
                    shifts={scheduleData.shifts}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onSuccess={fetchSchedule}
                    preSelectedEmployees={selectedCells.map((c) => c.userId)}
                />
            )}

            {/* Template Manager */}
            {scheduleData && (
                <ShiftTemplateManager
                    open={templateManagerOpen}
                    onOpenChange={setTemplateManagerOpen}
                    shifts={scheduleData.shifts}
                />
            )}
        </div >
    );
}
