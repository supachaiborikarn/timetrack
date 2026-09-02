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
    isProvisional: boolean;
    fairPlayStatus: "CLEAR" | "REVIEW" | "APPROVED" | "DISQUALIFIED" | "INELIGIBLE";
    isMe: boolean;
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
