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
    label: string;
    stationId: string | null;
    stationLabel: string | null;
    latestResponseAt: string | null;
    responseCount: number;
    monthlyEvaluationCount: number;
    minimumSample: number;
    meetsMinimumSample: boolean;
    score64: number | null;
    earnedWeight: number;
    evaluableWeight: number;
    excludedWeight: number;
    criteria: Criterion[];
};

type ScoreResponse = {
    rubricVersion: string;
    totalPoints: number;
    from: string;
    toExclusive: string;
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
                                <div className="text-xs text-muted-foreground">ยอดผู้ประเมินเดือนนี้</div>
                                <div className="mt-1 text-2xl font-bold">
                                    {selected.monthlyEvaluationCount}
                                    <span className="ml-1 text-sm font-normal text-muted-foreground">/ {monthlyTarget} คน</span>
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
                            นับเฉพาะ VALID employee-v3 ของเดือนปัจจุบันตามเวลาไทย · ไม่เปลี่ยนตามช่วงวันที่ด้านบน
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <Card>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">คะแนนรวม</div>
                            <div className="mt-1 text-2xl font-bold">
                                {selected.score64 === null ? "—" : selected.score64.toFixed(1)}
                                <span className="ml-1 text-sm font-normal text-muted-foreground">/ 64</span>
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
                    <Card>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">ตอบ YES</div>
                            <div className="mt-1 text-2xl font-bold">{selectedAnswerCounts?.yes ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">ตอบ NO</div>
                            <div className="mt-1 text-2xl font-bold">{selectedAnswerCounts?.no ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">ไม่แน่ใจ</div>
                            <div className="mt-1 text-2xl font-bold">{selectedAnswerCounts?.unsure ?? 0}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex flex-wrap items-center gap-2">
                            รายละเอียดคะแนน — {selected.label}
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
                        <p className="text-xs text-muted-foreground">
                            “ไม่แน่ใจ” ถูกตัดออกจากฐานคะแนนของข้อนั้น ไม่คิดเป็นศูนย์ คะแนนนี้เป็นหลักฐานประกอบโบนัสเท่านั้น และยังไม่เขียนเข้า Payroll อัตโนมัติ
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
                        <div>เกณฑ์บริการหน้าลาน {data?.totalPoints ?? 64} คะแนน</div>
                        <div>YES = เต็ม · NO = 0 · ไม่แน่ใจ = ไม่นำมาหัก</div>
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
                            <CardTitle>คะแนนพนักงานจากเสียงลูกค้า</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>พนักงาน</TableHead>
                                            <TableHead>สถานีล่าสุด</TableHead>
                                            <TableHead className="text-right">แบบประเมิน VALID</TableHead>
                                            <TableHead>เป้าเดือนนี้</TableHead>
                                            <TableHead className="text-right">คะแนน / 64</TableHead>
                                            <TableHead>สถานะข้อมูล</TableHead>
                                            <TableHead className="text-right">ดูรายคน</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={7} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                                        ) : !data || data.employees.length === 0 ? (
                                            <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">ยังไม่มีคำตอบ employee-v3 ในช่วงวันที่เลือก</TableCell></TableRow>
                                        ) : data.employees.map((employee) => (
                                            <TableRow key={employee.employeeId}>
                                                <TableCell className="font-medium">{employee.label}</TableCell>
                                                <TableCell>{employee.stationLabel ?? "-"}</TableCell>
                                                <TableCell className="text-right">{employee.responseCount}</TableCell>
                                                <TableCell className="min-w-[180px]">
                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                        <span className="font-semibold">{employee.monthlyEvaluationCount} / {monthlyTarget} คน</span>
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
                                                    {employee.score64 === null ? "—" : employee.score64.toFixed(1)}
                                                </TableCell>
                                                <TableCell>
                                                    {employee.meetsMinimumSample
                                                        ? <Badge>พร้อมใช้เป็นหลักฐาน</Badge>
                                                        : <Badge variant="secondary">ข้อมูลยังไม่พอ {employee.responseCount}/{employee.minimumSample}</Badge>}
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
                                                <span className="block font-semibold">{employee.score64 === null ? "—" : employee.score64.toFixed(1)}</span>
                                                <span className="block text-[11px] font-normal text-muted-foreground">/ 64</span>
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
