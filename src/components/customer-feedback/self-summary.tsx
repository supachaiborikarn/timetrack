"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquareHeart, Scale } from "lucide-react";
import { toast } from "sonner";
import { formatBangkokDateTime } from "@/lib/date-utils";

interface SelfSummary {
    meetsMinimum: boolean;
    summary: { average?: number; positiveRate?: number; negativeRate?: number };
    message: string | null;
    source: "LIVE" | "SNAPSHOT";
    scope: { reviewPeriodId: string; title: string; dateFrom: string; dateToExclusive: string; closedAt: string | null; generatedAt: string | null } | null;
    topReasons: { key: string }[];
}

interface SelfReviewRequest {
    id: string;
    scopeKey: string;
    reason: string;
    status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
    resolutionNote: string | null;
    submittedAt: string;
    resolvedAt: string | null;
}

async function fetchReviewRequests(signal?: AbortSignal): Promise<
    | { enabled: false; requests: SelfReviewRequest[] }
    | { enabled: true; requests: SelfReviewRequest[] }
    | null
> {
    const response = await fetch("/api/customer-feedback/me/review-requests", {
        cache: "no-store",
        signal,
    }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        return null;
    });
    if (!response) return null;
    if (response.status === 403 || response.status === 404) {
        return { enabled: false, requests: [] };
    }
    if (!response.ok) return null;
    const result = await response.json();
    return { enabled: true, requests: result.requests ?? [] };
}

const REASON_LABEL: Record<string, string> = {
    employee_courtesy: "การพูดจาและความสุภาพ",
    employee_clarity: "ความชัดเจนของข้อมูล",
    employee_accuracy: "ความถูกต้องของบริการ",
    employee_helpfulness: "การใส่ใจและช่วยแก้ปัญหา",
    employee_safety: "ความปลอดภัยตามขั้นตอน",
    employee_fairness: "ความเท่าเทียมในการให้บริการ",
    system_wait: "เวลารอหรือจำนวนพนักงาน",
    system_process: "ขั้นตอนหรือระบบชำระเงิน",
    system_availability: "สินค้าหรืออุปกรณ์ไม่พร้อม",
    other: "อื่น ๆ",
    unspecified: "ไม่สะดวกระบุ",
};

const REQUEST_STATUS: Record<SelfReviewRequest["status"], string> = {
    OPEN: "รอทบทวน",
    IN_REVIEW: "กำลังทบทวน",
    RESOLVED: "ทบทวนแล้ว",
    DISMISSED: "ยกเลิก",
};

export function CustomerFeedbackSelfSummary({ reviewPeriodId }: { reviewPeriodId?: string }) {
    const [data, setData] = useState<SelfSummary | null>(null);
    const [summaryStatus, setSummaryStatus] = useState<"loading" | "ok" | "off">("loading");
    const [loadedSummaryKey, setLoadedSummaryKey] = useState<string | null>(null);
    const [requests, setRequests] = useState<SelfReviewRequest[]>([]);
    const [requestEnabled, setRequestEnabled] = useState(false);
    const [requestReason, setRequestReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams();
        if (reviewPeriodId) params.set("reviewPeriodId", reviewPeriodId);
        const summaryKey = reviewPeriodId ?? "GENERAL";
        void fetch(`/api/customer-feedback/me?${params.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
        })
            .then((res) => {
                if (res.status === 404 || res.status === 403) return null;
                return res.ok ? res.json() : null;
            })
            .then((result) => {
                if (controller.signal.aborted) return;
                if (result) {
                    setData(result);
                    setSummaryStatus("ok");
                } else {
                    setData(null);
                    setSummaryStatus("off");
                }
                setLoadedSummaryKey(summaryKey);
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === "AbortError") return;
                setData(null);
                setSummaryStatus("off");
                setLoadedSummaryKey(summaryKey);
            });
        return () => controller.abort();
    }, [reviewPeriodId]);

    const loadRequests = useCallback(async () => {
        const result = await fetchReviewRequests();
        if (!result) return;
        setRequests(result.requests);
        setRequestEnabled(result.enabled);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void fetchReviewRequests(controller.signal).then((result) => {
            if (!result || controller.signal.aborted) return;
            setRequests(result.requests);
            setRequestEnabled(result.enabled);
        });
        return () => controller.abort();
    }, []);

    const submitRequest = async () => {
        const reason = requestReason.trim();
        if (reason.length < 10) {
            toast.error("กรุณาอธิบายเหตุผลอย่างน้อย 10 ตัวอักษร");
            return;
        }
        setSubmitting(true);
        const response = await fetch("/api/customer-feedback/me/review-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, ...(reviewPeriodId ? { reviewPeriodId } : {}) }),
        }).catch(() => null);
        if (!response) {
            toast.error("ส่งคำขอไม่สำเร็จ");
            setSubmitting(false);
            return;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok) toast.error(result.error ?? "ส่งคำขอไม่สำเร็จ");
        else {
            toast.success("ส่งคำขอทบทวนแล้ว");
            setRequestReason("");
            await loadRequests();
        }
        setSubmitting(false);
    };

    const currentScope = reviewPeriodId ?? "GENERAL";
    const visibleSummaryStatus = loadedSummaryKey === currentScope ? summaryStatus : "loading";
    const visibleData = loadedSummaryKey === currentScope ? data : null;
    const hasOpenRequest = requests.some(
        (request) => request.scopeKey === currentScope && (request.status === "OPEN" || request.status === "IN_REVIEW")
    );

    if (visibleSummaryStatus === "loading" && !requestEnabled) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-6" role="status" aria-label="กำลังโหลดความคิดเห็นลูกค้า">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400 motion-reduce:animate-none" />
                </CardContent>
            </Card>
        );
    }

    if (visibleSummaryStatus === "off" && !requestEnabled) return null;

    return (
        <div className="space-y-4">
            {visibleSummaryStatus === "ok" && visibleData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquareHeart className="h-5 w-5 text-amber-500" />
                            ความคิดเห็นจากลูกค้า
                        </CardTitle>
                        <CardDescription>
                            {visibleData.scope
                                ? `ผลจาก QR บนป้ายชื่อของคุณในรอบ “${visibleData.scope.title}”${visibleData.source === "SNAPSHOT" ? " ซึ่งปิดรอบแล้ว" : ""}`
                                : "ผลสรุปจาก QR บนป้ายชื่อของคุณ โดยไม่แสดงข้อความดิบของลูกค้า"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {visibleData.meetsMinimum ? (
                            <>
                                <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                                    <div><div className="text-2xl font-bold">{visibleData.summary.average?.toFixed(2)}</div><div className="text-xs text-slate-500">คะแนนเฉลี่ย</div></div>
                                    <div><div className="text-2xl font-bold text-green-600">{visibleData.summary.positiveRate?.toFixed(0)}%</div><div className="text-xs text-slate-500">คะแนน 4–5</div></div>
                                    <div><div className="text-2xl font-bold text-red-600">{visibleData.summary.negativeRate?.toFixed(0)}%</div><div className="text-xs text-slate-500">คะแนน 1–2</div></div>
                                </div>
                                {visibleData.topReasons.length > 0 && (
                                    <div className="space-y-1 text-sm">
                                        <p className="font-semibold text-slate-600">เรื่องที่ลูกค้าพูดถึงบ่อย</p>
                                        {visibleData.topReasons.map((reason) => (
                                            <div key={reason.key}>{REASON_LABEL[reason.key] ?? reason.key}</div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">{visibleData.message ?? "กำลังรวบรวมข้อมูลสำหรับคะแนนสรุป"}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {requestEnabled && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-5 w-5 text-indigo-500" />ขอทบทวนผลความคิดเห็นลูกค้า</CardTitle>
                        <CardDescription>แจ้งเหตุผลเมื่อเห็นว่าข้อมูลอาจคลาดเคลื่อนหรือควรตรวจสอบเพิ่มเติม โดยไม่ต้องขออ่านข้อความดิบของลูกค้า</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!hasOpenRequest && (
                            <div className="space-y-2">
                                <label htmlFor="feedback-review-reason" className="text-sm font-semibold">เหตุผลที่ขอทบทวน</label>
                                <Textarea id="feedback-review-reason" value={requestReason} onChange={(event) => setRequestReason(event.target.value)} maxLength={500} placeholder="อธิบายช่วงเวลา เหตุการณ์ หรือข้อมูลที่ควรตรวจสอบ" />
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs text-slate-500">{requestReason.length}/500</span>
                                    <Button onClick={() => void submitRequest()} disabled={submitting || requestReason.trim().length < 10}>
                                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}ส่งคำขอทบทวน
                                    </Button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            {requests.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีคำขอทบทวน</p> : requests.slice(0, 5).map((request) => (
                                <div key={request.id} className="rounded-lg border p-3 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline">{REQUEST_STATUS[request.status]}</Badge><span className="text-xs text-slate-500">{formatBangkokDateTime(request.submittedAt)}</span></div>
                                    <p className="mt-2 whitespace-pre-wrap">{request.reason}</p>
                                    {request.resolutionNote && <p className="mt-2 rounded bg-slate-50 p-2 text-slate-600">ผลการทบทวน: {request.resolutionNote}</p>}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
