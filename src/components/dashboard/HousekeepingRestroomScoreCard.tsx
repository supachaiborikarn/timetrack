"use client";

import { useEffect, useState } from "react";
import { Bath, Loader2, Sparkles } from "lucide-react";

type Lang = "th" | "en" | "my";

type RestroomScorePayload = {
    applicable: boolean;
    period?: "LAST_30_DAYS";
    status?: "READY" | "COLLECTING";
    score?: number | null;
    overallPoints?: number | null;
    checklistPoints?: number | null;
};

export function HousekeepingRestroomScoreCard({ lang = "th" }: { lang?: Lang }) {
    const [data, setData] = useState<RestroomScorePayload | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            try {
                const response = await fetch("/api/employee/restroom-score", {
                    cache: "no-store",
                    signal: controller.signal,
                });
                if (!response.ok) return;
                setData(await response.json());
            } catch (error) {
                if (!(error instanceof DOMException && error.name === "AbortError")) {
                    console.error("Restroom score fetch failed", error);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();
        return () => controller.abort();
    }, []);

    if (!loading && !data?.applicable) return null;

    return (
        <section className="tt-paper-card tt-instrument-frame rounded-[22px] border border-zinc-700/35 p-4 text-zinc-950 shadow-[0_3px_0_rgba(0,0,0,0.06)] dark:border-white/15 dark:text-zinc-50">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fbbf24] text-zinc-950">
                        <Bath className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black tracking-[0.18em] text-amber-800 dark:text-amber-300">RESTROOM QUALITY</p>
                        <h2 className="text-base font-black">{lang === "th" ? "คะแนนความสะอาดห้องน้ำ" : "Restroom cleanliness score"}</h2>
                        <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                            {lang === "th" ? "จากความคิดเห็นลูกค้า VALID ในช่วง 30 วันที่ผ่านมา" : "From VALID customer feedback in the last 30 days"}
                        </p>
                    </div>
                </div>
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-amber-600" /> : null}
            </div>

            {!loading && data?.status === "COLLECTING" ? (
                <div className="mt-4 rounded-2xl border border-dashed border-zinc-400/60 bg-white/50 p-4 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-2 font-black"><Sparkles className="h-4 w-4 text-amber-500" />{lang === "th" ? "กำลังสะสมข้อมูล" : "Collecting feedback"}</div>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {lang === "th" ? "เมื่อมีข้อมูลที่เชื่อถือได้เพียงพอ ระบบจะแสดงคะแนนโดยอัตโนมัติ" : "Your score will appear automatically once there is enough reliable feedback."}
                    </p>
                </div>
            ) : null}

            {!loading && data?.status === "READY" && data.score !== null && data.score !== undefined ? (
                <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3 rounded-2xl bg-zinc-950 p-4 text-white">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400">{lang === "th" ? "คุณภาพห้องน้ำ" : "RESTROOM QUALITY"}</p>
                        <p className="mt-1 text-xs text-zinc-300">{lang === "th" ? "คะแนนรวมจากความพึงพอใจและ checklist ความสะอาด" : "Overall satisfaction plus cleanliness checklist"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black tabular-nums text-[#fbbf24]">{data.score.toFixed(1)}</p>
                        <p className="text-[10px] font-black text-zinc-400">/ 100</p>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
