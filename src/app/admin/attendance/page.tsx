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
    Search,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    Download,
    Users,
    AlertTriangle,
    Timer,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate, format, getBangkokNow, subDays } from "@/lib/date-utils";

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
    user: {
        id: string;
        name: string;
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

    // Filters
    const [startDate, setStartDate] = useState(format(subDays(getBangkokNow(), 7), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(getBangkokNow(), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

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

    const handleExport = () => {
        const params = new URLSearchParams({
            startDate,
            endDate,
            ...(stationId !== "all" && { stationId }),
            ...(statusFilter !== "all" && { status: statusFilter }),
        });
        window.open(`/api/admin/attendance/export?${params}`, "_blank");
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    const getStatusBadge = (status: string, lateMinutes: number | null) => {
        if (status === "APPROVED") {
            return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">อนุมัติ</Badge>;
        }
        if (status === "REJECTED") {
            return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">ปฏิเสธ</Badge>;
        }
        if (status === "ABSENT") {
            return <Badge className="bg-muted text-muted-foreground border-border">ขาด</Badge>;
        }
        if (lateMinutes && lateMinutes > 0) {
            return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">สาย {lateMinutes} นาที</Badge>;
        }
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">รอตรวจสอบ</Badge>;
    };

    const filteredRecords = records.filter((r) =>
        searchTerm
            ? r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.user.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
            : true
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">ตรวจสอบการลงเวลา</h1>
                    <p className="text-muted-foreground">ดูและอนุมัติเวลาเข้า-ออกงาน</p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-end gap-4">
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
                            <Select value={stationId} onValueChange={setStationId}>
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
                            <label className="text-xs text-muted-foreground">สถานะ</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32">
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
                        <div className="flex-1 min-w-[200px] space-y-1">
                            <label className="text-xs text-muted-foreground">ค้นหา</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="ชื่อ หรือ รหัสพนักงาน"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{filteredRecords.length}</p>
                                <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {filteredRecords.filter((r) => r.lateMinutes && r.lateMinutes > 0).length}
                                </p>
                                <p className="text-xs text-muted-foreground">มาสาย</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Timer className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {filteredRecords.filter((r) => r.overtimeHours && Number(r.overtimeHours) > 0).length}
                                </p>
                                <p className="text-xs text-muted-foreground">ทำ OT</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {filteredRecords.filter((r) => r.status === "PENDING").length}
                                </p>
                                <p className="text-xs text-muted-foreground">รอตรวจสอบ</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>วันที่</TableHead>
                                <TableHead>พนักงาน</TableHead>
                                <TableHead className="hidden md:table-cell">สถานี / แผนก</TableHead>
                                <TableHead className="text-center">เข้างาน</TableHead>
                                <TableHead className="text-center">ออกงาน</TableHead>
                                <TableHead className="text-center hidden sm:table-cell">ชม.</TableHead>
                                <TableHead className="text-center hidden sm:table-cell">OT</TableHead>
                                <TableHead className="text-center">สถานะ</TableHead>
                                <TableHead className="text-center">ดำเนินการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                                        ไม่พบข้อมูล
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRecords.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">
                                            {formatThaiDate(new Date(record.date), "d MMM yy")}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-foreground">{record.user.name}</p>
                                                <p className="text-xs text-muted-foreground">{record.user.employeeId}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div>
                                                <p className="text-sm">{record.user.station}</p>
                                                <p className="text-xs text-muted-foreground">{record.user.department}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center text-green-500">
                                            {record.checkInTime
                                                ? format(new Date(record.checkInTime), "HH:mm")
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-center text-orange-500">
                                            {record.checkOutTime
                                                ? format(new Date(record.checkOutTime), "HH:mm")
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-center hidden sm:table-cell">
                                            {record.actualHours?.toFixed(1) || "-"}
                                        </TableCell>
                                        <TableCell className="text-center text-blue-500 hidden sm:table-cell">
                                            {record.overtimeHours && Number(record.overtimeHours) > 0
                                                ? Number(record.overtimeHours).toFixed(1)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(record.status, record.lateMinutes)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                                    onClick={() => handleStatusChange(record.id, "APPROVED")}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
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
                )}
            </Card>
        </div>
    );
}
