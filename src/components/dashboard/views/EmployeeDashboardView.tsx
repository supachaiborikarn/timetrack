"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  subMonths,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
} from "date-fns";
import { th, enUS } from "date-fns/locale";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Fuel,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Megaphone,
  Moon,
  Pause,
  Play,
  Plus,
  Sun,
  Target,
  Trophy,
  Wallet,
  CalendarCheck,
} from "lucide-react";
import { useTheme } from "next-themes";

import { useAttendance } from "@/hooks/useAttendance";
import { MoodCheckOutDialog } from "@/components/engagement/MoodCheckOutDialog";
import { RightMenuDrawer } from "@/components/layout/RightMenuDrawer";
import { ClockInModal } from "@/components/layout/ClockInModal";

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: { name: string; nickName: string | null };
  _count: { comments: number };
  reads: { id: string }[];
}

interface AdvanceSummary {
  totalAmount: number;
  pendingAmount: number;
}

type CustomerEvaluationStatus = "NOT_YET" | "NEAR" | "DONE";

interface CalendarDay {
  date: string;
  checkedIn: boolean;
  checkedOut: boolean;
  isLate: boolean;
  status: string;
}

const LANG = {
  th: {
    welcome: "สวัสดี",
    shiftToday: "กะวันนี้",
    noShift: "วันนี้ไม่มีตารางกะ",
    checkedIn: "เข้างานแล้ว",
    checkedOut: "เลิกงานแล้ว",
    notCheckedIn: "ยังไม่ได้เข้างาน",
    workedFor: "ทำงานมาแล้ว",
    workComplete: "เสร็จงานวันนี้แล้ว",
    checkIn: "เข้างาน",
    takeBreak: "พัก",
    endBreak: "จบพัก",
    breakDone: "พักแล้ว",
    checkOut: "เลิกงาน",
    mission: "ภารกิจวันนี้",
    feedbackNotYet: "ยังไม่ครบเป้าวันนี้",
    feedbackNear: "ใกล้ครบเป้าแล้ว",
    feedbackDone: "ครบเป้าวันนี้แล้ว",
    monthSummary: "สรุปเดือนนี้",
    daysWorked: "วันทำงาน",
    lateIn: "มาสาย",
    leave: "ลา",
    permission: "ขออนุญาต",
    earlyOut: "ออกก่อน",
    score: "คะแนนผลงาน",
    breakUsed: "ใช้เวลาพักไปแล้ว",
    announcements: "ประกาศสำคัญ",
    noAnnouncement: "ไม่มีประกาศในขณะนี้",
    viewAll: "ดูทั้งหมด",
    quickActions: "เมนูด่วน",
    attCorrection: "ขอแก้ไขเวลา",
    attCorrectionSub: "แจ้งลืมกดเข้า-ออกงาน",
    advance: "เบิกค่าแรง",
    advanceSub: "ยอดที่ขอเบิก",
    calendar: "ปฏิทินเดือนนี้",
    monthLabel: (d: Date) => format(d, "MMMM yyyy", { locale: th }),
    weekDays: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
    flag: "🇹🇭",
    nextLangLabel: "EN",
  },
  en: {
    welcome: "Welcome",
    shiftToday: "Today’s shift",
    noShift: "No shift scheduled today",
    checkedIn: "Checked in",
    checkedOut: "Checked out",
    notCheckedIn: "Not checked in yet",
    workedFor: "Working for",
    workComplete: "Today’s work is complete",
    checkIn: "Check in",
    takeBreak: "Break",
    endBreak: "End break",
    breakDone: "Break taken",
    checkOut: "Check out",
    mission: "Today’s mission",
    feedbackNotYet: "Daily goal not reached",
    feedbackNear: "Almost at today’s goal",
    feedbackDone: "Today’s goal complete",
    monthSummary: "This month",
    daysWorked: "Days worked",
    lateIn: "Late",
    leave: "Leave",
    permission: "Permission",
    earlyOut: "Early out",
    score: "Performance",
    breakUsed: "Break used",
    announcements: "Announcements",
    noAnnouncement: "No announcements right now",
    viewAll: "View all",
    quickActions: "Quick actions",
    attCorrection: "Att. correction",
    attCorrectionSub: "Edit attendance time",
    advance: "Salary advance",
    advanceSub: "Requested amount",
    calendar: "Monthly calendar",
    monthLabel: (d: Date) => format(d, "MMMM yyyy", { locale: enUS }),
    weekDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    flag: "🇬🇧",
    nextLangLabel: "MY",
  },
  my: {
    welcome: "ကြိုဆိုပါတယ်",
    shiftToday: "ယနေ့ အလုပ်ချိန်",
    noShift: "ယနေ့ အလုပ်ချိန် မရှိပါ",
    checkedIn: "အလုပ်ဝင်ပြီး",
    checkedOut: "အလုပ်ဆင်းပြီး",
    notCheckedIn: "အလုပ်မဝင်ရသေး",
    workedFor: "အလုပ်လုပ်ပြီး",
    workComplete: "ယနေ့ အလုပ်ပြီးပါပြီ",
    checkIn: "အလုပ်ဝင်",
    takeBreak: "နားချိန်",
    endBreak: "နားချိန်ပြီး",
    breakDone: "နားပြီး",
    checkOut: "အလုပ်ဆင်း",
    mission: "ယနေ့ ရည်မှန်းချက်",
    feedbackNotYet: "ယနေ့ ရည်မှန်းချက် မပြည့်သေး",
    feedbackNear: "ရည်မှန်းချက် ပြည့်ရန် နီးပါပြီ",
    feedbackDone: "ယနေ့ ရည်မှန်းချက် ပြည့်ပါပြီ",
    monthSummary: "ယခုလ အကျဉ်းချုပ်",
    daysWorked: "အလုပ်ရက်",
    lateIn: "နောက်ကျ",
    leave: "ခွင့်",
    permission: "ခွင့်ပြုချက်",
    earlyOut: "စောထွက်",
    score: "စွမ်းဆောင်ရည်",
    breakUsed: "နားချိန် သုံးပြီး",
    announcements: "ကြေညာချက်",
    noAnnouncement: "ကြေညာချက်မရှိပါ",
    viewAll: "အားလုံးကြည့်",
    quickActions: "အမြန်မီနူး",
    attCorrection: "တက်ရောက်ပြင်ဆင်",
    attCorrectionSub: "အချိန်ပြင်ဆင်ရန်",
    advance: "လစာကြိုထုတ်",
    advanceSub: "ငွေပမာဏ",
    calendar: "လစဉ်ပြက္ခဒိန်",
    monthLabel: (d: Date) => format(d, "MMMM yyyy", { locale: enUS }),
    weekDays: ["တနင်္ဂ", "တနင်္လာ", "အင်္ဂါ", "ဗုဒ္ဓ", "ကြာ", "သောက", "စနေ"],
    flag: "🇲🇲",
    nextLangLabel: "TH",
  },
} as const;

type Lang = keyof typeof LANG;
const LANG_CYCLE: Lang[] = ["th", "en", "my"];

function parseClockMinutes(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getShiftProgress(startTime: string | undefined, endTime: string | undefined, now: Date) {
  const start = parseClockMinutes(startTime);
  const rawEnd = parseClockMinutes(endTime);
  if (start === null || rawEnd === null) return 0;

  let end = rawEnd;
  let current = now.getHours() * 60 + now.getMinutes();
  if (end <= start) {
    end += 24 * 60;
    if (current < start) current += 24 * 60;
  }

  return Math.max(0, Math.min(100, ((current - start) / (end - start)) * 100));
}

function formatBangkokClock(value?: string | null) {
  if (!value) return "--:--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(parsed);
}

function formatWorkedDuration(checkInTime: string | null | undefined, checkOutTime: string | null | undefined, now: Date) {
  if (!checkInTime) return "00:00";
  const start = new Date(checkInTime).getTime();
  const end = checkOutTime ? new Date(checkOutTime).getTime() : now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "00:00";
  const totalMinutes = Math.floor((end - start) / 60000);
  return `${Math.floor(totalMinutes / 60).toString().padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")}`;
}

function getPerformanceLabel(score: number) {
  if (score >= 90) return "EXCELLENT";
  if (score >= 70) return "GOOD";
  return "NEEDS ATTENTION";
}

export function EmployeeDashboardView() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const {
    currentTime,
    todayData,
    isLoading,
    isChecking,
    hasCheckedIn,
    hasCheckedOut,
    isOnBreak,
    hasTakenBreak,
    handleCheckIn,
    handleStartBreak,
    handleEndBreak,
  } = useAttendance(session?.user?.id);

  const [isMoodDialogOpen, setIsMoodDialogOpen] = useState(false);
  const [isSubmittingMood, setIsSubmittingMood] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [lang, setLang] = useState<Lang>("th");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [advanceSummary, setAdvanceSummary] = useState<AdvanceSummary>({ totalAmount: 0, pendingAmount: 0 });
  const [daysWorked, setDaysWorked] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [earlyOutCount, setEarlyOutCount] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);
  const [permissionCount, setPermissionCount] = useState(0);
  const [breakMinutesToday, setBreakMinutesToday] = useState(0);
  const [performanceScore, setPerformanceScore] = useState(100);
  const [displayPerformanceScore, setDisplayPerformanceScore] = useState(0);
  const [customerEvaluationStatus, setCustomerEvaluationStatus] = useState<CustomerEvaluationStatus | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const T = LANG[lang];
  const hasAdminAccess = ["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session?.user?.role || "");

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setDataLoading(true);
      const calYear = currentMonth.getFullYear();
      const calMonthIdx = currentMonth.getMonth();
      const res = await fetch(`/api/employee/dashboard?calYear=${calYear}&calMonth=${calMonthIdx}`);

      if (res.ok) {
        const data = await res.json();
        setDaysWorked(data.daysWorked ?? 0);
        setLateCount(data.lateCount ?? 0);
        setEarlyOutCount(data.earlyOutCount ?? 0);
        setLeaveCount(data.leaveCount ?? 0);
        setPermissionCount(data.permissionCount ?? 0);
        setBreakMinutesToday(data.breakMinutesToday ?? 0);
        setPerformanceScore(data.performanceScore ?? 100);
        setCustomerEvaluationStatus(data.customerEvaluationStatus ?? null);
        setAdvanceSummary(data.advanceSummary ?? { totalAmount: 0, pendingAmount: 0 });
        setAnnouncements(data.announcements ?? []);
        setCalendarDays(data.calendarDays ?? []);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setDataLoading(false);
    }
  }, [session?.user?.id, currentMonth]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("openModal") === "true") {
        const timer = setTimeout(() => {
          document.dispatchEvent(new CustomEvent("open-clock-modal"));
          window.history.replaceState({}, "", "/");
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (dataLoading) return;

    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayPerformanceScore(performanceScore);
      return;
    }

    const durationMs = 650;
    const startedAt = window.performance.now();
    let frameId = 0;

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPerformanceScore(Math.round(performanceScore * eased));
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [dataLoading, performanceScore]);

  const onCheckOutClick = () => {
    window.requestAnimationFrame(() => setIsMoodDialogOpen(true));
  };

  const logCheckOutMood = async (mood: string, note: string) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch("/api/engagement/happiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, note }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error("Failed to save checkout mood:", await response.text());
      }
    } catch (error) {
      console.error("Mood log request failed:", error);
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleMoodSubmit = async (mood: string, note: string) => {
    setIsSubmittingMood(true);
    try {
      await logCheckOutMood(mood, note);
    } catch (error) {
      console.error("Clock-out after mood submission failed:", error);
    } finally {
      setIsSubmittingMood(false);
      setIsMoodDialogOpen(false);
      router.push("/qr-scan?action=checkout");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4efe4] dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
      </div>
    );
  }

  if (!session) redirect("/login");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const getCalDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return calendarDays.find((item) => item.date.startsWith(dateStr));
  };

  const formatMoney = (amount: number) => new Intl.NumberFormat("th-TH").format(amount);
  const now = currentTime || new Date();
  const shiftProgress = getShiftProgress(todayData?.shift?.startTime, todayData?.shift?.endTime, now);
  const workedDuration = formatWorkedDuration(
    todayData?.attendance?.checkInTime,
    todayData?.attendance?.checkOutTime,
    now,
  );
  const missionLevel = customerEvaluationStatus === "DONE" ? 3 : customerEvaluationStatus === "NEAR" ? 2 : 1;
  const missionText = customerEvaluationStatus === "DONE"
    ? T.feedbackDone
    : customerEvaluationStatus === "NEAR"
      ? T.feedbackNear
      : T.feedbackNotYet;
  const unreadAnnouncements = announcements.filter((announcement) => (announcement.reads ?? []).length === 0).length;
  const firstAnnouncement = announcements[0];

  return (
    <div className="min-h-screen bg-[#f4efe4] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
      <header
        className="relative overflow-hidden bg-[#fbbf24] px-4 pt-5 pb-4 border-b border-black/15"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 20%, rgba(255,255,255,0.2) 0 1px, transparent 1.5px), radial-gradient(circle at 85% 70%, rgba(0,0,0,0.05) 0 1px, transparent 1.5px)",
          backgroundSize: "20px 20px, 24px 24px",
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[23px] font-black tracking-[-0.03em] text-black leading-tight truncate">
              {T.welcome}, {session.user.name?.split(" ")[0] || "User"}
            </h1>
            <p className="text-[12px] font-bold text-black/55 mt-1 truncate">
              {todayData?.user?.station || "Supachai Group"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const index = LANG_CYCLE.indexOf(lang);
                setLang(LANG_CYCLE[(index + 1) % LANG_CYCLE.length]);
              }}
              className="tt-retro-control h-9 min-w-11 px-2 rounded-full border border-black/25 bg-white/15 text-[10px] font-black text-black flex flex-col items-center justify-center leading-none"
              aria-label="เปลี่ยนภาษา"
            >
              <span className="text-base leading-none">{T.flag}</span>
              <span className="mt-0.5">{T.nextLangLabel}</span>
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="tt-retro-control h-9 w-9 rounded-full border border-black/25 bg-white/15 flex items-center justify-center"
              aria-label="สลับธีม"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-black" /> : <Moon className="w-4 h-4 text-black" />}
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="tt-retro-control h-9 w-9 rounded-full border border-black/25 bg-white/15 flex items-center justify-center"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3.5 pt-3 pb-8 space-y-2.5">
        <section className="tt-retro-enter tt-retro-panel relative overflow-hidden rounded-[24px] border border-black/20 dark:border-white/15 bg-[#fffaf0] dark:bg-zinc-900 shadow-[0_3px_0_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between border-b border-black/15 dark:border-white/10 bg-zinc-950 text-white px-4 py-2">
            <p className="font-mono text-[11px] tracking-[0.12em] font-bold">
              <span className="text-[#fbbf24]">TODAY</span> / {format(now, lang === "th" ? "d MMM" : "MMM d", { locale: lang === "th" ? th : enUS })}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-white/65 font-medium">
              <Clock3 className="w-3.5 h-3.5" />
              {format(now, "HH:mm")}
            </div>
          </div>

          <div className="p-4">
            <div className={todayData?.shift ? "grid grid-cols-[1fr_96px] gap-3 items-center" : "block"}>
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.16em] uppercase text-zinc-500 dark:text-zinc-400">
                  {T.shiftToday}
                </p>
                <h2 className="mt-1 text-[29px] font-black tracking-[-0.05em] leading-none">
                  {todayData?.shift ? todayData.shift.name : T.noShift}
                </h2>
                {todayData?.shift && (
                  <p className="mt-2 text-[20px] font-black tracking-[-0.03em] text-amber-500">
                    {todayData.shift.startTime} — {todayData.shift.endTime}
                  </p>
                )}

                {todayData?.shift && (
                  <div className="mt-3 pt-3 border-t border-dashed border-black/25 dark:border-white/20 space-y-2.5">
                    <div className={`flex items-center gap-2 text-[13px] font-black ${hasCheckedOut || hasCheckedIn ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                      {hasCheckedOut || hasCheckedIn ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Clock3 className="w-4 h-4 shrink-0" />}
                      <span>
                        {hasCheckedOut
                          ? `${T.checkedOut} ${formatBangkokClock(todayData?.attendance?.checkOutTime)}`
                          : hasCheckedIn
                            ? `${T.checkedIn} ${formatBangkokClock(todayData?.attendance?.checkInTime)}`
                            : T.notCheckedIn}
                      </span>
                    </div>
                    {hasCheckedIn && (
                      <div className="flex items-center gap-2 text-[12px] font-bold text-zinc-500 dark:text-zinc-400">
                        <Clock3 className="w-4 h-4 shrink-0" />
                        <span>{T.workedFor} <strong className="text-zinc-800 dark:text-zinc-200 font-black">{workedDuration}</strong> ชม.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {todayData?.shift && (
              <div className="flex justify-center">
                <div
                  className="relative w-[96px] h-[96px] rounded-full p-[7px] shadow-inner"
                  style={{
                    background: `conic-gradient(#fbbf24 ${shiftProgress * 3.6}deg, rgba(24,24,27,0.09) 0deg)`,
                  }}
                  aria-label={`ความคืบหน้ากะ ${Math.round(shiftProgress)} เปอร์เซ็นต์`}
                >
                  <span className="tt-retro-orbit pointer-events-none absolute -inset-1 rounded-full" aria-hidden="true">
                    <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full border border-black/20 bg-[#fbbf24] shadow-[0_0_0_3px_rgba(251,191,36,0.16)]" />
                  </span>
                  <div className="relative z-[1] w-full h-full rounded-full border border-black/15 dark:border-white/10 bg-[#fffaf0] dark:bg-zinc-900 flex flex-col items-center justify-center">
                    <Fuel className="w-7 h-7 text-zinc-800 dark:text-zinc-100" />
                    <span className="mt-1 font-mono text-[10px] font-bold text-zinc-500 dark:text-zinc-400">SHIFT</span>
                  </div>
                </div>
              </div>
              )}
            </div>

            {todayData?.shift && (
            <div className="mt-4">
              {hasCheckedOut ? (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 py-3 px-4 text-center text-[13px] font-black text-emerald-700 dark:text-emerald-400">
                  ✓ {T.workComplete}
                </div>
              ) : !hasCheckedIn ? (
                <button
                  onClick={() => void handleCheckIn()}
                  disabled={isChecking}
                  className="tt-retro-control w-full min-h-12 rounded-2xl border border-black bg-[#fbbf24] text-black font-black text-[15px] flex items-center justify-center gap-2 shadow-[0_3px_0_rgba(0,0,0,0.18)] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                >
                  {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  {T.checkIn}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => void (isOnBreak ? handleEndBreak() : handleStartBreak())}
                    disabled={isChecking || (hasTakenBreak && !isOnBreak)}
                    className="tt-retro-control min-h-12 rounded-2xl border border-black/30 dark:border-white/20 bg-white/70 dark:bg-white/5 font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-45 active:scale-[0.98]"
                  >
                    {isChecking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isOnBreak ? (
                      <Play className="w-5 h-5" />
                    ) : (
                      <Pause className="w-5 h-5" />
                    )}
                    {isOnBreak ? T.endBreak : hasTakenBreak ? T.breakDone : T.takeBreak}
                  </button>
                  <button
                    onClick={onCheckOutClick}
                    disabled={isChecking}
                    className="tt-retro-control min-h-12 rounded-2xl border border-black bg-[#fbbf24] text-black font-black text-[14px] flex items-center justify-center gap-2 shadow-[0_3px_0_rgba(0,0,0,0.18)] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                  >
                    <LogOut className="w-5 h-5" />
                    {T.checkOut}
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        </section>

        {customerEvaluationStatus && (
          <section className="tt-retro-enter tt-retro-delay-1 rounded-[22px] border border-black/15 dark:border-white/10 bg-[#fffaf0] dark:bg-zinc-900 px-3.5 py-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full border border-black/20 dark:border-white/15 bg-[#fbbf24]/20 flex items-center justify-center shrink-0 ${customerEvaluationStatus === "DONE" ? "tt-retro-pop" : ""}`}>
                <Target className="w-5 h-5 text-zinc-800 dark:text-zinc-100" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12px] font-black tracking-[0.08em] uppercase">{T.mission}</p>
                  <p className={`text-[12px] font-black text-right ${customerEvaluationStatus === "DONE" ? "text-emerald-600 dark:text-emerald-400" : customerEvaluationStatus === "NEAR" ? "text-amber-600 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-300"}`}>
                    {customerEvaluationStatus === "DONE" ? `✓ ${missionText}` : missionText}
                  </p>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-1.5" aria-label={missionText}>
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className={`tt-retro-meter h-2.5 rounded-sm ${index < missionLevel ? `tt-retro-meter-on ${customerEvaluationStatus === "DONE" ? "bg-emerald-500" : "bg-[#fbbf24]"}` : "bg-zinc-200 dark:bg-zinc-700"}`}
                      style={index < missionLevel ? { animationDelay: `${180 + index * 90}ms` } : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {session?.user?.role === "CASHIER" && (
          <Link
            href="/admin/attendance?manual=true"
            className="tt-retro-enter tt-retro-delay-2 tt-retro-control block rounded-[22px] border border-blue-300/60 bg-blue-600 text-white p-4 shadow-[0_2px_0_rgba(30,64,175,0.3)] active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[15px] font-black">เช็คอินแทน</p>
                  <p className="text-[10px] text-blue-100">ลงเวลาแทนพนักงานที่ไม่มีมือถือ</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
        )}

        <section className="tt-retro-enter tt-retro-delay-2 rounded-[22px] border border-black/15 dark:border-white/10 bg-[#fffaf0] dark:bg-zinc-900 p-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-2.5">
            <CalendarDays className="w-4.5 h-4.5 text-amber-500" />
            <h3 className="text-[13px] font-black">{T.monthSummary}</h3>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/55 dark:bg-white/[0.03] p-2 text-center">
              <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400">{T.daysWorked}</p>
              <p className="mt-1 text-[22px] font-black leading-none">{daysWorked}</p>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/55 dark:bg-white/[0.03] p-2 text-center">
              <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400">{T.lateIn}</p>
              <p className={`mt-1 text-[22px] font-black leading-none ${lateCount > 0 ? "text-red-500" : ""}`}>{lateCount}</p>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/55 dark:bg-white/[0.03] p-2 text-center">
              <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400">{T.leave}</p>
              <p className="mt-1 text-[22px] font-black leading-none">{leaveCount}</p>
              {permissionCount > 0 && <p className="mt-1 text-[8px] font-bold text-zinc-400">{T.permission} {permissionCount}</p>}
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/55 dark:bg-white/[0.03] p-2 text-center">
              <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400">{T.earlyOut}</p>
              <p className={`mt-1 text-[22px] font-black leading-none ${earlyOutCount > 0 ? "text-red-500" : ""}`}>{earlyOutCount}</p>
            </div>
          </div>
        </section>

        <section className="tt-retro-enter tt-retro-delay-3 rounded-[22px] border border-black/15 dark:border-white/10 bg-[#fffaf0] dark:bg-zinc-900 p-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#fbbf24] border border-black/15 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.08em] uppercase text-zinc-500 dark:text-zinc-400">{T.score}</p>
                <div className="flex items-baseline gap-2">
                  <span className="tt-retro-score text-[36px] leading-none font-black tracking-[-0.06em]">{displayPerformanceScore}</span>
                  <span className={`text-[10px] font-black ${performanceScore >= 90 ? "text-emerald-600 dark:text-emerald-400" : performanceScore >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
                    {getPerformanceLabel(performanceScore)}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-l border-black/10 dark:border-white/10 pl-4 text-right">
              <Coffee className="w-5 h-5 text-amber-500 ml-auto" />
              <p className="mt-1 text-[9px] font-bold text-zinc-400">{T.breakUsed}</p>
              <p className="text-[18px] font-black">{breakMinutesToday}<span className="text-[9px] font-bold text-zinc-400 ml-1">นาที</span></p>
            </div>
          </div>
        </section>

        <section className="tt-retro-enter tt-retro-delay-4 rounded-[24px] border border-black/15 dark:border-white/10 bg-[#fffaf0] dark:bg-zinc-900 overflow-hidden shadow-[0_2px_0_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <Megaphone className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="text-[13px] font-black truncate">{T.announcements}</h3>
              {unreadAnnouncements > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {unreadAnnouncements}
                </span>
              )}
            </div>
            <Link href="/announcements" className="text-[10px] font-black text-amber-600 dark:text-amber-400 shrink-0">
              {T.viewAll}
            </Link>
          </div>
          {dataLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
          ) : firstAnnouncement ? (
            <Link href={`/announcements/${firstAnnouncement.id}`} className="block px-4 py-4 active:bg-black/[0.03] dark:active:bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${(firstAnnouncement.reads ?? []).length === 0 ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black truncate">{firstAnnouncement.isPinned && "📌 "}{firstAnnouncement.title}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {firstAnnouncement.author.name} · {format(new Date(firstAnnouncement.createdAt), "d MMM", { locale: th })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
              </div>
            </Link>
          ) : (
            <p className="py-6 text-center text-[11px] font-bold text-zinc-400">{T.noAnnouncement}</p>
          )}
        </section>

        <section className="tt-retro-enter tt-retro-delay-5 space-y-2.5">
          <p className="px-1 text-[10px] font-black tracking-[0.12em] uppercase text-zinc-500 dark:text-zinc-400">{T.quickActions}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/requests/time-correction"
              className="tt-retro-control rounded-[22px] border border-black/15 dark:border-white/10 bg-[#fffaf0] dark:bg-zinc-900 p-4 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <CalendarCheck className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="mt-5 text-[12px] font-black">{T.attCorrection}</p>
              <p className="mt-0.5 text-[9px] font-bold text-zinc-400">{T.attCorrectionSub}</p>
            </Link>

            <Link
              href="/advances"
              className="tt-retro-control rounded-[22px] border border-black/15 dark:border-white/10 bg-[#fffaf0] dark:bg-zinc-900 p-4 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <Wallet className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="mt-5 text-[12px] font-black">{T.advance}</p>
              <p className="mt-0.5 text-[9px] font-bold text-zinc-400">฿{formatMoney(advanceSummary.totalAmount)} · {T.advanceSub}</p>
            </Link>
          </div>
        </section>

        <section className="tt-retro-enter tt-retro-delay-5 rounded-[22px] border border-black/15 dark:border-white/10 bg-[#fffaf0] dark:bg-zinc-900 p-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-500" />
              <p className="text-[12px] font-black">{T.calendar}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5" aria-label="เดือนก่อนหน้า">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-[12px] font-black min-w-[96px] text-center">{T.monthLabel(currentMonth)}</p>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5" aria-label="เดือนถัดไป">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {T.weekDays.map((day, index) => (
              <p key={day} className={`text-[9px] font-black text-center ${index === 0 ? "text-amber-500" : "text-zinc-400"}`}>{day}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2">
            {Array.from({ length: startDay }).map((_, index) => <div key={`empty-${index}`} />)}
            {days.map((day) => {
              const isCurrentDay = isToday(day);
              const calendarDay = getCalDay(day);
              const checkedIn = calendarDay?.checkedIn;
              const late = calendarDay?.isLate;
              const future = day > now;

              return (
                <div key={day.toISOString()} className="relative flex flex-col items-center pb-1.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-black border ${isCurrentDay ? "bg-[#fbbf24] border-black/20 text-black" : "border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/[0.02]"} ${future ? "text-zinc-300 dark:text-zinc-600" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {!future && (
                    <span className={`absolute bottom-0 w-1.5 h-1.5 rounded-full ${late ? "bg-red-500" : checkedIn ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-[20px] border border-red-200 dark:border-red-950/80 bg-red-50/70 dark:bg-red-950/20 py-3.5 flex items-center justify-center gap-2 text-[12px] font-black text-red-600 dark:text-red-400 active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4" />
          {lang === "th" ? "ออกจากระบบ" : lang === "my" ? "ထွက်မည်" : "Sign out"}
        </button>
      </main>

      <MoodCheckOutDialog
        isOpen={isMoodDialogOpen}
        onClose={() => setIsMoodDialogOpen(false)}
        onConfirm={handleMoodSubmit}
        isLoading={isSubmittingMood}
      />
      <RightMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        hasAdminAccess={hasAdminAccess}
      />
      <ClockInModal
        hasCheckedIn={hasCheckedIn}
        hasCheckedOut={hasCheckedOut}
        isOnBreak={isOnBreak}
        hasTakenBreak={hasTakenBreak}
        isChecking={isChecking}
        onCheckIn={handleCheckIn}
        onCheckOut={onCheckOutClick}
        onStartBreak={handleStartBreak}
        hasShift={!!todayData?.shift}
        shiftTime={todayData?.shift ? `${todayData.shift.startTime} - ${todayData.shift.endTime}` : undefined}
        checkInTime={todayData?.attendance?.checkInTime}
        checkOutTime={todayData?.attendance?.checkOutTime}
      />
    </div>
  );
}
