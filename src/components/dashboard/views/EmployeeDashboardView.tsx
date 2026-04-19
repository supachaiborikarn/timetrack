"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import {
  format, subMonths, addMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday,
} from "date-fns";
import { th, enUS } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MoodCheckOutDialog } from "@/components/engagement/MoodCheckOutDialog";
import { RightMenuDrawer } from "@/components/layout/RightMenuDrawer";
import { ClockInModal } from "@/components/layout/ClockInModal";
import {
  Menu, CalendarDays, Trophy, TrendingUp,
  Megaphone, CalendarCheck, Wallet,
  ChevronRight, ChevronLeft, Sun, Moon,
  BellRing, Globe, LogOut, Coffee, Plus,
} from "lucide-react";
import { useTheme } from "next-themes";

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface LeaveBalance {
  sickLeave: number; usedSick: number;
  annualLeave: number; usedAnnual: number;
  personalLeave: number; usedPersonal: number;
}

interface AdvanceSummary {
  totalAmount: number;
  pendingAmount: number;
}

interface CalendarDay {
  date: string;
  checkedIn: boolean;
  checkedOut: boolean;
  isLate: boolean;
  status: string;
}

// ─── Translation helper ───────────────────────────────────────────────────────
const LANG = {
  th: {
    welcome: "สวัสดี",
    daysWorked: "วันทำงาน",
    leave: "ลางาน",
    permission: "ขออนุญาต",
    lateIn: "มาสาย",
    earlyOut: "ออกก่อน",
    today: "วันนี้",
    rank: "อันดับของคุณ",
    score: "คะแนนผลงาน",
    announcements: "ประกาศสำคัญ",
    noAnnouncement: "ไม่มีประกาศในขณะนี้",
    attCorrection: "ขอแก้ไขเวลา",
    attCorrectionSub: "แจ้งลืมกดเข้า-ออกงาน",
    advance: "เบิกค่าแรง",
    advanceSub: "ยอดที่ขอเบิก",
    monthLabel: (d: Date) => format(d, "MMMM yyyy", { locale: th }),
    weekDays: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
    flag: "🇹🇭",
    nextLangLabel: "EN",
  },
  en: {
    welcome: "Welcome",
    daysWorked: "Days Worked",
    leave: "Leave",
    permission: "Permission",
    lateIn: "Late In",
    earlyOut: "Early Out",
    today: "Today",
    rank: "Current Rank",
    score: "Performance Score",
    announcements: "Announcements",
    noAnnouncement: "No announcements right now",
    attCorrection: "Att. Correction",
    attCorrectionSub: "Edit your attendance",
    advance: "Salary Advance",
    advanceSub: "Request amount",
    monthLabel: (d: Date) => format(d, "MMMM yyyy", { locale: enUS }),
    weekDays: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    flag: "🇬🇧",
    nextLangLabel: "MY",
  },
  my: {
    welcome: "ကြိုဆိုပါတယ်",
    daysWorked: "အလုပ်ရက်",
    leave: "ခွင့်",
    permission: "ခွင့်ပြုချက်",
    lateIn: "နောက်ကျ",
    earlyOut: "စောထွက်",
    today: "ယနေ့",
    rank: "အဆင့်",
    score: "စွမ်းဆောင်ရည်",
    announcements: "ကြေညာချက်",
    noAnnouncement: "ကြေညာချက်မရှိပါ",
    attCorrection: "တက်ရောက်ပြင်ဆင်",
    attCorrectionSub: "အချိန်ပြင်ဆင်ရန်",
    advance: "လစာကြိုထုတ်",
    advanceSub: "ငွေပမာဏ",
    monthLabel: (d: Date) => format(d, "MMMM yyyy", { locale: enUS }),
    weekDays: ["တနင်္ဂ","တနင်္လာ","အင်္ဂါ","ဗုဒ္ဓ","ကြာ","သောက","စနေ"],
    flag: "🇲🇲",
    nextLangLabel: "TH",
  },
} as const;

type Lang = keyof typeof LANG;
const LANG_CYCLE: Lang[] = ["th", "en", "my"];

// ─── Main Component ────────────────────────────────────────────────────────────
export function EmployeeDashboardView() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const {
    currentTime, todayData, isLoading, isChecking,
    hasCheckedIn, hasCheckedOut, isOnBreak, hasTakenBreak,
    handleCheckIn, handleCheckOut, handleStartBreak,
  } = useAttendance(session?.user?.id);

  const [isMoodDialogOpen, setIsMoodDialogOpen]   = useState(false);
  const [isSubmittingMood, setIsSubmittingMood]   = useState(false);
  const [isMenuOpen, setIsMenuOpen]               = useState(false);
  const [currentMonth, setCurrentMonth]           = useState(new Date());
  const [lang, setLang]                           = useState<Lang>("th");

  // API data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaveBalance, setLeaveBalance]   = useState<LeaveBalance | null>(null);
  const [advanceSummary, setAdvanceSummary] = useState<AdvanceSummary>({ totalAmount: 0, pendingAmount: 0 });
  const [daysWorked, setDaysWorked]       = useState(0);
  const [lateCount, setLateCount]         = useState(0);
  const [earlyOutCount, setEarlyOutCount] = useState(0);
  const [leaveCount, setLeaveCount]       = useState(0);
  const [permissionCount, setPermissionCount] = useState(0);
  const [breakMinutesToday, setBreakMinutesToday] = useState(0);
  const [performanceScore, setPerformanceScore] = useState(100);
  const [calendarDays, setCalendarDays]   = useState<CalendarDay[]>([]);
  const [dataLoading, setDataLoading]     = useState(true);

  const T = LANG[lang];

  const hasAdminAccess = ["ADMIN","HR","MANAGER","CASHIER"].includes(session?.user?.role || "");

  // ── Fetch data from consolidated API ────────────────────────────────────────
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
        setLeaveBalance(data.leaveBalance ?? null);
        setAdvanceSummary(data.advanceSummary ?? { totalAmount: 0, pendingAmount: 0 });
        setAnnouncements(data.announcements ?? []);
        setCalendarDays(data.calendarDays ?? []);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setDataLoading(false);
    }
  }, [session?.user?.id, currentMonth]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("openModal") === "true") {
        const t = setTimeout(() => {
          document.dispatchEvent(new CustomEvent("open-clock-modal"));
          window.history.replaceState({}, "", "/");
        }, 300);
        return () => clearTimeout(t);
      }
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const onCheckOutClick = () => {
    window.requestAnimationFrame(() => {
      setIsMoodDialogOpen(true);
    });
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

  const handleSkipMood = () => {
    setIsMoodDialogOpen(false);
    router.push("/qr-scan?action=checkout");
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
      </div>
    );
  }
  if (!session) { redirect("/login"); }

  // Calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay   = getDay(monthStart);

  const leaveCountDisplay = leaveCount;

  const formatMoney = (n: number) => new Intl.NumberFormat("th-TH").format(n);

  // Helper: find calendar day data for a given date
  const getCalDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return calendarDays.find(c => c.date.startsWith(dateStr));
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-zinc-900 pb-28 font-sans relative overflow-x-hidden">

      {/* ── 1. Yellow Header with SVG curve ── */}
      <div className="relative z-10">
        <div className="bg-[#fbbf24] pt-8 pb-6 px-5">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-black leading-tight">
                {T.welcome}, {session.user.name?.split(" ")[0] || "User"}
              </h1>
              <p className="text-[12px] font-medium text-black/60 mt-0.5">
                {todayData?.user?.station || "Supachai Group"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const i = LANG_CYCLE.indexOf(lang);
                  const next = LANG_CYCLE[(i + 1) % LANG_CYCLE.length];
                  setLang(next);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-black/10 rounded-xl text-black text-[11px] font-bold"
              >
                <span className="text-sm">{T.flag}</span>
                {T.nextLangLabel}
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 bg-black/10 rounded-xl"
              >
                {theme === "dark"
                  ? <Sun className="w-4 h-4 text-black" />
                  : <Moon className="w-4 h-4 text-black" />}
              </button>
              <button className="p-2 bg-black/10 rounded-xl" onClick={() => setIsMenuOpen(true)}>
                <Menu className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>

          {/* Stats row — #1 & #2 bigger numbers */}
          <div className="flex items-center justify-between px-2 pb-4">
            <div className="text-center w-[28%]">
              <p className="text-3xl font-black text-black leading-none">{leaveCountDisplay}</p>
              <p className="text-[10px] font-bold text-black/70 uppercase tracking-wider mt-1.5 mb-4">{T.leave}</p>
              <p className="text-3xl font-black text-black leading-none">{permissionCount}</p>
              <p className="text-[10px] font-bold text-black/70 uppercase tracking-wider mt-1.5">{T.permission}</p>
            </div>
            <div className="w-[36%]" />
            <div className="text-center w-[28%]">
              <p className="text-3xl font-black text-black leading-none">{lateCount}</p>
              <p className="text-[10px] font-bold text-black/70 uppercase tracking-wider mt-1.5 mb-4">{T.lateIn}</p>
              <p className="text-3xl font-black text-black leading-none">{earlyOutCount}</p>
              <p className="text-[10px] font-bold text-black/70 uppercase tracking-wider mt-1.5">{T.earlyOut}</p>
            </div>
          </div>
        </div>

        {/* #5 SVG concave curve — large visible downward bulge */}
        <svg viewBox="0 0 100 30" className="w-full block -mt-px" preserveAspectRatio="none" style={{ height: '60px' }}>
          <path d="M0,0 Q50,35 100,0 Z" fill="#fbbf24" />
        </svg>

        {/* #6 Curved yellow border stroke below */}
        <svg viewBox="0 0 100 18" className="w-full block -mt-1" preserveAspectRatio="none" style={{ height: '22px' }}>
          <path d="M0,2 Q50,20 100,2" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
        </svg>

        {/* #3 Floating circle — extra large & higher */}
        <div className="absolute left-1/2 bottom-[20px] -translate-x-1/2 z-20">
          <div className="w-[160px] h-[160px] rounded-full bg-[#fae075] shadow-[0_8px_32px_rgb(0,0,0,0.15)] flex flex-col items-center justify-center border-2 border-white/30">
            <div className="w-[140px] h-[140px] border-2 border-[#f3c740] rounded-full flex flex-col items-center justify-center">
              {dataLoading
                ? <Loader2 className="w-8 h-8 animate-spin text-black/50" />
                : <>
                    <p className="text-[44px] font-black text-black leading-none">{daysWorked}</p>
                    <p className="text-[11px] font-bold text-black/70 text-center leading-tight mt-1 px-2 uppercase">{T.daysWorked}</p>
                  </>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="px-4 pt-10 pb-10 space-y-3 relative z-10 w-full max-w-md mx-auto">

        {/* #4 Date bar — larger & tighter to header */}
        <div className="bg-white dark:bg-zinc-800 rounded-[24px] py-4 px-6 flex items-center justify-center gap-3 shadow-[0_2px_14px_rgb(0,0,0,0.06)] border border-gray-100 dark:border-zinc-700">
          <CalendarDays className="w-6 h-6 text-gray-500 dark:text-gray-400 shrink-0" />
          <p className="text-[17px] font-bold text-gray-700 dark:text-gray-200">
            {T.today}, {format(currentTime || new Date(), lang === "th" ? "d MMM - HH:mm น." : "MMM d - hh:mm a", { locale: lang === "th" ? th : enUS })}
          </p>
        </div>

        {/* CASHIER Extra Check-in Card */}
        {session?.user?.role === "CASHIER" && (
          <Link href="/admin/attendance?manual=true" className="block relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[24px] p-5 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform border border-blue-400/30">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner overflow-hidden relative">
                        <Plus className="w-6 h-6 text-white" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20 pointer-events-none" />
                    </div>
                    <div>
                        <p className="text-[18px] font-black text-white leading-tight mb-0.5 mt-0.5">เช็คอินแทน</p>
                        <p className="text-[11px] font-medium text-blue-100 opacity-90 leading-tight">
                            ลงเวลาแทนพนักงานที่ไม่มีมือถือ
                        </p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-4 h-4 text-white" />
                </div>
            </div>
          </Link>
        )}

        {/* Break Time & Score */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-zinc-800 rounded-[22px] p-3.5 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700 flex items-center gap-3 active:scale-[0.98] transition-transform">
            <Coffee className="w-7 h-7 text-[#facc15] shrink-0" />
            <div>
              <p className="text-[9px] border-b border-gray-100 dark:border-zinc-700 pb-0.5 font-bold text-gray-400 dark:text-gray-500 leading-tight">ใช้เวลาพักไปแล้ว</p>
              <p className="text-sm font-black text-amber-600 dark:text-amber-500 leading-tight mt-1">{breakMinutesToday} <span className="text-gray-400 text-[11px] font-normal">นาที</span></p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-[22px] p-3.5 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700 flex items-center gap-3 active:scale-[0.98] transition-transform">
            <TrendingUp className="w-7 h-7 text-[#facc15] shrink-0" />
            <div>
              <p className="text-[9px] border-b border-gray-100 dark:border-zinc-700 pb-0.5 font-bold text-gray-400 dark:text-gray-500 leading-tight">{T.score}</p>
              <p className={`text-sm font-black leading-tight mt-1 ${performanceScore >= 90 ? 'text-emerald-500' : performanceScore >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                {performanceScore} <span className="text-gray-400 text-[11px] font-normal">/ 100</span>
              </p>
            </div>
          </div>
        </div>

        {/* Announcements card */}
        <div className="bg-white dark:bg-zinc-800 rounded-[22px] shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#fbbf24]" />
              <h3 className="font-bold text-black dark:text-white text-[13px]">{T.announcements}</h3>
              {announcements.filter(a => (a.reads ?? []).length === 0).length > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {announcements.filter(a => (a.reads ?? []).length === 0).length}
                </span>
              )}
            </div>
            <Link href="/announcements" className="text-[11px] font-bold text-[#fbbf24]">ดูทั้งหมด</Link>
          </div>
          {dataLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : announcements.length === 0 ? (
            <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center py-5 pb-4">{T.noAnnouncement}</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-zinc-700">
              {announcements.slice(0, 3).map(ann => (
                <Link key={ann.id} href={`/announcements/${ann.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors active:scale-[0.99]">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${(ann.reads ?? []).length === 0 ? "bg-red-500" : "bg-gray-200 dark:bg-zinc-600"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] leading-snug truncate ${(ann.reads ?? []).length === 0 ? "font-bold text-black dark:text-white" : "font-medium text-gray-600 dark:text-gray-400"}`}>
                      {ann.isPinned && "📌 "}{ann.title}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {ann.author.name} · {format(new Date(ann.createdAt), "d MMM", { locale: th })}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Att. Correction & Advance cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Att. Correction */}
          <Link
            href="/requests/time-correction"
            className="bg-white dark:bg-zinc-800 rounded-[22px] p-4 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700 flex flex-col justify-between h-36 active:scale-[0.98] transition-transform"
          >
            <div className="flex justify-between items-start">
              <CalendarCheck className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <ChevronRight className="w-4 h-4 text-black dark:text-white" />
            </div>
            <div>
              <h3 className="font-bold text-black dark:text-white text-[13px]">{T.attCorrection}</h3>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">{T.attCorrectionSub}</p>
            </div>
          </Link>

          {/* Salary Advance */}
          <Link
            href="/advances"
            className="bg-white dark:bg-zinc-800 rounded-[22px] p-4 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700 flex flex-col justify-between h-36 active:scale-[0.98] transition-transform"
          >
            <div className="flex justify-between items-start">
              <Wallet className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <ChevronRight className="w-4 h-4 text-black dark:text-white" />
            </div>
            <div>
              <h3 className="font-bold text-black dark:text-white text-[13px]">{T.advance}</h3>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 pb-2 border-b border-gray-100 dark:border-zinc-700">
                {T.advanceSub}
              </p>
              {dataLoading ? (
                <div className="mt-2"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
              ) : (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-0.5">ยอดเบิก</p>
                    <p className="text-[11px] font-black text-black dark:text-white">฿{formatMoney(advanceSummary.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-0.5">รออนุมัติ</p>
                    <p className="text-[11px] font-black text-amber-500">฿{formatMoney(advanceSummary.pendingAmount)}</p>
                  </div>
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Monthly Calendar */}
        <div className="bg-white dark:bg-zinc-800 rounded-[26px] p-4 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-4 px-1">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1">
              <ChevronLeft className="w-5 h-5 text-[#fbbf24]" strokeWidth={3} />
            </button>
            <p className="text-[16px] font-black text-black dark:text-white tracking-tight">{T.monthLabel(currentMonth)}</p>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1">
              <ChevronRight className="w-5 h-5 text-[#fbbf24]" strokeWidth={3} />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-3">
            {T.weekDays.map((d, i) => (
              <p key={d} className={`text-[10px] font-bold text-center ${i === 0 ? "text-[#fbbf24]" : "text-gray-400 dark:text-gray-500"}`}>{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-3">
            {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map(day => {
              const isTd = isToday(day);
              const cd = getCalDay(day);
              const hasChecked = cd?.checkedIn;
              const isLate = cd?.isLate;
              const isFuture = day > new Date();
              return (
                <div key={day.toISOString()} className="flex flex-col items-center relative">
                  <span className={`text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full
                    ${isTd ? "bg-[#fbbf24] text-white" : hasChecked ? "text-gray-700 dark:text-gray-300" : isFuture ? "text-gray-300 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}`}>
                    {format(day, "d")}
                  </span>
                  {/* Dots based on real attendance data */}
                  {!isFuture && !isTd && (
                    <div className="absolute -bottom-1 flex gap-[2px]">
                      {hasChecked && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                      {isLate && <span className="w-1 h-1 rounded-full bg-red-400" />}
                      {!hasChecked && day.getDay() !== 0 && day.getDay() !== 6 && <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full bg-white dark:bg-zinc-800 rounded-[22px] py-4 px-5 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700 flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <span className="text-[14px] font-bold text-red-500">
            {lang === "th" ? "ออกจากระบบ" : lang === "my" ? "ထွက်မည်" : "Sign Out"}
          </span>
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
      />
    </div>
  );
}
