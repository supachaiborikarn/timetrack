"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Gift, Loader2, Medal, RefreshCw, Save, Star, Trophy } from "lucide-react";

interface RewardOption {
    code: string;
    label: string;
    description: string;
    valueBaht: number;
}

interface ChampionshipData {
    periodKey: string;
    currentPeriodKey: string;
    stationCompetitions: Array<{
        station: { id: string; code: string; name: string };
        standings: Array<{
            userId: string;
            label: string;
            championshipPoints: number;
            averageScore: number;
            weeks: number;
            rank: number;
        }>;
    }>;
    grandPreview: Array<{
        station: { id: string; code: string; name: string };
        label: string;
        championshipPoints: number;
        averageScore: number;
        weeks: number;
        grandRank: number;
    }>;
    rewards: {
        stationChampion: RewardOption[];
        grandChampion: RewardOption[];
    };
    awards: Array<{
        id: string;
        awardType: "MONTHLY_STATION_CHAMPION" | "GRAND_CHAMPION";
        title: string;
        status: "AVAILABLE" | "SELECTED" | "FULFILLED" | "CANCELLED";
        rewardLabel: string | null;
        rewardValueBaht: number | null;
        user: { employeeId: string; name: string; nickName: string | null };
        station: { code: string; name: string } | null;
        period: { type: string; periodKey: string; status: string };
    }>;
}

type RewardDraft = Array<{ label: string; description: string; valueBaht: number }>;
type ConfigurableAwardType = "MONTHLY_STATION_CHAMPION" | "GRAND_CHAMPION";

function rankLabel(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
}

function rewardDraft(options: RewardOption[]): RewardDraft {
    return options.map((option) => ({
        label: option.label,
        description: option.description,
        valueBaht: option.valueBaht,
    }));
}

function RewardEditor({
    title,
    subtitle,
    tone,
    options,
    onChange,
    onSave,
    saving,
}: {
    title: string;
    subtitle: string;
    tone: "amber" | "violet";
    options: RewardDraft;
    onChange: (options: RewardDraft) => void;
    onSave: () => void;
    saving: boolean;
}) {
    const panelClass = tone === "amber"
        ? "border-amber-300 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/20"
        : "border-violet-300 bg-violet-50/80 dark:border-violet-900/70 dark:bg-violet-950/20";
    const buttonClass = tone === "amber"
        ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
        : "bg-violet-600 text-white hover:bg-violet-500";

    return (
        <section className={`rounded-[22px] border p-4 shadow-sm ${panelClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-black">{title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
                </div>
                <button
                    type="button"
                    disabled={saving || options.length >= 3}
                    onClick={() => onChange([...options, { label: "", description: "", valueBaht: 0 }])}
                    className="rounded-xl border bg-background px-3 py-2 text-xs font-black disabled:opacity-40"
                >
                    + เพิ่มตัวเลือก
                </button>
            </div>

            <div className="mt-4 space-y-3">
                {options.map((option, index) => (
                    <div key={index} className="rounded-2xl border bg-background/90 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-black">ตัวเลือก {index + 1}</span>
                            {options.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => onChange(options.filter((_, rowIndex) => rowIndex !== index))}
                                    className="text-[10px] font-black text-red-600"
                                >
                                    ลบ
                                </button>
                            ) : null}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                            <label className="text-[10px] font-black text-muted-foreground">
                                ชื่อรางวัล
                                <input
                                    value={option.label}
                                    maxLength={120}
                                    onChange={(event) => onChange(options.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))}
                                    placeholder="เช่น Voucher 700 บาท"
                                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </label>
                            <label className="text-[10px] font-black text-muted-foreground">
                                มูลค่า (บาท)
                                <input
                                    type="number"
                                    min={0}
                                    max={100000}
                                    value={option.valueBaht}
                                    onChange={(event) => onChange(options.map((row, rowIndex) => rowIndex === index ? { ...row, valueBaht: Number(event.target.value) } : row))}
                                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </label>
                        </div>
                        <label className="mt-2 block text-[10px] font-black text-muted-foreground">
                            รายละเอียดที่พนักงานจะเห็น
                            <input
                                value={option.description}
                                maxLength={300}
                                onChange={(event) => onChange(options.map((row, rowIndex) => rowIndex === index ? { ...row, description: event.target.value } : row))}
                                placeholder="เช่น Voucher ร้านอาหารหรือร้านค้าที่บริษัทกำหนด"
                                className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-amber-300"
                            />
                        </label>
                    </div>
                ))}
            </div>

            <button
                type="button"
                disabled={saving || options.some((option) => !option.label.trim() || !Number.isFinite(option.valueBaht) || option.valueBaht < 0)}
                onClick={onSave}
                className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-40 ${buttonClass}`}
            >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                บันทึกรางวัล
            </button>
        </section>
    );
}

export default function AdminChampionshipPage() {
    const [data, setData] = useState<ChampionshipData | null>(null);
    const [periodKey, setPeriodKey] = useState("");
    const [stationRewards, setStationRewards] = useState<RewardDraft>([]);
    const [grandRewards, setGrandRewards] = useState<RewardDraft>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<ConfigurableAwardType | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async (requestedPeriodKey?: string) => {
        setLoading(true);
        setError(null);
        try {
            const query = requestedPeriodKey ? `?periodKey=${encodeURIComponent(requestedPeriodKey)}` : "";
            const response = await fetch(`/api/admin/championship${query}`, { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error || "โหลด Championship ไม่สำเร็จ");
            const championship = payload as ChampionshipData;
            setData(championship);
            setPeriodKey(championship.periodKey);
            setStationRewards(rewardDraft(championship.rewards.stationChampion));
            setGrandRewards(rewardDraft(championship.rewards.grandChampion));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "โหลด Championship ไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const saveRewards = useCallback(async (awardType: ConfigurableAwardType, options: RewardDraft) => {
        if (!data) return;
        setSaving(awardType);
        setMessage(null);
        setError(null);
        try {
            const response = await fetch("/api/admin/championship", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ periodKey: data.periodKey, awardType, options }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error || "บันทึกรางวัลไม่สำเร็จ");
            setMessage(awardType === "MONTHLY_STATION_CHAMPION" ? "บันทึกรางวัล Station Champion แล้ว" : "บันทึกรางวัล Grand Champion แล้ว");
            await loadData(data.periodKey);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "บันทึกรางวัลไม่สำเร็จ");
        } finally {
            setSaving(null);
        }
    }, [data, loadData]);

    const awardedCount = useMemo(() => data?.awards.filter((award) => award.status === "FULFILLED").length ?? 0, [data]);
    const pendingAwardCount = useMemo(() => data?.awards.filter((award) => award.status === "AVAILABLE" || award.status === "SELECTED").length ?? 0, [data]);

    return (
        <div className="space-y-5 pb-10">
            <section className="relative overflow-hidden rounded-[26px] border border-zinc-800/20 bg-zinc-950 p-5 text-white shadow-lg">
                <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(#fbbf24 0.8px, transparent 0.8px)", backgroundSize: "11px 11px" }} />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-amber-300"><Crown className="h-5 w-5" /><span className="text-[10px] font-black tracking-[0.18em]">CHAMPIONSHIP CONTROL</span></div>
                        <h1 className="mt-2 text-2xl font-black">จัดการ Championship</h1>
                        <p className="mt-1 max-w-2xl text-xs text-zinc-400">Championship Points รายเดือน · Station Champion แต่ละปั๊ม · Grand Champion ระหว่างปั๊ม · กำหนดรางวัลที่พนักงานเห็น</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <label className="text-[10px] font-black text-zinc-400">
                            เดือนการแข่งขัน
                            <input
                                type="month"
                                value={periodKey}
                                onChange={(event) => setPeriodKey(event.target.value)}
                                className="mt-1 block rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-black text-white"
                            />
                        </label>
                        <button
                            type="button"
                            disabled={loading || !periodKey}
                            onClick={() => void loadData(periodKey)}
                            className="inline-flex h-[38px] items-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-black text-zinc-950 disabled:opacity-40"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            โหลดเดือนนี้
                        </button>
                        <Link href="/admin/league" className="inline-flex h-[38px] items-center rounded-xl border border-white/15 px-3 text-xs font-black text-white">League & Fair Play</Link>
                    </div>
                </div>
            </section>

            {message ? <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">✓ {message}</div> : null}
            {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}

            {loading && !data ? (
                <div className="grid min-h-52 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
            ) : data ? (
                <>
                    <section className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border bg-card p-4"><p className="text-[10px] font-black text-muted-foreground">เดือน</p><p className="mt-1 text-xl font-black">{data.periodKey}</p></div>
                        <div className="rounded-2xl border bg-card p-4"><p className="text-[10px] font-black text-muted-foreground">ปั๊มที่แข่งขัน</p><p className="mt-1 text-xl font-black">{data.stationCompetitions.length}</p></div>
                        <div className="rounded-2xl border bg-card p-4"><p className="text-[10px] font-black text-muted-foreground">รางวัลรอเลือก/รอมอบ</p><p className="mt-1 text-xl font-black text-amber-600">{pendingAwardCount}</p></div>
                        <div className="rounded-2xl border bg-card p-4"><p className="text-[10px] font-black text-muted-foreground">มอบแล้ว</p><p className="mt-1 text-xl font-black text-emerald-600">{awardedCount}</p></div>
                    </section>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <RewardEditor
                            title="🏆 รางวัล Station Champion ประจำเดือน"
                            subtitle="ใช้ร่วมกันสำหรับแชมป์ประจำปั๊มทุกสาขาในเดือนนี้ พนักงานจะเห็นตัวเลือกนี้บน Dashboard/League"
                            tone="amber"
                            options={stationRewards}
                            onChange={setStationRewards}
                            onSave={() => void saveRewards("MONTHLY_STATION_CHAMPION", stationRewards)}
                            saving={saving === "MONTHLY_STATION_CHAMPION"}
                        />
                        <RewardEditor
                            title="👑 รางวัล Grand Champion ระหว่างปั๊ม"
                            subtitle="รางวัลใหญ่สำหรับผู้ชนะเมื่อเทียบ Station Champion ของทุกปั๊มในเดือนเดียวกัน"
                            tone="violet"
                            options={grandRewards}
                            onChange={setGrandRewards}
                            onSave={() => void saveRewards("GRAND_CHAMPION", grandRewards)}
                            saving={saving === "GRAND_CHAMPION"}
                        />
                    </div>

                    <section className="rounded-[22px] border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-2"><Star className="h-5 w-5 text-violet-500" /><h2 className="font-black">Grand Champion Preview — ระหว่างปั๊ม</h2></div>
                        <p className="mt-1 text-xs text-muted-foreground">Station Champion ของแต่ละปั๊มมาจาก CP สะสม จากนั้น Grand Champion จะเทียบคะแนน League เฉลี่ยของแชมป์แต่ละปั๊ม</p>
                        {data.grandPreview.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มี Weekly League ที่ปิดผลในเดือนนี้</p>
                        ) : (
                            <div className="mt-3 grid gap-2 lg:grid-cols-3">
                                {data.grandPreview.map((standing) => (
                                    <div key={standing.station.id} className={`rounded-2xl border p-3 ${standing.grandRank === 1 ? "border-violet-400 bg-violet-50 dark:bg-violet-950/20" : "bg-background"}`}>
                                        <div className="flex items-center justify-between"><span className="text-lg font-black">{rankLabel(standing.grandRank)}</span><span className="rounded-full bg-zinc-900 px-2 py-1 text-[9px] font-black text-white">{standing.station.code}</span></div>
                                        <p className="mt-2 font-black">{standing.label}</p>
                                        <p className="text-xs text-muted-foreground">{standing.station.name}</p>
                                        <div className="mt-2 flex items-center justify-between text-xs"><span>League เฉลี่ย {standing.averageScore.toFixed(1)}</span><span className="font-black text-amber-600">{standing.championshipPoints} CP</span></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center gap-2"><Medal className="h-5 w-5 text-amber-500" /><h2 className="font-black">Championship Points รายปั๊ม</h2></div>
                        <div className="grid gap-3 xl:grid-cols-2">
                            {data.stationCompetitions.map((competition) => (
                                <div key={competition.station.id} className="rounded-[20px] border bg-card p-4 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <div><p className="font-black">{competition.station.name}</p><p className="text-[10px] font-bold text-muted-foreground">{competition.station.code} · {data.periodKey}</p></div>
                                        <Trophy className="h-5 w-5 text-amber-500" />
                                    </div>
                                    {competition.standings.length === 0 ? (
                                        <p className="py-5 text-center text-xs text-muted-foreground">ยังไม่มีผล Weekly ที่ Finalize ในเดือนนี้</p>
                                    ) : (
                                        <div className="mt-3 space-y-1.5">
                                            {competition.standings.slice(0, 5).map((standing) => (
                                                <div key={`${standing.rank}:${standing.userId}`} className="grid grid-cols-[38px_1fr_auto] items-center gap-2 rounded-xl border bg-background px-3 py-2">
                                                    <span className="font-black">{rankLabel(standing.rank)}</span>
                                                    <div className="min-w-0"><p className="truncate text-sm font-black">{standing.label}</p><p className="text-[9px] text-muted-foreground">League เฉลี่ย {standing.averageScore.toFixed(1)} · {standing.weeks} สัปดาห์</p></div>
                                                    <span className="font-black text-amber-600">{standing.championshipPoints} CP</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[22px] border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-emerald-500" /><h2 className="font-black">สถานะรางวัล Championship ของเดือนนี้</h2></div>
                        {data.awards.length === 0 ? (
                            <p className="py-5 text-center text-xs text-muted-foreground">ยังไม่ปิดผลเดือนนี้ จึงยังไม่มีผู้ชนะที่ได้รับสิทธิ์เลือกรางวัล</p>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {data.awards.map((award) => (
                                    <div key={award.id} className="flex flex-col gap-2 rounded-xl border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-black">{award.awardType === "GRAND_CHAMPION" ? "👑 Grand Champion" : "🏆 Station Champion"} · {award.user.nickName || award.user.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{award.station?.name ?? "ทุกปั๊ม"} · {award.user.employeeId}</p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs font-black">{award.rewardLabel ?? (award.status === "AVAILABLE" ? "รอผู้ชนะเลือกรางวัล" : "-")}{award.rewardValueBaht !== null ? ` · ฿${award.rewardValueBaht.toLocaleString("th-TH")}` : ""}</p>
                                            <p className="text-[10px] text-muted-foreground">{award.status === "AVAILABLE" ? "AVAILABLE" : award.status === "SELECTED" ? "SELECTED · รอมอบ" : award.status === "FULFILLED" ? "FULFILLED · มอบแล้ว" : "CANCELLED"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            ) : null}
        </div>
    );
}
