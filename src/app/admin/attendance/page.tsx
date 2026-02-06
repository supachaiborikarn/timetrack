"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Search,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    Download,
    Users,
    AlertTriangle,
    Timer,
    Plus,
    CalendarDays,
    TrendingUp,
    Filter,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate, format, getBangkokNow, subDays } from "@/lib/date-utils";

interface User {
    id: string;
    name: string;
    employeeId: string;
}

interface Station {
    id: string;
    name: string;
}

interface AttendanceRecord {
    id: string;
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    lateMinutes: number | null;
    actualHours: number | null;
    overtimeHours: number | null;
    status: string;
    breakStartTime: string | null;
    breakEndTime: string | null;
    breakDurationMin: number | null;
    breakPenaltyAmount: number | null;
    user: {
        id: string;
        name: string;
        nickName: string | null;
        employeeId: string;
        department: string;
        station: string;
    };
}

export default function AttendanceReviewPage() {
    const { data: session, status } = useSession();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState(format(subDays(getBangkokNow(), 7), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(getBangkokNow(), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Manual Check-in State
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [manualType, setManualType] = useState("CHECK_IN");
    const [manualDate, setManualDate] = useState(format(getBangkokNow(), "yyyy-MM-dd"));
    const [manualTime, setManualTime] = useState(format(getBangkokNow(), "HH:mm"));
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Break Edit State
    const [isBreakEditOpen, setIsBreakEditOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [editBreakStartTime, setEditBreakStartTime] = useState("");
    const [editBreakEndTime, setEditBreakEndTime] = useState("");
    const [isBreakEditSubmitting, setIsBreakEditSubmitting] = useState(false);

    useEffect(() => {
        fetchStations();
    }, []);

    useEffect(() => {
        if (session?.user?.id) {
            fetchRecords();
        }
    }, [session?.user?.id, startDate, endDate, stationId, statusFilter]);

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

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/employees");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.employees || []);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    const handleManualSubmit = async () => {
        if (!selectedUserId) {
            toast.error("กรุณาเลือกพนักงาน");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/attendance/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedUserId,
                    type: manualType,
                    date: manualDate,
                    time: manualTime,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(manualType === "CHECK_IN" ? "เช็คอินสำเร็จ" : "เช็คเอาต์สำเร็จ");
                setIsManualOpen(false);
                fetchRecords();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                ...(stationId !== "all" && { stationId }),
                ...(statusFilter !== "all" && { status: statusFilter }),
            });

            const res = await fetch(`/api/admin/attendance?${params}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
            }
        } catch (error) {
            console.error("Failed to fetch attendance:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchRecords();
        setIsRefreshing(false);
        toast.success("รีเฟรชข้อมูลแล้ว");
    };

    const handleStatusChange = async (recordId: string, newStatus: string) => {
        try {
            const res = await fetch("/api/admin/attendance", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: recordId, status: newStatus }),
            });

            if (res.ok) {
                toast.success("อัปเดตสถานะสำเร็จ");
                fetchRecords();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    // Break management for supervisors
    const handleBreakManage = async (employeeId: string, action: 'start' | 'end') => {
        try {
            const res = await fetch("/api/attendance/break-manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employeeId, action }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                fetchRecords();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
        }
    };

    // Open break edit dialog
    const openBreakEditDialog = (record: AttendanceRecord) => {
        setEditingRecord(record);
        // Convert to local datetime-local format for input
        if (record.breakStartTime) {
            const startDate = new Date(record.breakStartTime);
            setEditBreakStartTime(format(startDate, "yyyy-MM-dd'T'HH:mm"));
        } else {
            setEditBreakStartTime("");
        }
        if (record.breakEndTime) {
            const endDate = new Date(record.breakEndTime);
            setEditBreakEndTime(format(endDate, "yyyy-MM-dd'T'HH:mm"));
        } else {
            setEditBreakEndTime("");
        }
        setIsBreakEditOpen(true);
    };

    // Submit break edit
    const handleBreakEditSubmit = async () => {
        if (!editingRecord) return;

        setIsBreakEditSubmitting(true);
        try {
            const res = await fetch("/api/admin/attendance/break-edit", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendanceId: editingRecord.id,
                    breakStartTime: editBreakStartTime ? new Date(editBreakStartTime).toISOString() : null,
                    breakEndTime: editBreakEndTime ? new Date(editBreakEndTime).toISOString() : null,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setIsBreakEditOpen(false);
                setEditingRecord(null);
                fetchRecords();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsBreakEditSubmitting(false);
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams({
            startDate,
            endDate,
            ...(stationId !== "all" && { stationId }),
            ...(statusFilter !== "all" && { status: statusFilter }),
        });
        window.open(`/api/admin/attendance/export?${params}`, "_blank");
    };

    const setQuickDateRange = (days: number) => {
        setEndDate(format(getBangkokNow(), "yyyy-MM-dd"));
        setStartDate(format(subDays(getBangkokNow(), days), "yyyy-MM-dd"));
    };

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

    const getStatusBadge = (status: string, lateMinutes: number | null) => {
        if (status === "APPROVED") {
            return (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    อนุมัติ
                </Badge>
            );
        }
        if (status === "REJECTED") {
            return (
                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20 transition-colors">
                    <XCircle className="w-3 h-3 mr-1" />
                    ปฏิเสธ
                </Badge>
            );
        }
        if (status === "ABSENT") {
            return (
                <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/20 transition-colors">
                    ขาด
                </Badge>
            );
        }
        if (lateMinutes && lateMinutes > 0) {
            return (
                <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20 transition-colors">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    สาย {lateMinutes} นาที
                </Badge>
            );
        }
        return (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 transition-colors animate-pulse">
                <Clock className="w-3 h-3 mr-1" />
                รอตรวจสอบ
            </Badge>
        );
    };

    const filteredRecords = records.filter((r) =>
        searchTerm
            ? r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.user.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
            : true
    );

    // Calculate stats
    const totalRecords = filteredRecords.length;
    const lateCount = filteredRecords.filter((r) => r.lateMinutes && r.lateMinutes > 0).length;
    const otCount = filteredRecords.filter((r) => r.overtimeHours && Number(r.overtimeHours) > 0).length;
    const pendingCount = filteredRecords.filter((r) => r.status === "PENDING").length;

    return (
        <div className="space-y-6 pb-8">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtMnYtMmgtMnYyaC0ydjJoLTJ2LTJoLTJ2MmgtMnY0aDJ2MmgydjJoMnYtMmgydi0yaDJ2LTJoMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                                <CalendarDays className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                    ตรวจสอบการลงเวลา
                                </h1>
                                <p className="text-blue-100/80 text-sm sm:text-base">
                                    ดูและอนุมัติเวลาเข้า-ออกงานของพนักงาน
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all duration-200"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            รีเฟรช
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleExport}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all duration-200"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        <Dialog open={isManualOpen} onOpenChange={(open) => {
                            setIsManualOpen(open);
                            if (open && users.length === 0) fetchUsers();
                        }}>
                            <DialogTrigger asChild>
                                <Button className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg shadow-blue-900/20 transition-all duration-200 hover:scale-105">
                                    <Plus className="w-4 h-4 mr-2" />
                                    เช็คอินแทน
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-blue-500/10">
                                            <Clock className="w-5 h-5 text-blue-500" />
                                        </div>
                                        ลงเวลาแทนพนักงาน
                                    </DialogTitle>
                                    <DialogDescription>
                                        บันทึกเวลาเข้า-ออกงานสำหรับพนักงานที่ไม่มีอุปกรณ์
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label className="text-sm font-medium">พนักงาน</Label>
                                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="เลือกพนักงาน" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map((u) => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        <span className="font-mono text-xs text-muted-foreground mr-2">{u.employeeId}</span>
                                                        {u.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-sm font-medium">ประเภท</Label>
                                        <Select value={manualType} onValueChange={setManualType}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CHECK_IN">
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                                        เข้างาน (Check In)
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="CHECK_OUT">
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                                                        ออกงาน (Check Out)
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-sm font-medium">วันที่</Label>
                                            <Input
                                                type="date"
                                                value={manualDate}
                                                onChange={(e) => setManualDate(e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-sm font-medium">เวลา</Label>
                                            <Input
                                                type="time"
                                                value={manualTime}
                                                onChange={(e) => setManualTime(e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button variant="outline" onClick={() => setIsManualOpen(false)}>
                                        ยกเลิก
                                    </Button>
                                    <Button onClick={handleManualSubmit} disabled={isSubmitting} className="min-w-[100px]">
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                บันทึก
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors ring-4 ring-blue-500/5">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-foreground">{totalRecords}</p>
                                <p className="text-sm text-muted-foreground">รายการทั้งหมด</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors ring-4 ring-orange-500/5">
                                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-foreground">{lateCount}</p>
                                <p className="text-sm text-muted-foreground">มาสาย</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/50 dark:to-violet-900/30 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors ring-4 ring-violet-500/5">
                                <TrendingUp className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-foreground">{otCount}</p>
                                <p className="text-sm text-muted-foreground">ทำ OT</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors ring-4 ring-amber-500/5">
                                <Timer className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-foreground">{pendingCount}</p>
                                <p className="text-sm text-muted-foreground">รอตรวจสอบ</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardContent className="py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">ตัวกรอง</span>
                    </div>

                    {/* Quick Date Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange(0)}
                            className={`transition-all ${startDate === endDate ? 'bg-primary text-primary-foreground' : ''}`}
                        >
                            วันนี้
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange(7)}
                            className="transition-all"
                        >
                            7 วัน
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange(30)}
                            className="transition-all"
                        >
                            30 วัน
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">เริ่มต้น</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-36 h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">สิ้นสุด</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-36 h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">สถานี</label>
                            <Select value={stationId} onValueChange={setStationId}>
                                <SelectTrigger className="w-40 h-10">
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
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">สถานะ</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-36 h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทั้งหมด</SelectItem>
                                    <SelectItem value="PENDING">รอตรวจสอบ</SelectItem>
                                    <SelectItem value="APPROVED">อนุมัติ</SelectItem>
                                    <SelectItem value="LATE">มาสาย</SelectItem>
                                    <SelectItem value="ABSENT">ขาด</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">ค้นหา</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="ชื่อ หรือ รหัสพนักงาน"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-10"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden border-0 shadow-sm">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        </div>
                        <p className="text-muted-foreground text-sm">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="font-semibold">วันที่</TableHead>
                                    <TableHead className="font-semibold">พนักงาน</TableHead>
                                    <TableHead className="hidden md:table-cell font-semibold">สถานี / แผนก</TableHead>
                                    <TableHead className="text-center font-semibold">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                            เข้างาน
                                        </span>
                                    </TableHead>
                                    <TableHead className="text-center font-semibold">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                                            ออกงาน
                                        </span>
                                    </TableHead>
                                    <TableHead className="text-center hidden sm:table-cell font-semibold">ชม.</TableHead>
                                    <TableHead className="text-center hidden sm:table-cell font-semibold">OT</TableHead>
                                    <TableHead className="text-center font-semibold">สถานะ</TableHead>
                                    <TableHead className="text-center font-semibold">ดำเนินการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-full bg-muted">
                                                    <CalendarDays className="w-8 h-8 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-lg font-medium text-muted-foreground">ไม่พบข้อมูล</p>
                                                    <p className="text-sm text-muted-foreground/70">ลองปรับตัวกรองเพื่อดูข้อมูลเพิ่มเติม</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecords.map((record, index) => (
                                        <TableRow
                                            key={record.id}
                                            className="group hover:bg-accent/50 transition-colors"
                                            style={{ animationDelay: `${index * 20}ms` }}
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold">
                                                        {new Date(record.date).getDate()}
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatThaiDate(new Date(record.date), "MMM yy")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
                                                        {(record.user.nickName || record.user.name).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{record.user.nickName || record.user.name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">{record.user.employeeId}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div>
                                                    <p className="text-sm font-medium">{record.user.station}</p>
                                                    <p className="text-xs text-muted-foreground">{record.user.department}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`font-mono text-sm ${record.checkInTime ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}`}>
                                                    {record.checkInTime
                                                        ? format(new Date(record.checkInTime), "HH:mm")
                                                        : "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`font-mono text-sm ${record.checkOutTime ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-muted-foreground'}`}>
                                                    {record.checkOutTime
                                                        ? format(new Date(record.checkOutTime), "HH:mm")
                                                        : "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center hidden sm:table-cell">
                                                <span className="font-mono text-sm">
                                                    {record.actualHours?.toFixed(1) || "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center hidden sm:table-cell">
                                                <span className={`font-mono text-sm ${record.overtimeHours && Number(record.overtimeHours) > 0 ? 'text-violet-600 dark:text-violet-400 font-semibold' : 'text-muted-foreground'}`}>
                                                    {record.overtimeHours && Number(record.overtimeHours) > 0
                                                        ? Number(record.overtimeHours).toFixed(1)
                                                        : "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(record.status, record.lateMinutes)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-1 flex-wrap">
                                                    {/* Break Management Buttons */}
                                                    {record.checkInTime && !record.checkOutTime && (
                                                        <>
                                                            {!record.breakStartTime ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                                                                    onClick={() => handleBreakManage(record.user.id, 'start')}
                                                                >
                                                                    เริ่มพักให้
                                                                </Button>
                                                            ) : !record.breakEndTime ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                                                                    onClick={() => handleBreakManage(record.user.id, 'end')}
                                                                >
                                                                    จบพักให้
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-xs text-slate-600 border-slate-300 hover:bg-slate-50"
                                                                    onClick={() => openBreakEditDialog(record)}
                                                                    title="คลิกเพื่อแก้ไขเวลาพัก"
                                                                >
                                                                    พัก {record.breakDurationMin} นาที ✏️
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                    {/* Approve/Reject Buttons */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all hover:scale-110"
                                                        onClick={() => handleStatusChange(record.id, "APPROVED")}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-500 hover:bg-red-500/10 transition-all hover:scale-110"
                                                        onClick={() => handleStatusChange(record.id, "REJECTED")}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Break Edit Dialog */}
            <Dialog open={isBreakEditOpen} onOpenChange={setIsBreakEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                                <Timer className="w-5 h-5 text-orange-500" />
                            </div>
                            แก้ไขเวลาพัก
                        </DialogTitle>
                        <DialogDescription>
                            {editingRecord && (
                                <span>
                                    แก้ไขเวลาพักของ <strong>{editingRecord.user.name}</strong> ({editingRecord.user.employeeId})
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">เวลาเริ่มพัก</Label>
                            <Input
                                type="datetime-local"
                                value={editBreakStartTime}
                                onChange={(e) => setEditBreakStartTime(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">เวลาจบพัก</Label>
                            <Input
                                type="datetime-local"
                                value={editBreakEndTime}
                                onChange={(e) => setEditBreakEndTime(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        {editBreakStartTime && editBreakEndTime && (
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    ระยะเวลาพัก: <strong className="text-foreground">
                                        {Math.floor((new Date(editBreakEndTime).getTime() - new Date(editBreakStartTime).getTime()) / (1000 * 60))} นาที
                                    </strong>
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsBreakEditOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleBreakEditSubmit} disabled={isBreakEditSubmitting} className="min-w-[100px]">
                            {isBreakEditSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    บันทึก
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
