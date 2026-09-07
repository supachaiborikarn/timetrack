"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { getCashierWeeklyReport } from "@/lib/cashier-weekly-report";

type Report = Awaited<ReturnType<typeof getCashierWeeklyReport>>;
const sourceLabels: Record<string, string> = { INITIAL_GRANT: "ให้เต็มตามที่กำหนดสำหรับรอบนี้", ADMIN: "แอดมินลงคะแนน", CUSTOMER: "ลูกค้าประเมิน", MISSING: "ยังไม่มีคะแนน" };
export function CashierWeeklyScore({ stationId, personal = false }: { stationId?: string; personal?: boolean }) {
    const [payload, setPayload] = useState<{ report: Report; canEdit: boolean } | null>(null);
    const [week, setWeek] = useState("previous");
    const [station, setStation] = useState("");
    const [restroom, setRestroom] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setPayload(null);
        setMessage("");
        const query = new URLSearchParams({ week, ...(stationId ? { stationId } : {}) });
        void fetch(`/api/admin/cashier-scores?${query}`, { cache: "no-store", signal: controller.signal }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "โหลดคะแนนไม่สำเร็จ");
            if (!controller.signal.aborted) {
                setPayload(data);
                setStation(data.report.station.manual?.toString() ?? "");
                setRestroom(data.report.restroom.manual?.toString() ?? "");
            }
        }).catch((error) => { if (!controller.signal.aborted) setMessage(error.message); });
        return () => controller.abort();
    }, [stationId, week, revision]);
    async function save() {
        if (!payload || !stationId) return;
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/cashier-scores", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId, periodKey: payload.report.periodKey, station: station === "" ? null : Number(station), restroom: restroom === "" ? null : Number(restroom) }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
            toast.success("บันทึกคะแนนแล้ว");
            setRevision((value) => value + 1);
        } catch (error) { setMessage(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ"); }
        finally { setSaving(false); }
    }
    const report = payload?.report;
    return <section className="rounded-2xl border border-emerald-500/30 bg-zinc-950 p-4 text-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">คะแนนเสมียนประจำสัปดาห์</h2>{!personal && <select aria-label="รอบคะแนนเสมียน" className="bg-zinc-800 rounded p-2" value={week} disabled={saving} onChange={(event) => setWeek(event.target.value)}><option value="previous">สัปดาห์ก่อน</option><option value="current">สัปดาห์นี้</option></select>}</div>
        {report ? <>
            <p className="text-sm">รอบเริ่ม {report.periodKey} · {report.cashiers.map((cashier) => cashier.label).join(", ") || "ไม่มีเสมียนน้ำมันประจำปั๊ม"}</p>
            <p className="text-2xl font-bold text-emerald-300">{report.result.score === null ? "รอคะแนนพนักงานหรือผลประเมิน" : `${report.result.score} / 100`}</p>
            <p className="text-sm">ผลงานพนักงาน {report.teamScore ?? "—"}/100 × 60% = {report.result.points.teamPerformance ?? "—"} คะแนน ({report.teamCount} คน)</p>
            {(["station", "restroom"] as const).map((key) => <p className="text-sm" key={key}>{key === "station" ? "ปั๊ม" : "ห้องน้ำ"} {report[key].score ?? "—"}/100 × 20% = {report[key].score === null ? "—" : Math.round(report[key].score! * 2) / 10} คะแนน · {sourceLabels[report[key].source]}</p>)}
            <p className="text-xs text-zinc-400">{report.teamSource === "FINALIZED_EMPLOYEE_LEAGUE" ? "ใช้คะแนน League พนักงานที่ปิดรอบแล้ว" : "ใช้คะแนนประเมินผลงานพนักงาน 60 + ลูกค้า 40"} · การแก้คะแนนไม่เปลี่ยน RP ของรอบที่ปิดแล้ว</p>
            {payload.canEdit && !personal && <form className="space-y-3 border-t border-white/10 pt-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
                <p className="text-sm">ลงคะแนนแทนเมื่อลูกค้าไม่ได้ประเมิน (เต็ม 100) · เว้นว่างเพื่อล้างคะแนนที่ลงเอง</p>
                <div className="flex flex-wrap gap-3">{(["station", "restroom"] as const).map((key) => <label className="text-sm" key={key}>{key === "station" ? "คะแนนปั๊ม" : "คะแนนห้องน้ำ"}<input type="number" min="0" max="100" step="0.1" className="block w-32 rounded bg-zinc-800 p-2 mt-1" disabled={saving || (report.periodKey !== "2026-08-31" && report[key].responseCount > 0)} value={key === "station" ? station : restroom} onChange={(event) => (key === "station" ? setStation : setRestroom)(event.target.value)} /></label>)}</div>
                <button disabled={saving} className="rounded bg-emerald-600 px-4 py-2 disabled:opacity-50">{saving ? "กำลังบันทึก…" : "บันทึกคะแนน"}</button>
            </form>}
        </> : <p className="text-sm">{message || "กำลังโหลดคะแนน…"}</p>}
        {report && message && <p role="alert" className="text-sm text-red-300">{message}</p>}
    </section>;
}
