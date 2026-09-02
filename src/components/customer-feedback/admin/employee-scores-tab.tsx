"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    const [employeeSearch, setEmployeeSearch] = useState("");
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
                        <div className="overflow-x-auto">
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
        );
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="flex flex-wrap items-end gap-3 pt-6">
                    <div>
                        <label htmlFor="employee-score-from" className="mb-1 block text-xs font-medium">ตั้งแต่วันที่</label>
                        <Input id="employee-score-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="employee-score-to" className="mb-1 block text-xs font-medium">ถึงวันที่</label>
                        <Input id="employee-score-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                    </div>
                    <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        โหลดคะแนน
                    </Button>
                    <div className="ml-auto text-right text-sm text-muted-foreground">
                        <div>คะแนนรวม 100 = เวลาทำงาน {data?.workPoints ?? 60} + ลูกค้า {data?.customerPoints ?? 40}</div>
                        <div>โหลดเมื่อเปิดหน้า เปลี่ยนวันที่ หรือกดปุ่ม{lastUpdatedAt ? ` · ล่าสุด ${lastUpdatedAt.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</div>
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
                            <div className="overflow-x-auto">
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
                        </CardContent>
                    </Card>
                </div>
            )}

            {view === "individual" && (
                <div className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                        <Card className="h-fit">
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
