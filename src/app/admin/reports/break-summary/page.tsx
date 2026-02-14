"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    AlertTriangle,
    Timer,
    Users,
    DollarSign,
    Loader2,
    RefreshCw,
    ArrowLeft,
    Coffee,
    TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, getBangkokNow, startOfMonth, endOfMonth } from "@/lib/date-utils";
import Link from "next/link";

interface Station {
    id: string;
    name: string;
}

interface OvertimeRecord {
    id: string;
    date: string;
    userId: string;
    userName: string;
    userNickName: string | null;
    employeeId: string;
    stationName: string;
    departmentName: string;
    breakStartTime: string | null;
    breakEndTime: string | null;
    breakDurationMin: number | null;
    allowedBreakMin: number;
    isOvertime: boolean;
    overtimeMinutes: number;
    penaltyAmount: number;
}

interface EmployeeSummary {
    userId: string;
    userName: string;
    userNickName: string | null;
    employeeId: string;
    stationName: string;
    totalBreaks: number;
    overtimeBreaks: number;
    totalPenalty: number;
    totalDurationMin: number;
    avgDurationMin: number;
    overtimeDates: string[];
}

interface SummaryData {
    summary: {
        totalBreakRecords: number;
        totalOvertimeBreaks: number;
        totalPenaltyAmount: number;
        employeesWithOvertime: number;
    };
    overtimeRecords: OvertimeRecord[];
    employeeSummaries: EmployeeSummary[];
}

export default function BreakSummaryPage() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SummaryData | null>(null);
    const [stations, setStations] = useState<Station[]>([]);

    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState("all");
    const [activeTab, setActiveTab] = useState<"alerts" | "employees">("alerts");

    useEffect(() => {
        if (status === "unauthenticated") redirect("/");
    }, [status]);

    useEffect(() => {
        fetchStations();
    }, []);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, stationId]);

    async function fetchStations() {
        try {
            const res = await fetch("/api/admin/stations");
            if (res.ok) {
                const json = await res.json();
                setStations(json.stations || json || []);
            }
        } catch (e) {
            console.error("Failed to fetch stations", e);
        }
    }

    async function fetchData() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ startDate, endDate });
            if (stationId && stationId !== "all") {
                params.set("stationId", stationId);
            }
            const res = await fetch(`/api/admin/break-summary?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error("Failed to fetch break summary", e);
            toast.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    }

    function formatTime(isoString: string | null) {
        if (!isoString) return "-";
        return format(new Date(isoString), "HH:mm");
    }

    function formatDate(isoString: string) {
        return format(new Date(isoString), "dd/MM/yyyy");
    }

    function getOvertimeBadge(overtimeMinutes: number) {
        if (overtimeMinutes > 30) {
            return <Badge variant="destructive" className="text-xs">เกิน {overtimeMinutes} นาที</Badge>;
        }
        return <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/50">เกิน {overtimeMinutes} นาที</Badge>;
    }

    // Quick date presets
    function setThisMonth() {
        setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
    }

    function setLast7Days() {
        const end = now;
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        setStartDate(format(start, "yyyy-MM-dd"));
        setEndDate(format(end, "yyyy-MM-dd"));
    }

    function setLast30Days() {
        const end = now;
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        setStartDate(format(start, "yyyy-MM-dd"));
        setEndDate(format(end, "yyyy-MM-dd"));
    }

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/reports">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Coffee className="w-6 h-6 text-orange-500" />
                        สรุปเวลาพัก
                    </h1>
                    <p className="text-sm text-muted-foreground">รายงานและแจ้งเตือนพนักงานพักเกินเวลา</p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-1.5">
                            <Label className="text-xs">วันเริ่มต้น</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">วันสิ้นสุด</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">สถานี</Label>
                            <Select value={stationId} onValueChange={setStationId}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="ทุกสถานี" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกสถานี</SelectItem>
                                    {stations.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={setLast7Days}>7 วัน</Button>
                            <Button variant="outline" size="sm" onClick={setThisMonth}>เดือนนี้</Button>
                            <Button variant="outline" size="sm" onClick={setLast30Days}>30 วัน</Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                            รีเฟรช
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-blue-500/20 bg-blue-500/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Coffee className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">พักทั้งหมด</p>
                                    <p className="text-2xl font-bold text-foreground">{data.summary.totalBreakRecords}</p>
                                    <p className="text-xs text-muted-foreground">ครั้ง</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-orange-500/20 bg-orange-500/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">พักเกินเวลา</p>
                                    <p className="text-2xl font-bold text-orange-500">{data.summary.totalOvertimeBreaks}</p>
                                    <p className="text-xs text-muted-foreground">ครั้ง</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-red-500/20 bg-red-500/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <DollarSign className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">ค่าปรับรวม</p>
                                    <p className="text-2xl font-bold text-red-500">฿{data.summary.totalPenaltyAmount.toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-purple-500/20 bg-purple-500/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <Users className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">พนักงานพักเกิน</p>
                                    <p className="text-2xl font-bold text-purple-500">{data.summary.employeesWithOvertime}</p>
                                    <p className="text-xs text-muted-foreground">คน</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-1">
                <Button
                    variant={activeTab === "alerts" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("alerts")}
                    className="gap-2"
                >
                    <AlertTriangle className="w-4 h-4" />
                    แจ้งเตือนพักเกิน
                    {data && data.summary.totalOvertimeBreaks > 0 && (
                        <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                            {data.summary.totalOvertimeBreaks}
                        </Badge>
                    )}
                </Button>
                <Button
                    variant={activeTab === "employees" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("employees")}
                    className="gap-2"
                >
                    <TrendingUp className="w-4 h-4" />
                    สรุปรายพนักงาน
                </Button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Alerts Table */}
            {!loading && data && activeTab === "alerts" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            รายการพักเกินเวลา
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.overtimeRecords.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Coffee className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>ไม่มีรายการพักเกินเวลาในช่วงนี้ 🎉</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>วันที่</TableHead>
                                            <TableHead>พนักงาน</TableHead>
                                            <TableHead>สถานี</TableHead>
                                            <TableHead className="text-center">เริ่มพัก</TableHead>
                                            <TableHead className="text-center">จบพัก</TableHead>
                                            <TableHead className="text-center">ระยะเวลา</TableHead>
                                            <TableHead className="text-center">อนุญาต</TableHead>
                                            <TableHead className="text-center">เกิน</TableHead>
                                            <TableHead className="text-right">ค่าปรับ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.overtimeRecords.map((record) => (
                                            <TableRow key={record.id} className={record.overtimeMinutes > 30 ? "bg-red-500/5" : "bg-orange-500/5"}>
                                                <TableCell className="font-medium">
                                                    {formatDate(record.date)}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <span className="font-medium">{record.userNickName || record.userName}</span>
                                                        <span className="text-xs text-muted-foreground ml-1">({record.employeeId})</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{record.stationName}</TableCell>
                                                <TableCell className="text-center text-sm">
                                                    {formatTime(record.breakStartTime)}
                                                </TableCell>
                                                <TableCell className="text-center text-sm">
                                                    {formatTime(record.breakEndTime)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-medium">{record.breakDurationMin} นาที</span>
                                                </TableCell>
                                                <TableCell className="text-center text-sm text-muted-foreground">
                                                    {record.allowedBreakMin} นาที
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {getOvertimeBadge(record.overtimeMinutes)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {record.penaltyAmount > 0 ? (
                                                        <span className="text-red-500 font-medium">-฿{record.penaltyAmount.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Employee Summary Table */}
            {!loading && data && activeTab === "employees" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            สรุปรายพนักงาน
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.employeeSummaries.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>ไม่มีข้อมูลพักในช่วงนี้</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>พนักงาน</TableHead>
                                            <TableHead>สถานี</TableHead>
                                            <TableHead className="text-center">พักทั้งหมด</TableHead>
                                            <TableHead className="text-center">พักเกิน</TableHead>
                                            <TableHead className="text-center">เฉลี่ย (นาที)</TableHead>
                                            <TableHead className="text-right">ค่าปรับรวม</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.employeeSummaries.map((emp) => (
                                            <TableRow key={emp.userId} className={emp.overtimeBreaks > 0 ? "bg-orange-500/5" : ""}>
                                                <TableCell>
                                                    <div>
                                                        <span className="font-medium">{emp.userNickName || emp.userName}</span>
                                                        <span className="text-xs text-muted-foreground ml-1">({emp.employeeId})</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{emp.stationName}</TableCell>
                                                <TableCell className="text-center">{emp.totalBreaks}</TableCell>
                                                <TableCell className="text-center">
                                                    {emp.overtimeBreaks > 0 ? (
                                                        <Badge variant="destructive" className="text-xs">
                                                            {emp.overtimeBreaks} ครั้ง
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-green-500">✓</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={emp.avgDurationMin > 90 ? "text-orange-500 font-medium" : ""}>
                                                        {emp.avgDurationMin}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {emp.totalPenalty > 0 ? (
                                                        <span className="text-red-500 font-medium">-฿{emp.totalPenalty.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">฿0</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
