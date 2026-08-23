"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Eye, EyeOff, Flag } from "lucide-react";
import { toast } from "sonner";
import { formatBangkokDateTime } from "@/lib/date-utils";

interface ResponseRow {
    id: string;
    refCode: string;
    kind: string;
    targetType: string;
    employeeLabelSnapshot: string | null;
    stationLabelSnapshot: string | null;
    overallRating: number | null;
    reasonKeys: string[];
    incidentKey: string | null;
    comment: string | null;
    wantsFollowUp: boolean;
    validity: string;
    submittedAt: string;
}

const VALIDITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    VALID: "default",
    SUSPECTED: "secondary",
    HIDDEN: "destructive",
    TEST: "outline",
};

export function ResponsesTab() {
    const [rows, setRows] = useState<ResponseRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [contactCache, setContactCache] = useState<Record<string, string>>({});

    const load = useCallback(async (p: number) => {
        const res = await fetch(`/api/admin/customer-feedback/responses?page=${p}&pageSize=20`);
        if (res.ok) {
            const data = await res.json();
            setRows(data.responses);
            setTotal(data.total);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => void load(page), 0);
        return () => clearTimeout(timer);
    }, [load, page]);

    const viewContact = async (id: string) => {
        if (contactCache[id]) {
            const next = { ...contactCache };
            delete next[id];
            setContactCache(next);
            return;
        }
        const res = await fetch(`/api/admin/customer-feedback/responses/${id}/contact`);
        const data = await res.json();
        if (!res.ok) {
            toast.error(data.error ?? "เปิดข้อมูลติดต่อไม่สำเร็จ");
            return;
        }
        setContactCache((prev) => ({ ...prev, [id]: `${data.contact.channel === "PHONE" ? "โทร" : "อีเมล"}: ${data.contact.value}${data.contact.name ? ` (${data.contact.name})` : ""}` }));
    };

    const moderate = async (id: string, validity: string) => {
        const reason = validity === "HIDDEN" ? window.prompt("เหตุผลในการซ่อนคำตอบ:") : undefined;
        if (validity === "HIDDEN" && !reason?.trim()) return;
        const res = await fetch(`/api/admin/customer-feedback/responses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ validity, reason }),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success(data.message ?? "อัปเดตแล้ว");
            void load(page);
        } else {
            toast.error(data.error ?? "อัปเดตไม่สำเร็จ");
        }
    };

    const exportCsv = () => {
        window.open("/api/admin/customer-feedback/export", "_blank");
    };

    return (
        <Card>
            <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">ทั้งหมด {total} รายการ (ข้อมูลติดต่อไม่แสดงในรายการ)</p>
                    <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>เวลา</TableHead>
                            <TableHead>เป้าหมาย</TableHead>
                            <TableHead>คะแนน</TableHead>
                            <TableHead>สาเหตุ</TableHead>
                            <TableHead>ข้อความ</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead>การกระทำ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">ยังไม่มีคำตอบ</TableCell></TableRow>
                        ) : (
                            rows.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="whitespace-nowrap text-xs">{formatBangkokDateTime(r.submittedAt)}</TableCell>
                                    <TableCell className="text-xs">
                                        <div>{r.kind === "INCIDENT" ? <Badge variant="destructive">เหตุเร่งด่วน</Badge> : r.employeeLabelSnapshot ?? r.stationLabelSnapshot}</div>
                                        <div className="text-muted-foreground">{r.stationLabelSnapshot}</div>
                                    </TableCell>
                                    <TableCell>{r.overallRating ?? "-"}</TableCell>
                                    <TableCell className="max-w-48 truncate text-xs">{r.reasonKeys.join(", ") || r.incidentKey || "-"}</TableCell>
                                    <TableCell className="max-w-56 truncate text-xs">{r.comment ?? "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={VALIDITY_VARIANT[r.validity] ?? "outline"}>{r.validity}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {r.wantsFollowUp && (
                                                <Button size="icon-sm" variant="ghost" title="ดูข้อมูลติดต่อ" onClick={() => void viewContact(r.id)}>
                                                    {contactCache[r.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            )}
                                            {r.validity !== "VALID" && (
                                                <Button size="icon-sm" variant="ghost" title="ยืนยัน VALID" onClick={() => void moderate(r.id, "VALID")}>
                                                    <Flag className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {r.validity !== "HIDDEN" && r.validity !== "TEST" && (
                                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void moderate(r.id, "HIDDEN")}>
                                                    ซ่อน
                                                </Button>
                                            )}
                                        </div>
                                        {contactCache[r.id] && <p className="mt-1 text-xs font-semibold">{contactCache[r.id]}</p>}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <div className="flex justify-between">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>ก่อนหน้า</Button>
                    <span className="self-center text-sm text-muted-foreground">หน้า {page}</span>
                    <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>ถัดไป</Button>
                </div>
            </CardContent>
        </Card>
    );
}
