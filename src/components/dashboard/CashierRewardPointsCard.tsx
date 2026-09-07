"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Gift, Loader2, WalletCards } from "lucide-react";

type RewardPayload = {
    enabled: boolean;
    wallet?: { earnedPoints: number; spentPoints: number; balance: number };
    featured?: { title: string; pointsCost: number; stock: number | null } | null;
    catalogCount?: number;
    weekly?: {
        periodKey: string;
        score: number | null;
        forecastScore: number | null;
        knownWeight: number;
        rewardPointsPreview: number;
        ready: boolean;
    };
};

export function CashierRewardPointsCard() {
    const [data, setData] = useState<RewardPayload | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        void fetch("/api/employee/reward-points", { cache: "no-store", signal: controller.signal })
            .then(async (response) => response.ok ? response.json() as Promise<RewardPayload> : null)
            .then((payload) => { if (!controller.signal.aborted) setData(payload); })
            .catch((error) => {
                if (!(error instanceof DOMException && error.name === "AbortError")) console.error("Cashier RP load failed:", error);
            })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, []);

    if (!loading && !data?.enabled) return null;
    const wallet = data?.wallet;

    return (
        <section className="overflow-hidden rounded-[18px] border border-emerald-700/30 bg-zinc-950 text-white shadow-[0_3px_0_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400 text-zinc-950">
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <WalletCards className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] font-black tracking-[0.16em] text-emerald-300">REWARD POINTS</p>
                        <p className="text-[13px] font-black">RP สำหรับแลกของ</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-mono text-[26px] font-black leading-none text-emerald-300">{wallet?.balance ?? "—"}</p>
                    <p className="mt-1 text-[8px] font-black text-zinc-400">RP คงเหลือ</p>
                </div>
            </div>
            {!loading && wallet ? (
                <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 text-center">
                    <div className="bg-zinc-950 px-2 py-2"><p className="text-[8px] text-zinc-500">สะสมทั้งหมด</p><p className="text-[11px] font-black">{wallet.earnedPoints} RP</p></div>
                    <div className="bg-zinc-950 px-2 py-2"><p className="text-[8px] text-zinc-500">ใช้ไป / รอมอบ</p><p className="text-[11px] font-black">{wallet.spentPoints} RP</p></div>
                </div>
            ) : null}
            {data?.weekly ? (
                <div className="border-t border-white/10 px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[8px] font-black text-zinc-500">RP สัปดาห์นี้</p>
                            <p className="mt-0.5 text-[10px] font-black">
                                {data.weekly.ready
                                    ? `คะแนน ${data.weekly.score}/100`
                                    : `กำลังรวบรวมข้อมูล ${data.weekly.knownWeight}/100`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className={`font-mono text-[17px] font-black ${data.weekly.ready ? "text-emerald-300" : "text-amber-300"}`}>
                                {data.weekly.ready ? `+${data.weekly.rewardPointsPreview} RP` : "รอข้อมูล"}
                            </p>
                            <p className="text-[7px] font-bold text-zinc-500">เครดิตเมื่อปิดผลสัปดาห์</p>
                        </div>
                    </div>
                    {!data.weekly.ready && data.weekly.forecastScore !== null ? (
                        <p className="mt-1 text-[8px] font-bold text-zinc-400">จากข้อมูลที่พร้อม คะแนนคาดการณ์ {data.weekly.forecastScore}/100</p>
                    ) : null}
                </div>
            ) : null}
            {data?.featured ? (
                <div className="flex items-center gap-2 border-t border-white/10 bg-amber-300/10 px-3.5 py-2 text-[9px]">
                    <Gift className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span className="min-w-0 flex-1 truncate font-bold">เด่น: {data.featured.title}</span>
                    <span className="shrink-0 font-black text-emerald-300">{data.featured.pointsCost} RP</span>
                </div>
            ) : null}
            <Link href="/league" className="flex items-center justify-between border-t border-white/10 px-3.5 py-2.5 text-[10px] font-black text-amber-300 active:bg-white/5">
                <span>ดูของรางวัลและแลก RP {data?.catalogCount ? `(${data.catalogCount})` : ""}</span>
                <ArrowRight className="h-4 w-4" />
            </Link>
        </section>
    );
}
