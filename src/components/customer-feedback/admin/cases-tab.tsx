"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatBangkokDateTime } from "@/lib/date-utils";

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
        overallRating: number | null;
        incidentKey: string | null;
        stationLabelSnapshot: string | null;
        employeeLabelSnapshot: string | null;
        comment: string | null;
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

function remainingLabel(dueAt: string, now: number): string {
    const difference = new Date(dueAt).getTime() - now;
    const absoluteMinutes = Math.max(0, Math.floor(Math.abs(difference) / 60_000));
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;
    const value = hours > 0 ? `${hours} ชม. ${minutes} นาที` : `${minutes} นาที`;
    return difference < 0 ? `เกินกำหนด ${value}` : `เหลือ ${value}`;
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
    const [stationCaseId, setStationCaseId] = useState<string | null>(null);
    const [stationId, setStationId] = useState("");
    const [stations, setStations] = useState<StationOption[]>([]);
    const [isLoadingStations, setIsLoadingStations] = useState(false);
    const [isSavingStation, setIsSavingStation] = useState(false);

    const load = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
        if (!quiet) setIsLoading(true);
        const params = new URLSearchParams({ page: String(page), pageSize: "30" });
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
    }, [caseStatus, mineOnly, page, severity]);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

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
                    <div><label htmlFor="case-severity" className="block text-xs font-semibold">ระดับ</label><select id="case-severity" value={severity} onChange={(event) => { setSeverity(event.target.value); setPage(1); setExpandedId(null); }} className="min-h-10 rounded-md border bg-background px-3 text-sm"><option value="">ทั้งหมด</option><option value="URGENT">URGENT</option><option value="HIGH">HIGH</option><option value="NORMAL">NORMAL</option></select></div>
                    <div><label htmlFor="case-status" className="block text-xs font-semibold">สถานะ</label><select id="case-status" value={caseStatus} onChange={(event) => { setCaseStatus(event.target.value); setPage(1); setExpandedId(null); }} className="min-h-10 rounded-md border bg-background px-3 text-sm"><option value="">ค้างทั้งหมด</option><option value="OPEN">OPEN</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="RESOLVED">RESOLVED</option><option value="DISMISSED">DISMISSED</option></select></div>
                    <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={mineOnly} onChange={(event) => { setMineOnly(event.target.checked); setPage(1); setExpandedId(null); }} />เฉพาะที่รับผิดชอบ</label>
                    <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="mr-1 h-4 w-4" />รีเฟรช</Button>
                </div>
                <p className="text-sm text-muted-foreground">ระบบรีเฟรชทุก 30 วินาทีเมื่อหน้านี้เปิดอยู่ · URGENT รับทราบภายใน 2 ชม., HIGH 24 ชม., NORMAL 72 ชม.</p>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>ระดับ</TableHead><TableHead>สถานะ</TableHead><TableHead>สถานี / เป้าหมาย</TableHead><TableHead>รายละเอียด</TableHead><TableHead>SLA</TableHead><TableHead>ผู้รับผิดชอบ</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin motion-reduce:animate-none" /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">ไม่มีเคสตามตัวกรอง</TableCell></TableRow>
                            ) : rows.map((row) => {
                                const overdue = new Date(row.dueAt).getTime() < now;
                                const expanded = expandedId === row.id;
                                return (
                                    <Fragment key={row.id}>
                                        <TableRow className={SEVERITY_STYLE[row.severity]}>
                                            <TableCell><Badge variant={row.severity === "URGENT" ? "destructive" : row.severity === "HIGH" ? "secondary" : "outline"}>{row.severity}</Badge></TableCell>
                                            <TableCell>{row.status}</TableCell>
                                            <TableCell className="text-xs"><div>{row.response.stationLabelSnapshot ?? "(รอระบุสถานี)"}</div><div className="text-muted-foreground">{row.response.employeeLabelSnapshot ?? row.response.refCode}</div></TableCell>
                                            <TableCell><Button size="sm" variant="outline" onClick={() => setExpandedId(expanded ? null : row.id)}>{expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}เปิดรายละเอียด</Button></TableCell>
                                            <TableCell className="whitespace-nowrap text-xs"><span className={overdue ? "font-bold text-red-600" : "font-semibold"}>{remainingLabel(row.dueAt, now)}</span><div className="text-muted-foreground">ถึง {formatBangkokDateTime(row.dueAt)}</div>{row.acknowledgedAt && <div className="text-green-700">รับทราบแล้ว</div>}</TableCell>
                                            <TableCell className="text-xs">{row.assignedTo?.name ?? "ยังไม่มอบหมาย"}</TableCell>
                                        </TableRow>
                                        {expanded && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="bg-muted/30 p-4">
                                                    <div className="space-y-4">
                                                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                                            <div><dt className="font-semibold">เลขอ้างอิง</dt><dd>{row.response.refCode}</dd></div>
                                                            <div><dt className="font-semibold">ประเภท</dt><dd>{row.response.incidentKey ?? (row.response.overallRating ? `คะแนน ${row.response.overallRating}` : row.category)}</dd></div>
                                                            <div className="sm:col-span-2"><dt className="font-semibold">รายละเอียดฉบับเต็ม</dt><dd className="mt-1 whitespace-pre-wrap rounded border bg-background p-3">{row.response.comment ?? "ไม่มีรายละเอียดเพิ่มเติม"}</dd></div>
                                                        </dl>
                                                        <div className="flex flex-wrap gap-2 border-t pt-3">
                                                            {canSetStation && !row.stationId && (
                                                                <Button size="sm" variant="outline" onClick={() => void openStationPicker(row.id)}>
                                                                    ระบุสถานี
                                                                </Button>
                                                            )}
                                                            {!row.acknowledgedAt && <Button size="sm" variant="outline" onClick={() => void act(row.id, { action: "acknowledge" })}>รับทราบ</Button>}
                                                            {row.status === "OPEN" && <Button size="sm" variant="outline" onClick={() => void act(row.id, { action: "start" })}>เริ่มดำเนินการ</Button>}
                                                            {row.assignedTo?.id !== currentUserId && <Button size="sm" variant="outline" onClick={() => void act(row.id, { action: "assign", assignedToId: currentUserId })}>รับงานนี้</Button>}
                                                            {(row.status === "OPEN" || row.status === "IN_PROGRESS") && (
                                                                <>
                                                                    <Button size="sm" onClick={() => { const note = window.prompt("วิธีจัดการเคสนี้:"); if (note?.trim()) void act(row.id, { action: "resolve", resolutionNote: note }); }}>ปิดเคส</Button>
                                                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { const reason = window.prompt("เหตุผลที่ยกเลิก:"); if (reason?.trim()) void act(row.id, { action: "dismiss", dismissedReason: reason }); }}>ยกเลิก</Button>
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
                <div className="flex justify-between"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>ก่อนหน้า</Button><span className="self-center text-sm text-muted-foreground">หน้า {page} · {total} เคส</span><Button size="sm" variant="outline" disabled={page * 30 >= total} onClick={() => setPage((current) => current + 1)}>ถัดไป</Button></div>
            </CardContent>
            <Dialog open={stationCaseId !== null} onOpenChange={(open) => { if (!open && !isSavingStation) setStationCaseId(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ระบุสถานีของเคส</DialogTitle>
                        <DialogDescription>เลือกสถานีที่เกิดเหตุเพื่อส่งเคสเข้าคิวของผู้จัดการสถานีนั้น</DialogDescription>
                    </DialogHeader>
                    <div>
                        <label htmlFor="case-station" className="mb-1 block text-sm font-semibold">สถานี</label>
                        <select
                            id="case-station"
                            value={stationId}
                            disabled={isLoadingStations || isSavingStation}
                            onChange={(event) => setStationId(event.target.value)}
                            className="min-h-11 w-full rounded-md border bg-background px-3 text-sm"
                        >
                            <option value="">{isLoadingStations ? "กำลังโหลด..." : "เลือกสถานี"}</option>
                            {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
                        </select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" disabled={isSavingStation} onClick={() => setStationCaseId(null)}>ยกเลิก</Button>
                        <Button disabled={!stationId || isLoadingStations || isSavingStation} onClick={() => void saveStation()}>
                            {isSavingStation && <Loader2 className="mr-1 h-4 w-4 animate-spin motion-reduce:animate-none" />}
                            ยืนยันสถานี
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
