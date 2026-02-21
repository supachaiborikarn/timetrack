"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    Loader2,
    Clock,
    CalendarDays,
    Save,
    CheckCircle2,
    XCircle,
    Copy,
    Users,
    AlertTriangle,
    ArrowLeft,
    Trash2,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, getBangkokNow, subDays, addDays } from "@/lib/date-utils";
import Link from "next/link";

interface Employee {
    id: string;
    name: string;
    nickName: string | null;
    employeeId: string;
    station?: { name: string } | null;
    department?: { name: string } | null;
}

interface AttendanceEntry {
    key: string; // `${userId}__${date}`
    userId: string;
    employeeName: string;
    employeeId: string;
    date: string; // YYYY-MM-DD
    checkInTime: string; // HH:mm
    checkOutTime: string; // HH:mm
    existingRecord: boolean;
    dirty: boolean;
}

export default function BackfillAttendancePage() {
    const { data: session, status } = useSession();

    // Step state
    const [step, setStep] = useState<1 | 2>(1);

    // Employee selection
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

    // Date range
    const [startDate, setStartDate] = useState("2026-01-26");
    const [endDate, setEndDate] = useState(format(getBangkokNow(), "yyyy-MM-dd"));

    // Spreadsheet entries
    const [entries, setEntries] = useState<AttendanceEntry[]>([]);
    const [isLoadingTable, setIsLoadingTable] = useState(false);

    // Save state
    const [isSaving, setIsSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success: number; failed: number } | null>(null);

    // Fill template
    const [fillCheckIn, setFillCheckIn] = useState("08:00");
    const [fillCheckOut, setFillCheckOut] = useState("17:00");

    // Collapsed employees
    const [collapsedEmployees, setCollapsedEmployees] = useState<Set<string>>(new Set());

    // Fetch employees
    useEffect(() => {
        const fetchEmployees = async () => {
            setIsLoadingEmployees(true);
            try {
                const res = await fetch("/api/admin/employees");
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data.employees || []);
                }
            } catch (error) {
                console.error("Failed to fetch employees:", error);
            } finally {
                setIsLoadingEmployees(false);
            }
        };
        fetchEmployees();
    }, []);

    // Filter employees based on search
    const filteredEmployees = employees.filter((emp) => {
        if (!employeeSearch) return true;
        const search = employeeSearch.toLowerCase();
        return (
            emp.name.toLowerCase().includes(search) ||
            emp.employeeId.toLowerCase().includes(search) ||
            (emp.nickName && emp.nickName.toLowerCase().includes(search))
        );
    });

    // Toggle employee selection
    const toggleEmployee = (emp: Employee) => {
        setSelectedEmployees((prev) => {
            const exists = prev.find((e) => e.id === emp.id);
            if (exists) return prev.filter((e) => e.id !== emp.id);
            return [...prev, emp];
        });
    };

    // Select all filtered employees
    const selectAllFiltered = () => {
        setSelectedEmployees((prev) => {
            const existing = new Set(prev.map((e) => e.id));
            const newEmployees = filteredEmployees.filter((e) => !existing.has(e.id));
            return [...prev, ...newEmployees];
        });
    };

    // Clear all selection
    const clearSelection = () => {
        setSelectedEmployees([]);
    };

    // Generate date range
    const getDateRange = (start: string, end: string): string[] => {
        const dates: string[] = [];
        let current = new Date(`${start}T00:00:00`);
        const endDate = new Date(`${end}T00:00:00`);
        while (current <= endDate) {
            dates.push(format(current, "yyyy-MM-dd"));
            current = addDays(current, 1);
        }
        return dates;
    };

    // Load table data
    const loadTable = useCallback(async () => {
        if (selectedEmployees.length === 0) {
            toast.error("กรุณาเลือกพนักงานอย่างน้อย 1 คน");
            return;
        }

        setIsLoadingTable(true);
        setStep(2);
        setSaveResult(null);

        try {
            const dates = getDateRange(startDate, endDate);
            const userIds = selectedEmployees.map((e) => e.id);

            // Fetch existing attendance records
            const params = new URLSearchParams({
                startDate,
                endDate,
            });

            const res = await fetch(`/api/admin/attendance?${params}`);
            const data = res.ok ? await res.json() : { records: [] };

            // Build a lookup map
            const existingMap = new Map<string, { checkInTime: string | null; checkOutTime: string | null }>();
            for (const record of data.records || []) {
                // Parse date from record
                const recordDate = new Date(record.date);
                const bangkokDate = new Date(recordDate.getTime() + 7 * 60 * 60 * 1000);
                const dateStr = format(bangkokDate, "yyyy-MM-dd");
                const key = `${record.user.id}__${dateStr}`;

                let checkIn = "";
                let checkOut = "";
                if (record.checkInTime) {
                    const d = new Date(record.checkInTime);
                    checkIn = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                }
                if (record.checkOutTime) {
                    const d = new Date(record.checkOutTime);
                    checkOut = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                }

                existingMap.set(key, { checkInTime: checkIn, checkOutTime: checkOut });
            }

            // Generate entries
            const newEntries: AttendanceEntry[] = [];
            for (const emp of selectedEmployees) {
                for (const date of dates) {
                    const key = `${emp.id}__${date}`;
                    const existing = existingMap.get(key);
                    newEntries.push({
                        key,
                        userId: emp.id,
                        employeeName: emp.nickName ? `${emp.name} (${emp.nickName})` : emp.name,
                        employeeId: emp.employeeId,
                        date,
                        checkInTime: existing?.checkInTime || "",
                        checkOutTime: existing?.checkOutTime || "",
                        existingRecord: !!existing,
                        dirty: false,
                    });
                }
            }

            setEntries(newEntries);
        } catch (error) {
            console.error("Failed to load table:", error);
            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setIsLoadingTable(false);
        }
    }, [selectedEmployees, startDate, endDate]);

    // Update entry
    const updateEntry = (key: string, field: "checkInTime" | "checkOutTime", value: string) => {
        setEntries((prev) =>
            prev.map((e) =>
                e.key === key ? { ...e, [field]: value, dirty: true } : e
            )
        );
    };

    // Fill empty entries with template values
    const fillEmptyEntries = (employeeId?: string) => {
        setEntries((prev) =>
            prev.map((e) => {
                if (employeeId && e.userId !== employeeId) return e;
                if (e.checkInTime && e.checkOutTime) return e; // already filled
                return {
                    ...e,
                    checkInTime: e.checkInTime || fillCheckIn,
                    checkOutTime: e.checkOutTime || fillCheckOut,
                    dirty: true,
                };
            })
        );
        toast.success(employeeId ? "เติมเวลาสำหรับพนักงานนี้แล้ว" : "เติมเวลาทั้งหมดแล้ว");
    };

    // Clear entries for an employee
    const clearEmployeeEntries = (employeeId: string) => {
        setEntries((prev) =>
            prev.map((e) => {
                if (e.userId !== employeeId) return e;
                if (e.existingRecord) return e; // don't clear existing records
                return { ...e, checkInTime: "", checkOutTime: "", dirty: false };
            })
        );
    };

    // Toggle collapse
    const toggleCollapse = (employeeId: string) => {
        setCollapsedEmployees((prev) => {
            const next = new Set(prev);
            if (next.has(employeeId)) next.delete(employeeId);
            else next.add(employeeId);
            return next;
        });
    };

    // Save all dirty entries
    const handleSave = async () => {
        const dirtyEntries = entries.filter((e) => e.dirty && (e.checkInTime || e.checkOutTime));

        if (dirtyEntries.length === 0) {
            toast.error("ไม่มีรายการที่ต้องบันทึก");
            return;
        }

        setIsSaving(true);
        setSaveResult(null);

        try {
            const payload = dirtyEntries.map((e) => ({
                userId: e.userId,
                date: e.date,
                checkInTime: e.checkInTime || null,
                checkOutTime: e.checkOutTime || null,
            }));

            const res = await fetch("/api/admin/attendance/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entries: payload }),
            });

            const data = await res.json();

            if (res.ok) {
                setSaveResult({
                    success: data.summary.success,
                    failed: data.summary.failed,
                });
                toast.success(`บันทึกสำเร็จ ${data.summary.success} รายการ`);

                // Mark saved entries as not dirty and existing
                setEntries((prev) =>
                    prev.map((e) => {
                        if (e.dirty && (e.checkInTime || e.checkOutTime)) {
                            return { ...e, dirty: false, existingRecord: true };
                        }
                        return e;
                    })
                );
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsSaving(false);
        }
    };

    // Format date for display (Thai format)
    const formatDateDisplay = (dateStr: string) => {
        const date = new Date(`${dateStr}T00:00:00`);
        const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
        const day = days[date.getDay()];
        const d = date.getDate();
        const m = date.getMonth() + 1;
        return `${day} ${d}/${m}`;
    };

    const isWeekend = (dateStr: string) => {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.getDay() === 0 || date.getDay() === 6;
    };

    // Stats
    const dirtyCount = entries.filter((e) => e.dirty).length;
    const emptyCount = entries.filter((e) => !e.checkInTime && !e.checkOutTime).length;
    const filledCount = entries.filter((e) => e.checkInTime || e.checkOutTime).length;

    // Group entries by employee
    const groupedEntries = selectedEmployees.map((emp) => ({
        employee: emp,
        entries: entries.filter((e) => e.userId === emp.id),
    }));

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <Clock className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    if (!session || !session.user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-6 sm:p-8 shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtMnYtMmgtMnYyaC0ydjJoLTJ2LTJoLTJ2MmgtMnY0aDJ2MmgydjJoMnYtMmgydi0yaDJ2LTJoMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                                <CalendarDays className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                    ลงเวลาย้อนหลัง
                                </h1>
                                <p className="text-emerald-100/80 text-sm sm:text-base">
                                    บันทึกเวลาเข้า-ออกงานย้อนหลังหลายวันพร้อมกัน
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/admin/attendance">
                            <Button
                                variant="secondary"
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                กลับหน้าลงเวลา
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Step 1: Selection */}
            {step === 1 && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Employee Selection Card */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">เลือกพนักงาน</h2>
                                {selectedEmployees.length > 0 && (
                                    <Badge variant="secondary" className="ml-auto">
                                        เลือกแล้ว {selectedEmployees.length} คน
                                    </Badge>
                                )}
                            </div>

                            {/* Search */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..."
                                    value={employeeSearch}
                                    onChange={(e) => {
                                        setEmployeeSearch(e.target.value);
                                        setShowEmployeeDropdown(true);
                                    }}
                                    onFocus={() => setShowEmployeeDropdown(true)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Quick actions */}
                            <div className="flex gap-2 mb-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={selectAllFiltered}
                                    className="text-xs"
                                >
                                    เลือกทั้งหมด ({filteredEmployees.length})
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearSelection}
                                    className="text-xs"
                                    disabled={selectedEmployees.length === 0}
                                >
                                    ล้างการเลือก
                                </Button>
                            </div>

                            {/* Employee list */}
                            <div className="max-h-[400px] overflow-y-auto border rounded-lg divide-y">
                                {isLoadingEmployees ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filteredEmployees.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm">
                                        ไม่พบพนักงาน
                                    </div>
                                ) : (
                                    filteredEmployees.map((emp) => {
                                        const isSelected = selectedEmployees.some((e) => e.id === emp.id);
                                        return (
                                            <div
                                                key={emp.id}
                                                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "bg-primary/5" : ""
                                                    }`}
                                                onClick={() => toggleEmployee(emp)}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleEmployee(emp)}
                                                    className="pointer-events-none"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {emp.employeeId}
                                                        </span>
                                                        <span className="font-medium text-sm truncate">
                                                            {emp.name}
                                                            {emp.nickName && (
                                                                <span className="text-muted-foreground ml-1">
                                                                    ({emp.nickName})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {(emp.station || emp.department) && (
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            {emp.station?.name}
                                                            {emp.department && ` / ${emp.department.name}`}
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Selected employee chips */}
                            {selectedEmployees.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {selectedEmployees.map((emp) => (
                                        <Badge
                                            key={emp.id}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors pl-2 pr-1 py-1"
                                            onClick={() => toggleEmployee(emp)}
                                        >
                                            {emp.nickName || emp.name}
                                            <XCircle className="w-3.5 h-3.5 ml-1" />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Date Range Card */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarDays className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">ช่วงวันที่</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-2">
                                    <Label className="text-sm">วันเริ่มต้น</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm">วันสิ้นสุด</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            {/* Quick date range buttons */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setStartDate("2026-01-26");
                                        setEndDate(format(getBangkokNow(), "yyyy-MM-dd"));
                                    }}
                                >
                                    26 ม.ค. - ปัจจุบัน
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setStartDate(format(subDays(getBangkokNow(), 7), "yyyy-MM-dd"));
                                        setEndDate(format(getBangkokNow(), "yyyy-MM-dd"));
                                    }}
                                >
                                    7 วันล่าสุด
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setStartDate(format(subDays(getBangkokNow(), 30), "yyyy-MM-dd"));
                                        setEndDate(format(getBangkokNow(), "yyyy-MM-dd"));
                                    }}
                                >
                                    30 วันล่าสุด
                                </Button>
                            </div>

                            {/* Summary */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                                <p className="text-sm text-muted-foreground mb-2">สรุปก่อนโหลดตาราง:</p>
                                <div className="space-y-1 text-sm">
                                    <p>
                                        👤 พนักงาน:{" "}
                                        <span className="font-semibold">{selectedEmployees.length} คน</span>
                                    </p>
                                    <p>
                                        📅 วันที่:{" "}
                                        <span className="font-semibold">
                                            {getDateRange(startDate, endDate).length} วัน
                                        </span>{" "}
                                        ({startDate} ถึง {endDate})
                                    </p>
                                    <p>
                                        📝 รายการทั้งหมด:{" "}
                                        <span className="font-semibold">
                                            {selectedEmployees.length * getDateRange(startDate, endDate).length} รายการ
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Load button */}
                            <Button
                                className="w-full mt-4 h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                                onClick={loadTable}
                                disabled={selectedEmployees.length === 0}
                            >
                                <CalendarDays className="w-5 h-5 mr-2" />
                                โหลดตาราง
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 2: Spreadsheet */}
            {step === 2 && (
                <>
                    {/* Toolbar */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="py-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStep(1)}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    เปลี่ยนการเลือก
                                </Button>

                                <div className="h-6 w-px bg-border" />

                                {/* Fill template */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">เติมค่า:</span>
                                    <Input
                                        type="time"
                                        value={fillCheckIn}
                                        onChange={(e) => setFillCheckIn(e.target.value)}
                                        className="w-28 h-8 text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground">-</span>
                                    <Input
                                        type="time"
                                        value={fillCheckOut}
                                        onChange={(e) => setFillCheckOut(e.target.value)}
                                        className="w-28 h-8 text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fillEmptyEntries()}
                                        className="h-8 text-xs"
                                    >
                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                        เติมทั้งหมด
                                    </Button>
                                </div>

                                <div className="ml-auto flex items-center gap-3">
                                    {/* Stats */}
                                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>ทั้งหมด {entries.length}</span>
                                        <span className="text-emerald-600">มีข้อมูล {filledCount}</span>
                                        <span className="text-orange-600">ว่าง {emptyCount}</span>
                                        {dirtyCount > 0 && (
                                            <Badge variant="default" className="animate-pulse h-5 text-xs">
                                                แก้ไข {dirtyCount}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Save button */}
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving || dirtyCount === 0}
                                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        บันทึก ({dirtyCount})
                                    </Button>
                                </div>
                            </div>

                            {/* Save result */}
                            {saveResult && (
                                <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                        บันทึกสำเร็จ {saveResult.success} รายการ
                                        {saveResult.failed > 0 && (
                                            <span className="text-red-600 ml-2">
                                                (ล้มเหลว {saveResult.failed} รายการ)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Table by employee */}
                    {isLoadingTable ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            </div>
                            <p className="text-muted-foreground text-sm">กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groupedEntries.map(({ employee, entries: empEntries }) => {
                                const isCollapsed = collapsedEmployees.has(employee.id);
                                const empEmptyCount = empEntries.filter(
                                    (e) => !e.checkInTime && !e.checkOutTime
                                ).length;
                                const empDirtyCount = empEntries.filter((e) => e.dirty).length;

                                return (
                                    <Card
                                        key={employee.id}
                                        className="overflow-hidden border-0 shadow-sm"
                                    >
                                        {/* Employee header */}
                                        <div
                                            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/50 dark:to-slate-900/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                                            onClick={() => toggleCollapse(employee.id)}
                                        >
                                            {isCollapsed ? (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                                                <span className="text-white text-xs font-medium">
                                                    {employee.name.charAt(0)}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-medium text-sm">
                                                    {employee.name}
                                                    {employee.nickName && (
                                                        <span className="text-muted-foreground ml-1">
                                                            ({employee.nickName})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    {employee.employeeId}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {empEmptyCount > 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-orange-600 border-orange-300 text-xs"
                                                    >
                                                        ว่าง {empEmptyCount}
                                                    </Badge>
                                                )}
                                                {empDirtyCount > 0 && (
                                                    <Badge className="bg-emerald-500 text-xs">
                                                        แก้ไข {empDirtyCount}
                                                    </Badge>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fillEmptyEntries(employee.id);
                                                    }}
                                                >
                                                    <Copy className="w-3 h-3 mr-1" />
                                                    เติม
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Entries table */}
                                        {!isCollapsed && (
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                                                            <TableHead className="w-24 text-xs font-semibold">
                                                                วันที่
                                                            </TableHead>
                                                            <TableHead className="text-center text-xs font-semibold w-36">
                                                                <span className="inline-flex items-center gap-1">
                                                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                                                    เวลาเข้างาน
                                                                </span>
                                                            </TableHead>
                                                            <TableHead className="text-center text-xs font-semibold w-36">
                                                                <span className="inline-flex items-center gap-1">
                                                                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                                                                    เวลาออกงาน
                                                                </span>
                                                            </TableHead>
                                                            <TableHead className="text-center text-xs font-semibold w-24">
                                                                สถานะ
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {empEntries.map((entry) => {
                                                            const weekend = isWeekend(entry.date);
                                                            return (
                                                                <TableRow
                                                                    key={entry.key}
                                                                    className={`transition-colors ${entry.dirty
                                                                            ? "bg-amber-50/50 dark:bg-amber-950/10"
                                                                            : weekend
                                                                                ? "bg-red-50/30 dark:bg-red-950/10"
                                                                                : ""
                                                                        } ${!entry.existingRecord && !entry.checkInTime
                                                                            ? "bg-yellow-50/30 dark:bg-yellow-950/10"
                                                                            : ""
                                                                        }`}
                                                                >
                                                                    <TableCell className="py-1.5">
                                                                        <span
                                                                            className={`text-sm font-medium ${weekend
                                                                                    ? "text-red-500"
                                                                                    : ""
                                                                                }`}
                                                                        >
                                                                            {formatDateDisplay(entry.date)}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5">
                                                                        <Input
                                                                            type="time"
                                                                            value={entry.checkInTime}
                                                                            onChange={(e) =>
                                                                                updateEntry(
                                                                                    entry.key,
                                                                                    "checkInTime",
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            className="h-8 text-center text-sm w-full max-w-[130px] mx-auto"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5">
                                                                        <Input
                                                                            type="time"
                                                                            value={entry.checkOutTime}
                                                                            onChange={(e) =>
                                                                                updateEntry(
                                                                                    entry.key,
                                                                                    "checkOutTime",
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            className="h-8 text-center text-sm w-full max-w-[130px] mx-auto"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5 text-center">
                                                                        {entry.dirty ? (
                                                                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                                                                แก้ไข
                                                                            </Badge>
                                                                        ) : entry.existingRecord ? (
                                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                                มีข้อมูล
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-xs">
                                                                                ว่าง
                                                                            </Badge>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Floating save bar */}
                    {dirtyCount > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xl shadow-slate-900/30 animate-in slide-in-from-bottom-4">
                                <AlertTriangle className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                                <span className="text-sm font-medium">
                                    {dirtyCount} รายการที่ยังไม่ได้บันทึก
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white ml-2"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-1" />
                                            บันทึก
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
