"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, CircleHelp, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatBangkokDateTime } from "@/lib/date-utils";
import {
    feedbackAnswerLabel,
    feedbackBehaviorFindings,
    feedbackCaseActionSteps,
    feedbackCaseTrigger,
    feedbackIncidentLabel,
    feedbackReasonLabels,
    feedbackServiceAreaLabels,
} from "@/lib/customer-feedback/case-presentation";

interface CaseAnswer {
    questionKey: string;
    state: string;
    numberValue: number | null;
    textValue: string | null;
    choiceValues: string[];
}

interface CaseRow {
    id: string;
    severity: string;
    status: string;
    category: string;
    stationId: string | null;
    dueAt: string;
    acknowledgedAt: string | null;
    createdAt: string;
    assignedTo: { id: string; name: string } | null;
    response: {
        refCode: string;
        kind: string;
        surveyVersion?: string | null;
        overallRating: number | null;
        reasonKeys?: string[];
        serviceAreas?: string[];
        incidentKey: string | null;
        dangerStatus?: string | null;
        occurredAt?: string | null;
        noDetail?: boolean;
        stationLabelSnapshot: string | null;
        employeeLabelSnapshot: string | null;
        departmentLabelSnapshot?: string | null;
        shiftLabelSnapshot?: string | null;
        wantsFollowUp?: boolean;
        validity?: string;
        submittedAt?: string;
        comment: string | null;
        answers?: CaseAnswer[];
    };
}

interface StationOption {
    id: string;
    name: string;
    isActive: boolean;
}

const SEVERITY_STYLE: Record<string, string> = {
    URGENT: "border-l-4 border-l-red-600",
    HIGH: "border-l-4 border-l-amber-500",
    NORMAL: "",
};

const STATUS_LABELS: Record<string, string> = {
    OPEN: "เปิดใหม่",
    IN_PROGRESS: "กำลังดำเนินการ",
    RESOLVED: "ปิดแล้ว",
    DISMISSED: "ยกเลิกแล้ว",
};

function remainingLabel(dueAt: string, now: number): string {
    const difference = new Date(dueAt).getTime() - now;
    const absoluteMinutes = Math.max(0, Math.floor(Math.abs(difference) / 60_000));
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;
    const value = hours > 0 ? `${hours} ชม. ${minutes} นาที` : `${minutes} นาที`;
    return difference < 0 ? `เกินกำหนด ${value}` : `เหลือ ${value}`;
}

function answerIcon(answer: "YES" | "NO" | "UNSURE" | null) {
    if (answer === "YES") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />;
    if (answer === "NO") return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />;
    return <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />;
}

export function CasesTab({ currentUserId, canSetStation }: { currentUserId: string; canSetStation: boolean }) {
    const [rows, setRows] = useState<CaseRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [now, setNow] = useState(() => Date.now());
    const [severity, setSeverity] = useState("");
    const [caseStatus, setCaseStatus] = useState("");
    const [mineOnly, setMineOnly] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [focusCaseId, setFocusCaseId] = useState<string | null>(null);
    const [stationCaseId, setStationCaseId] = useState<string | null>(null);
    const [stationId, setStationId] = useState("");
    const [stations, setStations] = useState<StationOption[]>([]);
    const [isLoadingStations, setIsLoadingStations] = useState(false);
    const [isSavingStation, setIsSavingStation] = useState(false);

    const load = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
        if (!quiet) setIsLoading(true);
        const params = new URLSearchParams({ page: String(page), pageSize: "30" });
        if (focusCaseId) params.set("caseId", focusCaseId);
        if (severity) params.set("severity", severity);
        if (caseStatus) params.set("status", caseStatus);
        if (mineOnly) params.set("assignee", "me");
        const response = await fetch(`/api/admin/customer-feedback/cases?${params.toString()}`, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            setRows(data.cases ?? []);
            setTotal(data.total ?? 0);
        } else if (!quiet) toast.error("โหลดคิวเคสไม่สำเร็จ");
        setIsLoading(false);
    }, [caseStatus, focusCaseId, mineOnly, page, severity]);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    useEffect(() => {
        const caseId = new URLSearchParams(window.location.search).get("caseId")?.trim();
        if (caseId) {
            setFocusCaseId(caseId);
            setExpandedId(caseId);
            setPage(1);
        }
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") void load({ quiet: true });
        }, 30_000);
        const onVisibility = () => {
            if (document.visibilityState === "visible") void load({ quiet: true });
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [load]);

    const clearFocusCase = () => {
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("caseId");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        setFocusCaseId(null);
        setExpandedId(null);
        setPage(1);
    };

    const act = async (id: string, body: Record<string, unknown>): Promise<boolean> => {
        const response = await fetch(`/api/admin/customer-feedback/cases/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            toast.success(data.message ?? "อัปเดตแล้ว");
            void load({ quiet: true });
            return true;
        }
        toast.error(data.error ?? "อัปเดตไม่สำเร็จ");
        return false;
    };

    const openStationPicker = async (caseId: string) => {
        setStationCaseId(caseId);
        setStationId("");
        setIsLoadingStations(true);
        try {
            const response = await fetch("/api/admin/stations", { cache: "no-store" });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                toast.error(data.error ?? "โหลดรายชื่อสถานีไม่สำเร็จ");
                setStationCaseId(null);
                return;
            }
            setStations((data.stations ?? []).filter((station: StationOption) => station.isActive));
        } catch {
            toast.error("เชื่อมต่อเพื่อโหลดรายชื่อสถานีไม่ได้");
            setStationCaseId(null);
        } finally {
            setIsLoadingStations(false);
        }
    };

    const saveStation = async () => {
        if (!stationCaseId || !stationId) return;
        setIsSavingStation(true);
        const saved = await act(stationCaseId, { action: "set-station", stationId });
        setIsSavingStation(false);
        if (saved) setStationCaseId(null);
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-end gap-2">
                    <div>
                        <label htmlFor="case-severity" className="block text-xs font-semibold">ระดับ</label>
                        <select id="case-severity" value={severity} onChange={(event) => { clearFocusCase(); setSeverity(event.target.value); }} className="min-h-10 rounded-md border bg-background px-3 text-sm">
                            <option value="">ทั้งหมด</option><option value="URGENT">URGENT</option><option value="HIGH">HIGH</option><option value="NORMAL">NORMAL</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="case-status" className="block text-xs font-semibold">สถานะ</label>
                        <select id="case-status" value={caseStatus} onChange={(event) => { clearFocusCase(); setCaseStatus(event.target.value); }} className="min-h-10 rounded-md border bg-background px-3 text-sm">
                            <option value="">ค้างทั้งหมด</option><option value="OPEN">OPEN</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="RESOLVED">RESOLVED</option><option value="DISMISSED">DISMISSED</option>
                        </select>
                    </div>
                    <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={mineOnly} onChange={(event) => { clearFocusCase(); setMineOnly(event.target.checked); }} />เฉพาะที่รับผิดชอบ</label>
                    <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="mr-1 h-4 w-4" />รีเฟรช</Button>
                </div>

                {focusCaseId && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                        <span className="font-medium">เปิดเคสจากการแจ้งเตือนโดยตรง — รายละเอียดถูกขยายไว้ให้แล้ว</span>
                        <Button size="sm" variant="outline" onClick={clearFocusCase}>กลับไปดูทุกเคส</Button>
                    </div>
                )}

                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <p className="font-semibold">คิวติดตามปัญหาจากเสียงลูกค้า</p>
                    <p className="mt-1 text-muted-foreground">แต่ละเคสจะบอกด้านล่างว่า “เกิดจากอะไร → ลูกค้าตอบอะไร → ควรทำอะไรต่อ” แล้วจึงรับทราบ / รับงาน / ปิดเคสเมื่อจัดการเสร็จ</p>
                </div>
                <p className="text-sm text-muted-foreground">ระบบรีเฟรชทุก 30 วินาทีเมื่อหน้านี้เปิดอยู่ · URGENT รับทราบภายใน 2 ชม., HIGH 24 ชม., NORMAL 72 ชม.</p>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>ระดับ</TableHead><TableHead>สถานะ</TableHead><TableHead>สถานี / เป้าหมาย</TableHead><TableHead className="min-w-[290px]">เหตุผลที่เปิดเคส</TableHead><TableHead>SLA</TableHead><TableHead>ผู้รับผิดชอบ</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin motion-reduce:animate-none" /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">ไม่พบเคสตามตัวกรอง หรือเคสจากการแจ้งเตือนไม่อยู่ในสิทธิ์ที่คุณดูได้</TableCell></TableRow>
                            ) : rows.map((row) => {
                                const overdue = new Date(row.dueAt).getTime() < now;
                                const expanded = expandedId === row.id;
                                const trigger = feedbackCaseTrigger(row.response, row.category);
                                const reasonLabels = feedbackReasonLabels(row.response.surveyVersion, row.response.reasonKeys);
                                const serviceAreaLabels = feedbackServiceAreaLabels(row.response.serviceAreas);
                                const behaviorFindings = feedbackBehaviorFindings(row.response.surveyVersion, row.response.answers);
                                const failedFindings = behaviorFindings.filter((finding) => finding.answer === "NO");
                                const actionSteps = feedbackCaseActionSteps(row.response);
                                const incidentLabel = feedbackIncidentLabel(row.response.incidentKey);
                                return (
                                    <Fragment key={row.id}>
                                        <TableRow className={SEVERITY_STYLE[row.severity]}>
                                            <TableCell><Badge variant={row.severity === "URGENT" ? "destructive" : row.severity === "HIGH" ? "secondary" : "outline"}>{row.severity}</Badge></TableCell>
                                            <TableCell className="whitespace-nowrap"><span className="font-medium">{STATUS_LABELS[row.status] ?? row.status}</span><div className="text-[11px] text-muted-foreground">{row.status}</div></TableCell>
                                            <TableCell className="text-xs"><div>{row.response.stationLabelSnapshot ?? "(รอระบุสถานี)"}</div><div className="font-medium text-foreground">{row.response.employeeLabelSnapshot ?? row.response.refCode}</div></TableCell>
                                            <TableCell>
                                                <div className="space-y-1.5">
                                                    <p className="font-semibold leading-snug">{trigger.headline}</p>
                                                    {reasonLabels.length > 0 && <p className="text-xs text-red-700 dark:text-red-300">สาเหตุ: {reasonLabels.join(" · ")}</p>}
                                                    {failedFindings.length > 0 && <p className="text-xs font-medium text-red-700 dark:text-red-300">มี {failedFindings.length} ข้อบริการที่ลูกค้าตอบว่า “ไม่ผ่าน”</p>}
                                                    <Button size="sm" variant="outline" onClick={() => setExpandedId(expanded ? null : row.id)}>{expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}{expanded ? "ปิดรายละเอียด" : "ดูสาเหตุ / วิธีจัดการ"}</Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-xs"><span className={overdue ? "font-bold text-red-600" : "font-semibold"}>{remainingLabel(row.dueAt, now)}</span><div className="text-muted-foreground">ถึง {formatBangkokDateTime(row.dueAt)}</div>{row.acknowledgedAt && <div className="text-green-700">รับทราบแล้ว</div>}</TableCell>
                                            <TableCell className="text-xs">{row.assignedTo?.name ?? "ยังไม่มอบหมาย"}</TableCell>
                                        </TableRow>

                                        {expanded && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="bg-muted/30 p-4">
                                                    <div className="space-y-4">
                                                        <section className={`rounded-lg border p-4 ${row.severity === "URGENT" ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : row.severity === "HIGH" ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" : "bg-background"}`}>
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${row.severity === "URGENT" ? "text-red-600" : "text-amber-600"}`} />
                                                                <div>
                                                                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">เหตุผลที่ระบบเปิดเคส</p>
                                                                    <p className="mt-1 text-lg font-bold">{trigger.headline}</p>
                                                                    <p className="mt-1 text-sm">{trigger.detail}</p>
                                                                </div>
                                                            </div>
                                                        </section>

                                                        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                                            <div><dt className="font-semibold">เลขอ้างอิง</dt><dd>{row.response.refCode}</dd></div>
                                                            <div><dt className="font-semibold">ส่งแบบประเมินเมื่อ</dt><dd>{row.response.submittedAt ? formatBangkokDateTime(row.response.submittedAt) : formatBangkokDateTime(row.createdAt)}</dd></div>
                                                            <div><dt className="font-semibold">สถานี / พนักงาน</dt><dd>{row.response.stationLabelSnapshot ?? "ยังไม่ระบุ"}{row.response.employeeLabelSnapshot ? ` · ${row.response.employeeLabelSnapshot}` : ""}</dd></div>
                                                            <div><dt className="font-semibold">แผนก / กะ</dt><dd>{row.response.departmentLabelSnapshot ?? "—"}{row.response.shiftLabelSnapshot ? ` · ${row.response.shiftLabelSnapshot}` : ""}</dd></div>
                                                        </dl>

                                                        {row.response.validity === "SUSPECTED" && (
                                                            <div className="rounded-lg border border-purple-300 bg-purple-50 p-3 text-sm text-purple-950 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-100">
                                                                <p className="font-semibold">⚠ แบบประเมินนี้ถูกระบบตั้งข้อสังเกต</p>
                                                                <p className="mt-1">ตรวจบริบทและข้อเท็จจริงก่อนสรุปว่าเป็นความผิดของพนักงาน คะแนนนี้อาจมีสัญญาณการส่งซ้ำหรือรูปแบบผิดปกติ</p>
                                                            </div>
                                                        )}

                                                        {row.response.kind === "STANDARD" ? (
                                                            <div className="grid gap-3 lg:grid-cols-2">
                                                                <section className="rounded-lg border bg-background p-4">
                                                                    <h4 className="font-semibold">ลูกค้าระบุสาเหตุอะไร</h4>
                                                                    {reasonLabels.length > 0 ? (
                                                                        <div className="mt-2 flex flex-wrap gap-2">{reasonLabels.map((label) => <Badge key={label} variant="secondary" className="whitespace-normal text-left">{label}</Badge>)}</div>
                                                                    ) : (
                                                                        <p className="mt-2 text-sm text-muted-foreground">ลูกค้าไม่ได้เลือกสาเหตุเฉพาะ{row.response.overallRating && row.response.overallRating <= 2 ? " (ข้อมูลเก่าบางรายการอาจไม่มีสาเหตุที่แปลงได้)" : ""}</p>
                                                                    )}
                                                                    {serviceAreaLabels.length > 0 && <p className="mt-3 text-sm"><span className="font-medium">ส่วนบริการ:</span> {serviceAreaLabels.join(" · ")}</p>}
                                                                    {row.response.wantsFollowUp && <p className="mt-3 rounded bg-blue-50 px-2 py-1.5 text-sm font-medium text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">ลูกค้าขอให้ติดต่อกลับ</p>}
                                                                </section>

                                                                <section className="rounded-lg border bg-background p-4">
                                                                    <h4 className="font-semibold">ข้อความจากลูกค้า</h4>
                                                                    {row.response.comment?.trim() ? (
                                                                        <p className="mt-2 whitespace-pre-wrap text-sm">{row.response.comment}</p>
                                                                    ) : (
                                                                        <p className="mt-2 text-sm text-muted-foreground">ลูกค้าไม่ได้พิมพ์ข้อความเพิ่มเติม — <strong className="text-foreground">ไม่ได้หมายความว่าไม่มีข้อมูล</strong> เคสนี้เกิดจากคะแนน สาเหตุ และคำตอบรายข้อที่แสดงในหน้านี้</p>
                                                                    )}
                                                                </section>
                                                            </div>
                                                        ) : (
                                                            <section className="rounded-lg border bg-background p-4 text-sm">
                                                                <h4 className="font-semibold">ข้อมูลเหตุที่ลูกค้าแจ้ง</h4>
                                                                <p className="mt-2"><span className="font-medium">ประเภท:</span> {incidentLabel ?? row.category}</p>
                                                                {row.response.dangerStatus && <p><span className="font-medium">ยังมีอันตรายหรือไม่:</span> {row.response.dangerStatus === "YES" ? "มี" : row.response.dangerStatus === "NO" ? "ไม่มี" : "ไม่แน่ใจ"}</p>}
                                                                {row.response.occurredAt && <p><span className="font-medium">เวลาเกิดเหตุ:</span> {formatBangkokDateTime(row.response.occurredAt)}</p>}
                                                                <div className="mt-3 rounded border p-3">{row.response.comment?.trim() ?? (row.response.noDetail ? "ลูกค้าเลือกไม่สะดวกให้รายละเอียดเพิ่มเติม" : "ไม่มีข้อความเพิ่มเติม")}</div>
                                                            </section>
                                                        )}

                                                        {behaviorFindings.length > 0 && (
                                                            <section className="rounded-lg border bg-background p-4">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <h4 className="font-semibold">คำตอบเกณฑ์การบริการรายข้อ</h4>
                                                                    {failedFindings.length > 0 ? <Badge variant="destructive">ควรตรวจ {failedFindings.length} ข้อ</Badge> : <Badge variant="outline">ไม่มีข้อที่ตอบว่าไม่ผ่าน</Badge>}
                                                                </div>
                                                                {failedFindings.length > 0 && (
                                                                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
                                                                        <p className="text-sm font-semibold text-red-800 dark:text-red-200">ประเด็นที่ควรคุยกับพนักงานก่อน</p>
                                                                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-red-900 dark:text-red-100">
                                                                            {failedFindings.map((finding) => <li key={finding.questionKey}>{finding.label}{finding.weight ? ` (น้ำหนัก ${finding.weight})` : ""}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                                                    {behaviorFindings.map((finding) => (
                                                                        <div key={finding.questionKey} className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${finding.answer === "NO" ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" : ""}`}>
                                                                            {answerIcon(finding.answer)}
                                                                            <div><p>{finding.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{feedbackAnswerLabel(finding.answer)}{finding.weight ? ` · น้ำหนัก ${finding.weight}` : ""}</p></div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </section>
                                                        )}

                                                        <section className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                                                            <h4 className="font-semibold text-blue-950 dark:text-blue-100">ควรทำอะไรกับเคสนี้</h4>
                                                            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-blue-950 dark:text-blue-100">
                                                                {actionSteps.map((step) => <li key={step}>{step}</li>)}
                                                            </ol>
                                                        </section>

                                                        <div className="flex flex-wrap gap-2 border-t pt-3">
                                                            {canSetStation && !row.stationId && <Button size="sm" variant="outline" onClick={() => void openStationPicker(row.id)}>ระบุสถานี</Button>}
                                                            {!row.acknowledgedAt && <Button size="sm" variant="outline" onClick={() => void act(row.id, { action: "acknowledge" })}>รับทราบ</Button>}
                                                            {row.status === "OPEN" && <Button size="sm" variant="outline" onClick={() => void act(row.id, { action: "start" })}>เริ่มดำเนินการ</Button>}
                                                            {row.assignedTo?.id !== currentUserId && <Button size="sm" variant="outline" onClick={() => void act(row.id, { action: "assign", assignedToId: currentUserId })}>รับงานนี้</Button>}
                                                            {(row.status === "OPEN" || row.status === "IN_PROGRESS") && (
                                                                <>
                                                                    <Button size="sm" onClick={() => { const note = window.prompt("วิธีจัดการเคสนี้:"); if (note?.trim()) void act(row.id, { action: "resolve", resolutionNote: note }); }}>ปิดเคส</Button>
                                                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { const reason = window.prompt("เหตุผลที่ยกเลิก:"); if (reason?.trim()) void act(row.id, { action: "dismiss", dismissedReason: reason }); }}>ยกเลิกเคส</Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex justify-between"><Button size="sm" variant="outline" disabled={page <= 1 || Boolean(focusCaseId)} onClick={() => setPage((current) => current - 1)}>ก่อนหน้า</Button><span className="self-center text-sm text-muted-foreground">{focusCaseId ? "กำลังดูเคสจากการแจ้งเตือน" : `หน้า ${page} · ${total} เคส`}</span><Button size="sm" variant="outline" disabled={Boolean(focusCaseId) || page * 30 >= total} onClick={() => setPage((current) => current + 1)}>ถัดไป</Button></div>
            </CardContent>

            <Dialog open={stationCaseId !== null} onOpenChange={(open) => { if (!open && !isSavingStation) setStationCaseId(null); }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>ระบุสถานีของเคส</DialogTitle><DialogDescription>เลือกสถานีที่เกิดเหตุเพื่อส่งเคสเข้าคิวของผู้จัดการสถานีนั้น</DialogDescription></DialogHeader>
                    <div>
                        <label htmlFor="case-station" className="mb-1 block text-sm font-semibold">สถานี</label>
                        <select id="case-station" value={stationId} disabled={isLoadingStations || isSavingStation} onChange={(event) => setStationId(event.target.value)} className="min-h-11 w-full rounded-md border bg-background px-3 text-sm">
                            <option value="">{isLoadingStations ? "กำลังโหลด..." : "เลือกสถานี"}</option>
                            {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
                        </select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" disabled={isSavingStation} onClick={() => setStationCaseId(null)}>ยกเลิก</Button>
                        <Button disabled={!stationId || isLoadingStations || isSavingStation} onClick={() => void saveStation()}>{isSavingStation && <Loader2 className="mr-1 h-4 w-4 animate-spin motion-reduce:animate-none" />}ยืนยันสถานี</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
