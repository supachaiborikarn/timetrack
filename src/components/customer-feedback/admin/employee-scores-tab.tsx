"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Flame,
    Loader2,
    MessageSquare,
    RefreshCcw,
    Search,
    TrendingDown,
    TrendingUp,
    UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

type Criterion = {
    key: string;
    label: { th: string; en: string };
    weight: number;
    yes: number;
    no: number;
    unsure: number;
    evaluable: number;
    earnedPerResponse: number | null;
};

type HourlyStat = {
    hour: number;
    label: string;
    responseCount: number;
    score64: number | null;
};

type TimeSlotStat = {
    slotKey: "morning_rush" | "daytime" | "evening_rush" | "night";
    label: string;
    timeRange: string;
    responseCount: number;
    score64: number | null;
    isPeak: boolean;
};

type ShiftStat = {
    shiftLabel: string;
    responseCount: number;
    score64: number | null;
};

type DayOfWeekStat = {
    type: "weekday" | "weekend";
    label: string;
    responseCount: number;
    score64: number | null;
};

type ProgressionBucket = {
    periodKey: string;
    label: string;
    startDate: string;
    endDate: string;
    responseCount: number;
    score64: number | null;
    customerPoints: number | null;
};

type RushHourRubricComparison = {
    questionKey: string;
    label: { th: string; en: string };
    weight: number;
    normalRate: number | null;
    rushHourRate: number | null;
    gap: number | null;
    isDropAlert: boolean;
};

type RecentFeedbackItem = {
    id: string;
    submittedAt: string;
    timeLabel: string;
    shiftLabel: string | null;
    durationSeconds: number;
    score64: number | null;
    comment: string | null;
    missedCriteria: string[];
};

type EmployeeTemporalStats = {
    peakHour: string | null;
    peakSlot: string | null;
    hourly: HourlyStat[];
    timeSlots: TimeSlotStat[];
    shifts: ShiftStat[];
    dayOfWeek: DayOfWeekStat[];
    progression: {
        buckets: ProgressionBucket[];
        trend: "improving" | "declining" | "stable" | "insufficient_data";
        delta: number | null;
        summaryText: string;
    };
    rushHourRubric: RushHourRubricComparison[];
    recentFeedbacks: RecentFeedbackItem[];
};

type EmployeeScore = {
    employeeId: string;
    rank: number | null;
    label: string;
    stationId: string | null;
    stationLabel: string | null;
    latestResponseAt: string | null;
    responseCount: number;
    monthlyEvaluationCount: number;
    minimumSample: number;
    meetsMinimumSample: boolean;
    score64: number | null;
    overallScore: number | null;
    workPoints: number;
    workPointsMax: number;
    customerPoints: number | null;
    customerPointsMax: number;
    customerIncluded: boolean;
    isProvisional: boolean;
    components: {
        presence: number;
        punctuality: number;
        completion: number;
        breakDiscipline: number;
    };
    counts: {
        scheduledDays: number;
        requiredDays: number;
        presentDays: number;
        absentDays: number;
        approvedLeaveDays: number;
        pendingLeaveDays: number;
        dayOffDays: number;
        upcomingDays: number;
        inProgressDays: number;
        lateDays: number;
        earlyLeaveDays: number;
        overBreakDays: number;
        leaveAttendanceOverlapDays: number;
        duplicateLeaveDays: number;
        unscheduledAttendanceDays: number;
    };
    dataIssues: string[];
    earnedWeight: number;
    evaluableWeight: number;
    excludedWeight: number;
    criteria: Criterion[];
    temporalStats?: EmployeeTemporalStats;
};

type ScoreResponse = {
    rubricVersion: string;
    totalPoints: number;
    overallPoints: number;
    workPoints: number;
    customerPoints: number;
    from: string;
    toExclusive: string;
    calculatedAt: string;
    monthlyEvaluationTarget: number;
    monthlyFrom: string;
    monthlyToExclusive: string;
    employees: EmployeeScore[];
};

type ScoreView = "overview" | "individual";

function isoDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function EmployeeScoresTab() {
    const [data, setData] = useState<ScoreResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [view, setView] = useState<ScoreView>("overview");
    const [subTab, setSubTab] = useState<"overview" | "time" | "rubric" | "comments">("overview");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [isMobileSelectorOpen, setIsMobileSelectorOpen] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [from, setFrom] = useState(() => isoDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
    const [to, setTo] = useState(() => isoDateInput(new Date()));

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            const response = await fetch(`/api/admin/customer-feedback/employee-scores?${params.toString()}`, { cache: "no-store" });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error ?? "โหลดคะแนนพนักงานไม่สำเร็จ");
            setData(body as ScoreResponse);
            setLastUpdatedAt(new Date((body as ScoreResponse).calculatedAt));
            setSelectedId((current) => {
                const employees = (body as ScoreResponse).employees;
                return current && employees.some((item) => item.employeeId === current)
                    ? current
                    : employees[0]?.employeeId ?? null;
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "โหลดคะแนนพนักงานไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    }, [from, to]);

    useEffect(() => {
        void load();
    }, [load]);

    const selected = useMemo(
        () => data?.employees.find((employee) => employee.employeeId === selectedId) ?? null,
        [data, selectedId]
    );

    const filteredEmployees = useMemo(() => {
        const employees = data?.employees ?? [];
        const query = employeeSearch.trim().toLocaleLowerCase("th");
        if (!query) return employees;
        return employees.filter((employee) =>
            employee.label.toLocaleLowerCase("th").includes(query)
            || (employee.stationLabel ?? "").toLocaleLowerCase("th").includes(query)
        );
    }, [data, employeeSearch]);

    const monthlyTarget = data?.monthlyEvaluationTarget ?? 60;

    const selectedAnswerCounts = useMemo(() => {
        if (!selected) return null;
        return selected.criteria.reduce(
            (sum, criterion) => ({
                yes: sum.yes + criterion.yes,
                no: sum.no + criterion.no,
                unsure: sum.unsure + criterion.unsure,
            }),
            { yes: 0, no: 0, unsure: 0 }
        );
    }, [selected]);

    const openIndividual = (employeeId: string) => {
        setSelectedId(employeeId);
        setView("individual");
        setSubTab("overview");
    };

    const renderIndividualDetail = () => {
        if (!selected) {
            return (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        ยังไม่มีพนักงานให้เลือกในช่วงวันที่นี้
                    </CardContent>
                </Card>
            );
        }

        const tStats = selected.temporalStats;

        return (
            <div className="space-y-4">
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-xs text-muted-foreground">แบบประเมิน VALID เดือนนี้</div>
                                <div className="mt-1 text-2xl font-bold">
                                    {selected.monthlyEvaluationCount}
                                    <span className="ml-1 text-sm font-normal text-muted-foreground">/ {monthlyTarget} แบบ</span>
                                </div>
                            </div>
                            <Badge variant={selected.monthlyEvaluationCount >= monthlyTarget ? "default" : "secondary"}>
                                {selected.monthlyEvaluationCount >= monthlyTarget
                                    ? "ถึงเป้าแล้ว"
                                    : `ขาดอีก ${monthlyTarget - selected.monthlyEvaluationCount} คน`}
                            </Badge>
                        </div>
                        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-[width] duration-500"
                                style={{ width: `${Math.min(100, monthlyTarget > 0 ? (selected.monthlyEvaluationCount / monthlyTarget) * 100 : 0)}%` }}
                                role="progressbar"
                                aria-label={`ยอดประเมินเดือนนี้ ${selected.label}`}
                                aria-valuemin={0}
                                aria-valuemax={monthlyTarget}
                                aria-valuenow={selected.monthlyEvaluationCount}
                            />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            นับเฉพาะ VALID employee-v3/v4 ของเดือนปัจจุบันตามเวลาไทย · ไม่เปลี่ยนตามช่วงวันที่ด้านบน
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">คะแนนผลงานรวม</div>
                            <div className="mt-1 text-2xl font-bold">
                                {selected.overallScore === null ? "—" : selected.overallScore.toFixed(0)}
                                <span className="ml-1 text-sm font-normal text-muted-foreground">/ 100</span>
                            </div>
                            <div className="text-xs text-muted-foreground">อันดับ {selected.rank ?? "รอข้อมูลครบ"}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">เวลาทำงาน</div>
                            <div className="mt-1 text-2xl font-bold">
                                {selected.workPoints.toFixed(1)}
                                <span className="ml-1 text-sm font-normal text-muted-foreground">/ {selected.workPointsMax}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">มาทำงาน {selected.counts.presentDays}/{selected.counts.requiredDays} วัน</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">คะแนนลูกค้า</div>
                            <div className="mt-1 text-2xl font-bold">
                                {selected.customerPoints === null ? "—" : selected.customerPoints.toFixed(1)}
                                <span className="ml-1 text-sm font-normal text-muted-foreground">/ {selected.customerPointsMax}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {selected.score64 === null ? "รอข้อมูลลูกค้าครบ" : `${selected.score64.toFixed(1)} / 64`}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">แบบประเมิน VALID</div>
                            <div className="mt-1 text-2xl font-bold">{selected.responseCount}</div>
                            <div className="text-xs text-muted-foreground">ขั้นต่ำ {selected.minimumSample}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Progression & Peak Highlight Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm">แนวโน้มผลงาน:</span>
                        {tStats?.progression.trend === "improving" && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600/90 text-white flex items-center gap-1">
                                <TrendingUp className="h-3.5 w-3.5" />
                                มีพัฒนาการ (+{tStats.progression.delta?.toFixed(1)} คะแนน ↗)
                            </Badge>
                        )}
                        {tStats?.progression.trend === "declining" && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <TrendingDown className="h-3.5 w-3.5" />
                                คะแนนลดลง ({tStats.progression.delta?.toFixed(1)} คะแนน ↘)
                            </Badge>
                        )}
                        {tStats?.progression.trend === "stable" && (
                            <Badge variant="outline" className="border-blue-500/40 text-blue-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                สม่ำเสมอคงที่ (→)
                            </Badge>
                        )}
                        {(!tStats || tStats.progression.trend === "insufficient_data") && (
                            <Badge variant="secondary">รอสะสมข้อมูลเพื่อวัดแนวโน้ม</Badge>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {tStats?.peakSlot && (
                            <div className="flex items-center gap-1">
                                <Flame className="h-3.5 w-3.5 text-amber-500" />
                                <span>ช่วงประเมินหนาแน่น: <strong className="text-foreground">{tStats.peakSlot}</strong></span>
                            </div>
                        )}
                        {tStats?.peakHour && !tStats?.peakSlot && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>ชั่วโมงประเมินสูงสุด: <strong className="text-foreground">{tStats.peakHour}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-Tab Switcher */}
                <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-4" role="tablist" aria-label="หมวดหมู่รายละเอียดพนักงาน">
                    <Button
                        type="button"
                        size="sm"
                        variant={subTab === "overview" ? "secondary" : "ghost"}
                        onClick={() => setSubTab("overview")}
                        className="text-xs sm:text-sm"
                    >
                        ภาพรวม & พัฒนาการ
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={subTab === "time" ? "secondary" : "ghost"}
                        onClick={() => setSubTab("time")}
                        className="text-xs sm:text-sm"
                    >
                        ช่วงเวลา & กะทำงาน
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={subTab === "rubric" ? "secondary" : "ghost"}
                        onClick={() => setSubTab("rubric")}
                        className="text-xs sm:text-sm"
                    >
                        เกณฑ์ 9 ข้อ & ชม.เร่งด่วน
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={subTab === "comments" ? "secondary" : "ghost"}
                        onClick={() => setSubTab("comments")}
                        className="text-xs sm:text-sm"
                    >
                        ความคิดเห็นลูกค้า ({tStats?.recentFeedbacks.length ?? 0})
                    </Button>
                </div>

                {/* SUB-TAB 1: ภาพรวม & พัฒนาการ */}
                {subTab === "overview" && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>แนวโน้มคะแนนการบริการ (Score Progression)</span>
                                    {tStats?.progression.delta !== null && tStats?.progression.delta !== undefined && (
                                        <Badge variant="outline">
                                            ผลต่าง {tStats.progression.delta >= 0 ? "+" : ""}{tStats.progression.delta.toFixed(1)} คะแนน
                                        </Badge>
                                    )}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">{tStats?.progression.summaryText ?? "กำลังโหลดข้อมูล..."}</p>
                            </CardHeader>
                            <CardContent>
                                {tStats?.progression.buckets && tStats.progression.buckets.length > 0 ? (
                                    <div className="h-[180px] sm:h-[220px] w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <LineChart data={tStats.progression.buckets} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                                <YAxis domain={[0, 64]} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    formatter={(value, name) => [
                                                        typeof value === "number" ? value.toFixed(1) : value,
                                                        name === "score64" ? "คะแนนเฉลี่ย (/64)" : "คะแนนผลงาน (/40)"
                                                    ]}
                                                />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="score64"
                                                    name="คะแนนบริการ (/64)"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    dot={{ r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="customerPoints"
                                                    name="คะแนนลูกค้า (/40)"
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    strokeDasharray="4 4"
                                                    dot={{ r: 3 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        ยังไม่มีข้อมูลแบบประเมินเพียงพอสำหรับแสดงกราฟพัฒนาการ
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>รายละเอียดเวลาทำงาน 60 คะแนน</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">การมาทำงาน</div>
                                        <div className="mt-1 text-xl font-bold">{selected.components.presence.toFixed(1)} / 25</div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">ตรงเวลา</div>
                                        <div className="mt-1 text-xl font-bold">{selected.components.punctuality.toFixed(1)} / 15</div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">อยู่ครบกะ</div>
                                        <div className="mt-1 text-xl font-bold">{selected.components.completion.toFixed(1)} / 10</div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">พักตามกำหนด</div>
                                        <div className="mt-1 text-xl font-bold">{selected.components.breakDiscipline.toFixed(1)} / 10</div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <Badge variant="outline">มา {selected.counts.presentDays} วัน</Badge>
                                    <Badge variant="outline">ขาด {selected.counts.absentDays} วัน</Badge>
                                    <Badge variant="outline">สาย {selected.counts.lateDays} วัน</Badge>
                                    <Badge variant="outline">ออกก่อน {selected.counts.earlyLeaveDays} วัน</Badge>
                                    <Badge variant="outline">พักเกิน {selected.counts.overBreakDays} วัน</Badge>
                                    <Badge variant="outline">ลาอนุมัติ {selected.counts.approvedLeaveDays} วัน</Badge>
                                    <Badge variant="outline">วันหยุด {selected.counts.dayOffDays} วัน</Badge>
                                </div>
                                {selected.dataIssues.length > 0 && (
                                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                                        <div className="font-semibold text-destructive">พบข้อมูลที่ต้องตรวจสอบ</div>
                                        <ul className="mt-2 list-disc space-y-1 pl-5">
                                            {selected.dataIssues.map((issue) => <li key={issue}>{issue}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex flex-wrap items-center gap-2">
                                    รายละเอียดคะแนนลูกค้า — {selected.label}
                                    {selected.stationLabel && <Badge variant="secondary">{selected.stationLabel}</Badge>}
                                    {selected.score64 !== null && <Badge variant="outline">{selected.score64.toFixed(1)} / 64</Badge>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {!selected.meetsMinimumSample && (
                                    <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                                        ยังไม่แสดงคะแนนรายข้อจนกว่าจะมีคำตอบ VALID อย่างน้อย {selected.minimumSample} แบบประเมิน เพื่อไม่สรุปผลงานจากตัวอย่างที่น้อยเกินไป
                                    </p>
                                )}
                                <div className="hidden sm:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>เกณฑ์</TableHead>
                                                <TableHead className="text-right">เต็ม</TableHead>
                                                <TableHead className="text-right">YES</TableHead>
                                                <TableHead className="text-right">NO</TableHead>
                                                <TableHead className="text-right">ไม่แน่ใจ</TableHead>
                                                <TableHead className="text-right">คะแนนเฉลี่ย</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selected.criteria.map((criterion) => (
                                                <TableRow key={criterion.key}>
                                                    <TableCell>{criterion.label.th}</TableCell>
                                                    <TableCell className="text-right">{criterion.weight}</TableCell>
                                                    <TableCell className="text-right">{criterion.yes}</TableCell>
                                                    <TableCell className="text-right">{criterion.no}</TableCell>
                                                    <TableCell className="text-right">{criterion.unsure}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {selected.meetsMinimumSample && criterion.earnedPerResponse !== null
                                                            ? `${criterion.earnedPerResponse.toFixed(1)} / ${criterion.weight}`
                                                            : "—"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="block sm:hidden space-y-2">
                                    {selected.criteria.map((criterion) => (
                                        <div key={criterion.key} className="rounded-lg border p-2.5 bg-card text-xs space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-medium text-foreground">{criterion.label.th}</span>
                                                <span className="font-bold shrink-0">
                                                    {selected.meetsMinimumSample && criterion.earnedPerResponse !== null
                                                        ? `${criterion.earnedPerResponse.toFixed(1)} / ${criterion.weight}`
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400 font-medium">YES {criterion.yes}</span>
                                                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive font-medium">NO {criterion.no}</span>
                                                <span className="rounded bg-muted px-1.5 py-0.5">ไม่แน่ใจ {criterion.unsure}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                    <span>YES {selectedAnswerCounts?.yes ?? 0}</span>
                                    <span>NO {selectedAnswerCounts?.no ?? 0}</span>
                                    <span>ไม่แน่ใจ {selectedAnswerCounts?.unsure ?? 0}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    “ไม่แน่ใจ” ถูกตัดออกจากฐานคะแนนของข้อนั้น คะแนนผลงานรวมยังไม่เขียนเข้า Payroll อัตโนมัติ
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* SUB-TAB 2: ช่วงเวลา & กะทำงาน */}
                {subTab === "time" && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>ปริมาณและคะแนนเฉลี่ยรายชั่วโมง (Bangkok Time)</span>
                                    {tStats?.peakHour && (
                                        <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                                            พีคสุด: {tStats.peakHour}
                                        </Badge>
                                    )}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    แท่งสีน้ำเงินคือจำนวนแบบประเมินที่ลูกค้าสแกนตอบในแต่ละชั่วโมง · เส้นสีส้มคือคะแนนเฉลี่ย Caltex (/64)
                                </p>
                            </CardHeader>
                            <CardContent>
                                {tStats?.hourly && tStats.hourly.some((h) => h.responseCount > 0) ? (
                                    <div className="h-[210px] sm:h-[260px] w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <ComposedChart data={tStats.hourly} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                                                <YAxis yAxisId="left" orientation="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                                                <YAxis yAxisId="right" orientation="right" domain={[0, 64]} tick={{ fontSize: 11 }} />
                                                <Tooltip
                                                    formatter={(value, name) => [
                                                        name === "responseCount" ? `${value} แบบ` : `${typeof value === "number" ? value.toFixed(1) : value} / 64`,
                                                        name === "responseCount" ? "จำนวนประเมิน" : "คะแนนเฉลี่ย"
                                                    ]}
                                                />
                                                <Legend wrapperStyle={{ fontSize: "11px" }} />
                                                <Bar yAxisId="left" dataKey="responseCount" name="จำนวนประเมิน" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                <Line yAxisId="right" type="monotone" dataKey="score64" name="คะแนนเฉลี่ย" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        ยังไม่มีข้อมูลแบบประเมินรายชั่วโมง
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
                            {tStats?.timeSlots.map((slot) => (
                                <Card key={slot.slotKey} className={slot.isPeak ? "border-primary/50 shadow-sm" : ""}>
                                    <CardContent className="p-3 sm:pt-4 space-y-1.5 sm:space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">{slot.timeRange}</span>
                                            {slot.isPeak && <Badge variant="default" className="text-[9px] sm:text-[10px] px-1 py-0">Peak</Badge>}
                                        </div>
                                        <div className="font-semibold text-xs sm:text-sm line-clamp-1">{slot.label}</div>
                                        <div className="flex items-baseline justify-between pt-1 border-t">
                                            <div>
                                                <div className="text-[10px] sm:text-[11px] text-muted-foreground">ประเมิน</div>
                                                <div className="text-base sm:text-lg font-bold">{slot.responseCount} แบบ</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] sm:text-[11px] text-muted-foreground">คะแนนเฉลี่ย</div>
                                                <div className="text-base sm:text-lg font-bold">{slot.score64 !== null ? `${slot.score64.toFixed(1)}` : "—"}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        เปรียบเทียบตามกะการทำงาน (Shift Breakdown)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {tStats?.shifts && tStats.shifts.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>กะการทำงาน</TableHead>
                                                    <TableHead className="text-right">จำนวนประเมิน</TableHead>
                                                    <TableHead className="text-right">คะแนนเฉลี่ย / 64</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tStats.shifts.map((s) => (
                                                    <TableRow key={s.shiftLabel}>
                                                        <TableCell className="font-medium">{s.shiftLabel}</TableCell>
                                                        <TableCell className="text-right">{s.responseCount} แบบ</TableCell>
                                                        <TableCell className="text-right font-semibold">
                                                            {s.score64 !== null ? s.score64.toFixed(1) : "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="py-6 text-center text-sm text-muted-foreground">ไม่มีข้อมูลกะการทำงาน</div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        วันธรรมดา vs วันหยุดสุดสัปดาห์
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {tStats?.dayOfWeek && tStats.dayOfWeek.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>ช่วงวัน</TableHead>
                                                    <TableHead className="text-right">จำนวนประเมิน</TableHead>
                                                    <TableHead className="text-right">คะแนนเฉลี่ย / 64</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tStats.dayOfWeek.map((dow) => (
                                                    <TableRow key={dow.type}>
                                                        <TableCell className="font-medium">{dow.label}</TableCell>
                                                        <TableCell className="text-right">{dow.responseCount} แบบ</TableCell>
                                                        <TableCell className="text-right font-semibold">
                                                            {dow.score64 !== null ? dow.score64.toFixed(1) : "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="py-6 text-center text-sm text-muted-foreground">ไม่มีข้อมูลช่วงวัน</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* SUB-TAB 3: เกณฑ์ 9 ข้อ & ชม.เร่งด่วน */}
                {subTab === "rubric" && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    การวิเคราะห์เกณฑ์ 9 ขั้นตอน Caltex และจุดตกหล่นช่วงเร่งด่วน
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    เปรียบเทียบอัตราการผ่านเกณฑ์ (YES Rate %) ระหว่าง <strong>เวลาปกติ</strong> กับ <strong>ชั่วโมงเร่งด่วน (06:00-09:00 และ 16:00-19:30)</strong> เพื่อระบุขั้นตอนที่มักตกหล่นเวลาที่รถเข้าแถวยาว
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>เกณฑ์การบริการ Caltex</TableHead>
                                                <TableHead className="text-right">เต็ม</TableHead>
                                                <TableHead className="text-right">เวลาปกติ</TableHead>
                                                <TableHead className="text-right">ช่วงเร่งด่วน</TableHead>
                                                <TableHead className="text-right">ผลต่าง (Gap)</TableHead>
                                                <TableHead className="text-center">จุดสังเกต</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tStats?.rushHourRubric.map((item) => (
                                                <TableRow key={item.questionKey}>
                                                    <TableCell className="font-medium max-w-[280px]">
                                                        {item.label.th}
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.weight}</TableCell>
                                                    <TableCell className="text-right">
                                                        {item.normalRate !== null ? `${item.normalRate}%` : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {item.rushHourRate !== null ? `${item.rushHourRate}%` : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.gap !== null ? (
                                                            <span className={item.gap < 0 ? "text-destructive font-semibold" : item.gap > 0 ? "text-emerald-600 font-semibold" : ""}>
                                                                {item.gap > 0 ? `+${item.gap}%` : `${item.gap}%`}
                                                            </span>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {item.isDropAlert ? (
                                                            <Badge variant="destructive" className="flex items-center gap-1 text-[11px] justify-center">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                ตกหล่นช่วงเร่งด่วน
                                                            </Badge>
                                                        ) : item.gap !== null && item.gap >= 0 ? (
                                                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[11px]">
                                                                ทำได้สม่ำเสมอ
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="block md:hidden space-y-2.5">
                                    {tStats?.rushHourRubric.map((item) => (
                                        <div key={item.questionKey} className="rounded-lg border p-3 bg-card space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-semibold text-xs text-foreground leading-snug">
                                                    {item.label.th}
                                                </div>
                                                <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                                                    {item.weight} คะแนน
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-3 gap-1.5 rounded-md bg-muted/50 p-2 text-center text-xs">
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground">เวลาปกติ</div>
                                                    <div className="font-semibold">{item.normalRate !== null ? `${item.normalRate}%` : "—"}</div>
                                                </div>
                                                <div className="border-x border-border/60">
                                                    <div className="text-[10px] text-muted-foreground">ช่วงเร่งด่วน</div>
                                                    <div className="font-semibold">{item.rushHourRate !== null ? `${item.rushHourRate}%` : "—"}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground">ผลต่าง (Gap)</div>
                                                    <div className={cn("font-bold", item.gap !== null && item.gap < 0 ? "text-destructive" : item.gap !== null && item.gap > 0 ? "text-emerald-600" : "")}>
                                                        {item.gap !== null ? (item.gap > 0 ? `+${item.gap}%` : `${item.gap}%`) : "—"}
                                                    </div>
                                                </div>
                                            </div>

                                            {item.isDropAlert ? (
                                                <div className="flex items-center gap-1.5 rounded bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                    <span>ตกหล่นช่วงเร่งด่วน (คะแนนลดลง {Math.abs(item.gap ?? 0)}%)</span>
                                                </div>
                                            ) : item.gap !== null && item.gap >= 0 ? (
                                                <div className="flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                    <span>ทำได้สม่ำเสมอในทุกช่วงเวลา</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* SUB-TAB 4: ความคิดเห็นลูกค้า */}
                {subTab === "comments" && (
                    <div className="space-y-3">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    บันทึกคำตอบและความคิดเห็นจากลูกค้า (Customer Feedback Feed)
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    เรียงตามวันเวลาที่ลูกค้าส่งแบบประเมินล่าสุด พร้อมแสดงข้อคิดเห็นและเกณฑ์ที่ถูกตอบ NO
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {!tStats?.recentFeedbacks || tStats.recentFeedbacks.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        ยังไม่มีแบบประเมินในช่วงเวลานี้
                                    </div>
                                ) : (
                                    tStats.recentFeedbacks.map((fb) => (
                                        <div key={fb.id} className="rounded-lg border p-3.5 space-y-2 bg-card">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="font-semibold">{fb.timeLabel}</span>
                                                    {fb.shiftLabel && <Badge variant="secondary" className="text-[10px]">{fb.shiftLabel}</Badge>}
                                                    {fb.durationSeconds > 0 && (
                                                        <span className="text-muted-foreground">({fb.durationSeconds} วินาที)</span>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className="font-semibold">
                                                    {fb.score64 !== null ? `${fb.score64} / 64 คะแนน` : "รวบรวมคะแนน"}
                                                </Badge>
                                            </div>

                                            {fb.comment ? (
                                                <div className="rounded-md bg-muted/60 p-2.5 text-sm italic text-foreground flex items-start gap-2">
                                                    <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                    <span>“{fb.comment}”</span>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground italic pl-1">
                                                    (ลูกค้าไม่ได้ระบุข้อคิดเห็นเพิ่มเติม)
                                                </div>
                                            )}

                                            {fb.missedCriteria.length > 0 ? (
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    <span className="text-xs font-medium text-destructive">ขั้นตอนที่ไม่ผ่าน:</span>
                                                    {fb.missedCriteria.map((missed) => (
                                                        <Badge key={missed} variant="outline" className="border-destructive/40 text-destructive text-[11px]">
                                                            {missed}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 pt-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span>ผ่านเกณฑ์ประเมินครบทุกข้อ</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
                            <div>
                                <label htmlFor="employee-score-from" className="mb-1 block text-xs font-medium">ตั้งแต่วันที่</label>
                                <Input id="employee-score-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-full text-xs sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="employee-score-to" className="mb-1 block text-xs font-medium">ถึงวันที่</label>
                                <Input id="employee-score-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-full text-xs sm:text-sm" />
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => void load()} disabled={isLoading} className="w-full sm:w-auto">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                            โหลดคะแนน
                        </Button>
                        <div className="text-xs text-muted-foreground sm:ml-auto sm:text-right sm:text-sm">
                            <div>คะแนนรวม 100 = เวลาทำงาน {data?.workPoints ?? 60} + ลูกค้า {data?.customerPoints ?? 40}</div>
                            <div className="text-[11px] sm:text-xs">
                                โหลดเมื่อเปิดหน้า เปลี่ยนวันที่ หรือกดปุ่ม{lastUpdatedAt ? ` · ล่าสุด ${lastUpdatedAt.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid w-full max-w-md grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="มุมมองคะแนนพนักงาน">
                <Button
                    type="button"
                    role="tab"
                    aria-selected={view === "overview"}
                    variant={view === "overview" ? "secondary" : "ghost"}
                    onClick={() => setView("overview")}
                >
                    ภาพรวมคะแนน
                </Button>
                <Button
                    type="button"
                    role="tab"
                    aria-selected={view === "individual"}
                    variant={view === "individual" ? "secondary" : "ghost"}
                    onClick={() => setView("individual")}
                >
                    รายบุคคล
                </Button>
            </div>

            {view === "overview" && (
                <div className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>อันดับผลงานรวม</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center">อันดับ</TableHead>
                                            <TableHead>พนักงาน</TableHead>
                                            <TableHead>สถานี</TableHead>
                                            <TableHead className="text-right">เวลาทำงาน / 60</TableHead>
                                            <TableHead className="text-right">ลูกค้า / 40</TableHead>
                                            <TableHead>เป้าเดือนนี้</TableHead>
                                            <TableHead className="text-right">คะแนนรวม / 100</TableHead>
                                            <TableHead>สถานะ</TableHead>
                                            <TableHead className="text-right">ดูรายคน</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={9} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                                        ) : !data || data.employees.length === 0 ? (
                                            <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">ไม่พบพนักงานหน้าลานที่ทำงานอยู่ในขอบเขตนี้</TableCell></TableRow>
                                        ) : data.employees.map((employee) => (
                                            <TableRow key={employee.employeeId}>
                                                <TableCell className="text-center text-lg font-bold">{employee.rank ?? "—"}</TableCell>
                                                <TableCell className="font-medium">{employee.label}</TableCell>
                                                <TableCell>{employee.stationLabel ?? "-"}</TableCell>
                                                <TableCell className="min-w-[145px] text-right">
                                                    <div className="font-semibold">{employee.workPoints.toFixed(1)} / {employee.workPointsMax}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        มา {employee.counts.presentDays}/{employee.counts.requiredDays} · ขาด {employee.counts.absentDays} · สาย {employee.counts.lateDays}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[135px] text-right">
                                                    <div className="font-semibold">
                                                        {employee.customerPoints === null ? "—" : employee.customerPoints.toFixed(1)} / {employee.customerPointsMax}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">VALID {employee.responseCount}/{employee.minimumSample}</div>
                                                </TableCell>
                                                <TableCell className="min-w-[180px]">
                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                        <span className="font-semibold">{employee.monthlyEvaluationCount} / {monthlyTarget} แบบ</span>
                                                        <span className="text-muted-foreground">
                                                            {employee.monthlyEvaluationCount >= monthlyTarget
                                                                ? "ถึงเป้าแล้ว"
                                                                : `ขาด ${monthlyTarget - employee.monthlyEvaluationCount}`}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-primary"
                                                            style={{ width: `${Math.min(100, monthlyTarget > 0 ? (employee.monthlyEvaluationCount / monthlyTarget) * 100 : 0)}%` }}
                                                            role="progressbar"
                                                            aria-label={`ยอดประเมินเดือนนี้ ${employee.label}`}
                                                            aria-valuemin={0}
                                                            aria-valuemax={monthlyTarget}
                                                            aria-valuenow={employee.monthlyEvaluationCount}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-lg font-bold">
                                                    {employee.overallScore === null ? "—" : employee.overallScore.toFixed(0)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex min-w-[170px] flex-col items-start gap-1">
                                                        {employee.overallScore === null
                                                            ? employee.counts.requiredDays === 0
                                                                ? <Badge variant="secondary">ยังไม่มีวันทำงานในช่วงนี้</Badge>
                                                                : <Badge variant="secondary">รอลูกค้าครบ {employee.responseCount}/{employee.minimumSample}</Badge>
                                                            : employee.isProvisional
                                                                ? <Badge variant="secondary">คะแนนระหว่างงวด</Badge>
                                                                : <Badge>พร้อมจัดอันดับ</Badge>}
                                                        {employee.dataIssues.length > 0 && (
                                                            <Badge variant="destructive">ตรวจข้อมูล {employee.dataIssues.length} จุด</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="outline" onClick={() => openIndividual(employee.employeeId)}>
                                                        ดูคะแนนรายคน
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards View */}
                            <div className="block md:hidden space-y-3">
                                {isLoading ? (
                                    <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div>
                                ) : !data || data.employees.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">ไม่พบพนักงานหน้าลานที่ทำงานอยู่ในขอบเขตนี้</div>
                                ) : (
                                    data.employees.map((employee) => (
                                        <Card key={`mobile-${employee.employeeId}`} className="overflow-hidden border shadow-sm transition-colors hover:border-primary/40">
                                            <div className="p-3.5 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                            {employee.rank ? `#${employee.rank}` : "—"}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="truncate font-semibold text-sm text-foreground">
                                                                {employee.rank ? `#${employee.rank} ` : "— "}{employee.label}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate">{employee.stationLabel ?? "ไม่ระบุสถานี"}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-base font-bold text-foreground">
                                                            {employee.overallScore === null ? "—" : employee.overallScore.toFixed(0)}
                                                            <span className="text-xs font-normal text-muted-foreground ml-0.5">/ 100</span>
                                                        </div>
                                                        <div>
                                                            {employee.overallScore === null ? (
                                                                employee.counts.requiredDays === 0 ? (
                                                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">ไม่มีวันทำงาน</Badge>
                                                                ) : (
                                                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">รอลูกค้า {employee.responseCount}/{employee.minimumSample}</Badge>
                                                                )
                                                            ) : employee.isProvisional ? (
                                                                <Badge variant="secondary" className="text-[10px] px-1 py-0">ระหว่างงวด</Badge>
                                                            ) : (
                                                                <Badge className="text-[10px] px-1 py-0">พร้อมจัดอันดับ</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2.5 text-xs">
                                                    <div>
                                                        <div className="text-[11px] text-muted-foreground">เวลาทำงาน</div>
                                                        <div className="text-sm font-bold text-foreground">
                                                            {employee.workPoints.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ {employee.workPointsMax}</span>
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                                            มา {employee.counts.presentDays}/{employee.counts.requiredDays} · สาย {employee.counts.lateDays}
                                                        </div>
                                                    </div>
                                                    <div className="border-l pl-2.5">
                                                        <div className="text-[11px] text-muted-foreground">คะแนนลูกค้า</div>
                                                        <div className="text-sm font-bold text-foreground">
                                                            {employee.customerPoints === null ? "—" : employee.customerPoints.toFixed(1)}{" "}
                                                            <span className="text-xs font-normal text-muted-foreground">/ {employee.customerPointsMax}</span>
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                                            VALID {employee.responseCount}/{employee.minimumSample} แบบ
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-[11px] text-muted-foreground">เป้าเดือนนี้:</span>
                                                        <span className="font-medium text-[11px]">
                                                            {employee.monthlyEvaluationCount} / {monthlyTarget} แบบ
                                                            <span className="text-muted-foreground ml-1">
                                                                ({employee.monthlyEvaluationCount >= monthlyTarget ? "ครบแล้ว" : `ขาดอีก ${monthlyTarget - employee.monthlyEvaluationCount}`})
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-primary"
                                                            style={{ width: `${Math.min(100, monthlyTarget > 0 ? (employee.monthlyEvaluationCount / monthlyTarget) * 100 : 0)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs font-medium justify-center gap-1 mt-1"
                                                    aria-label={`ดูคะแนนรายคน ${employee.label}`}
                                                    onClick={() => openIndividual(employee.employeeId)}
                                                >
                                                    <span>ดูคะแนนรายคน</span>
                                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {view === "individual" && (
                <div className="mt-4 space-y-4">
                    {/* Mobile Top Navigation & Employee Switcher */}
                    <div className="lg:hidden flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5 shadow-sm">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setView("overview")}
                            className="text-xs h-8 px-2 flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>อันดับรวม</span>
                        </Button>

                        <Sheet open={isMobileSelectorOpen} onOpenChange={setIsMobileSelectorOpen}>
                            <SheetTrigger asChild>
                                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 max-w-[210px] truncate">
                                    <UserRound className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className="truncate">{selected?.label ?? "เลือกพนักงาน"}</span>
                                    <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                                </Button>
                            </SheetTrigger>
                            {isMobileSelectorOpen && (
                                <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-4">
                                    <SheetHeader className="text-left pb-2">
                                        <SheetTitle className="text-base flex items-center gap-2">
                                            <UserRound className="h-4 w-4 text-primary" />
                                            เลือกพนักงาน
                                        </SheetTitle>
                                    </SheetHeader>
                                    <div className="space-y-3 pt-2">
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder="ค้นหาชื่อหรือสถานี"
                                                value={employeeSearch}
                                                onChange={(e) => setEmployeeSearch(e.target.value)}
                                                className="pl-9 text-sm"
                                            />
                                        </div>
                                        <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
                                            {filteredEmployees.map((emp) => (
                                                <Button
                                                    key={`sheet-${emp.employeeId}`}
                                                    variant={selectedId === emp.employeeId ? "secondary" : "ghost"}
                                                    className="w-full justify-between h-auto py-2.5 px-3 text-left"
                                                    onClick={() => {
                                                        setSelectedId(emp.employeeId);
                                                        setIsMobileSelectorOpen(false);
                                                    }}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-sm truncate">{emp.label}</div>
                                                        <div className="text-xs text-muted-foreground truncate">{emp.stationLabel ?? "ไม่ระบุสถานี"}</div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="font-bold text-sm">{emp.overallScore === null ? "—" : emp.overallScore.toFixed(0)}</div>
                                                        <div className="text-[10px] text-muted-foreground">/ 100</div>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </SheetContent>
                            )}
                        </Sheet>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                        {/* Desktop Sidebar */}
                        <Card className="hidden lg:block h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <UserRound className="h-4 w-4" />
                                    เลือกพนักงาน
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        aria-label="ค้นหาพนักงาน"
                                        placeholder="ค้นหาชื่อหรือสถานี"
                                        value={employeeSearch}
                                        onChange={(event) => setEmployeeSearch(event.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <div className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
                                    {isLoading ? (
                                        <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
                                    ) : filteredEmployees.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">ไม่พบพนักงาน</div>
                                    ) : filteredEmployees.map((employee) => (
                                        <Button
                                            key={employee.employeeId}
                                            variant={selectedId === employee.employeeId ? "secondary" : "ghost"}
                                            className="h-auto w-full justify-between gap-3 px-3 py-2 text-left"
                                            onClick={() => setSelectedId(employee.employeeId)}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium">{employee.label}</span>
                                                <span className="block truncate text-xs font-normal text-muted-foreground">{employee.stationLabel ?? "ไม่ระบุสถานี"}</span>
                                            </span>
                                            <span className="shrink-0 text-right">
                                                <span className="block font-semibold">{employee.overallScore === null ? "—" : employee.overallScore.toFixed(0)}</span>
                                                <span className="block text-[11px] font-normal text-muted-foreground">/ 100</span>
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {renderIndividualDetail()}
                    </div>
                </div>
            )}
        </div>
    );
}
