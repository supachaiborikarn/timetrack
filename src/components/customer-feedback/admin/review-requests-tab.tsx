"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatBangkokDateTime } from "@/lib/date-utils";

interface ReviewRequestRow {
    id: string;
    employeeLabelSnapshot: string;
    scopeKey: string;
    reason: string;
    status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
    resolutionNote: string | null;
    submittedAt: string;
    resolvedAt: string | null;
}

const STATUS_LABEL: Record<ReviewRequestRow["status"], string> = {
    OPEN: "รอทบทวน",
    IN_REVIEW: "กำลังทบทวน",
    RESOLVED: "ทบทวนแล้ว",
    DISMISSED: "ยกเลิก",
};

const PAGE_SIZE = 50;

export function ReviewRequestsTab() {
    const [rows, setRows] = useState<ReviewRequestRow[]>([]);
    const [status, setStatus] = useState("OPEN");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        const response = await fetch(`/api/admin/customer-feedback/review-requests?${params.toString()}`, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            setRows(data.requests ?? []);
            setTotal(typeof data.total === "number" ? data.total : 0);
        } else {
            toast.error("โหลดคำขอทบทวนไม่สำเร็จ");
        }
        setLoading(false);
    }, [page, status]);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const act = async (id: string, action: "start" | "resolve" | "dismiss") => {
        const body: Record<string, string> = { action };
        if (action === "resolve") {
            const note = window.prompt("สรุปผลการทบทวน:");
            if (!note?.trim()) return;
            body.resolutionNote = note.trim();
        }
        if (action === "dismiss") {
            const reason = window.prompt("เหตุผลที่ยกเลิกคำขอ:");
            if (!reason?.trim()) return;
            body.dismissedReason = reason.trim();
        }
        const response = await fetch(`/api/admin/customer-feedback/review-requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            toast.error(data.error ?? "อัปเดตคำขอไม่สำเร็จ");
            return;
        }
        toast.success(data.message ?? "อัปเดตคำขอแล้ว");
        void load();
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-end gap-2">
                    <div>
                        <label htmlFor="review-status" className="block text-xs font-semibold">สถานะ</label>
                        <select
                            id="review-status"
                            value={status}
                            onChange={(event) => {
                                setStatus(event.target.value);
                                setPage(1);
                            }}
                            className="min-h-10 rounded-md border bg-background px-3 text-sm"
                        >
                            <option value="">ทั้งหมด</option>
                            <option value="OPEN">รอทบทวน</option>
                            <option value="IN_REVIEW">กำลังทบทวน</option>
                            <option value="RESOLVED">ทบทวนแล้ว</option>
                            <option value="DISMISSED">ยกเลิก</option>
                        </select>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void load()}>รีเฟรช</Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>พนักงาน</TableHead>
                                <TableHead>ส่งเมื่อ</TableHead>
                                <TableHead>เหตุผล</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead>การกระทำ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin motion-reduce:animate-none" /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">ไม่มีคำขอในสถานะนี้</TableCell></TableRow>
                            ) : rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="font-medium">{row.employeeLabelSnapshot}</div>
                                        <div className="text-xs text-muted-foreground">{row.scopeKey}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-xs">{formatBangkokDateTime(row.submittedAt)}</TableCell>
                                    <TableCell className="min-w-64 whitespace-pre-wrap text-sm">{row.reason}</TableCell>
                                    <TableCell><Badge variant={row.status === "OPEN" ? "destructive" : "secondary"}>{STATUS_LABEL[row.status]}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {row.status === "OPEN" && <Button size="sm" variant="outline" onClick={() => void act(row.id, "start")}>เริ่มทบทวน</Button>}
                                            {(row.status === "OPEN" || row.status === "IN_REVIEW") && (
                                                <>
                                                    <Button size="sm" onClick={() => void act(row.id, "resolve")}>บันทึกผล</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => void act(row.id, "dismiss")}>ยกเลิก</Button>
                                                </>
                                            )}
                                            {row.resolutionNote && <p className="w-full text-xs text-muted-foreground">ผล: {row.resolutionNote}</p>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                        หน้า {page} จาก {Math.max(1, Math.ceil(total / PAGE_SIZE))} · ทั้งหมด {total} รายการ
                    </span>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={loading || page <= 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                            หน้าก่อนหน้า
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={loading || page * PAGE_SIZE >= total}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            หน้าถัดไป
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
