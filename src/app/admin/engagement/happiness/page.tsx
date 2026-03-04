"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Smile,
    Meh,
    Frown,
    Loader2,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Minus,
    Filter,
    BarChart3,
    Users,
    MessageSquare,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface Summary {
    total: number;
    happy: number;
    neutral: number;
    sad: number;
    happyPct: number;
    neutralPct: number;
    sadPct: number;
}

interface DailyData {
    date: string;
    happy: number;
    neutral: number;
    sad: number;
}

interface EmployeeTrend {
    id: string;
    name: string;
    nickName: string | null;
    station: string;
    department: string;
    totalLogs: number;
    counts: { happy: number; neutral: number; sad: number };
    happyPct: number;
    sadPct: number;
    trend: "improving" | "declining" | "stable" | "watch";
    trendLabel: string;
    recentMoods: string[];
}

interface RecentLog {
    id: string;
    userName: string;
    nickName: string | null;
    mood: string;
    note: string | null;
    date: string;
    station: string;
}

interface Station {
    id: string;
    name: string;
}

interface Department {
    id: string;
    name: string;
}

const MOOD_COLORS = {
    happy: "#22c55e",
    neutral: "#f59e0b",
    sad: "#ef4444",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

function MoodIcon({ mood, size = "w-5 h-5" }: { mood: string; size?: string }) {
    switch (mood) {
        case "HAPPY":
            return <Smile className={`${size} text-green-500`} />;
        case "NEUTRAL":
            return <Meh className={`${size} text-yellow-500`} />;
        case "SAD":
            return <Frown className={`${size} text-red-500`} />;
        default:
            return <Minus className={`${size} text-slate-400`} />;
    }
}

function TrendIcon({ trend }: { trend: string }) {
    switch (trend) {
        case "improving":
            return <TrendingUp className="w-4 h-4 text-green-500" />;
        case "declining":
            return <TrendingDown className="w-4 h-4 text-red-500" />;
        case "watch":
            return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        default:
            return <Minus className="w-4 h-4 text-slate-400" />;
    }
}

function TrendBadge({ trend, label }: { trend: string; label: string }) {
    const variants: Record<string, string> = {
        improving: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        declining: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        watch: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        stable: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variants[trend] || variants.stable}`}>
            <TrendIcon trend={trend} />
            {label}
        </span>
    );
}

function MoodDots({ moods }: { moods: string[] }) {
    return (
        <div className="flex gap-0.5">
            {moods.map((m, i) => (
                <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${m === "HAPPY" ? "bg-green-500" : m === "SAD" ? "bg-red-500" : "bg-yellow-500"
                        }`}
                    title={m === "HAPPY" ? "แฮปปี้" : m === "SAD" ? "เหนื่อย/ท้อ" : "เฉยๆ"}
                />
            ))}
        </div>
    );
}

export default function HappinessDashboard() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [dailyChart, setDailyChart] = useState<DailyData[]>([]);
    const [employeeTrends, setEmployeeTrends] = useState<EmployeeTrend[]>([]);
    const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);

    // Filters
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
    const [stationId, setStationId] = useState<string>("all");
    const [departmentId, setDepartmentId] = useState<string>("all");

    // Station & Department options
    const [stations, setStations] = useState<Station[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    useEffect(() => {
        // Fetch stations & departments for filters
        fetch("/api/admin/stations")
            .then((r) => r.ok ? r.json() : [])
            .then((data) => setStations(Array.isArray(data) ? data : data.stations || []))
            .catch(() => { });
        fetch("/api/admin/departments")
            .then((r) => r.ok ? r.json() : [])
            .then((data) => setDepartments(Array.isArray(data) ? data : data.departments || []))
            .catch(() => { });
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("from", dateFrom);
            params.set("to", dateTo);
            if (stationId !== "all") params.set("stationId", stationId);
            if (departmentId !== "all") params.set("departmentId", departmentId);

            const res = await fetch(`/api/admin/engagement/happiness?${params}`);
            if (res.ok) {
                const data = await res.json();
                setSummary(data.summary);
                setDailyChart(data.dailyChart);
                setEmployeeTrends(data.employeeTrends);
                setRecentLogs(data.recentLogs);
            }
        } catch (error) {
            console.error("Failed to fetch happiness data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [dateFrom, dateTo, stationId, departmentId]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchData();
        }
    }, [session?.user?.id, fetchData]);

    const pieData = summary
        ? [
            { name: "แฮปปี้", value: summary.happy },
            { name: "เฉยๆ", value: summary.neutral },
            { name: "เหนื่อย/ท้อ", value: summary.sad },
        ]
        : [];

    const watchCount = employeeTrends.filter((e) => e.trend === "watch").length;
    const decliningCount = employeeTrends.filter((e) => e.trend === "declining").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Smile className="w-7 h-7 text-green-500" />
                    ความสุขพนักงาน
                </h1>
                <p className="text-muted-foreground">วิเคราะห์ mood จากการเช็คเอาท์เลิกงาน</p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Filter className="w-4 h-4" />
                            ตัวกรอง:
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">จากวันที่</Label>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">ถึงวันที่</Label>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">สถานี</Label>
                            <Select value={stationId} onValueChange={setStationId}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="ทั้งหมด" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทั้งหมด</SelectItem>
                                    {stations.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">แผนก</Label>
                            <Select value={departmentId} onValueChange={setDepartmentId}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="ทั้งหมด" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทั้งหมด</SelectItem>
                                    {departments.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                        <BarChart3 className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{summary?.total || 0}</p>
                                        <p className="text-xs text-muted-foreground">บันทึกทั้งหมด</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-green-200 dark:border-green-800/50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                                        <Smile className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary?.happy || 0}</p>
                                        <p className="text-xs text-muted-foreground">แฮปปี้ ({summary?.happyPct || 0}%)</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-yellow-200 dark:border-yellow-800/50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
                                        <Meh className="w-5 h-5 text-yellow-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary?.neutral || 0}</p>
                                        <p className="text-xs text-muted-foreground">เฉยๆ ({summary?.neutralPct || 0}%)</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-red-200 dark:border-red-800/50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                                        <Frown className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary?.sad || 0}</p>
                                        <p className="text-xs text-muted-foreground">เหนื่อย/ท้อ ({summary?.sadPct || 0}%)</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alert Banner for employees that need attention */}
                    {(watchCount > 0 || decliningCount > 0) && (
                        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <p className="font-medium text-foreground">
                                            มีพนักงานที่ต้องดูแล
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {watchCount > 0 && `⚠️ ควรดูแล ${watchCount} คน`}
                                            {watchCount > 0 && decliningCount > 0 && " • "}
                                            {decliningCount > 0 && `📉 แนวโน้มแย่ลง ${decliningCount} คน`}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Charts */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Daily Trend Bar Chart */}
                        <Card className="lg:col-span-2">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    <CardTitle className="text-lg">Mood Trend รายวัน</CardTitle>
                                </div>
                                <CardDescription>จำนวนการบันทึก mood แต่ละวัน</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {dailyChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={dailyChart} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                            <XAxis
                                                dataKey="date"
                                                stroke="currentColor"
                                                className="text-muted-foreground"
                                                fontSize={11}
                                                tickFormatter={(v) => {
                                                    const d = new Date(v);
                                                    return `${d.getDate()}/${d.getMonth() + 1}`;
                                                }}
                                            />
                                            <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "hsl(var(--card))",
                                                    border: "1px solid hsl(var(--border))",
                                                    borderRadius: "8px",
                                                    color: "hsl(var(--foreground))",
                                                }}
                                                labelFormatter={(v) => {
                                                    const d = new Date(v);
                                                    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
                                                }}
                                            />
                                            <Legend />
                                            <Bar dataKey="happy" name="แฮปปี้" fill={MOOD_COLORS.happy} radius={[2, 2, 0, 0]} stackId="mood" />
                                            <Bar dataKey="neutral" name="เฉยๆ" fill={MOOD_COLORS.neutral} radius={[0, 0, 0, 0]} stackId="mood" />
                                            <Bar dataKey="sad" name="เหนื่อย/ท้อ" fill={MOOD_COLORS.sad} radius={[2, 2, 0, 0]} stackId="mood" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                        ยังไม่มีข้อมูลในช่วงนี้
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pie Chart */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">สัดส่วน Mood</CardTitle>
                                <CardDescription>ภาพรวมช่วงที่เลือก</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {summary && summary.total > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {pieData.map((_, idx) => (
                                                    <Cell key={idx} fill={PIE_COLORS[idx]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                                        ไม่มีข้อมูล
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Employee Trend Analysis */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-500" />
                                <CardTitle className="text-lg">วิเคราะห์แนวโน้มรายบุคคล</CardTitle>
                            </div>
                            <CardDescription>
                                เปรียบเทียบ mood ล่าสุด 7 ครั้ง กับก่อนหน้า • เรียงจากควรดูแลมากที่สุด
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {employeeTrends.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left py-3 px-2 font-medium text-muted-foreground">พนักงาน</th>
                                                <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">สถานี/แผนก</th>
                                                <th className="text-center py-3 px-2 font-medium text-muted-foreground">😊</th>
                                                <th className="text-center py-3 px-2 font-medium text-muted-foreground">😐</th>
                                                <th className="text-center py-3 px-2 font-medium text-muted-foreground">😥</th>
                                                <th className="text-center py-3 px-2 font-medium text-muted-foreground">แนวโน้ม</th>
                                                <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Mood ล่าสุด</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employeeTrends.map((emp) => (
                                                <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                                    <td className="py-3 px-2">
                                                        <div>
                                                            <p className="font-medium text-foreground">{emp.name}</p>
                                                            {emp.nickName && (
                                                                <p className="text-xs text-muted-foreground">({emp.nickName})</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 hidden sm:table-cell">
                                                        <p className="text-xs text-muted-foreground">{emp.station}</p>
                                                        <p className="text-xs text-muted-foreground">{emp.department}</p>
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        <span className="text-green-600 dark:text-green-400 font-medium">{emp.counts.happy}</span>
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">{emp.counts.neutral}</span>
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        <span className="text-red-600 dark:text-red-400 font-medium">{emp.counts.sad}</span>
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        <TrendBadge trend={emp.trend} label={emp.trendLabel} />
                                                    </td>
                                                    <td className="py-3 px-2 hidden md:table-cell">
                                                        <MoodDots moods={emp.recentMoods} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    ไม่มีข้อมูลพนักงานในช่วงนี้
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Logs with Notes */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-sky-500" />
                                <CardTitle className="text-lg">บันทึกล่าสุด</CardTitle>
                            </div>
                            <CardDescription>mood และข้อความจากพนักงาน</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentLogs.length > 0 ? (
                                <div className="space-y-3">
                                    {recentLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                        >
                                            <MoodIcon mood={log.mood} size="w-6 h-6" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-medium text-sm text-foreground">
                                                        {log.userName}
                                                        {log.nickName && <span className="text-muted-foreground"> ({log.nickName})</span>}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground">•</span>
                                                    <span className="text-xs text-muted-foreground">{log.station}</span>
                                                </div>
                                                {log.note && (
                                                    <p className="text-sm text-muted-foreground mt-1 italic">
                                                        &ldquo;{log.note}&rdquo;
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(log.date).toLocaleDateString("th-TH", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    ไม่มีบันทึกในช่วงนี้
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
