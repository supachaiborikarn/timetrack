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
  startOfWeek,
  addDays,
  isSameMonth,
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
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Megaphone,
  Moon,
  Play,
  Plus,
  Sun,
  Star,
  Trophy,
  UserRound,
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

interface PerformanceSummary {
  score: number | null;
  isProvisional: boolean;
  workPoints: number;
  workPointsMax: number;
  customerPoints: number | null;
  customerPointsMax: number;
  customerIncluded: boolean;
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
    dayOff: "วันหยุด",
    dayOffMessage: "วันนี้เป็นวันหยุดตามตาราง ไม่ต้องลงเวลา",
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
    scorePending: "รอข้อมูล",
    scoreProvisional: "ชั่วคราว",
    workScore: "เวลา",
    customerScore: "ลูกค้า",
    customerWaiting: "รอแบบประเมิน",
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
    dayOff: "Day off",
    dayOffMessage: "Today is your scheduled day off. No clock action required.",
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
    scorePending: "Waiting for data",
    scoreProvisional: "Provisional",
    workScore: "Attendance",
    customerScore: "Customer",
    customerWaiting: "Waiting for feedback",
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
    dayOff: "နားရက်",
    dayOffMessage: "ယနေ့သည် အလုပ်ပိတ်ရက်ဖြစ်၍ အလုပ်ချိန် မှတ်တမ်းတင်ရန် မလိုပါ",
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
    scorePending: "ဒေတာစောင့်နေသည်",
    scoreProvisional: "ယာယီ",
    workScore: "အလုပ်ချိန်",
    customerScore: "ဖောက်သည်",
    customerWaiting: "အကဲဖြတ်ချက် စောင့်နေသည်",
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

function getShiftProgress(startTime: string | null | undefined, endTime: string | null | undefined, now: Date) {
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

function RetroStationMark() {
  return (
    <svg viewBox="0 0 120 72" className="w-[82px] h-[50px]" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 30h88L88 20H34L16 30Z" fill="currentColor" fillOpacity="0.08" />
        <path d="M27 31v27M93 31v27M17 59h86" />
        <rect x="38" y="39" width="13" height="19" rx="2" />
        <rect x="69" y="39" width="13" height="19" rx="2" />
        <path d="M51 43h6v13M82 43h6v13" />
        <circle cx="60" cy="22" r="9" fill="#fbbe18" />
        <path d="m60 16 1.8 3.8 4.2.5-3.1 2.9.8 4.2-3.7-2-3.7 2 .8-4.2-3.1-2.9 4.2-.5L60 16Z" fill="currentColor" strokeWidth="1.2" />
      </g>
    </svg>
  );
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
  const [performanceScore, setPerformanceScore] = useState<number | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
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
        setPerformanceScore(data.performanceScore ?? null);
        setPerformanceSummary(data.performance ?? null);
        setCustomerEvaluationStatus(data.customerEvaluationStatus ?? null);
        setAdvanceSummary(data.advanceSummary ?? { totalAmount: 0, pendingAmount: 0 });
        setAnnouncements(data.announcements ?? []);
        setCalendarDays(data.calendarDays ?? []);
      } else {
        setPerformanceScore(null);
        setPerformanceSummary(null);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setPerformanceScore(null);
      setPerformanceSummary(null);
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
    if (performanceScore === null) {
      setDisplayPerformanceScore(0);
      return;
    }

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

  const getCalDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return calendarDays.find((item) => item.date.startsWith(dateStr));
  };

  const formatMoney = (amount: number) => new Intl.NumberFormat("th-TH").format(amount);
  const now = currentTime || new Date();
  const todayShift = todayData?.shift ?? null;
  const isDayOff = todayShift?.isDayOff === true;
  const workShift = todayShift && !isDayOff ? todayShift : null;
  const shiftProgress = getShiftProgress(workShift?.startTime, workShift?.endTime, now);
  const workedDuration = formatWorkedDuration(
    todayData?.attendance?.checkInTime,
    todayData?.attendance?.checkOutTime,
    now,
  );
  const missionText = customerEvaluationStatus === "DONE"
    ? T.feedbackDone
    : customerEvaluationStatus === "NEAR"
      ? T.feedbackNear
      : T.feedbackNotYet;
  const unreadAnnouncements = announcements.filter((announcement) => (announcement.reads ?? []).length === 0).length;
  const firstAnnouncement = announcements[0];
  const calendarAnchor = isSameMonth(currentMonth, now) ? now : startOfMonth(currentMonth);
  const compactWeekStart = startOfWeek(calendarAnchor, { weekStartsOn: 0 });
  const compactCalendarDays = Array.from({ length: 7 }, (_, index) => addDays(compactWeekStart, index));
  const missionLitSegments = customerEvaluationStatus === "DONE" ? 16 : customerEvaluationStatus === "NEAR" ? 12 : 6;

  return (
    <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
      <header className="tt-yellow-paper relative overflow-hidden px-4 pt-5 pb-5 border-b border-black/20">
        <div className="max-w-[470px] mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-black tracking-[-0.045em] text-black leading-tight truncate">
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
              className="tt-retro-control h-12 min-w-12 px-2 rounded-full border-[1.5px] border-black/70 bg-[#ffc62c]/70 text-[10px] font-black text-black flex flex-col items-center justify-center leading-none shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)]"
              aria-label="เปลี่ยนภาษา"
            >
              <span className="text-base leading-none">{T.flag}</span>
              <span className="mt-0.5">{T.nextLangLabel}</span>
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="tt-retro-control h-12 w-12 rounded-full border-[1.5px] border-black/70 bg-[#ffc62c]/70 flex items-center justify-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)]"
              aria-label="สลับธีม"
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-black" /> : <Moon className="w-5 h-5 text-black" />}
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="tt-retro-control h-12 w-12 rounded-full border-[1.5px] border-black/70 bg-[#ffc62c]/70 flex items-center justify-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)]"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-6 h-6 text-black" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[470px] mx-auto px-3 pt-3 pb-8 space-y-2.5">
        <section className="tt-retro-enter tt-retro-panel tt-paper-card tt-instrument-frame relative overflow-hidden rounded-[20px] border-2 border-zinc-800/75 dark:border-white/25">
          <div className="relative h-11">
            <div className="tt-today-tab absolute left-0 top-0 h-11 min-w-[190px] bg-zinc-950 px-5 flex items-center text-white">
              <p className="font-mono text-[13px] tracking-[0.1em] font-black">
                <span className="text-[#fbbf24]">TODAY</span> / {format(now, lang === "th" ? "d MMM" : "MMM d", { locale: lang === "th" ? th : enUS })}
              </p>
            </div>
            <span className="absolute right-[28%] top-2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-zinc-700/80" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_148px] gap-2 items-center px-4 pt-1 pb-3">
            <div className="min-w-0 py-2">
              <p className="text-[10px] font-black tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                {isDayOff ? T.dayOff : workShift ? workShift.name : T.shiftToday}
              </p>
              <h2 className={`mt-1 font-black tracking-[-0.055em] leading-[1.02] ${isDayOff || workShift ? "text-[34px]" : "text-[27px]"}`}>
                {isDayOff ? T.dayOff : workShift ? T.shiftToday : T.noShift}
              </h2>

              {workShift && (
                <p className="mt-3 whitespace-nowrap text-[24px] font-black tracking-[-0.035em] text-[#efa800]">
                  {workShift.startTime} — {workShift.endTime}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-dashed border-zinc-600/50 space-y-2.5">
                {isDayOff ? (
                  <div className="flex items-center gap-2 text-[12px] font-black text-emerald-700 dark:text-emerald-400">
                    <CalendarCheck className="w-5 h-5 shrink-0" />
                    <span>{T.dayOffMessage}</span>
                  </div>
                ) : workShift ? (
                  <>
                    <div className={`flex items-center gap-2 text-[13px] font-black ${hasCheckedOut || hasCheckedIn ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-300"}`}>
                      {hasCheckedOut || hasCheckedIn ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <Clock3 className="w-5 h-5 shrink-0" />}
                      <span>
                        {hasCheckedOut
                          ? `${T.checkedOut} ${formatBangkokClock(todayData?.attendance?.checkOutTime)}`
                          : hasCheckedIn
                            ? `${T.checkedIn} ${formatBangkokClock(todayData?.attendance?.checkInTime)}`
                            : T.notCheckedIn}
                      </span>
                    </div>
                    {hasCheckedIn && (
                      <div className="flex items-center gap-2 text-[12px] font-bold text-zinc-600 dark:text-zinc-300">
                        <Clock3 className="w-5 h-5 shrink-0" />
                        <span>{T.workedFor} <strong className="font-black text-zinc-900 dark:text-white">{workedDuration}</strong> ชม.</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-[12px] font-bold text-zinc-500 dark:text-zinc-400">
                    <Clock3 className="w-5 h-5 shrink-0" />
                    <span>{lang === "th" ? "วันนี้ไม่ต้องลงเวลาตามกะ" : lang === "my" ? "ယနေ့ အလုပ်ချိန် မရှိပါ" : "No clock action required today"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <div
                className={`tt-shift-dial relative w-[148px] h-[148px] rounded-full ${workShift ? "" : "opacity-65"}`}
                style={{
                  background: `conic-gradient(from -130deg, #fbbf24 0deg ${Math.max(workShift ? 8 : 0, shiftProgress * 2.6)}deg, rgba(39,39,42,0.10) ${Math.max(workShift ? 8 : 0, shiftProgress * 2.6)}deg 260deg, transparent 260deg 360deg)`,
                }}
                aria-label={isDayOff ? T.dayOff : workShift ? `ความคืบหน้ากะ ${Math.round(shiftProgress)} เปอร์เซ็นต์` : T.noShift}
              >
                <div className="tt-shift-dial-ticks absolute inset-[7px] rounded-full" aria-hidden="true" />
                <div className="absolute inset-[17px] rounded-full border border-zinc-700/35 bg-[#f7f0e2] dark:bg-zinc-900 shadow-[inset_0_0_14px_rgba(0,0,0,0.08)] flex items-center justify-center text-zinc-700 dark:text-zinc-200">
                  <RetroStationMark />
                </div>
                <span
                  className="tt-shift-needle absolute left-1/2 bottom-1/2 h-[52px] w-[2px] bg-zinc-800/80 origin-bottom rounded-full"
                  style={{ transform: `translateX(-50%) rotate(${-130 + shiftProgress * 2.6}deg)` }}
                  aria-hidden="true"
                >
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-zinc-800" />
                </span>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#fbbf24] border-2 border-zinc-700 z-[3]" aria-hidden="true" />
              </div>
            </div>
          </div>

          {workShift && (
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              {hasCheckedOut ? (
                <div className="col-span-2 rounded-xl border border-emerald-700/30 bg-emerald-50/70 dark:bg-emerald-950/30 py-3 text-center text-[13px] font-black text-emerald-700 dark:text-emerald-400">
                  ✓ {T.workComplete}
                </div>
              ) : !hasCheckedIn ? (
                <button
                  onClick={() => void handleCheckIn()}
                  disabled={isChecking}
                  className="tt-retro-control col-span-2 min-h-12 rounded-xl border-[1.5px] border-zinc-800 bg-[#fbbf24] text-black font-black text-[15px] flex items-center justify-center gap-2 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.28),0_3px_0_rgba(0,0,0,0.18)] disabled:opacity-60"
                >
                  {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  {T.checkIn}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => void (isOnBreak ? handleEndBreak() : handleStartBreak())}
                    disabled={isChecking || (hasTakenBreak && !isOnBreak)}
                    className="tt-retro-control min-h-12 rounded-xl border-[1.5px] border-zinc-700/75 bg-[#faf4e8] dark:bg-zinc-800 font-black text-[14px] flex items-center justify-center gap-2 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.32),0_2px_0_rgba(0,0,0,0.12)] disabled:opacity-45"
                  >
                    {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : isOnBreak ? <Play className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
                    {isOnBreak ? T.endBreak : hasTakenBreak ? T.breakDone : T.takeBreak}
                  </button>
                  <button
                    onClick={onCheckOutClick}
                    disabled={isChecking}
                    className="tt-retro-control min-h-12 rounded-xl border-[1.5px] border-zinc-800 bg-[#fbbf24] text-black font-black text-[14px] flex items-center justify-center gap-2 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.28),0_3px_0_rgba(0,0,0,0.18)] disabled:opacity-60"
                  >
                    <LogOut className="w-5 h-5" />
                    {T.checkOut}
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {customerEvaluationStatus && !isDayOff && (
          <section className="tt-retro-enter tt-retro-delay-1 tt-paper-card rounded-[18px] border border-zinc-700/35 dark:border-white/15 px-3.5 py-3 shadow-[0_2px_0_rgba(0,0,0,0.08)]">
            <div className="grid grid-cols-[52px_1px_1fr] gap-3 items-center">
              <div className={`w-12 h-12 rounded-full border-2 border-zinc-600/70 bg-[#f6ead1] dark:bg-zinc-800 flex items-center justify-center shadow-[inset_0_0_0_3px_rgba(255,255,255,0.5)] ${customerEvaluationStatus === "DONE" ? "tt-retro-pop" : ""}`}>
                <Star className="w-7 h-7 fill-[#fbbf24] text-zinc-700 dark:text-zinc-200" />
              </div>
              <div className="h-12 bg-zinc-500/35" />
              <div className="min-w-0">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black tracking-[-0.01em]">{T.mission}</p>
                    <p className="mt-0.5 text-[8px] tracking-[0.18em] text-zinc-500 dark:text-zinc-400">━━━━ ★★★</p>
                  </div>
                  <p className={`text-[12px] font-black text-right leading-tight ${customerEvaluationStatus === "DONE" ? "text-emerald-600 dark:text-emerald-400" : customerEvaluationStatus === "NEAR" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-300"}`}>
                    {customerEvaluationStatus === "DONE" ? `✓ ${missionText}` : missionText}
                  </p>
                </div>
                <div className="mt-2 flex gap-[3px]" aria-label={missionText}>
                  {Array.from({ length: 16 }, (_, index) => (
                    <span
                      key={index}
                      className={`tt-mission-segment h-2.5 min-w-0 flex-1 rounded-[2px] ${index < missionLitSegments ? `tt-retro-meter-on ${customerEvaluationStatus === "NOT_YET" ? "bg-[#fbbf24]" : "bg-emerald-500"}` : "bg-zinc-300 dark:bg-zinc-700"}`}
                      style={index < missionLitSegments ? { animationDelay: `${100 + index * 28}ms` } : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {customerEvaluationStatus && (
          <Link
            href="/league"
            className="tt-retro-enter tt-retro-delay-2 tt-retro-control flex items-center gap-3 rounded-[18px] border border-zinc-700/35 dark:border-white/15 bg-zinc-950 px-3.5 py-3 text-white shadow-[0_3px_0_rgba(0,0,0,0.16)] active:translate-y-[1px]"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-300/70 bg-[#fbbf24] text-zinc-950">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black tracking-[0.18em] text-amber-300">WEEKLY STATION LEAGUE</p>
              <p className="text-[13px] font-black">แข่งคะแนน · ลุ้นแชมป์ · เลือกรางวัล</p>
              <p className="mt-0.5 text-[9px] text-zinc-400">การประเมินซ้ำไม่เพิ่มแต้ม และมี Fair Play ก่อนประกาศผล</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-amber-300" />
          </Link>
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

        <section className="tt-retro-enter tt-retro-delay-2 tt-paper-card rounded-[18px] border border-zinc-700/30 dark:border-white/15 p-3 shadow-[0_2px_0_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2.5">
            <CalendarDays className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
            <h3 className="text-[13px] font-black">{T.monthSummary}</h3>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <div className="tt-stat-tile rounded-[12px] border border-zinc-600/25 bg-white/35 dark:bg-white/[0.03] px-1.5 py-2 text-center">
              <CalendarDays className="mx-auto w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <p className="mt-1 text-[8px] font-bold text-zinc-500 dark:text-zinc-400">{T.daysWorked}</p>
              <p className="mt-0.5 text-[23px] font-black leading-none">{daysWorked}</p>
            </div>
            <div className="tt-stat-tile rounded-[12px] border border-zinc-600/25 bg-white/35 dark:bg-white/[0.03] px-1.5 py-2 text-center">
              <Clock3 className={`mx-auto w-4 h-4 ${lateCount > 0 ? "text-red-600" : "text-zinc-600 dark:text-zinc-300"}`} />
              <p className="mt-1 text-[8px] font-bold text-zinc-500 dark:text-zinc-400">{T.lateIn}</p>
              <p className={`mt-0.5 text-[23px] font-black leading-none ${lateCount > 0 ? "text-red-600" : ""}`}>{lateCount}</p>
            </div>
            <div className="tt-stat-tile rounded-[12px] border border-zinc-600/25 bg-white/35 dark:bg-white/[0.03] px-1.5 py-2 text-center">
              <UserRound className="mx-auto w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <p className="mt-1 text-[8px] font-bold text-zinc-500 dark:text-zinc-400">{T.leave}</p>
              <p className="mt-0.5 text-[23px] font-black leading-none">{leaveCount}</p>
              {permissionCount > 0 && <p className="mt-0.5 text-[7px] font-bold text-zinc-400">{T.permission} {permissionCount}</p>}
            </div>
            <div className="tt-stat-tile rounded-[12px] border border-zinc-600/25 bg-white/35 dark:bg-white/[0.03] px-1.5 py-2 text-center">
              <LogOut className={`mx-auto w-4 h-4 ${earlyOutCount > 0 ? "text-red-600" : "text-zinc-600 dark:text-zinc-300"}`} />
              <p className="mt-1 text-[8px] font-bold text-zinc-500 dark:text-zinc-400">{T.earlyOut}</p>
              <p className={`mt-0.5 text-[23px] font-black leading-none ${earlyOutCount > 0 ? "text-red-600" : ""}`}>{earlyOutCount}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          <section className="tt-retro-enter tt-retro-delay-3 tt-paper-card rounded-[18px] border border-zinc-700/30 dark:border-white/15 p-3 shadow-[0_2px_0_rgba(0,0,0,0.08)] min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-full bg-[#fbbf24] border border-zinc-700/50 flex items-center justify-center shrink-0 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.32)]">
                <Trophy className="w-6 h-6 text-zinc-900" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-zinc-500 dark:text-zinc-400">{T.score}</p>
                <span className="tt-retro-score block text-[39px] leading-[0.88] font-black tracking-[-0.07em]">
                  {performanceScore === null ? "—" : displayPerformanceScore}
                </span>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-600/25 pt-2 min-w-0">
              <p className={`text-[9px] font-black truncate ${performanceScore === null ? "text-zinc-400" : performanceScore >= 90 ? "text-emerald-600" : performanceScore >= 70 ? "text-amber-600" : "text-red-600"}`}>
                {performanceScore === null
                  ? T.scorePending
                  : performanceSummary?.isProvisional
                    ? `${T.scoreProvisional} ★`
                    : `${getPerformanceLabel(performanceScore)} ★`}
              </p>
              {performanceSummary ? (
                <p className="mt-0.5 text-[7.5px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                  {T.workScore} {performanceSummary.workPoints}/{performanceSummary.workPointsMax}
                  {performanceSummary.customerIncluded && performanceSummary.customerPoints !== null
                    ? ` · ${T.customerScore} ${performanceSummary.customerPoints}/${performanceSummary.customerPointsMax}`
                    : performanceSummary.isProvisional
                      ? ` · ${T.customerWaiting}`
                      : ""}
                </p>
              ) : (
                <p className="mt-0.5 text-[7.5px] font-bold text-zinc-400 truncate">{T.breakUsed} {breakMinutesToday} นาที</p>
              )}
            </div>
          </section>

          <section className="tt-retro-enter tt-retro-delay-4 tt-paper-card rounded-[18px] border border-zinc-700/30 dark:border-white/15 overflow-hidden shadow-[0_2px_0_rgba(0,0,0,0.08)] min-w-0">
            <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b border-zinc-600/25">
              <div className="flex items-center gap-1.5 min-w-0">
                <Megaphone className="w-4 h-4 text-zinc-700 dark:text-zinc-200 shrink-0" />
                <p className="text-[10px] font-black truncate">{T.announcements}</p>
                {unreadAnnouncements > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
              </div>
              <Link href="/announcements" className="text-[8px] font-black text-[#d89500] shrink-0">{T.viewAll}</Link>
            </div>
            {dataLoading ? (
              <div className="h-[72px] flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-zinc-400" /></div>
            ) : firstAnnouncement ? (
              <Link href={`/announcements/${firstAnnouncement.id}`} className="block px-3 py-3 active:bg-black/[0.03]">
                <p className="text-[10px] font-black leading-snug line-clamp-2">{firstAnnouncement.isPinned && "📌 "}{firstAnnouncement.title}</p>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <p className="text-[8px] text-zinc-500 dark:text-zinc-400 truncate">{format(new Date(firstAnnouncement.createdAt), "d MMM", { locale: th })}</p>
                  <ChevronRight className="w-4 h-4 shrink-0 text-zinc-600" />
                </div>
              </Link>
            ) : (
              <div className="h-[72px] px-3 flex items-center justify-center text-center">
                <p className="text-[9px] font-bold text-zinc-400">{T.noAnnouncement}</p>
              </div>
            )}
          </section>
        </div>

        <section className="tt-retro-enter tt-retro-delay-5 tt-paper-card rounded-[18px] border border-zinc-700/30 dark:border-white/15 p-3 shadow-[0_2px_0_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
              <p className="text-[12px] font-black">{lang === "th" ? "ปฏิทินเดือนนี้" : T.calendar}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="tt-retro-control p-1 rounded-full" aria-label="เดือนก่อนหน้า">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-[11px] font-black min-w-[82px] text-center">{T.monthLabel(currentMonth)}</p>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="tt-retro-control p-1 rounded-full" aria-label="เดือนถัดไป">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {compactCalendarDays.map((day, index) => {
              const isCurrentDay = isToday(day);
              const calendarDay = getCalDay(day);
              const checkedIn = calendarDay?.checkedIn;
              const late = calendarDay?.isLate;
              const future = day > now;

              return (
                <div key={day.toISOString()} className="min-w-0 text-center">
                  <p className={`mb-1 text-[8px] font-black ${index === 0 ? "text-zinc-500" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {T.weekDays[index]}
                  </p>
                  <div className={`tt-calendar-tile relative h-12 rounded-[10px] border flex flex-col items-center justify-center ${isCurrentDay ? "bg-[#f6cf5a] border-zinc-700/60 text-black shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]" : "border-zinc-600/20 bg-white/30 dark:bg-white/[0.03]"} ${future ? "text-zinc-300 dark:text-zinc-600" : ""}`}>
                    <span className="text-[16px] font-black leading-none">{format(day, "d")}</span>
                    {!future && (
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full ${late ? "bg-red-500" : checkedIn ? "bg-emerald-500" : "bg-zinc-400"}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2.5">
          <p className="px-1 text-[9px] font-black tracking-[0.12em] uppercase text-zinc-500 dark:text-zinc-400">{T.quickActions}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/requests/time-correction"
              className="tt-retro-control tt-paper-card rounded-[16px] border border-zinc-700/25 dark:border-white/10 p-3 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <CalendarCheck className="w-4.5 h-4.5 text-zinc-700 dark:text-zinc-200" />
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="mt-3 text-[11px] font-black">{T.attCorrection}</p>
              <p className="mt-0.5 text-[8px] font-bold text-zinc-400">{T.attCorrectionSub}</p>
            </Link>

            <Link
              href="/advances"
              className="tt-retro-control tt-paper-card rounded-[16px] border border-zinc-700/25 dark:border-white/10 p-3 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <Wallet className="w-4.5 h-4.5 text-zinc-700 dark:text-zinc-200" />
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="mt-3 text-[11px] font-black">{T.advance}</p>
              <p className="mt-0.5 text-[8px] font-bold text-zinc-400">฿{formatMoney(advanceSummary.totalAmount)} · {T.advanceSub}</p>
            </Link>
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
        hasShift={!!workShift}
        shiftTime={workShift?.startTime && workShift.endTime ? `${workShift.startTime} - ${workShift.endTime}` : undefined}
        checkInTime={todayData?.attendance?.checkInTime}
        checkOutTime={todayData?.attendance?.checkOutTime}
      />
    </div>
  );
}
