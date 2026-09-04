"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Gift, Loader2 } from "lucide-react";

type Lang = "th" | "en" | "my";
type BonusProfile = "FRONT_YARD" | "FUEL_CASHIER";

type BonusComponent = {
    key: "attendance" | "customerQuality" | "cooperation" | "supervisorSop" | "disciplineSafety";
    label: string;
    maxPoints: number;
    points: number | null;
    status: "READY" | "WAITING";
};

type BonusPayload = {
    enabled: boolean;
    reason?: string;
    profile?: BonusProfile;
    period?: {
        id: string;
        title: string;
        startDate: string;
        endDate: string;
        closed: boolean;
    };
    preview?: {
        profile: BonusProfile;
        forecastScore: number | null;
        bonusPercent: number | null;
        knownPoints: number;
        knownWeight: number;
        missingComponents: string[];
        nextTierScore: number | null;
        pointsToNextTier: number | null;
        isProvisional: boolean;
        safetyReviewRequired: boolean;
        components: BonusComponent[];
    };
};

const COPY = {
    th: {
        eyebrow: "CHINESE NEW YEAR BONUS",
        title: "แต๊ะเอียตรุษจีน",
        forecast: "คาดการณ์แต๊ะเอียฐาน",
        score: "คะแนนคาดการณ์",
        provisional: "คาดการณ์",
        final: "ข้อมูลรอบปิด",
        waiting: "รอข้อมูล",
        known: "น้ำหนักข้อมูลที่พร้อม",
        next: (points: number, tier: number) => `อีก ${points} คะแนน ถึงขั้น ${tier}`,
        top: "อยู่ในขั้นสูงสุดตามคะแนนปัจจุบัน",
        safety: "มีเคสความปลอดภัยที่ต้องตรวจสอบก่อนสรุปผล",
        note: "ตัวเลขนี้เป็นเครื่องมือคาดการณ์ ยังไม่เขียนโบนัสเข้า Payroll อัตโนมัติ",
        cashierHint: "คะแนนทีมมีผล 35% เพื่อให้ช่วยติดตามและโค้ชทีมหน้าลาน ส่วนอีก 65% มาจากผลงานของเสมียนเอง",
    },
    en: {
        eyebrow: "CHINESE NEW YEAR BONUS",
        title: "Chinese New Year bonus",
        forecast: "Base-bonus forecast",
        score: "Forecast score",
        provisional: "Forecast",
        final: "Closed-period data",
        waiting: "Waiting",
        known: "Available data weight",
        next: (points: number, tier: number) => `${points} points to the ${tier} tier`,
        top: "Current score is in the top payout tier",
        safety: "A safety case must be reviewed before the result is finalized",
        note: "This is a forecast only. It does not write a bonus into Payroll automatically.",
        cashierHint: "Team results contribute 35% to encourage coaching; the remaining 65% comes from the cashier's own performance.",
    },
    my: {
        eyebrow: "CHINESE NEW YEAR BONUS",
        title: "တရုတ်နှစ်သစ်ကူး ဘောနပ်စ်",
        forecast: "အခြေခံဘောနပ်စ် ခန့်မှန်းချက်",
        score: "ခန့်မှန်းအမှတ်",
        provisional: "ခန့်မှန်း",
        final: "ပိတ်ပြီးကာလ အချက်အလက်",
        waiting: "ဒေတာစောင့်နေသည်",
        known: "ရရှိပြီး ဒေတာအလေးချိန်",
        next: (points: number, tier: number) => `${tier} အဆင့်ရောက်ရန် ${points} မှတ်လိုသည်`,
        top: "လက်ရှိအမှတ်သည် အမြင့်ဆုံးအဆင့်တွင်ရှိသည်",
        safety: "အပြီးသတ်မတိုင်မီ လုံခြုံရေးကိစ္စကို စစ်ဆေးရမည်",
        note: "ဤကိန်းဂဏန်းသည် ခန့်မှန်းချက်သာဖြစ်ပြီး Payroll ထဲသို့ အလိုအလျောက် မထည့်ပါ။",
        cashierHint: "အဖွဲ့ရလဒ် 35% ပါဝင်ပြီး အဖွဲ့ကို ကူညီလေ့ကျင့်ရန် ရည်ရွယ်သည်။ ကျန် 65% သည် စာရေး၏ ကိုယ်ပိုင်လုပ်ဆောင်မှုဖြစ်သည်။",
    },
} as const;

const COMPONENT_LABELS: Record<BonusProfile, Record<Lang, Record<BonusComponent["key"], string>>> = {
    FRONT_YARD: {
        th: {
            attendance: "เวลา / การมาทำงาน",
            customerQuality: "คุณภาพเสียงลูกค้า",
            cooperation: "ความร่วมมือแบบประเมิน",
            supervisorSop: "หัวหน้างาน / SOP",
            disciplineSafety: "วินัย / ความปลอดภัย",
        },
        en: {
            attendance: "Attendance",
            customerQuality: "Customer quality",
            cooperation: "Feedback cooperation",
            supervisorSop: "Supervisor / SOP",
            disciplineSafety: "Discipline / safety",
        },
        my: {
            attendance: "အလုပ်တက်ရောက်မှု",
            customerQuality: "ဖောက်သည်အရည်အသွေး",
            cooperation: "အကဲဖြတ်ပူးပေါင်းမှု",
            supervisorSop: "ကြီးကြပ်သူ / SOP",
            disciplineSafety: "စည်းကမ်း / လုံခြုံရေး",
        },
    },
    FUEL_CASHIER: {
        th: {
            attendance: "เวลา / การมาทำงาน",
            customerQuality: "คุณภาพบริการของทีม",
            cooperation: "ความร่วมมือแบบประเมินของทีม",
            supervisorSop: "งานเสมียน / SOP",
            disciplineSafety: "วินัย / ความปลอดภัย",
        },
        en: {
            attendance: "Attendance",
            customerQuality: "Team service quality",
            cooperation: "Team feedback cooperation",
            supervisorSop: "Cashier work / SOP",
            disciplineSafety: "Discipline / safety",
        },
        my: {
            attendance: "အလုပ်တက်ရောက်မှု",
            customerQuality: "အဖွဲ့ဝန်ဆောင်မှုအရည်အသွေး",
            cooperation: "အဖွဲ့အကဲဖြတ်ပူးပေါင်းမှု",
            supervisorSop: "စာရေးအလုပ် / SOP",
            disciplineSafety: "စည်းကမ်း / လုံခြုံရေး",
        },
    },
};

export function ChineseNewYearBonusCard({ lang = "th" }: { lang?: Lang }) {
    const [data, setData] = useState<BonusPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const T = COPY[lang];

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            try {
                const response = await fetch("/api/employee/chinese-new-year-bonus", {
                    cache: "no-store",
                    signal: controller.signal,
                });
                if (!response.ok) return;
                const payload = (await response.json()) as BonusPayload;
                if (!controller.signal.aborted) setData(payload);
            } catch (error) {
                if (!(error instanceof DOMException && error.name === "AbortError")) {
                    console.error("CNY bonus forecast load failed:", error);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();
        return () => controller.abort();
    }, []);

    if (!loading && !data?.enabled) return null;
    if (!loading && (!data?.period || !data.preview)) return null;

    const preview = data?.preview;
    const profile: BonusProfile = data?.profile ?? preview?.profile ?? "FRONT_YARD";

    return (
        <section className="tt-retro-enter tt-retro-delay-2 overflow-hidden rounded-[20px] border-2 border-red-900/70 bg-[#fff4df] text-zinc-950 shadow-[0_4px_0_rgba(127,29,29,0.16)] dark:border-red-500/35 dark:bg-zinc-950 dark:text-zinc-50">
            <div className="flex items-center justify-between gap-3 border-b border-red-900/15 bg-red-800 px-3.5 py-3 text-white dark:border-white/10">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200 bg-[#fbbf24] text-red-900 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35)]">
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] font-black tracking-[0.17em] text-amber-200">{T.eyebrow}</p>
                        <p className="truncate text-[14px] font-black">{T.title}</p>
                        {data?.period ? <p className="mt-0.5 truncate text-[8px] font-bold text-red-100">{data.period.title}</p> : null}
                    </div>
                </div>
                {preview ? (
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black ${preview.isProvisional ? "border-amber-200/60 bg-amber-300/15 text-amber-100" : "border-emerald-200/60 bg-emerald-300/15 text-emerald-100"}`}>
                        {preview.isProvisional ? T.provisional : T.final}
                    </span>
                ) : null}
            </div>

            {loading || !preview ? (
                <div className="flex h-28 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-red-700" />
                </div>
            ) : (
                <>
                    {profile === "FUEL_CASHIER" ? (
                        <div className="border-b border-red-900/15 bg-amber-50 px-3.5 py-2 text-[8px] font-bold leading-relaxed text-amber-900 dark:border-white/10 dark:bg-amber-950/20 dark:text-amber-200">
                            {T.cashierHint}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-[1.2fr_0.8fr] divide-x divide-red-900/15 dark:divide-white/10">
                        <div className="px-3.5 py-3.5">
                            <p className="text-[9px] font-black tracking-[0.08em] text-red-800 dark:text-red-300">{T.forecast}</p>
                            <div className="mt-1 flex items-end gap-1">
                                <span className="font-mono text-[42px] font-black leading-none tracking-[-0.06em] text-red-800 dark:text-red-300">
                                    {preview.bonusPercent ?? "—"}
                                </span>
                                <span className="pb-1 text-[14px] font-black">%</span>
                            </div>
                            <p className="mt-1 text-[8px] font-bold text-zinc-500 dark:text-zinc-400">{T.note}</p>
                        </div>
                        <div className="px-3 py-3.5 text-center">
                            <p className="text-[8px] font-black text-zinc-500 dark:text-zinc-400">{T.score}</p>
                            <p className="mt-1 font-mono text-[30px] font-black leading-none tabular-nums">
                                {preview.forecastScore ?? "—"}
                            </p>
                            <p className="mt-1 text-[8px] font-bold text-zinc-400">/100</p>
                        </div>
                    </div>

                    <div className="border-t border-red-900/15 px-3.5 py-3 dark:border-white/10">
                        <div className="flex items-center justify-between gap-2 text-[9px] font-black">
                            <span>{T.known}</span>
                            <span className="font-mono">{preview.knownWeight}/100</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-red-900/10 dark:bg-white/10">
                            <div className="h-full rounded-full bg-red-700 transition-all dark:bg-red-500" style={{ width: `${preview.knownWeight}%` }} />
                        </div>
                        <p className="mt-2 text-[9px] font-black text-red-800 dark:text-red-300">
                            {preview.pointsToNextTier != null && preview.nextTierScore != null
                                ? T.next(preview.pointsToNextTier, preview.nextTierScore)
                                : T.top}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 border-t border-red-900/15 dark:border-white/10 sm:grid-cols-2">
                        {preview.components.map((component) => (
                            <div key={component.key} className="flex items-center justify-between gap-2 border-b border-red-900/10 px-3.5 py-2.5 last:border-b-0 dark:border-white/5">
                                <div className="min-w-0">
                                    <p className="truncate text-[9px] font-black">{COMPONENT_LABELS[profile][lang][component.key]}</p>
                                    <p className="text-[7px] font-bold text-zinc-400">MAX {component.maxPoints}</p>
                                </div>
                                <p className={`shrink-0 font-mono text-[12px] font-black ${component.points == null ? "text-zinc-400" : "text-zinc-900 dark:text-white"}`}>
                                    {component.points == null ? T.waiting : `${component.points}/${component.maxPoints}`}
                                </p>
                            </div>
                        ))}
                    </div>

                    {preview.safetyReviewRequired ? (
                        <div className="flex items-start gap-2 border-t border-red-300 bg-red-100/80 px-3.5 py-2.5 text-[9px] font-black text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{T.safety}</span>
                        </div>
                    ) : null}
                </>
            )}
        </section>
    );
}
