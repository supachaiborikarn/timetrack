"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    Users,
    Clock,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Coffee,
    DollarSign,
    Loader2,
    BarChart3,
    RefreshCw,
} from "lucide-react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface AnalyticsData {
    weekly: {
        day: string;
        date: string;
        onTime: number;
        late: number;
        absent: number;
    }[];
    trend: {
        date: string;
        lateCount: number;
        avgLateMinutes: number;
    }[];
    summary: {
        totalEmployees: number;
        todayAttendance: number;
        todayLate: number;
        weekLateTotal: number;
        weekAbsentTotal: number;
    };
}

export default function AnalyticsPage() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            fetchAnalytics();
        }
    }, [session?.user?.id]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/analytics");
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    // Calculate additional stats from weekly data
    const weeklyTotal = data?.weekly.reduce((acc, d) => ({
        onTime: acc.onTime + d.onTime,
        late: acc.late + d.late,
        absent: acc.absent + d.absent,
    }), { onTime: 0, late: 0, absent: 0 }) || { onTime: 0, late: 0, absent: 0 };

    const attendanceRate = weeklyTotal.onTime + weeklyTotal.late + weeklyTotal.absent > 0
        ? Math.round(((weeklyTotal.onTime + weeklyTotal.late) / (weeklyTotal.onTime + weeklyTotal.late + weeklyTotal.absent)) * 100)
        : 0;

    // Find max for chart scaling
    const maxValue = Math.max(...(data?.weekly.map(d => d.onTime + d.late + d.absent) || [1]));

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Analytics</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">สรุปสถิติการเข้างานและประสิทธิภาพ</p>
                </div>
                <Button variant="outline" onClick={fetchAnalytics} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                    รีเฟรช
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">พนักงานทั้งหมด</p>
                                <p className="text-2xl font-bold">{data?.summary.totalEmployees || 0}</p>
                            </div>
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">เข้างานวันนี้</p>
                                <p className="text-2xl font-bold">{data?.summary.todayAttendance || 0}</p>
                            </div>
                            <div className="p-3 rounded-full bg-green-500/10">
                                <TrendingUp className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">สายวันนี้</p>
                                <p className="text-2xl font-bold text-orange-500">{data?.summary.todayLate || 0}</p>
                            </div>
                            <div className="p-3 rounded-full bg-orange-500/10">
                                <Clock className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">อัตราเข้างาน</p>
                                <p className="text-2xl font-bold">{attendanceRate}%</p>
                            </div>
                            <div className="p-3 rounded-full bg-purple-500/10">
                                <BarChart3 className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Weekly Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        สถิติรายสัปดาห์
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-2 h-48">
                        {data?.weekly.map((day, i) => {
                            const total = day.onTime + day.late + day.absent;
                            const height = total > 0 ? (total / maxValue) * 100 : 5;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                        className="w-full rounded-t flex flex-col justify-end overflow-hidden"
                                        style={{ height: `${height}%` }}
                                    >
                                        {day.absent > 0 && (
                                            <div
                                                className="w-full bg-red-500/80"
                                                style={{ height: `${(day.absent / total) * 100}%` }}
                                                title={`ขาด: ${day.absent}`}
                                            />
                                        )}
                                        {day.late > 0 && (
                                            <div
                                                className="w-full bg-orange-500/80"
                                                style={{ height: `${(day.late / total) * 100}%` }}
                                                title={`สาย: ${day.late}`}
                                            />
                                        )}
                                        {day.onTime > 0 && (
                                            <div
                                                className="w-full bg-green-500/80"
                                                style={{ height: `${(day.onTime / total) * 100}%` }}
                                                title={`ตรงเวลา: ${day.onTime}`}
                                            />
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{day.day}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-500/80" />
                            <span className="text-sm text-muted-foreground">ตรงเวลา</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-orange-500/80" />
                            <span className="text-sm text-muted-foreground">สาย</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-500/80" />
                            <span className="text-sm text-muted-foreground">ขาด</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Week Summary Table */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            สรุปสัปดาห์นี้
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10">
                                <span className="text-muted-foreground">เข้าตรงเวลา</span>
                                <span className="font-bold text-green-500">{weeklyTotal.onTime} ครั้ง</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-orange-500/10">
                                <span className="text-muted-foreground">เข้าสาย</span>
                                <span className="font-bold text-orange-500">{weeklyTotal.late} ครั้ง</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/10">
                                <span className="text-muted-foreground">ขาดงาน</span>
                                <span className="font-bold text-red-500">{weeklyTotal.absent} ครั้ง</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-blue-500" />
                            แนวโน้มการมาสาย (30 วัน)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-0.5 h-32">
                            {data?.trend.map((d, i) => {
                                const maxLate = Math.max(...(data.trend.map(t => t.lateCount) || [1]));
                                const height = d.lateCount > 0 ? (d.lateCount / maxLate) * 100 : 2;
                                return (
                                    <div
                                        key={i}
                                        className="flex-1 bg-blue-500/60 rounded-t hover:bg-blue-500 transition-colors cursor-pointer"
                                        style={{ height: `${height}%` }}
                                        title={`${d.date}: ${d.lateCount} คนสาย (เฉลี่ย ${d.avgLateMinutes} นาที)`}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>30 วันก่อน</span>
                            <span>วันนี้</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
