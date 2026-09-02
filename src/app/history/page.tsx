"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  TimerReset,
} from "lucide-react";
import {
  addMonths,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  setDate,
  subMonths,
} from "date-fns";
import { formatThaiDate, formatTime } from "@/lib/date-utils";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  lateMinutes: number | null;
  actualHours: number | null;
  overtimeHours?: number | null;
  latePenaltyAmount: number;
  breakDurationMin?: number | null;
  breakPenaltyAmount?: number;
  note?: string | null;
}

interface ScheduleRecord {
  id: string;
  date: string;
  isDayOff: boolean;
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  } | null;
}

interface TimelineEntry {
  key: string;
  date: string;
  attendance?: AttendanceRecord;
  schedule?: ScheduleRecord;
}

function getHistoryPeriod(referenceMonth: Date, isFrontYard: boolean) {
  if (isFrontYard) {
    const prevMonth = subMonths(referenceMonth, 1);
    return {
      startDate: startOfDay(setDate(prevMonth, 26)),
      endDate: endOfDay(setDate(referenceMonth, 25)),
    };
  }
  return {
    startDate: startOfMonth(referenceMonth),
    endDate: endOfMonth(referenceMonth),
  };
}

function getPeriodLabel(referenceMonth: Date, isFrontYard: boolean): string {
  if (isFrontYard) {
    const { startDate, endDate } = getHistoryPeriod(referenceMonth, true);
    return `${formatThaiDate(startDate, "d MMM")} - ${formatThaiDate(endDate, "d MMM yyyy")}`;
  }
  return formatThaiDate(referenceMonth, "MMMM yyyy");
}

function bangkokDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function statusText(entry: TimelineEntry) {
  if (entry.schedule?.isDayOff) return "วันหยุด";
  if (entry.attendance?.status === "LEAVE") return "ลา";
  if (entry.attendance?.status === "ABSENT") return "ขาด";
  if (entry.attendance?.checkInTime && entry.attendance?.checkOutTime) return "ครบเวลา";
  if (entry.attendance?.checkInTime && !entry.attendance?.checkOutTime) return "ยังไม่ออกงาน";
  if (entry.schedule?.shift && !entry.attendance?.checkInTime) return "ไม่มีบันทึก";
  return "รอตรวจสอบ";
}

function StatusPill({ entry }: { entry: TimelineEntry }) {
  const text = statusText(entry);
  const className = entry.schedule?.isDayOff
    ? "border-zinc-400/40 bg-zinc-200/65 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
    : text === "ครบเวลา"
      ? "border-emerald-700/25 bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      : text === "ลา"
        ? "border-amber-700/25 bg-amber-100/80 text-amber-800 dark:bg-amber-950/35 dark:text-amber-300"
        : text === "ขาด" || text === "ไม่มีบันทึก" || text === "ยังไม่ออกงาน"
          ? "border-red-700/20 bg-red-100/75 text-red-700 dark:bg-red-950/35 dark:text-red-300"
          : "border-zinc-500/25 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${className}`}>
      {text}
    </span>
  );
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFrontYard, setIsFrontYard] = useState<boolean | null>(null);

  const fetchHistory = useCallback(async (month: Date, frontyard: boolean | null) => {
    setIsLoading(true);
    try {
      const useFrontYard = frontyard ?? false;
      const { startDate: periodStart, endDate: periodEnd } = getHistoryPeriod(month, useFrontYard);
      const startStr = format(periodStart, "yyyy-MM-dd");
      const endStr = format(periodEnd, "yyyy-MM-dd");
      const res = await fetch(`/api/attendance/history?startDate=${startStr}&endDate=${endStr}`, { cache: "no-store" });

      if (!res.ok) return;
      const json = await res.json();
      const payload = json.data ?? json;
      setRecords(payload.records ?? []);
      setSchedule(payload.schedule ?? []);

      const apiFrontYard = payload.isFrontYard ?? false;
      if (frontyard === null && apiFrontYard !== useFrontYard) {
        setIsFrontYard(apiFrontYard);
        const corrected = getHistoryPeriod(month, apiFrontYard);
        const correctedStart = format(corrected.startDate, "yyyy-MM-dd");
        const correctedEnd = format(corrected.endDate, "yyyy-MM-dd");
        const correctedRes = await fetch(`/api/attendance/history?startDate=${correctedStart}&endDate=${correctedEnd}`, { cache: "no-store" });
        if (correctedRes.ok) {
          const correctedJson = await correctedRes.json();
          const correctedPayload = correctedJson.data ?? correctedJson;
          setRecords(correctedPayload.records ?? []);
          setSchedule(correctedPayload.schedule ?? []);
        }
      } else if (frontyard === null) {
        setIsFrontYard(apiFrontYard);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      void fetchHistory(currentMonth, isFrontYard);
    }
  }, [session?.user?.id, currentMonth, fetchHistory, isFrontYard]);

  const timeline = useMemo(() => {
    const map = new Map<string, TimelineEntry>();
    const todayKey = bangkokDateKey(new Date());

    for (const item of schedule) {
      const key = bangkokDateKey(item.date);
      map.set(key, { key, date: item.date, schedule: item });
    }

    for (const record of records) {
      const key = bangkokDateKey(record.date);
      const existing = map.get(key);
      map.set(key, {
        key,
        date: record.date,
        schedule: existing?.schedule,
        attendance: record,
      });
    }

    return [...map.values()]
      .filter((entry) => entry.key <= todayKey)
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [records, schedule]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#fbbf24]" />
      </div>
    );
  }

  if (!session) redirect("/login");

  const summary = {
    presentDays: records.filter((r) => Boolean(r.checkInTime)).length,
    totalHours: records.reduce((sum, r) => sum + (r.actualHours || 0), 0),
    lateDays: records.filter((r) => (r.lateMinutes || 0) > 0).length,
    issueDays: timeline.filter((entry) => {
      if (entry.schedule?.isDayOff || entry.attendance?.status === "LEAVE") return false;
      if (entry.schedule?.shift && !entry.attendance?.checkInTime) return true;
      return Boolean(entry.attendance?.checkInTime && !entry.attendance?.checkOutTime);
    }).length,
  };

  const periodLabel = getPeriodLabel(currentMonth, isFrontYard ?? false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eee8db] pb-28 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <EmployeePageHeader
        eyebrow="WORK LOG"
        title="ประวัติการทำงาน"
        subtitle={session.user.name || "บันทึกเวลาเข้า-ออกงาน"}
      />

      <main className="mx-auto max-w-[470px] space-y-3 px-3 pb-8 pt-3">
        <section className="tt-paper-card tt-instrument-frame rounded-[20px] border-2 border-zinc-800/70 p-3 dark:border-white/25">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="tt-retro-control grid h-10 w-10 place-items-center rounded-xl border border-zinc-700/40 bg-[#f5ecdc] dark:bg-zinc-800"
              aria-label="รอบก่อนหน้า"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 text-center">
              <p className="font-mono text-[8px] font-black tracking-[0.18em] text-zinc-500">PAY PERIOD</p>
              <p className="mt-0.5 truncate text-[14px] font-black">{periodLabel}</p>
              {isFrontYard && <p className="mt-0.5 text-[9px] font-bold text-zinc-500">รอบเงินเดือนหน้าลาน 26–25</p>}
            </div>

            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="tt-retro-control grid h-10 w-10 place-items-center rounded-xl border border-zinc-700/40 bg-[#f5ecdc] dark:bg-zinc-800"
              aria-label="รอบถัดไป"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="tt-retro-enter overflow-hidden rounded-[20px] border-2 border-zinc-800/80 bg-zinc-950 text-white shadow-[0_4px_0_rgba(0,0,0,0.16)] dark:border-white/20">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="font-mono text-[9px] font-black tracking-[0.18em] text-[#fbbf24]">PERIOD SUMMARY</p>
              <p className="mt-0.5 text-[14px] font-black">ภาพรวมรอบนี้</p>
            </div>
            {summary.issueDays > 0 ? (
              <span className="flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-[9px] font-black text-amber-300">
                <AlertTriangle className="h-3 w-3" /> {summary.issueDays} วันควรตรวจ
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> ปกติ
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 divide-x divide-white/10">
            {[
              { label: "ทำงาน", value: summary.presentDays.toString(), suffix: "วัน" },
              { label: "ชั่วโมง", value: summary.totalHours.toFixed(1), suffix: "ชม." },
              { label: "มาสาย", value: summary.lateDays.toString(), suffix: "วัน" },
              { label: "ตรวจสอบ", value: summary.issueDays.toString(), suffix: "วัน" },
            ].map((item) => (
              <div key={item.label} className="px-1.5 py-3 text-center">
                <p className="font-mono text-[18px] font-black leading-none text-[#fbbf24]">{item.value}</p>
                <p className="mt-1 text-[8px] font-black text-zinc-400">{item.label}</p>
                <p className="text-[7px] font-bold text-zinc-600">{item.suffix}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between px-1 pt-1">
          <div>
            <p className="font-mono text-[9px] font-black tracking-[0.18em] text-zinc-500">TIME CARDS</p>
            <h2 className="text-[15px] font-black">บันทึกรายวัน</h2>
          </div>
          <span className="text-[10px] font-bold text-zinc-500">ล่าสุดก่อน</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-[#fbbf24]" />
          </div>
        ) : timeline.length === 0 ? (
          <section className="tt-paper-card rounded-[20px] border border-zinc-700/30 p-10 text-center dark:border-white/15">
            <CalendarDays className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-3 text-sm font-black">ยังไม่มีบันทึกในรอบนี้</p>
            <p className="mt-1 text-xs text-zinc-500">ข้อมูลกะและเวลาเข้า-ออกจะแสดงที่นี่</p>
          </section>
        ) : (
          <div className="space-y-2.5">
            {timeline.map((entry) => {
              const date = new Date(entry.date);
              const attendance = entry.attendance;
              const shift = entry.schedule?.shift;
              const isDayOff = entry.schedule?.isDayOff === true;
              const needsCorrection = !isDayOff && (
                (Boolean(shift) && !attendance?.checkInTime) ||
                Boolean(attendance?.checkInTime && !attendance?.checkOutTime)
              );

              return (
                <section
                  key={entry.key}
                  className="tt-retro-enter tt-paper-card tt-instrument-frame overflow-hidden rounded-[18px] border border-zinc-700/45 dark:border-white/15"
                >
                  <div className="flex items-center gap-3 border-b border-zinc-600/15 px-3.5 py-3 dark:border-white/10">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-zinc-700/30 bg-[#f2e6cf] text-center dark:bg-zinc-800">
                      <div>
                        <p className="text-[8px] font-black uppercase text-zinc-500">{formatThaiDate(date, "EEE")}</p>
                        <p className="text-[20px] font-black leading-none">{formatThaiDate(date, "d")}</p>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-black">{formatThaiDate(date, "d MMMM yyyy")}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-zinc-500">
                        {isDayOff
                          ? "วันหยุดตามตาราง"
                          : shift
                            ? `กะ ${shift.startTime}–${shift.endTime}${shift.name ? ` · ${shift.name}` : ""}`
                            : "ไม่มีข้อมูลกะในตาราง"}
                      </p>
                    </div>
                    <StatusPill entry={entry} />
                  </div>

                  {isDayOff ? (
                    <div className="flex items-center gap-2.5 px-4 py-4 text-[12px] font-black text-zinc-600 dark:text-zinc-300">
                      <CalendarOff className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      วันหยุดตามตาราง — ไม่ต้องลงเวลา
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-4">
                        <div>
                          <p className="font-mono text-[8px] font-black tracking-[0.14em] text-zinc-500">CLOCK IN</p>
                          <p className="mt-0.5 text-[21px] font-black tracking-[-0.04em]">
                            {attendance?.checkInTime ? formatTime(new Date(attendance.checkInTime)) : "--:--"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="h-px w-5 bg-zinc-400/60" />
                          <Clock3 className="h-4 w-4" />
                          <span className="h-px w-5 bg-zinc-400/60" />
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[8px] font-black tracking-[0.14em] text-zinc-500">CLOCK OUT</p>
                          <p className="mt-0.5 text-[21px] font-black tracking-[-0.04em]">
                            {attendance?.checkOutTime ? formatTime(new Date(attendance.checkOutTime)) : "--:--"}
                          </p>
                        </div>
                      </div>

                      {(attendance?.actualHours || (attendance?.lateMinutes || 0) > 0 || (attendance?.latePenaltyAmount || 0) > 0 || needsCorrection) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-zinc-600/25 px-4 py-2.5 text-[10px] font-bold dark:border-white/10">
                          {attendance?.actualHours ? (
                            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                              <TimerReset className="h-3.5 w-3.5" /> รวม {attendance.actualHours.toFixed(1)} ชม.
                            </span>
                          ) : null}
                          {(attendance?.lateMinutes || 0) > 0 && (
                            <span className="font-black text-amber-700 dark:text-amber-300">สาย {attendance?.lateMinutes} นาที</span>
                          )}
                          {(attendance?.latePenaltyAmount || 0) > 0 && (
                            <span className="font-black text-red-600 dark:text-red-300">ปรับ -฿{attendance?.latePenaltyAmount}</span>
                          )}
                          {needsCorrection && (
                            <Link
                              href={`/requests/time-correction?date=${entry.key}`}
                              className="ml-auto rounded-lg border border-zinc-700/30 bg-[#fbbf24] px-2.5 py-1.5 font-black text-black"
                            >
                              ขอแก้ไขเวลา
                            </Link>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
