"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Medal, RefreshCw, ShieldCheck, Star, Trophy } from "lucide-react";
import { toast } from "sonner";

interface WeeklyStanding {
    label: string;
    totalScore: number;
    workPoints: number;
    customerPoints: number;
    missionPoints: number;
    rank: number;
    isEligible: boolean;
    isRewardEligible: boolean;
    rewardEligibilityReason: "ELIGIBLE" | "NO_REQUIRED_WORK_DAYS" | "INSUFFICIENT_CUSTOMER_SAMPLE" | "CUSTOMER_QUALITY_BELOW_MINIMUM" | "FAIR_PLAY_REVIEW";
    rewardPointsPreview: number;
    isProvisional: boolean;
    fairPlayStatus: "CLEAR" | "REVIEW" | "APPROVED" | "DISQUALIFIED" | "INELIGIBLE";
    isMe: boolean;
}

interface RewardCatalogItem {
    id: string;
    code: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    pointsCost: number;
    stock: number | null;
    featuredWeekKey: string | null;
}

interface LeagueData {
    eligible: boolean;
    station?: { id: string; code: string; name: string };
    weekly?: {
        periodKey: string;
        from: string;
        to: string;
        standings: WeeklyStanding[];
        me: WeeklyStanding | null;
    };
    monthly?: {
        periodKey: string;
        standings: Array<{ label: string; championshipPoints: number; averageScore: number; weeks: number; rank: number; isMe: boolean }>;
        me: { label: string; championshipPoints: number; averageScore: number; weeks: number; rank: number; isMe: boolean } | null;
    };
    latestGrand?: {
        periodKey: string;
        standings: Array<{ employeeLabelSnapshot: string; totalScore: number; finalRank: number | null }>;
    } | null;
    rewardPoints?: {
        wallet: {
            earnedPoints: number;
            spentPoints: number;
            balance: number;
            recentEarnings: Array<{ periodKey: string; points: number; totalScore: number; finalizedAt: string | null }>;
            recentRedemptions: Array<{ id: string; title: string; pointsCost: number; status: "PENDING" | "FULFILLED" | "CANCELLED"; imageUrl: string | null; createdAt: string; fulfilledAt: string | null }>;
        };
        featured: RewardCatalogItem | null;
        catalog: RewardCatalogItem[];
    };
    awards?: Array<{
        id: string;
        awardType: "WEEKLY_CHAMPION" | "MONTHLY_STATION_CHAMPION" | "GRAND_CHAMPION";
        title: string;
        status: "AVAILABLE" | "SELECTED";
        rewardCode: string | null;
        rewardLabel: string | null;
        rewardValueBaht: number | null;
        period: { periodKey: string };
        options: Array<{ code: string; label: string; description: string; valueBaht: number }>;
    }>;
}

function rankIcon(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
}

function rewardEligibilityLabel(standing: WeeklyStanding | null) {
    if (!standing) return { label: "กำลังรอข้อมูล League", tone: "amber" as const };
    if (standing.rewardEligibilityReason === "ELIGIBLE") return { label: "✓ มีสิทธิ์รับและแลกรางวัลสัปดาห์นี้", tone: "green" as const };
    if (standing.rewardEligibilityReason === "CUSTOMER_QUALITY_BELOW_MINIMUM") return { label: "🔒 ไม่มีสิทธิ์รางวัลสัปดาห์นี้ — คะแนนบริการลูกค้าต้องถึง 20/25", tone: "red" as const };
    if (standing.rewardEligibilityReason === "INSUFFICIENT_CUSTOMER_SAMPLE") return { label: "⏳ รอข้อมูลเพิ่ม — จำนวนการประเมินยังไม่เพียงพอ", tone: "amber" as const };
    if (standing.rewardEligibilityReason === "FAIR_PLAY_REVIEW") return { label: "🛡 รอตรวจ Fair Play ก่อนรับหรือแลกรางวัล", tone: "amber" as const };
    return { label: "สัปดาห์นี้ยังไม่มีวันทำงานที่เข้าเกณฑ์", tone: "amber" as const };
}

function fairPlayLabel(standing: WeeklyStanding) {
    if (!standing.isEligible) return "กำลังสะสมข้อมูล";
    if (standing.fairPlayStatus === "REVIEW") return "รอตรวจ Fair Play";
    if (standing.fairPlayStatus === "DISQUALIFIED") return "ไม่ร่วมจัดอันดับ";
    return standing.isProvisional ? "อันดับชั่วคราว" : "ผ่าน Fair Play";
}

export default function LeaguePage() {
    const [data, setData] = useState<LeagueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState<string | null>(null);
    const [redeeming, setRedeeming] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/league", { cache: "no-store" });
            if (!response.ok) throw new Error("โหลดลีกไม่สำเร็จ");
            setData(await response.json());
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "โหลดลีกไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const chooseReward = async (awardId: string, rewardCode: string) => {
        setSelecting(`${awardId}:${rewardCode}`);
        try {
            const response = await fetch("/api/league/reward", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ awardId, rewardCode }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "เลือกรางวัลไม่สำเร็จ");
            toast.success("เลือกรางวัลเรียบร้อยแล้ว 🎁");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "เลือกรางวัลไม่สำเร็จ");
        } finally {
            setSelecting(null);
        }
    };

    const redeemReward = async (item: RewardCatalogItem) => {
        if (!window.confirm(`ใช้ ${item.pointsCost} RP แลก “${item.title}” ใช่ไหม?`)) return;
        setRedeeming(item.id);
        try {
            const response = await fetch("/api/league/points/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rewardItemId: item.id }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "แลกรางวัลไม่สำเร็จ");
            toast.success("แลกรางวัลแล้ว 🎁 รอผู้ดูแลมอบของรางวัล");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "แลกรางวัลไม่สำเร็จ");
        } finally {
            setRedeeming(null);
        }
    };

    if (loading && !data) {
        return <main className="min-h-screen bg-[#f2eee4] grid place-items-center"><RefreshCw className="h-8 w-8 animate-spin" /></main>;
    }

    if (!data?.eligible) {
        return (
            <main className="min-h-screen bg-[#f2eee4] p-5">
                <Link href="/" className="inline-flex items-center gap-2 font-bold"><ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก</Link>
                <div className="mt-8 rounded-3xl border-2 border-zinc-800 bg-[#fffaf0] p-6 text-center shadow-[0_5px_0_rgba(24,24,27,.12)]">
                    <Trophy className="mx-auto h-12 w-12 text-amber-500" />
                    <h1 className="mt-3 text-2xl font-black">TimeTrack League</h1>
                    <p className="mt-2 text-sm text-zinc-500">ลีกนี้เปิดสำหรับทีมบริการหน้าลานที่มีคะแนนลูกค้าเท่านั้น</p>
                </div>
            </main>
        );
    }

    const weekly = data.weekly!;
    const monthly = data.monthly!;
    const myWeekly = weekly.me;
    const reward = data.rewardPoints;
    const rewardEligibility = rewardEligibilityLabel(myWeekly);

    return (
        <main className="min-h-screen bg-[#f2eee4] pb-24 text-zinc-900">
            <header className="border-b-2 border-zinc-900 bg-[#ffc51b] px-4 pb-5 pt-4 shadow-[inset_0_-10px_25px_rgba(181,121,0,.08)]">
                <div className="mx-auto flex max-w-2xl items-center justify-between">
                    <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-zinc-800/70 bg-white/20"><ArrowLeft className="h-5 w-5" /></Link>
                    <div className="text-center">
                        <p className="text-[10px] font-black tracking-[0.22em]">TIMETRACK LEAGUE</p>
                        <h1 className="text-xl font-black">{data.station?.name}</h1>
                    </div>
                    <button onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-full border border-zinc-800/70 bg-white/20" aria-label="รีเฟรช"><RefreshCw className="h-5 w-5" /></button>
                </div>
            </header>

            <div className="mx-auto max-w-2xl space-y-4 p-3">
                <section className="overflow-hidden rounded-[24px] border-2 border-zinc-800 bg-[#fffaf0] shadow-[0_5px_0_rgba(24,24,27,.12)]">
                    <div className="flex items-center justify-between bg-zinc-950 px-4 py-3 text-white">
                        <div>
                            <p className="text-[10px] font-black tracking-[0.2em] text-amber-400">WEEKLY STATION LEAGUE</p>
                            <p className="text-sm font-bold">สัปดาห์ {weekly.periodKey}</p>
                        </div>
                        <Trophy className="h-7 w-7 text-amber-400" />
                    </div>
                    {myWeekly ? (
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-dashed border-zinc-300 p-4">
                            <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-zinc-800 bg-amber-300 text-xl font-black">{rankIcon(myWeekly.rank)}</div>
                            <div>
                                <p className="text-xs font-bold text-zinc-500">อันดับของคุณ</p>
                                <p className="text-2xl font-black">อันดับ {myWeekly.rank}</p>
                                <p className="text-[11px] font-semibold text-emerald-700">{fairPlayLabel(myWeekly)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black tabular-nums">{myWeekly.totalScore.toFixed(1)}</p>
                                <p className="text-[10px] font-bold text-zinc-500">LEAGUE SCORE</p>
                            </div>
                        </div>
                    ) : null}
                    <div className="divide-y divide-zinc-200">
                        {weekly.standings.slice(0, 8).map((standing) => (
                            <div key={`${standing.rank}:${standing.label}`} className="grid grid-cols-[42px_1fr_auto] items-center gap-2 px-4 py-3">
                                <span className="text-center text-lg font-black">{rankIcon(standing.rank)}</span>
                                <div className="min-w-0">
                                    <p className="truncate font-black">{standing.label}</p>
                                    <p className="text-[10px] text-zinc-500">งาน {standing.workPoints.toFixed(1)} · ลูกค้า {standing.customerPoints.toFixed(1)} · Mission {standing.missionPoints.toFixed(1)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black tabular-nums">{standing.totalScore.toFixed(1)}</p>
                                    {standing.fairPlayStatus === "REVIEW" ? <span className="text-[9px] font-bold text-amber-700">ตรวจ Fair Play</span> : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {reward ? (
                    <section className="overflow-hidden rounded-[24px] border-2 border-zinc-800 bg-zinc-950 text-white shadow-[0_5px_0_rgba(24,24,27,.16)]">
                        <div className="border-b border-white/10 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black tracking-[0.18em] text-emerald-300">REWARD POINTS WALLET</p>
                                    <h2 className="mt-1 text-xl font-black">แต้มสะสมสำหรับแลกของ</h2>
                                </div>
                                <div className="rounded-2xl bg-emerald-400 px-3 py-2 text-right text-zinc-950">
                                    <p className="text-2xl font-black tabular-nums">{reward.wallet.balance}</p>
                                    <p className="text-[9px] font-black">RP คงเหลือ</p>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2"><p className="text-[9px] text-zinc-400">สะสมทั้งหมด</p><p className="font-black">{reward.wallet.earnedPoints} RP</p></div>
                                <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2"><p className="text-[9px] text-zinc-400">ใช้ไป/รอมอบ</p><p className="font-black">{reward.wallet.spentPoints} RP</p></div>
                                <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2"><p className="text-[9px] text-zinc-400">สัปดาห์นี้</p><p className="font-black text-amber-300">+{myWeekly?.rewardPointsPreview ?? 0} RP</p></div>
                            </div>
                        </div>

                        <div className={`px-4 py-3 text-xs font-black ${rewardEligibility.tone === "green" ? "bg-emerald-950/70 text-emerald-300" : rewardEligibility.tone === "red" ? "bg-red-950/70 text-red-300" : "bg-amber-950/55 text-amber-200"}`}>
                            {rewardEligibility.label}
                        </div>

                        {reward.featured ? (
                            <div className="border-t border-white/10 p-4">
                                <p className="mb-2 text-[10px] font-black tracking-[0.15em] text-amber-300">🎁 ของรางวัลสัปดาห์นี้</p>
                                <div className="grid grid-cols-[110px_1fr] gap-3 rounded-2xl border border-amber-300/30 bg-white/5 p-3">
                                    <div
                                        className="grid h-[96px] place-items-center overflow-hidden rounded-xl bg-zinc-800 bg-cover bg-center"
                                        style={reward.featured.imageUrl ? { backgroundImage: `url(${reward.featured.imageUrl})` } : undefined}
                                    >
                                        {!reward.featured.imageUrl ? <Gift className="h-9 w-9 text-amber-300" /> : null}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black leading-tight">{reward.featured.title}</h3>
                                        {reward.featured.description ? <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{reward.featured.description}</p> : null}
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-xs font-black text-zinc-950">{reward.featured.pointsCost} RP</span>
                                            {reward.featured.stock !== null ? <span className="text-[10px] text-zinc-400">เหลือ {reward.featured.stock} ชิ้น</span> : null}
                                        </div>
                                        <button
                                            disabled={redeeming !== null || !myWeekly?.isRewardEligible || reward.wallet.balance < reward.featured.pointsCost || reward.featured.stock === 0}
                                            onClick={() => void redeemReward(reward.featured!)}
                                            className="mt-2 rounded-lg bg-amber-300 px-3 py-2 text-[11px] font-black text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {redeeming === reward.featured.id ? "กำลังแลก..." : reward.wallet.balance < reward.featured.pointsCost ? "RP ยังไม่พอ" : "แลกรางวัลนี้"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-zinc-400">ผู้ดูแลยังไม่ได้ตั้งของรางวัลเด่นประจำสัปดาห์</div>
                        )}

                        {reward.catalog.length > 0 ? (
                            <div className="border-t border-white/10 p-4">
                                <div className="mb-2 flex items-center justify-between"><h3 className="font-black">ของรางวัลที่แลกได้</h3><span className="text-[9px] text-zinc-500">แตะเพื่อใช้ RP</span></div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {reward.catalog.map((item) => (
                                        <div key={item.id} className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
                                            <div
                                                className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-zinc-800 bg-cover bg-center"
                                                style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
                                            >
                                                {!item.imageUrl ? <Gift className="h-5 w-5 text-zinc-500" /> : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-black">{item.title}</p>
                                                <p className="text-[10px] font-bold text-emerald-300">{item.pointsCost} RP{item.stock !== null ? ` · เหลือ ${item.stock}` : ""}</p>
                                                <button
                                                    disabled={redeeming !== null || !myWeekly?.isRewardEligible || reward.wallet.balance < item.pointsCost || item.stock === 0}
                                                    onClick={() => void redeemReward(item)}
                                                    className="mt-1 text-[10px] font-black text-amber-300 underline underline-offset-2 disabled:text-zinc-600 disabled:no-underline"
                                                >
                                                    {item.stock === 0 ? "ของหมด" : !myWeekly?.isRewardEligible ? "ยังไม่มีสิทธิ์" : reward.wallet.balance < item.pointsCost ? "RP ยังไม่พอ" : "แลกของรางวัล"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {(reward.wallet.recentEarnings.length > 0 || reward.wallet.recentRedemptions.length > 0) ? (
                            <div className="border-t border-white/10 p-4">
                                <h3 className="mb-2 text-sm font-black">ประวัติ Reward Points</h3>
                                <div className="space-y-1.5 text-[11px]">
                                    {reward.wallet.recentEarnings.slice(0, 3).map((entry) => (
                                        <div key={`earn:${entry.periodKey}`} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"><span>สัปดาห์ {entry.periodKey} · League {entry.totalScore.toFixed(1)}</span><span className="font-black text-emerald-300">+{entry.points} RP</span></div>
                                    ))}
                                    {reward.wallet.recentRedemptions.slice(0, 3).map((entry) => (
                                        <div key={entry.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"><span className="truncate">แลก {entry.title} · {entry.status === "PENDING" ? "รอมอบ" : entry.status === "FULFILLED" ? "ได้รับแล้ว" : "ยกเลิก"}</span><span className="shrink-0 font-black text-amber-300">-{entry.pointsCost} RP</span></div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </section>
                ) : null}

                <section className="rounded-[22px] border border-zinc-800/30 bg-[#fffaf0] p-4 shadow-[0_4px_0_rgba(24,24,27,.08)]">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2"><Medal className="h-5 w-5 text-amber-500" /><h2 className="font-black">Station Championship — เดือนนี้</h2></div>
                        {monthly.me ? <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-black text-white">คุณ #{monthly.me.rank}</span> : null}
                    </div>
                    <div className="space-y-2">
                        {monthly.standings.length === 0 ? <p className="py-3 text-center text-sm text-zinc-500">รอผล Weekly League รอบแรก</p> : monthly.standings.slice(0, 5).map((standing) => (
                            <div key={`${standing.rank}:${standing.label}`} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white/60 px-3 py-2">
                                <span className="w-8 font-black">{rankIcon(standing.rank)}</span>
                                <span className="min-w-0 flex-1 truncate font-bold">{standing.label}</span>
                                <span className="font-black text-amber-600">{standing.championshipPoints} CP</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-[10px] text-zinc-500">Weekly: 🥇 10 CP · 🥈 6 CP · 🥉 4 CP · อันดับ 4–5 = 2 CP</p>
                </section>

                {(data.awards?.length ?? 0) > 0 ? (
                    <section className="space-y-3 rounded-[22px] border-2 border-amber-400 bg-[#fff8dc] p-4 shadow-[0_4px_0_rgba(217,119,6,.15)]">
                        <div className="flex items-center gap-2"><Gift className="h-6 w-6 text-amber-600" /><h2 className="text-lg font-black">รางวัลของคุณ</h2></div>
                        {data.awards!.map((award) => (
                            <div key={award.id} className="rounded-2xl border border-amber-300 bg-white/70 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div><p className="font-black">🏆 {award.title}</p><p className="text-[10px] text-zinc-500">รอบ {award.period.periodKey}</p></div>
                                    <span className="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black">{award.status === "AVAILABLE" ? "เลือกรางวัล" : "เลือกแล้ว"}</span>
                                </div>
                                {award.status === "SELECTED" ? (
                                    <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">✓ {award.rewardLabel} · รอผู้ดูแลมอบรางวัล</div>
                                ) : (
                                    <div className="grid gap-2">
                                        {award.options.map((option) => (
                                            <button key={option.code} disabled={selecting !== null} onClick={() => void chooseReward(award.id, option.code)} className="rounded-xl border border-zinc-300 bg-white p-3 text-left transition active:translate-y-[1px] disabled:opacity-50">
                                                <div className="flex items-center justify-between"><span className="font-black">{option.label}</span><span className="text-xs font-bold text-amber-700">~฿{option.valueBaht}</span></div>
                                                <p className="mt-1 text-[11px] text-zinc-500">{option.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>
                ) : null}

                <section className="rounded-[22px] border border-zinc-800/30 bg-[#fffaf0] p-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" />
                        <div>
                            <h2 className="font-black">Fair Play — การประเมินซ้ำไม่เพิ่มแต้ม</h2>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-600">คำตอบลูกค้ายังถูกเก็บเป็น feedback ตามปกติ แต่ League ใช้สัญญาณลูกค้าแบบไม่เก็บ IP ดิบเพื่อตัดการประเมินซ้ำจากการเพิ่มแต้ม และไม่นำคำตอบ SUSPECTED หรือ abuse สูงมาคิดแต้ม หากพบรูปแบบผิดปกติ ผลจะถูกพักไว้ให้ผู้ดูแลตรวจสอบก่อนรับรางวัล</p>
                        </div>
                    </div>
                </section>

                {data.latestGrand?.standings?.[0] ? (
                    <section className="rounded-[22px] bg-zinc-950 p-4 text-white shadow-lg">
                        <div className="flex items-center gap-2 text-amber-400"><Star className="h-5 w-5 fill-current" /><span className="text-[10px] font-black tracking-[0.18em]">LATEST GRAND CHAMPION</span></div>
                        <p className="mt-2 text-2xl font-black">👑 {data.latestGrand.standings[0].employeeLabelSnapshot}</p>
                        <p className="text-xs text-zinc-400">รอบ {data.latestGrand.periodKey} · {data.latestGrand.standings[0].totalScore.toFixed(1)} คะแนน</p>
                    </section>
                ) : null}
            </div>
        </main>
    );
}
