"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Gift, ImagePlus, Loader2, RefreshCw, ShieldAlert, Sparkles, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";

interface AdminLeagueData {
    canManageRewards: boolean;
    pendingPeriods: Array<{
        id: string;
        periodKey: string;
        type: string;
        station: { name: string; code: string } | null;
        standings: Array<{
            id: string;
            totalScore: number;
            workPoints: number;
            customerPoints: number;
            missionPoints: number;
            eligibleCustomerCount: number;
            excludedRepeatCustomerCount: number;
            suspiciousCustomerCount: number;
            fairPlayStatus: string;
            fairPlayReasons: string[];
            user: { employeeId: string; name: string; nickName: string | null };
        }>;
    }>;
    selectedAwards: Array<{
        id: string;
        title: string;
        rewardLabel: string | null;
        rewardValueBaht: number | null;
        selectedAt: string | null;
        user: { employeeId: string; name: string; nickName: string | null };
        station: { name: string; code: string } | null;
        period: { type: string; periodKey: string };
    }>;
}

interface RewardItem {
    id: string;
    code: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    pointsCost: number;
    stock: number | null;
    isActive: boolean;
    featuredWeekKey: string | null;
}

interface RewardAdminData {
    weekKey: string;
    items: RewardItem[];
    redemptions: Array<{
        id: string;
        pointsCost: number;
        rewardTitleSnapshot: string;
        createdAt: string;
        user: { employeeId: string; name: string; nickName: string | null };
        station: { name: string; code: string } | null;
        rewardItem: { id: string; title: string; imageUrl: string | null };
    }>;
}

const EMPTY_REWARD_FORM = {
    title: "",
    description: "",
    pointsCost: "",
    stock: "",
    imageUrl: "",
    featuredThisWeek: true,
};

export default function AdminLeaguePage() {
    const [data, setData] = useState<AdminLeagueData | null>(null);
    const [rewardData, setRewardData] = useState<RewardAdminData | null>(null);
    const [rewardForm, setRewardForm] = useState(EMPTY_REWARD_FORM);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [savingReward, setSavingReward] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/league", { cache: "no-store" });
            if (!response.ok) throw new Error("โหลดข้อมูล League ไม่สำเร็จ");
            const leaguePayload = await response.json() as AdminLeagueData;
            setData(leaguePayload);

            if (leaguePayload.canManageRewards) {
                const rewardResponse = await fetch("/api/admin/league/rewards", { cache: "no-store" });
                if (!rewardResponse.ok) throw new Error("โหลด Reward Points ไม่สำเร็จ");
                setRewardData(await rewardResponse.json());
            } else {
                setRewardData(null);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const act = async (payload: Record<string, string>) => {
        const key = payload.standingId || payload.awardId || "action";
        setBusy(key);
        try {
            const response = await fetch("/api/admin/league", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ");
            toast.success("บันทึกเรียบร้อยแล้ว");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ");
        } finally {
            setBusy(null);
        }
    };

    const rewardAction = async (payload: Record<string, unknown>, key: string) => {
        setBusy(key);
        try {
            const response = await fetch("/api/admin/league/rewards", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ");
            toast.success("บันทึก Reward Points แล้ว");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ");
        } finally {
            setBusy(null);
        }
    };

    const onRewardImage = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
            toast.error("รองรับรูป PNG, JPG, WebP หรือ GIF เท่านั้น");
            event.target.value = "";
            return;
        }
        if (file.size > 550_000) {
            toast.error("รูปใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกินประมาณ 550 KB");
            event.target.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setRewardForm((form) => ({ ...form, imageUrl: typeof reader.result === "string" ? reader.result : "" }));
        reader.onerror = () => toast.error("อ่านไฟล์รูปไม่สำเร็จ");
        reader.readAsDataURL(file);
    };

    const createReward = async () => {
        if (!rewardForm.title.trim() || !Number(rewardForm.pointsCost)) {
            toast.error("กรอกชื่อของรางวัลและจำนวน RP");
            return;
        }
        setSavingReward(true);
        try {
            const response = await fetch("/api/admin/league/rewards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: rewardForm.title,
                    description: rewardForm.description,
                    pointsCost: Number(rewardForm.pointsCost),
                    stock: rewardForm.stock.trim() === "" ? null : Number(rewardForm.stock),
                    imageUrl: rewardForm.imageUrl || null,
                    featuredThisWeek: rewardForm.featuredThisWeek,
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "เพิ่มของรางวัลไม่สำเร็จ");
            toast.success("เพิ่มของรางวัลแล้ว 🎁");
            setRewardForm(EMPTY_REWARD_FORM);
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "เพิ่มของรางวัลไม่สำเร็จ");
        } finally {
            setSavingReward(false);
        }
    };

    const quickEditItem = async (item: RewardItem) => {
        const title = window.prompt("ชื่อของรางวัล", item.title);
        if (title === null) return;
        const points = window.prompt("ใช้กี่ Reward Points (RP)", String(item.pointsCost));
        if (points === null) return;
        const stock = window.prompt("จำนวนคงเหลือ (เว้นว่าง = ไม่จำกัด)", item.stock === null ? "" : String(item.stock));
        if (stock === null) return;
        await rewardAction({
            action: "UPDATE_ITEM",
            itemId: item.id,
            title,
            pointsCost: Number(points),
            stock: stock.trim() === "" ? null : Number(stock),
            isActive: item.isActive,
            featuredThisWeek: item.featuredWeekKey === rewardData?.weekKey,
        }, item.id);
    };

    const featured = rewardData?.items.find((item) => item.isActive && item.featuredWeekKey === rewardData.weekKey) ?? null;

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 bg-zinc-950 text-white p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.2)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbf24]">CHAMPIONSHIP & FAIR PLAY</p>
                            <h1 className="text-xl sm:text-2xl font-black text-white">League & Rewards</h1>
                            <p className="text-zinc-400 text-xs mt-0.5">Fair Play · Championship · Reward Points · ของรางวัลประจำสัปดาห์</p>
                        </div>
                    </div>
                    <button
                        onClick={() => void load()}
                        className="tt-retro-control flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold self-start sm:self-auto"
                        aria-label="รีเฟรช"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        รีเฟรช
                    </button>
                </div>
            </div>

            {data?.canManageRewards ? (
                <section className="space-y-4 tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-5 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2"><Gift className="h-6 w-6 text-emerald-600" /><div><h2 className="text-lg font-bold">Reward Points & ของรางวัล</h2><p className="text-xs text-muted-foreground">รอบสัปดาห์ {rewardData?.weekKey ?? "..."} · เกณฑ์ Customer Quality ≥ 20/25</p></div></div>
                        {featured ? <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-zinc-950">🎁 เด่นสัปดาห์นี้: {featured.title}</span> : <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">ยังไม่ได้ตั้งของรางวัลเด่น</span>}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
                        <div className="rounded-xl border bg-card p-4">
                            <div className="mb-3 flex items-center gap-2"><ImagePlus className="h-5 w-5" /><h3 className="font-bold">เพิ่มของรางวัล</h3></div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1 text-xs font-semibold">ชื่อของรางวัล<input value={rewardForm.title} onChange={(event) => setRewardForm((form) => ({ ...form, title: event.target.value }))} className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="เช่น แก้วเก็บความเย็น" /></label>
                                <label className="grid gap-1 text-xs font-semibold">ราคา RP<input type="number" min="1" value={rewardForm.pointsCost} onChange={(event) => setRewardForm((form) => ({ ...form, pointsCost: event.target.value }))} className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="300" /></label>
                                <label className="grid gap-1 text-xs font-semibold">จำนวนของ<input type="number" min="0" value={rewardForm.stock} onChange={(event) => setRewardForm((form) => ({ ...form, stock: event.target.value }))} className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="เว้นว่าง = ไม่จำกัด" /></label>
                                <label className="grid gap-1 text-xs font-semibold">รูปของรางวัล<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onRewardImage} className="rounded-lg border bg-background px-2 py-1.5 text-xs" /></label>
                            </div>
                            <label className="mt-3 grid gap-1 text-xs font-semibold">รายละเอียด<textarea value={rewardForm.description} onChange={(event) => setRewardForm((form) => ({ ...form, description: event.target.value }))} className="min-h-20 rounded-lg border bg-background px-3 py-2 text-sm" placeholder="รายละเอียดของรางวัล (ถ้ามี)" /></label>
                            {rewardForm.imageUrl ? <div className="mt-3 h-40 rounded-xl border bg-cover bg-center" style={{ backgroundImage: `url(${rewardForm.imageUrl})` }} /> : null}
                            <label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={rewardForm.featuredThisWeek} onChange={(event) => setRewardForm((form) => ({ ...form, featuredThisWeek: event.target.checked }))} /> แสดงเป็น “ของรางวัลสัปดาห์นี้” บน Dashboard</label>
                            <button disabled={savingReward} onClick={() => void createReward()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{savingReward ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} บันทึกของรางวัล</button>
                        </div>

                        <div className="rounded-xl border bg-card p-4">
                            <h3 className="font-bold">คำขอแลกรางวัลที่รอมอบ</h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">RP ถูกกันไว้ตั้งแต่พนักงานกดแลก ถ้ายกเลิก ระบบคืน RP และคืน stock อัตโนมัติ</p>
                            <div className="mt-3 space-y-2">
                                {rewardData?.redemptions.length === 0 ? <div className="rounded-lg bg-muted/40 p-4 text-center text-sm text-muted-foreground">ไม่มีรายการรอมอบ</div> : null}
                                {rewardData?.redemptions.map((redemption) => (
                                    <div key={redemption.id} className="rounded-lg border p-3">
                                        <p className="font-bold">{redemption.user.nickName || redemption.user.name} · {redemption.rewardTitleSnapshot}</p>
                                        <p className="text-xs text-muted-foreground">{redemption.station?.name ?? "-"} · ใช้ {redemption.pointsCost} RP</p>
                                        <div className="mt-2 flex gap-2">
                                            <button disabled={busy === redemption.id} onClick={() => void rewardAction({ action: "FULFILL_REDEMPTION", redemptionId: redemption.id }, redemption.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">มอบแล้ว</button>
                                            <button disabled={busy === redemption.id} onClick={() => void rewardAction({ action: "CANCEL_REDEMPTION", redemptionId: redemption.id }, redemption.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">ยกเลิก/คืน RP</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-4">
                        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">คลังของรางวัล</h3><span className="text-xs text-muted-foreground">{rewardData?.items.length ?? 0} รายการ</span></div>
                        {rewardData?.items.length === 0 ? <div className="rounded-lg bg-muted/40 p-4 text-center text-sm text-muted-foreground">ยังไม่มีของรางวัล</div> : null}
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {rewardData?.items.map((item) => {
                                const isFeatured = item.featuredWeekKey === rewardData.weekKey;
                                return (
                                    <div key={item.id} className={`overflow-hidden rounded-xl border ${item.isActive ? "bg-card" : "bg-muted/40 opacity-70"}`}>
                                        <div className="grid h-28 place-items-center bg-muted bg-cover bg-center" style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}>{!item.imageUrl ? <Gift className="h-8 w-8 text-muted-foreground" /> : null}</div>
                                        <div className="p-3">
                                            <div className="flex items-start justify-between gap-2"><p className="font-bold leading-tight">{item.title}</p>{isFeatured ? <span className="shrink-0 rounded bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-zinc-950">สัปดาห์นี้</span> : null}</div>
                                            <p className="mt-1 text-sm font-bold text-emerald-700">{item.pointsCost} RP {item.stock !== null ? `· เหลือ ${item.stock}` : "· ไม่จำกัด"}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button disabled={busy === item.id} onClick={() => void rewardAction({ action: "UPDATE_ITEM", itemId: item.id, featuredThisWeek: true, isActive: true }, item.id)} className="rounded-lg border border-amber-400 px-2.5 py-1.5 text-xs font-bold text-amber-700 disabled:opacity-50">ตั้งเป็นของสัปดาห์นี้</button>
                                                <button disabled={busy === item.id} onClick={() => void quickEditItem(item)} className="rounded-lg border px-2.5 py-1.5 text-xs font-bold disabled:opacity-50">แก้ RP/stock</button>
                                                <button disabled={busy === item.id} onClick={() => void rewardAction({ action: "UPDATE_ITEM", itemId: item.id, isActive: !item.isActive, featuredThisWeek: false }, item.id)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 ${item.isActive ? "text-red-700" : "text-emerald-700"}`}>{item.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            ) : null}

            <section className="space-y-3">
                <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" /><h2 className="text-lg font-bold">รอตรวจ Fair Play</h2></div>
                {loading && !data ? <div className="grid min-h-32 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : null}
                {data?.pendingPeriods.length === 0 ? <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">ไม่มีรอบที่รอตรวจ</div> : null}
                {data?.pendingPeriods.map((period) => (
                    <div key={period.id} className="overflow-hidden rounded-xl border bg-card">
                        <div className="border-b bg-muted/40 px-4 py-3">
                            <p className="font-bold">{period.station?.name ?? "ทุกสถานี"} · {period.periodKey}</p>
                            <p className="text-xs text-muted-foreground">ตรวจเฉพาะแถวที่ขึ้น REVIEW — feedback ต้นฉบับจะไม่ถูกลบหรือแก้</p>
                        </div>
                        <div className="divide-y">
                            {period.standings.filter((standing) => standing.fairPlayStatus === "REVIEW").map((standing) => (
                                <div key={standing.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{standing.user.nickName || standing.user.name}</span><span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{standing.totalScore.toFixed(1)} คะแนน</span></div>
                                        <p className="mt-1 text-xs text-muted-foreground">ลูกค้าที่นับ {standing.eligibleCustomerCount} · ซ้ำถูกตัด {standing.excludedRepeatCustomerCount} · ต้องสงสัย {standing.suspiciousCustomerCount}</p>
                                        <p className="mt-1 text-xs text-amber-700">เหตุผล: {standing.fairPlayReasons.join(", ") || "pattern review"}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button disabled={busy === standing.id} onClick={() => void act({ standingId: standing.id, action: "APPROVE" })} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> รับรอง</button>
                                        <button disabled={busy === standing.id} onClick={() => void act({ standingId: standing.id, action: "DISQUALIFY" })} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><XCircle className="h-4 w-4" /> ตัดจากรอบ</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>

            <section className="space-y-3">
                <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-bold">รางวัลแชมป์ที่พนักงานเลือกแล้ว</h2></div>
                {data?.selectedAwards.length === 0 ? <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">ยังไม่มีรางวัลแชมป์รอมอบ</div> : null}
                <div className="grid gap-3 lg:grid-cols-2">
                    {data?.selectedAwards.map((award) => (
                        <div key={award.id} className="rounded-xl border bg-card p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold">{award.user.nickName || award.user.name} · {award.title}</p>
                                    <p className="text-xs text-muted-foreground">{award.station?.name ?? "Grand Champion"} · {award.period.periodKey}</p>
                                    <p className="mt-2 text-sm font-semibold text-emerald-700">🎁 {award.rewardLabel ?? "-"}{award.rewardValueBaht ? ` (~฿${award.rewardValueBaht})` : ""}</p>
                                </div>
                                <button disabled={busy === award.id} onClick={() => void act({ awardId: award.id, action: "FULFILL_REWARD" })} className="shrink-0 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50">มอบแล้ว</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
