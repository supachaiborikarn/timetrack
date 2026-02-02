"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    FileSpreadsheet,
    FileText,
    Loader2,
    TrendingUp,
    Clock,
    Users,
    AlertTriangle,
    Timer,
    DollarSign,
} from "lucide-react";
import { format, getBangkokNow, subDays, startOfMonth, endOfMonth } from "@/lib/date-utils";

interface Station {
    id: string;
    name: string;
}

interface ReportData {
    employees: Array<{
        id: string;
        name: string;
        employeeId: string;
        station: string;
        department: string;
        workDays: number;
        totalHours: number;
        overtimeHours: number;
        lateDays: number;
        latePenalty: number;
    }>;
    summary: {
        totalEmployees: number;
        totalWorkDays: number;
        totalHours: number;
        totalOT: number;
        totalLateDays: number;
        totalLatePenalty: number;
    };
}

export default function ReportsPage() {
    const { data: session, status } = useSession();
    const [stations, setStations] = useState<Station[]>([]);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState("all");

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

    const generateReport = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                ...(stationId !== "all" && { stationId }),
            });

            const res = await fetch(`/api/admin/reports?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data);
            }
        } catch (error) {
            console.error("Failed to generate report:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams({
            startDate,
            endDate,
            ...(stationId !== "all" && { stationId }),
            format: "xlsx",
        });
        window.open(`/api/admin/reports/export?${params}`, "_blank");
    };

    const handleExportPDF = () => {
        const params = new URLSearchParams({
            startDate,
            endDate,
            ...(stationId !== "all" && { stationId }),
            format: "pdf",
        });
        window.open(`/api/admin/reports/export?${params}`, "_blank");
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

    const setLast7Days = () => {
        setStartDate(format(subDays(now, 7), "yyyy-MM-dd"));
        setEndDate(format(now, "yyyy-MM-dd"));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">รายงาน</h1>
                    <p className="text-muted-foreground">สรุปชั่วโมงทำงาน OT และค่าปรับ</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={!reportData}
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportPDF}
                        disabled={!reportData}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
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
                                <Button size="sm" variant="outline" className="text-xs" onClick={setThisMonth}>
                                    เดือนนี้
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs" onClick={setLastMonth}>
                                    เดือนก่อน
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs" onClick={setLast7Days}>
                                    7 วัน
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
                        <Button onClick={generateReport} disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                            สร้างรายงาน
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            {reportData && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <Card>
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10">
                                        <Users className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{reportData.summary.totalEmployees}</p>
                                        <p className="text-xs text-muted-foreground">พนักงาน</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-500/10">
                                        <Clock className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{reportData.summary.totalWorkDays}</p>
                                        <p className="text-xs text-muted-foreground">วันทำงาน</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-cyan-500/10">
                                        <Timer className="w-5 h-5 text-cyan-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{reportData.summary.totalHours.toFixed(0)}</p>
                                        <p className="text-xs text-muted-foreground">ชม.รวม</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10">
                                        <TrendingUp className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{reportData.summary.totalOT.toFixed(0)}</p>
                                        <p className="text-xs text-muted-foreground">OT รวม</p>
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
                                        <p className="text-2xl font-bold text-foreground">{reportData.summary.totalLateDays}</p>
                                        <p className="text-xs text-muted-foreground">วันมาสาย</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-red-500/10">
                                        <DollarSign className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">฿{reportData.summary.totalLatePenalty.toFixed(0)}</p>
                                        <p className="text-xs text-muted-foreground">หักสายรวม</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Employee Table */}
                    <Card className="overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg">รายละเอียดตามพนักงาน</CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รหัส</TableHead>
                                    <TableHead>ชื่อ</TableHead>
                                    <TableHead className="hidden md:table-cell">สถานี</TableHead>
                                    <TableHead className="hidden lg:table-cell">แผนก</TableHead>
                                    <TableHead className="text-center">วันทำงาน</TableHead>
                                    <TableHead className="text-center hidden sm:table-cell">ชม.รวม</TableHead>
                                    <TableHead className="text-center hidden sm:table-cell">OT</TableHead>
                                    <TableHead className="text-center">สาย</TableHead>
                                    <TableHead className="text-right">หักสาย</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.employees.map((emp) => (
                                    <TableRow key={emp.id}>
                                        <TableCell className="text-muted-foreground">{emp.employeeId}</TableCell>
                                        <TableCell className="font-medium">{emp.name}</TableCell>
                                        <TableCell className="text-muted-foreground hidden md:table-cell">{emp.station}</TableCell>
                                        <TableCell className="text-muted-foreground hidden lg:table-cell">{emp.department}</TableCell>
                                        <TableCell className="text-center">{emp.workDays}</TableCell>
                                        <TableCell className="text-center text-blue-500 hidden sm:table-cell">{emp.totalHours.toFixed(1)}</TableCell>
                                        <TableCell className="text-center text-purple-500 hidden sm:table-cell">{emp.overtimeHours.toFixed(1)}</TableCell>
                                        <TableCell className="text-center text-orange-500">{emp.lateDays}</TableCell>
                                        <TableCell className="text-right text-red-500">฿{emp.latePenalty.toFixed(0)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}

            {!reportData && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">เลือกช่วงเวลาและกด "สร้างรายงาน"</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
