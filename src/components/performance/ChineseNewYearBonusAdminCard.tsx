"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gift, Loader2, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    CHINESE_NEW_YEAR_BONUS_TIERS,
    CHINESE_NEW_YEAR_BONUS_WEIGHTS,
} from "@/lib/chinese-new-year-bonus";

type Period = {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    closedAt: string | null;
};

type ReviewSubmission = {
    id: string;
    selfReview: string;
    managerReview: string | null;
    rating: number | null;
    status: string;
    submittedAt: string | null;
    completedAt: string | null;
};

type ReviewRow = {
    employeeId: string;
    label: string;
    stationLabel: string | null;
    departmentLabel: string | null;
    submission: ReviewSubmission | null;
};

type AdminBonusPayload = {
    selectedPeriodId: string | null;
    periods: Period[];
    reviews: ReviewRow[];
};

type Draft = { rating: string; managerReview: string };

export function ChineseNewYearBonusAdminCard() {
    const [data, setData] = useState<AdminBonusPayload | null>(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState("");
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [loading, setLoading] = useState(true);
    const [savingPeriod, setSavingPeriod] = useState(false);
    const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/admin/performance/chinese-new-year-bonus", { cache: "no-store" });
            const payload = (await response.json().catch(() => ({}))) as AdminBonusPayload & { error?: string };
            if (!response.ok) throw new Error(payload.error ?? "โหลดการตั้งค่าแต๊ะเอียไม่สำเร็จ");
            setData(payload);
            setSelectedPeriodId(payload.selectedPeriodId ?? "");
            setDrafts(Object.fromEntries(payload.reviews.map((row) => [
                row.employeeId,
                {
                    rating: row.submission?.rating?.toString() ?? "",
                    managerReview: row.submission?.managerReview ?? "",
                },
            ])));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "โหลดการตั้งค่าแต๊ะเอียไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const selectedPeriod = useMemo(
        () => data?.periods.find((period) => period.id === (data.selectedPeriodId ?? "")) ?? null,
        [data],
    );

    const savePeriod = async () => {
        if (!selectedPeriodId) {
            toast.error("กรุณาเลือกรอบประเมิน");
            return;
        }
        setSavingPeriod(true);
        try {
            const response = await fetch("/api/admin/performance/chinese-new-year-bonus", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewPeriodId: selectedPeriodId }),
            });
            const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
            if (!response.ok) throw new Error(payload.error ?? "บันทึกรอบแต๊ะเอียไม่สำเร็จ");
            toast.success(payload.message ?? "ตั้งรอบแต๊ะเอียแล้ว");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "บันทึกรอบแต๊ะเอียไม่สำเร็จ");
        } finally {
            setSavingPeriod(false);
        }
    };

    const saveReview = async (row: ReviewRow) => {
        if (!data?.selectedPeriodId || !row.submission) return;
        const draft = drafts[row.employeeId] ?? { rating: "", managerReview: "" };
        const rating = Number(draft.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            toast.error("คะแนนหัวหน้างานต้องเป็น 1–5");
            return;
        }

        setSavingEmployeeId(row.employeeId);
        try {
            const response = await fetch("/api/admin/performance/chinese-new-year-bonus", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    periodId: data.selectedPeriodId,
                    employeeId: row.employeeId,
                    rating,
                    managerReview: draft.managerReview,
                }),
            });
            const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
            if (!response.ok) throw new Error(payload.error ?? "บันทึกคะแนนหัวหน้างานไม่สำเร็จ");
            toast.success(`${row.label}: ${payload.message ?? "บันทึกแล้ว"}`);
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "บันทึกคะแนนหัวหน้างานไม่สำเร็จ");
        } finally {
            setSavingEmployeeId(null);
        }
    };

    return (
        <Card className="border-red-200 bg-red-50/40 dark:border-red-950 dark:bg-red-950/10">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Gift className="h-5 w-5 text-red-700" />
                            แต๊ะเอียตรุษจีน
                        </CardTitle>
                        <CardDescription className="mt-1">
                            คาดการณ์เป็นเปอร์เซ็นต์ของแต๊ะเอียฐาน แยกจาก Payroll และไม่เขียนเงินให้อัตโนมัติ
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-red-300 text-red-700">PREVIEW ONLY</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-3 rounded-xl border border-red-200 bg-white/70 p-3 dark:border-red-950 dark:bg-zinc-950/40 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-1.5">
                        <Label htmlFor="cny-bonus-period">รอบประเมินที่ใช้คำนวณแต๊ะเอีย</Label>
                        <select
                            id="cny-bonus-period"
                            value={selectedPeriodId}
                            onChange={(event) => setSelectedPeriodId(event.target.value)}
                            disabled={loading}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">เลือกรอบประเมิน</option>
                            {data?.periods.map((period) => (
                                <option key={period.id} value={period.id}>
                                    {period.title}{period.closedAt ? " — ปิดรอบแล้ว" : period.isActive ? " — เปิดอยู่" : ""}
                                </option>
                            ))}
                        </select>
                        {selectedPeriod ? (
                            <p className="text-xs text-muted-foreground">กำลังใช้: {selectedPeriod.title}</p>
                        ) : (
                            <p className="text-xs text-amber-700">ยังไม่ได้กำหนดรอบแต๊ะเอีย พนักงานจะยังไม่เห็นการ์ดคาดการณ์</p>
                        )}
                    </div>
                    <Button onClick={() => void savePeriod()} disabled={savingPeriod || loading || !selectedPeriodId} className="bg-red-700 hover:bg-red-800">
                        {savingPeriod ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        ตั้งเป็นรอบแต๊ะเอีย
                    </Button>
                </div>

                <div>
                    <p className="mb-2 text-sm font-semibold">น้ำหนักคะแนน 100 คะแนน</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {[
                            ["เวลา / การมาทำงาน", CHINESE_NEW_YEAR_BONUS_WEIGHTS.attendance],
                            ["คุณภาพเสียงลูกค้า", CHINESE_NEW_YEAR_BONUS_WEIGHTS.customerQuality],
                            ["ความร่วมมือแบบประเมิน", CHINESE_NEW_YEAR_BONUS_WEIGHTS.cooperation],
                            ["หัวหน้างาน / SOP", CHINESE_NEW_YEAR_BONUS_WEIGHTS.supervisorSop],
                            ["วินัย / ความปลอดภัย", CHINESE_NEW_YEAR_BONUS_WEIGHTS.disciplineSafety],
                        ].map(([label, points]) => (
                            <div key={String(label)} className="rounded-lg border bg-background px-3 py-2 text-center">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="mt-1 font-mono text-xl font-bold">{points}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {CHINESE_NEW_YEAR_BONUS_TIERS.filter((tier) => tier.minScore > 0).map((tier) => (
                            <Badge key={tier.minScore} variant="secondary">
                                {tier.minScore}+ → {tier.bonusPercent}%
                            </Badge>
                        ))}
                        <Badge variant="outline">ต่ำกว่า 70 → 0%</Badge>
                    </div>
                </div>

                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                    <div className="flex items-start gap-2">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                            เคสความปลอดภัยไม่หักโบนัสอัตโนมัติจากคำตอบลูกค้าเพียงครั้งเดียว ระบบจะทำให้ผลยังเป็น “คาดการณ์” จนตรวจสอบเคสก่อน เพื่อไม่ให้ความเห็นเดียวกลายเป็นบทลงโทษโดยอัตโนมัติ
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : !data?.selectedPeriodId ? null : (
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold">คะแนนหัวหน้างาน / SOP (20 คะแนน)</p>
                            <p className="text-xs text-muted-foreground">ใช้ Rating 1–5 ของ ReviewSubmission แล้วแปลงเป็น 4, 8, 12, 16, 20 คะแนน</p>
                        </div>

                        <div className="space-y-2">
                            {data.reviews.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">ไม่พบพนักงานหน้าลานที่ใช้งานอยู่</div>
                            ) : data.reviews.map((row) => {
                                const draft = drafts[row.employeeId] ?? { rating: "", managerReview: "" };
                                return (
                                    <div key={row.employeeId} className="rounded-xl border bg-background p-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold">{row.label}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {[row.stationLabel, row.departmentLabel].filter(Boolean).join(" · ") || "ไม่ระบุสาขา/แผนก"}
                                                </p>
                                            </div>
                                            {row.submission ? (
                                                <Badge variant={row.submission.rating ? "default" : "secondary"}>
                                                    {row.submission.rating ? `หัวหน้า ${row.submission.rating}/5` : "รอหัวหน้าประเมิน"}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">รอพนักงานส่ง Self Assessment</Badge>
                                            )}
                                        </div>

                                        {row.submission ? (
                                            <div className="mt-3 grid gap-2 md:grid-cols-[120px_1fr_auto] md:items-end">
                                                <div className="space-y-1">
                                                    <Label htmlFor={`cny-rating-${row.employeeId}`}>Rating 1–5</Label>
                                                    <select
                                                        id={`cny-rating-${row.employeeId}`}
                                                        value={draft.rating}
                                                        onChange={(event) => setDrafts((current) => ({
                                                            ...current,
                                                            [row.employeeId]: { ...draft, rating: event.target.value },
                                                        }))}
                                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                    >
                                                        <option value="">เลือกคะแนน</option>
                                                        {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}/5 → {rating * 4}/20</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor={`cny-note-${row.employeeId}`}>หมายเหตุหัวหน้างาน (ไม่บังคับ)</Label>
                                                    <Input
                                                        id={`cny-note-${row.employeeId}`}
                                                        value={draft.managerReview}
                                                        onChange={(event) => setDrafts((current) => ({
                                                            ...current,
                                                            [row.employeeId]: { ...draft, managerReview: event.target.value },
                                                        }))}
                                                        placeholder="เช่น ทำตาม SOP สม่ำเสมอ / จุดที่ต้องพัฒนา"
                                                        maxLength={5000}
                                                    />
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => void saveReview(row)}
                                                    disabled={savingEmployeeId === row.employeeId || !draft.rating}
                                                >
                                                    {savingEmployeeId === row.employeeId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                    บันทึก
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-xs text-amber-700">ยังไม่สร้างคะแนน 0 ให้โดยอัตโนมัติ — ส่วนนี้จะอยู่สถานะรอข้อมูลจนพนักงานส่งแบบประเมินตนเอง</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
