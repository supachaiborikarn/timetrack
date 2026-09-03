"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Award, Send } from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";
import { CustomerFeedbackSelfSummary } from "@/components/customer-feedback/self-summary";
import { ReviewPeriod, ReviewSubmission } from "@/types/performance";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";

export default function PerformancePage() {
    const [periods, setPeriods] = useState<ReviewPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<ReviewPeriod | null>(null);
    const [submission, setSubmission] = useState<ReviewSubmission | null>(null);
    const [selfReview, setSelfReview] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        void fetchPeriods();
    }, []);

    useEffect(() => {
        if (!selectedPeriod) return;
        const controller = new AbortController();
        setSubmission(null);
        setSelfReview("");
        void fetchSubmission(selectedPeriod.id, controller.signal);
        return () => controller.abort();
    }, [selectedPeriod]);

    const fetchPeriods = async () => {
        try {
            const res = await fetch("/api/performance/periods", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                setPeriods(data.periods);
                if (data.periods.length > 0) {
                    setSelectedPeriod(data.periods.find((period: ReviewPeriod) => period.isActive) ?? data.periods[0]);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSubmission = async (periodId: string, signal?: AbortSignal) => {
        try {
            const res = await fetch(`/api/performance/submissions?periodId=${periodId}`, { signal });
            if (res.ok && !signal?.aborted) {
                const data = await res.json();
                if (signal?.aborted) return;
                setSubmission(data.submission);
                if (data.submission) {
                    setSelfReview(data.submission.selfReview);
                } else {
                    setSelfReview("");
                }
            }
        } catch (error) {
            if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedPeriod?.isActive || !selfReview.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/performance/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    periodId: selectedPeriod.id,
                    selfReview,
                }),
            });

            if (res.ok) {
                toast.success("ส่งแบบประเมินเรียบร้อยแล้ว");
                void fetchSubmission(selectedPeriod.id);
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="PERFORMANCE REVIEW"
                title="การประเมินผลงาน"
                subtitle="แบบประเมินตนเองตามรอบการประเมินผลการปฏิบัติงาน"
                backHref="/"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                <CustomerFeedbackSelfSummary reviewPeriodId={selectedPeriod?.id} />

                {periods.length === 0 ? (
                    <div className="tt-paper-card rounded-[18px] border border-zinc-700/25 p-8 text-center dark:border-white/10">
                        <Award className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-black text-zinc-500">ไม่มีรอบการประเมินที่เปิดอยู่ในขณะนี้</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {periods.length > 1 && selectedPeriod && (
                            <div className="space-y-1">
                                <label htmlFor="review-period" className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                    เลือกรอบการประเมิน
                                </label>
                                <select
                                    id="review-period"
                                    value={selectedPeriod.id}
                                    onChange={(event) => {
                                        const next = periods.find((period) => period.id === event.target.value);
                                        if (next) setSelectedPeriod(next);
                                    }}
                                    className="h-11 w-full rounded-xl border border-zinc-700/30 bg-white dark:bg-zinc-900 px-3 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#fbbf24]"
                                >
                                    {periods.map((period) => (
                                        <option key={period.id} value={period.id}>
                                            {period.title} — {period.isActive ? "เปิดอยู่" : "ปิดแล้ว"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedPeriod && (
                            <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 p-4 dark:border-white/15 space-y-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                                <div className="flex justify-between items-start border-b border-zinc-700/15 dark:border-white/10 pb-3">
                                    <div>
                                        <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{selectedPeriod.title}</h2>
                                        <p className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            {formatThaiDate(new Date(selectedPeriod.startDate), "d MMM")} - {formatThaiDate(new Date(selectedPeriod.endDate), "d MMM yyyy")}
                                        </p>
                                    </div>
                                    {!selectedPeriod.isActive ? (
                                        <Badge className="border border-zinc-500/30 bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 text-[10px] font-black">
                                            ปิดรอบแล้ว
                                        </Badge>
                                    ) : submission?.status === "SUBMITTED" || submission?.status === "COMPLETED" ? (
                                        <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> ส่งแล้ว
                                        </Badge>
                                    ) : (
                                        <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-black gap-1">
                                            <AlertCircle className="w-3 h-3" /> รอการส่ง
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 block">
                                            ส่วนที่ 1: ประเมินตนเอง (Self Assessment)
                                        </label>
                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                            สรุปผลงาน ความสำเร็จ และสิ่งที่พัฒนาขึ้นในรอบการทำงานนี้
                                        </p>
                                    </div>
                                    <Textarea
                                        value={selfReview}
                                        onChange={(e) => setSelfReview(e.target.value)}
                                        placeholder="พิมพ์รายละเอียดผลงานและการประเมินตนเอง..."
                                        className="min-h-[160px] text-xs font-bold leading-relaxed rounded-xl border-zinc-700/30 bg-white dark:bg-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#fbbf24]"
                                        disabled={!!submission || !selectedPeriod.isActive}
                                    />
                                </div>

                                <div className="pt-2 flex flex-col gap-2">
                                    <p className="text-[10px] text-zinc-500">
                                        {selectedPeriod.isActive ? "* กรุณาตรวจสอบข้อความให้เรียบร้อยก่อนส่ง" : "รอบประเมินนี้ปิดแล้ว"}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !selfReview.trim() || !!submission || !selectedPeriod.isActive}
                                        className="tt-retro-control w-full h-12 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black text-[13px] flex items-center justify-center gap-2 shadow-[0_3px_10px_rgba(251,191,36,0.25)] border border-black/20 active:scale-[0.98] disabled:opacity-50 transition-all"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        {!selectedPeriod.isActive ? "รอบประเมินปิดแล้ว" : submission ? "ส่งแบบประเมินแล้ว" : "ส่งแบบประเมินตนเอง"}
                                    </button>
                                </div>
                            </section>
                        )}

                        {submission?.managerReview && (
                            <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-emerald-500/35 bg-emerald-500/5 p-4 dark:border-white/15 space-y-2">
                                <h3 className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                    <Award className="w-4 h-4" />
                                    ความคิดเห็นและข้อเสนอแนะจากหัวหน้างาน
                                </h3>
                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap pt-1">
                                    {submission.managerReview}
                                </p>
                                {submission.rating && (
                                    <div className="mt-3 pt-2 border-t border-emerald-500/20 flex items-center gap-2">
                                        <span className="text-xs font-black text-zinc-600 dark:text-zinc-400">คะแนนประเมิน:</span>
                                        <Badge className="border border-emerald-500/40 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-black text-xs px-2.5 py-0.5">
                                            {submission.rating} / 5
                                        </Badge>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

