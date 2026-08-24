"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Eye, EyeOff, Flag, Loader2 } from "lucide-react";
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
    dangerStatus?: string | null;
    comment: string | null;
    wantsFollowUp: boolean;
    validity: string;
    submittedAt: string;
}

interface ResponseDetail extends ResponseRow {
    occurredAt?: string | null;
    noDetail?: boolean;
    serviceAreas?: string[];
    language?: string;
    surveyVersion?: string;
    case?: { id: string; severity: string; status: string; dueAt: string } | null;
}

interface ResponsesTabProps {
    canExport: boolean;
    canViewContact: boolean;
    canModerate: boolean;
    canViewIncident: boolean;
}

const VALIDITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    VALID: "default",
    SUSPECTED: "secondary",
    HIDDEN: "destructive",
    TEST: "outline",
};

export function ResponsesTab({ canExport, canViewContact, canModerate, canViewIncident }: ResponsesTabProps) {
    const [rows, setRows] = useState<ResponseRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [contactCache, setContactCache] = useState<Record<string, string>>({});
    const [details, setDetails] = useState<Record<string, ResponseDetail>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [kind, setKind] = useState("");
    const [validity, setValidity] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const contactRequestRef = useRef<AbortController | null>(null);
    const contactTimersRef = useRef<Record<string, number>>({});

    const clearContacts = useCallback(() => {
        contactRequestRef.current?.abort();
        contactRequestRef.current = null;
        Object.values(contactTimersRef.current).forEach((timer) => window.clearTimeout(timer));
        contactTimersRef.current = {};
        setContactCache({});
    }, []);

    const load = useCallback(async (requestedPage: number) => {
        clearContacts();
        setIsLoading(true);
        const params = new URLSearchParams({ page: String(requestedPage), pageSize: "20" });
        if (kind) params.set("kind", kind);
        if (validity) params.set("validity", validity);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const response = await fetch(`/api/admin/customer-feedback/responses?${params.toString()}`, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            setRows(data.responses ?? []);
            setTotal(data.total ?? 0);
        } else {
            toast.error("โหลดคำตอบไม่สำเร็จ");
        }
        setIsLoading(false);
    }, [clearContacts, from, kind, to, validity]);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(page), 0);
        return () => window.clearTimeout(timer);
    }, [load, page]);

    useEffect(() => () => {
        contactRequestRef.current?.abort();
        Object.values(contactTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    }, []);

    const viewContact = async (id: string) => {
        if (contactCache[id]) {
            window.clearTimeout(contactTimersRef.current[id]);
            delete contactTimersRef.current[id];
            setContactCache((current) => {
                const next = { ...current };
                delete next[id];
                return next;
            });
            return;
        }
        contactRequestRef.current?.abort();
        const controller = new AbortController();
        contactRequestRef.current = controller;
        try {
            const response = await fetch(`/api/admin/customer-feedback/responses/${id}/contact`, {
                cache: "no-store",
                signal: controller.signal,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                toast.error(data.error ?? "เปิดข้อมูลติดต่อไม่สำเร็จ");
                return;
            }
            if (controller.signal.aborted) return;
            setContactCache((current) => ({
                ...current,
                [id]: `${data.contact.channel === "PHONE" ? "โทร" : "อีเมล"}: ${data.contact.value}${data.contact.name ? ` (${data.contact.name})` : ""}`,
            }));
            contactTimersRef.current[id] = window.setTimeout(() => {
                setContactCache((current) => {
                    const next = { ...current };
                    delete next[id];
                    return next;
                });
                delete contactTimersRef.current[id];
            }, 60_000);
        } catch (error) {
            if (!(controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError"))) {
                toast.error("เชื่อมต่อเพื่อเปิดข้อมูลติดต่อไม่ได้");
            }
        } finally {
            if (contactRequestRef.current === controller) contactRequestRef.current = null;
        }
    };

    const moderate = async (id: string, nextValidity: string) => {
        const reason = nextValidity === "HIDDEN" ? window.prompt("เหตุผลในการซ่อนคำตอบ:") : undefined;
        if (nextValidity === "HIDDEN" && !reason?.trim()) return;
        const response = await fetch(`/api/admin/customer-feedback/responses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ validity: nextValidity, reason }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            toast.success(data.message ?? "อัปเดตแล้ว");
            void load(page);
        } else toast.error(data.error ?? "อัปเดตไม่สำเร็จ");
    };

    const toggleDetail = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        if (details[id]) return;
        const response = await fetch(`/api/admin/customer-feedback/responses/${id}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            toast.error(data.error ?? "เปิดรายละเอียดไม่สำเร็จ");
            setExpandedId(null);
            return;
        }
        setDetails((current) => ({ ...current, [id]: data }));
    };

    const exportCsv = () => {
        const params = new URLSearchParams();
        if (kind) params.set("kind", kind);
        if (validity) params.set("validity", validity);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        window.open(`/api/admin/customer-feedback/export?${params.toString()}`, "_blank", "noopener,noreferrer");
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                        <label htmlFor="response-kind" className="block text-xs font-semibold">ชนิด</label>
                        <select id="response-kind" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); setExpandedId(null); }} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm">
                            <option value="">ทั้งหมด</option>
                            <option value="STANDARD">แบบประเมิน</option>
                            {canViewIncident && <option value="INCIDENT">เหตุเร่งด่วน</option>}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="response-validity" className="block text-xs font-semibold">สถานะข้อมูล</label>
                        <select id="response-validity" value={validity} onChange={(event) => { setValidity(event.target.value); setPage(1); setExpandedId(null); }} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm">
                            <option value="">ทั้งหมด</option><option value="VALID">VALID</option><option value="SUSPECTED">SUSPECTED</option><option value="HIDDEN">HIDDEN</option><option value="TEST">TEST</option>
                        </select>
                    </div>
                    <div><label htmlFor="response-from" className="block text-xs font-semibold">จากวันที่</label><Input id="response-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); setExpandedId(null); }} /></div>
                    <div><label htmlFor="response-to" className="block text-xs font-semibold">ถึงวันที่</label><Input id="response-to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); setExpandedId(null); }} /></div>
                    <div className="flex items-end">{canExport && <Button className="w-full" variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>}</div>
                </div>

                <p className="text-sm text-muted-foreground">ทั้งหมด {total} รายการ ข้อมูลติดต่อจะแสดงเมื่อผู้ใช้มีสิทธิ์และกดเปิดเป็นรายครั้ง</p>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>เวลา</TableHead><TableHead>เป้าหมาย</TableHead><TableHead>คะแนน</TableHead><TableHead>สาเหตุ</TableHead><TableHead>ข้อความ</TableHead><TableHead>สถานะ</TableHead><TableHead>การกระทำ</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin motion-reduce:animate-none" /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">ยังไม่มีคำตอบ</TableCell></TableRow>
                            ) : rows.map((row) => {
                                const detail = details[row.id];
                                const expanded = expandedId === row.id;
                                return (
                                    <Fragment key={row.id}>
                                        <TableRow>
                                            <TableCell className="whitespace-nowrap text-xs">{formatBangkokDateTime(row.submittedAt)}</TableCell>
                                            <TableCell className="text-xs"><div>{row.kind === "INCIDENT" ? <Badge variant="destructive">เหตุเร่งด่วน</Badge> : row.employeeLabelSnapshot ?? row.stationLabelSnapshot}</div><div className="text-muted-foreground">{row.stationLabelSnapshot}</div></TableCell>
                                            <TableCell>{row.overallRating ?? "-"}</TableCell>
                                            <TableCell className="max-w-48 text-xs">{row.reasonKeys.join(", ") || row.incidentKey || "-"}</TableCell>
                                            <TableCell className="max-w-56 text-xs"><span className="line-clamp-2">{row.comment ?? "-"}</span></TableCell>
                                            <TableCell><Badge variant={VALIDITY_VARIANT[row.validity] ?? "outline"}>{row.validity}</Badge></TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    <Button size="sm" variant="outline" onClick={() => void toggleDetail(row.id)}>{expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}รายละเอียด</Button>
                                                    {canViewContact && row.wantsFollowUp && <Button size="icon-sm" variant="ghost" title="ดูข้อมูลติดต่อ" onClick={() => void viewContact(row.id)}>{contactCache[row.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>}
                                                    {canModerate && row.validity !== "TEST" && row.validity !== "VALID" && <Button size="icon-sm" variant="ghost" title="ยืนยัน VALID" onClick={() => void moderate(row.id, "VALID")}><Flag className="h-4 w-4" /></Button>}
                                                    {canModerate && row.validity !== "HIDDEN" && row.validity !== "TEST" && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void moderate(row.id, "HIDDEN")}>ซ่อน</Button>}
                                                </div>
                                                {contactCache[row.id] && <p className="mt-1 text-xs font-semibold">{contactCache[row.id]}</p>}
                                            </TableCell>
                                        </TableRow>
                                        {expanded && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="bg-muted/30 p-4">
                                                    {!detail ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : (
                                                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                                            <div><dt className="font-semibold">เลขอ้างอิง</dt><dd>{detail.refCode}</dd></div>
                                                            <div><dt className="font-semibold">แบบคำถาม</dt><dd>{detail.surveyVersion ?? "-"} ({detail.language ?? "-"})</dd></div>
                                                            {detail.occurredAt && <div><dt className="font-semibold">เวลาเกิดเหตุ</dt><dd>{formatBangkokDateTime(detail.occurredAt)}</dd></div>}
                                                            {detail.dangerStatus && <div><dt className="font-semibold">มีอันตรายตอนแจ้ง</dt><dd>{detail.dangerStatus}</dd></div>}
                                                            <div className="sm:col-span-2"><dt className="font-semibold">ข้อความฉบับเต็ม</dt><dd className="mt-1 whitespace-pre-wrap rounded border bg-background p-3">{detail.comment ?? (detail.noDetail ? "ผู้แจ้งเลือกไม่ให้รายละเอียด" : "-")}</dd></div>
                                                            {detail.case && <div className="sm:col-span-2"><dt className="font-semibold">เคส</dt><dd>{detail.case.severity} · {detail.case.status} · กำหนด {formatBangkokDateTime(detail.case.dueAt)}</dd></div>}
                                                        </dl>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex justify-between"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>ก่อนหน้า</Button><span className="self-center text-sm text-muted-foreground">หน้า {page}</span><Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage((current) => current + 1)}>ถัดไป</Button></div>
            </CardContent>
        </Card>
    );
}
