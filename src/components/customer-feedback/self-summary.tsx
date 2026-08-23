"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquareHeart } from "lucide-react";

/**
 * ส่วน "ความคิดเห็นจากลูกค้า" ในหน้า Performance ของพนักงาน
 * อ่าน /api/customer-feedback/me ซึ่งบังคับ employeeId จาก session
 * และไม่แสดง comment ดิบของลูกค้า
 */

interface SelfSummary {
    meetsMinimum: boolean;
    minimumSample: number;
    summary: { count: number; average?: number; positiveRate?: number; negativeRate?: number; distribution?: Record<string, number> };
    message: string | null;
    topReasons: { key: string; count: number }[];
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

export function CustomerFeedbackSelfSummary() {
    const [data, setData] = useState<SelfSummary | null>(null);
    const [status, setStatus] = useState<"loading" | "ok" | "off">("loading");

    useEffect(() => {
        fetch("/api/customer-feedback/me")
            .then((res) => {
                if (res.status === 404 || res.status === 403) {
                    setStatus("off");
                    return null;
                }
                return res.json();
            })
            .then((d) => {
                if (d) {
                    setData(d);
                    setStatus("ok");
                }
            })
            .catch(() => setStatus("off"));
    }, []);

    if (status === "loading") {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        );
    }
    if (status === "off" || !data) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquareHeart className="h-5 w-5 text-amber-500" />
                    ความคิดเห็นจากลูกค้า
                </CardTitle>
                <CardDescription>ผลสรุปจาก QR ประเมินป้ายชื่อของคุณ — ไม่แสดงข้อความดิบของลูกค้า</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {data.meetsMinimum ? (
                    <>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div className="text-2xl font-bold">{data.summary.average?.toFixed(2)}</div>
                                <div className="text-xs text-slate-500">คะแนนเฉลี่ย ({data.summary.count} คำตอบ)</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">{data.summary.positiveRate?.toFixed(0)}%</div>
                                <div className="text-xs text-slate-500">คะแนน 4–5</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-600">{data.summary.negativeRate?.toFixed(0)}%</div>
                                <div className="text-xs text-slate-500">คะแนน 1–2</div>
                            </div>
                        </div>
                        {data.topReasons.length > 0 && (
                            <div className="space-y-1 text-sm">
                                <p className="font-semibold text-slate-600">เรื่องที่ลูกค้าพูดถึงบ่อย</p>
                                {data.topReasons.map((r) => (
                                    <div key={r.key} className="flex justify-between">
                                        <span>{REASON_LABEL[r.key] ?? r.key}</span>
                                        <span className="font-semibold">{r.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-slate-500">
                        {data.message ?? `ยังไม่พอแสดงคะแนนสรุป — มีคำตอบ ${data.summary.count}/${data.minimumSample} รายการ`}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
