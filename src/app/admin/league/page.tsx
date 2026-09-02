"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Gift, Loader2, RefreshCw, ShieldAlert, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";

interface AdminLeagueData {
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

export default function AdminLeaguePage() {
    const [data, setData] = useState<AdminLeagueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/league", { cache: "no-store" });
            if (!response.ok) throw new Error("โหลดข้อมูล League ไม่สำเร็จ");
            setData(await response.json());
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

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2"><Trophy className="h-7 w-7 text-amber-500" /><h1 className="text-2xl font-bold">League & Rewards</h1></div>
                    <p className="mt-1 text-sm text-muted-foreground">ตรวจ Fair Play ก่อนประกาศแชมป์ และติดตามรางวัลที่พนักงานเลือก</p>
                </div>
                <button onClick={() => void load()} className="rounded-lg border p-2" aria-label="รีเฟรช"><RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} /></button>
            </div>

            <section className="space-y-3">
                <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" /><h2 className="text-lg font-bold">รอตรวจ Fair Play</h2></div>
                {loading && !data ? <div className="grid min-h-32 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : null}
                {data?.pendingPeriods.length === 0 ? <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">ไม่มีรอบที่รอตรวจ</div> : null}
                {data?.pendingPeriods.map((period) => (
                    <div key={period.id} className="rounded-xl border bg-card overflow-hidden">
                        <div className="border-b bg-muted/40 px-4 py-3">
                            <p className="font-bold">{period.station?.name ?? "ทุกสถานี"} · {period.periodKey}</p>
                            <p className="text-xs text-muted-foreground">ตรวจเฉพาะแถวที่ขึ้น REVIEW — feedback ต้นฉบับจะไม่ถูกลบหรือแก้</p>
                        </div>
                        <div className="divide-y">
                            {period.standings.filter((standing) => standing.fairPlayStatus === "REVIEW").map((standing) => (
                                <div key={standing.id} className="p-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
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
                <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-bold">รางวัลที่พนักงานเลือกแล้ว</h2></div>
                {data?.selectedAwards.length === 0 ? <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">ยังไม่มีรางวัลรอมอบ</div> : null}
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
