"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBangkokDateTime } from "@/lib/date-utils";

interface FairPlayRow {
    id: string;
    responseId: string;
    refCode: string;
    employeeLabelSnapshot: string | null;
    source: "MANUAL" | "AUTO";
    reasonCode: string;
    reasonLabel: string;
    reasonNote: string | null;
    signals: string[];
    signalExplanations: Array<{
        code: string;
        label: string;
        detail: string;
        level: "context" | "warning";
    }>;
    status: "REVIEW" | "CONFIRMED" | "DISMISSED";
    createdAt: string;
    reviewedAt: string | null;
    response: {
        submittedAt: string;
        overallRating: number | null;
        validity: string;
        durationSeconds: number;
        surveyVersion: string;
    };
}

const PAGE_SIZE = 50;
const STATUS_LABEL: Record<FairPlayRow["status"], string> = {
    REVIEW: "รอตรวจ",
    CONFIRMED: "ยืนยันว่าไม่เป็นธรรม",
    DISMISSED: "ยกข้อสงสัย",
};

export function FairPlayReviewsTab() {
    const [rows, setRows] = useState<FairPlayRow[]>([]);
    const [status, setStatus] = useState("REVIEW");
    const [source, setSource] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (status) params.set("status", status);
        if (source) params.set("source", source);
        const response = await fetch(`/api/admin/customer-feedback/fair-play-reviews?${params.toString()}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            setRows(data.reviews ?? []);
            setTotal(typeof data.total === "number" ? data.total : 0);
        } else {
            toast.error(data.error ?? "โหลดคิว Fair Play ไม่สำเร็จ");
        }
        setLoading(false);
    }, [page, source, status]);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const review = async (id: string, action: "confirm" | "dismiss") => {
        const note = window.prompt(
            action === "confirm"
                ? "ผลตรวจ/หลักฐานที่ยืนยันว่าพนักงานกดแทนลูกค้า:"
                : "เหตุผลที่ยกข้อสงสัย:"
        );
        if (!note?.trim()) return;
        const response = await fetch(`/api/admin/customer-feedback/fair-play-reviews/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, note: note.trim() }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            toast.error(data.error ?? "บันทึกผลตรวจไม่สำเร็จ");
            return;
        }
        if (action === "confirm" && data.penalty) {
            toast.success(`${data.message} · ครั้งที่ ${data.penalty.count30Days} ใน 30 วัน: ${data.penalty.label}`);
        } else {
            toast.success(data.message ?? "บันทึกผลแล้ว");
        }
        void load();
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <p className="font-bold">Fair Play: ลูกค้าต้องเป็นผู้กดคำตอบเอง</p>
                            <p className="mt-1">AUTO เป็นเพียงสัญญาณให้ตรวจ ไม่ตัดคะแนนเอง เมื่อ ADMIN/HR ยืนยันเท่านั้นระบบจึงเปลี่ยนแบบเป็น HIDDEN และตัดออกจากเป้า คะแนน League/RP และแต๊ะเอีย</p>
                            <p className="mt-1">โทษยืนยันซ้ำใน 30 วัน: ครั้ง 1 ตัดแบบ+เตือน · ครั้ง 2 Customer+Mission ของสัปดาห์เป็น 0 · ครั้ง 3 หมดสิทธิ์รางวัล/CP ของเดือน</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    <div>
                        <label htmlFor="fair-play-status" className="block text-xs font-semibold">สถานะ</label>
                        <select id="fair-play-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-10 rounded-md border bg-background px-3 text-sm">
                            <option value="">ทั้งหมด</option>
                            <option value="REVIEW">รอตรวจ</option>
                            <option value="CONFIRMED">ยืนยันว่าไม่เป็นธรรม</option>
                            <option value="DISMISSED">ยกข้อสงสัย</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="fair-play-source" className="block text-xs font-semibold">ที่มา</label>
                        <select id="fair-play-source" value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} className="min-h-10 rounded-md border bg-background px-3 text-sm">
                            <option value="">ทั้งหมด</option>
                            <option value="MANUAL">ADMIN/HR รายงาน</option>
                            <option value="AUTO">ระบบตรวจพบ</option>
                        </select>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => void load()}>รีเฟรช</Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>พนักงาน / แบบ</TableHead>
                                <TableHead>เวลาเกิดเหตุ</TableHead>
                                <TableHead>เหตุผล / สัญญาณ</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead>การตรวจ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin motion-reduce:animate-none" /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                            ) : rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="min-w-44">
                                        <div className="font-semibold">{row.employeeLabelSnapshot ?? "ไม่ทราบพนักงาน"}</div>
                                        <div className="text-xs text-muted-foreground">{row.refCode} · {row.response.surveyVersion}</div>
                                        <div className="text-xs">คะแนน {row.response.overallRating ?? "-"}/5 · {row.response.durationSeconds} วินาที</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-xs">{formatBangkokDateTime(row.response.submittedAt)}</TableCell>
                                    <TableCell className="min-w-64 text-sm">
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant={row.source === "AUTO" ? "secondary" : "outline"}>{row.source}</Badge>
                                            <span className="font-medium">{row.reasonLabel}</span>
                                        </div>
                                        {row.signalExplanations?.length > 0 && (
                                            <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                                                <p className="text-xs font-bold text-amber-950">เหตุที่ระบบขอให้ตรวจ</p>
                                                {row.signalExplanations.map((signal) => (
                                                    <div key={signal.code} className="text-xs">
                                                        <div className={signal.level === "warning" ? "font-semibold text-amber-950" : "font-medium text-slate-700"}>
                                                            {signal.label}
                                                        </div>
                                                        <div className="mt-0.5 leading-relaxed text-slate-600">{signal.detail}</div>
                                                    </div>
                                                ))}
                                                <p className="border-t border-amber-200 pt-2 text-[11px] leading-relaxed text-amber-900">
                                                    ข้อมูลนี้เป็นเพียงสัญญาณให้ ADMIN/HR ตรวจเพิ่มเติม ไม่ได้สรุปว่าพนักงานทุจริต
                                                </p>
                                            </div>
                                        )}
                                        {row.reasonNote && <p className="mt-2 whitespace-pre-wrap text-xs">{row.reasonNote}</p>}
                                    </TableCell>
                                    <TableCell><Badge variant={row.status === "CONFIRMED" ? "destructive" : row.status === "REVIEW" ? "secondary" : "outline"}>{STATUS_LABEL[row.status]}</Badge></TableCell>
                                    <TableCell>
                                        {row.status === "REVIEW" ? (
                                            <div className="flex flex-wrap gap-1">
                                                <Button size="sm" onClick={() => void review(row.id, "confirm")}><ShieldX className="mr-1 h-4 w-4" />ยืนยันไม่เป็นธรรม</Button>
                                                <Button size="sm" variant="outline" onClick={() => void review(row.id, "dismiss")}><ShieldCheck className="mr-1 h-4 w-4" />ยกข้อสงสัย</Button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">{row.reviewedAt ? formatBangkokDateTime(row.reviewedAt) : "-"}</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">หน้า {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))} · {total} รายการ</span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>ก่อนหน้า</Button>
                        <Button size="sm" variant="outline" disabled={loading || page * PAGE_SIZE >= total} onClick={() => setPage((current) => current + 1)}>ถัดไป</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
