"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, CalendarDays, CheckCircle2, Fuel, Loader2, RefreshCw, Scale, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Station {
    id: string;
    name: string;
    code: string;
}

interface FairnessSummary {
    employeeCount: number;
    shiftCount: number;
    understaffedSlots: number;
    overstaffedSlots: number;
    unavailableAssigned: number;
    preferredOffAssigned: number;
    workDaySpread: number;
    peakSpread: number;
    maxConsecutiveWorkDays: number;
}

interface CoverageRow {
    date: string;
    dayName: string;
    shiftId: string;
    shiftCode: string;
    shiftName: string;
    requiredWorkers: number;
    assignedWorkers: number;
    gap: number;
    status: "under" | "ok" | "over";
    isPeak: boolean;
}

interface EmployeeRow {
    userId: string;
    employeeId: string;
    name: string;
    nickName: string | null;
    department: string;
    workDays: number;
    dayOffs: number;
    weekendWorkDays: number;
    peakShiftCount: number;
    unavailableAssigned: number;
    preferredOffAssigned: number;
    maxConsecutiveWorkDays: number;
    assignedHours: number;
}

interface FairnessResponse {
    station: Station;
    month: number;
    year: number;
    scope: "frontyard" | "all";
    score: number;
    statusLabel: string;
    summary: FairnessSummary;
    demandSource: {
        type: "fuel-hourly" | "fuel-trend" | "current-schedule";
        label: string;
        fuelStationId: number | null;
        fuelStationName: string | null;
        fuelDate: string | null;
        days: number;
        error: string | null;
    };
    coverageRows: CoverageRow[];
    employeeRows: EmployeeRow[];
    recommendations: string[];
}

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

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

function scoreClass(score: number): string {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
}

function statusBadgeClass(status: CoverageRow["status"]): string {
    if (status === "under") return "bg-red-100 text-red-700 border-red-200";
    if (status === "over") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function statusText(status: CoverageRow["status"]): string {
    if (status === "under") return "ขาดคน";
    if (status === "over") return "คนเกิน";
    return "พอดี";
}

function formatHours(value: number): string {
    return `${Math.round(value * 10) / 10} ชม.`;
}

export default function ShiftFairnessPage() {
    const { status } = useSession();
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStationId, setSelectedStationId] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<FairnessResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStations = useCallback(async () => {
        const response = await fetch("/api/admin/stations");
        if (!response.ok) throw new Error("โหลดสถานีไม่สำเร็จ");

        const payload: { stations?: Station[] } = await response.json();
        const nextStations = payload.stations ?? [];
        setStations(nextStations);

        if (!selectedStationId && nextStations.length > 0) {
            setSelectedStationId(nextStations[0].id);
        }
    }, [selectedStationId]);

    const fetchFairness = useCallback(async () => {
        if (!selectedStationId) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                stationId: selectedStationId,
                month: String(selectedMonth),
                year: String(selectedYear),
                days: "90",
            });
            const response = await fetch(`/api/admin/schedule/fairness?${params.toString()}`);

            if (!response.ok) {
                throw new Error("โหลดคะแนนไม่สำเร็จ");
            }

            const payload: FairnessResponse = await response.json();
            setData(payload);
        } catch (fetchError) {
            setData(null);
            setError(fetchError instanceof Error ? fetchError.message : "โหลดคะแนนไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, selectedStationId, selectedYear]);

    useEffect(() => {
        fetchStations().catch((fetchError) => {
            setError(fetchError instanceof Error ? fetchError.message : "โหลดสถานีไม่สำเร็จ");
        });
    }, [fetchStations]);

    useEffect(() => {
        void fetchFairness();
    }, [fetchFairness]);

    const focusCoverageRows = useMemo(() => {
        if (!data) return [];

        return data.coverageRows
            .filter((row) => row.status !== "ok")
            .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
            .slice(0, 12);
    }, [data]);

    const riskiestEmployees = useMemo(() => {
        if (!data) return [];

        return [...data.employeeRows]
            .sort((a, b) => {
                const aRisk = a.unavailableAssigned * 4 + a.preferredOffAssigned + a.maxConsecutiveWorkDays + a.workDays;
                const bRisk = b.unavailableAssigned * 4 + b.preferredOffAssigned + b.maxConsecutiveWorkDays + b.workDays;
                return bRisk - aRisk;
            })
            .slice(0, 12);
    }, [data]);

    if (status === "loading") {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Scale className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold">Shift Fairness Index</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        คะแนนความแฟร์ของตารางกะตามจำนวนคนที่ต้องใช้และวันหยุดที่พนักงานแจ้งไว้
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" asChild>
                        <Link href="/admin/shifts">
                            <CalendarDays className="mr-2 h-4 w-4" />
                            ตารางกะ
                        </Link>
                    </Button>
                    <Button onClick={() => void fetchFairness()} disabled={isLoading || !selectedStationId}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        รีเฟรช
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกสถานี" />
                            </SelectTrigger>
                            <SelectContent>
                                {stations.map((station) => (
                                    <SelectItem key={station.id} value={station.id}>
                                        {station.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((month) => (
                                    <SelectItem key={month.value} value={String(month.value)}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={String(year)}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center rounded-md border px-3 text-sm text-muted-foreground">
                            {data?.scope === "frontyard" ? "วิเคราะห์เฉพาะหน้าลาน" : "วิเคราะห์พนักงานทั้งหมด"}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="flex items-center gap-3 p-4 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        <span>{error}</span>
                    </CardContent>
                </Card>
            )}

            {isLoading && !data ? (
                <Card>
                    <CardContent className="flex min-h-[220px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            ) : data ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">คะแนน</p>
                                        <p className={`text-4xl font-bold ${scoreClass(data.score)}`}>{data.score}</p>
                                    </div>
                                    <Badge variant="outline">{data.statusLabel}</Badge>
                                </div>
                                <div className="mt-4 h-2 rounded-full bg-muted">
                                    <div
                                        className="h-2 rounded-full bg-primary"
                                        style={{ width: `${data.score}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">ขาดคนรวม</p>
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="mt-2 text-3xl font-bold">{data.summary.understaffedSlots}</p>
                                <p className="text-sm text-muted-foreground">ช่องกะที่ต้องเติมคน</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">ชนวันไม่ว่าง</p>
                                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="mt-2 text-3xl font-bold">{data.summary.unavailableAssigned}</p>
                                <p className="text-sm text-muted-foreground">รวม preferred off {data.summary.preferredOffAssigned}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">แหล่ง demand</p>
                                    <Fuel className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="mt-2 text-lg font-semibold">{data.demandSource.label}</p>
                                <p className="text-sm text-muted-foreground">
                                    {data.demandSource.fuelStationName || data.demandSource.error || "พร้อมใช้งาน"}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">กะที่ควรแก้ก่อน</CardTitle>
                                <CardDescription>เรียงจากช่องที่ขาดหรือเกินคนมากสุด</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {focusCoverageRows.length === 0 ? (
                                    <div className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        จำนวนคนต่อกะพอดีแล้ว
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>วันที่</TableHead>
                                                    <TableHead>กะ</TableHead>
                                                    <TableHead className="text-center">ต้องใช้</TableHead>
                                                    <TableHead className="text-center">ลงไว้</TableHead>
                                                    <TableHead className="text-center">สถานะ</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {focusCoverageRows.map((row) => (
                                                    <TableRow key={`${row.date}-${row.shiftId}`}>
                                                        <TableCell>
                                                            <div className="font-medium">{row.date}</div>
                                                            <div className="text-xs text-muted-foreground">{row.dayName}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{row.shiftCode}</div>
                                                            <div className="text-xs text-muted-foreground">{row.shiftName}</div>
                                                        </TableCell>
                                                        <TableCell className="text-center">{row.requiredWorkers}</TableCell>
                                                        <TableCell className="text-center">{row.assignedWorkers}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className={statusBadgeClass(row.status)}>
                                                                {statusText(row.status)} {row.gap !== 0 ? Math.abs(row.gap) : ""}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">ข้อเสนอ</CardTitle>
                                <CardDescription>ใช้เป็นเช็กลิสต์ตอนปรับตาราง</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {data.recommendations.map((item) => (
                                        <div key={item} className="rounded-md border p-3 text-sm">
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">รายคน</CardTitle>
                            <CardDescription>
                                วันทำงาน ช่วงพีค วันหยุดที่ชน และจำนวนวันทำงานติดกัน
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>พนักงาน</TableHead>
                                            <TableHead>แผนก</TableHead>
                                            <TableHead className="text-center">วันทำงาน</TableHead>
                                            <TableHead className="text-center">วันหยุด</TableHead>
                                            <TableHead className="text-center">กะพีค</TableHead>
                                            <TableHead className="text-center">ชนวันลา</TableHead>
                                            <TableHead className="text-center">ทำติดกัน</TableHead>
                                            <TableHead className="text-right">ชั่วโมง</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {riskiestEmployees.map((employee) => (
                                            <TableRow key={employee.userId}>
                                                <TableCell>
                                                    <div className="font-medium">{employee.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {employee.employeeId}{employee.nickName ? ` · ${employee.nickName}` : ""}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{employee.department}</TableCell>
                                                <TableCell className="text-center">{employee.workDays}</TableCell>
                                                <TableCell className="text-center">{employee.dayOffs}</TableCell>
                                                <TableCell className="text-center">{employee.peakShiftCount}</TableCell>
                                                <TableCell className="text-center">
                                                    {employee.unavailableAssigned + employee.preferredOffAssigned}
                                                </TableCell>
                                                <TableCell className="text-center">{employee.maxConsecutiveWorkDays}</TableCell>
                                                <TableCell className="text-right">{formatHours(employee.assignedHours)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    );
}
