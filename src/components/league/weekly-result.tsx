import { Trophy } from "lucide-react";
import type { ChampionReward, PreviousWeeklyResult } from "@/lib/competition/weekly-results";

export type WeeklyChampionResult = {
    periodKey: string;
    championReward?: ChampionReward | null;
    standings: Array<{ employeeLabelSnapshot: string; finalRank: number | null }>;
};

export function championRewardLabel(reward?: ChampionReward | null) {
    if (!reward) return "รอข้อมูลรางวัล";
    if (reward.status === "CANCELLED") return "รางวัลถูกยกเลิก";
    if (reward.status === "AVAILABLE" || !reward.rewardLabel) return "รอเลือกรางวัล";
    const value = reward.rewardValueBaht ? ` (${reward.rewardValueBaht.toLocaleString("th-TH")} บาท)` : "";
    return reward.status === "FULFILLED"
        ? `ได้รับแล้ว: ${reward.rewardLabel}${value}`
        : `เลือกแล้ว: ${reward.rewardLabel}${value} · รอมอบ`;
}

function resultStatus(result: PreviousWeeklyResult) {
    if (result.status === "PENDING_REVIEW") return "รอตรวจสอบผลก่อนประกาศแชมป์";
    if (result.status === "AWAITING_FINALIZATION") return "รอประกาศผล · กำหนดวันจันทร์ 07:30 น. อาจใช้เวลาประมวลผลเพิ่มเติม";
    if (!result.standings.some((standing) => standing.finalRank === 1)) return "รอบนี้ไม่มีผู้ผ่านเกณฑ์รับตำแหน่งแชมป์";
    return "ผลอย่างเป็นทางการ";
}

function periodLabel(result: PreviousWeeklyResult) {
    const options = { timeZone: "Asia/Bangkok", day: "numeric", month: "short" } as const;
    const start = new Date(result.from).toLocaleDateString("th-TH", options);
    const end = new Date(new Date(result.to).getTime() - 1).toLocaleDateString("th-TH", { ...options, year: "numeric" });
    return `${start} – ${end}`;
}

export function PreviousWeeklyResultCard({ result }: { result: PreviousWeeklyResult }) {
    const official = result.status === "FINALIZED";
    return (
        <section aria-label="ผลสัปดาห์ก่อน" className="overflow-hidden rounded-2xl border-2 border-emerald-700 bg-[#f4fff7] text-zinc-950">
            <div className="flex items-center justify-between gap-3 bg-emerald-800 px-4 py-3 text-white">
                <div>
                    <h2 className="font-black">ผลสัปดาห์ก่อน · {periodLabel(result)}</h2>
                    <p className="mt-1 text-xs text-emerald-100">{resultStatus(result)}</p>
                </div>
                {official && result.standings.some((standing) => standing.finalRank === 1) ? <Trophy className="h-6 w-6 shrink-0 text-amber-300" /> : null}
            </div>
            {!official ? <p className="border-b border-emerald-100 px-4 py-2 text-xs text-zinc-600">คะแนนสัปดาห์ก่อนยังอยู่ · อันดับและแชมป์จะแสดงเมื่อรับรองผลแล้ว</p> : null}
            {result.standings.length === 0 ? <p className="p-4 text-sm text-zinc-600">ไม่มีข้อมูลการแข่งขันในรอบนี้</p> : (
                <div className="divide-y divide-emerald-100">
                    {result.standings.map((standing, index) => (
                        <div key={index} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
                            <span className="text-center font-black">{standing.finalRank === 1 ? "🥇" : standing.finalRank === 2 ? "🥈" : standing.finalRank === 3 ? "🥉" : standing.finalRank ? `#${standing.finalRank}` : "—"}</span>
                            <div className="min-w-0">
                                <p className="break-words font-black">{standing.employeeLabelSnapshot}{standing.finalRank === 1 ? <span className="ml-2 text-xs font-semibold text-emerald-800">· {championRewardLabel(result.championReward)}</span> : null}</p>
                                {!standing.isEligible ? <p className="text-xs text-zinc-500">ไม่ผ่านเกณฑ์จัดอันดับรอบนี้</p> : null}
                            </div>
                            <p className="font-black tabular-nums">{standing.totalScore.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export function WeeklyChampionBanner({ latest, previous }: { latest?: WeeklyChampionResult | null; previous?: PreviousWeeklyResult | null }) {
    const winner = latest?.standings.find((standing) => standing.finalRank === 1);
    if (!winner && !previous) return null;
    return (
        <div className="border-b border-amber-300/20 bg-amber-400/10 px-3.5 py-2">
            {winner ? (
                <div className="flex items-center gap-2.5">
                    <Trophy className="h-5 w-5 shrink-0 text-amber-300" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-amber-300/80">แชมป์ประจำปั๊ม · ผลที่รับรองล่าสุด</p>
                        <p className="mt-0.5 break-words text-sm font-black text-amber-100">{winner.employeeLabelSnapshot}<span className="ml-2 text-xs font-semibold">· {championRewardLabel(latest?.championReward)}</span></p>
                    </div>
                    <span className="shrink-0 text-[10px] text-amber-200/80">{latest?.periodKey}</span>
                </div>
            ) : null}
            {previous && (!winner || previous.periodKey !== latest?.periodKey) ? (
                <p className={`${winner ? "mt-2 " : ""}text-xs text-amber-100`}>สัปดาห์ก่อน · {resultStatus(previous)} · ดูคะแนนได้ใน League</p>
            ) : null}
        </div>
    );
}
