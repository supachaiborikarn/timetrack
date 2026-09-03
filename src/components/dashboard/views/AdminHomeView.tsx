"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
    AlertTriangle,
    ArrowRight,
    Banknote,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Coffee,
    Gift,
    Loader2,
    Menu,
    Megaphone,
    MessageSquareHeart,
    Phone,
    Plus,
    RefreshCw,
    ShieldAlert,
    Shuffle,
    Trophy,
    UserCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AttendanceCalendar } from "@/components/dashboard";
import { RightMenuDrawer } from "@/components/layout/RightMenuDrawer";
import { ClockInModal } from "@/components/layout/ClockInModal";
import { MoodCheckOutDialog } from "@/components/engagement/MoodCheckOutDialog";
import { useAttendance } from "@/hooks/useAttendance";

interface AbsentEmployee {
    id: string;
    name: string;
    nickName: string | null;
    phone: string | null;
    photoUrl: string | null;
    department: string;
    station: string;
    shiftName: string;
    shiftTime: string;
    leaveStatus: string | null;
    leaveType: string | null;
    overlaps: string[];
}

interface PresentEmployee {
    id: string;
    name: string;
    nickName: string | null;
    station: string;
    checkedOut: boolean;
}

interface LateEmployee {
    id: string;
    name: string;
    nickName: string | null;
    station: string;
    lateMinutes: number;
    checkInTime: string | null;
}

interface OverBreakEmployee {
    id: string;
    name: string;
    nickName: string | null;
    station: string;
    durationMinutes: number;
    allowedMinutes: number;
    overMinutes: number;
}

interface DashboardStats {
    totalEmployees: number;
    todayAttendance: number;
    todayExpected: number;
    todayNotArrived: number;
    todayAbsent: number;
    todayOnLeave: number;
    attendanceRate: number;
    lateToday: number;
    workingNow: number;
    checkedOutToday: number;
    onBreak: number;
    overBreak: number;
    checkoutOverdue: number;
    pendingApprovals: number;
    pendingShiftSwaps: number;
    pendingTimeCorrections: number;
    pendingLeaves: number;
    pendingAdvances: number;
    openShifts: number;
    leaguePendingReviews: number;
    rewardsToFulfill: number;
    customerOpenCases: number;
    customerReviewRequests: number;
    needsAttention: number;
    absentEmployees: AbsentEmployee[];
    presentEmployees: PresentEmployee[];
    lateEmployees: LateEmployee[];
    overBreakEmployees: OverBreakEmployee[];
}

type ActionItem = {
    id: string;
    tone: "critical" | "warning" | "info" | "success";
    category: string;
    title: string;
    detail: string;
    count: number;
    href: string;
};

interface DashboardData {
    role: string;
    scope: { station: { id: string; code: string; name: string } | null; label: string };
    stats: DashboardStats;
    actionItems: ActionItem[];
    fuelCashierTeamFeedback?: {
        dailyTarget: number;
        rollingWorkdayTarget: number;
        teamMetTargetCount: number;
        teamNeedsMoreCount: number;
        teamFollowUpCount: number;
        teamNeedsExplanationCount: number;
        employees: Array<{
            userId: string;
            label: string;
            todayEvaluationCount: number;
            remainingToday: number;
            dailyStatus: "NOT_YET" | "NEAR" | "DONE";
            rollingWorkdayCount: number;
            rollingEvaluationCount: number;
            rollingTargetCount: number;
            cooperationRate: number | null;
            cooperationStatus: "BUILDING" | "NORMAL" | "FOLLOW_UP" | "EXPLAIN";
            leagueRank: number | null;
            leagueScore: number | null;
            leagueNeedsReview: boolean;
        }>;
    } | null;
    monthlyAttendance: Array<{ date: string; onTime: number; late: number; absent: number }>;
}

interface AnnouncementItem {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
}

const toneClass = {
    critical: "border-red-200 bg-red-50/85 dark:border-red-950 dark:bg-red-950/25",
    warning: "border-amber-200 bg-amber-50/90 dark:border-amber-950 dark:bg-amber-950/25",
    info: "border-sky-200 bg-sky-50/85 dark:border-sky-950 dark:bg-sky-950/20",
    success: "border-emerald-200 bg-emerald-50/85 dark:border-emerald-950 dark:bg-emerald-950/20",
} as const;

function actionIcon(category: string) {
    if (category === "league") return Trophy;
    if (category === "reward") return Gift;
    if (category === "feedback") return MessageSquareHeart;
    if (category === "break") return Coffee;
    if (category === "shift") return Shuffle;
    if (category === "advance") return Banknote;
    if (category === "approval") return UserCheck;
    return AlertTriangle;
}

function employeeLabel(employee: { name: string; nickName: string | null }) {
    return employee.nickName ? `${employee.nickName} (${employee.name})` : employee.name;
}

export function AdminHomeView() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAbsentDialogOpen, setIsAbsentDialogOpen] = useState(false);
    const [isPresentDialogOpen, setIsPresentDialogOpen] = useState(false);
    const [clockNow, setClockNow] = useState(new Date());
    const [isMoodDialogOpen, setIsMoodDialogOpen] = useState(false);
    const [isSubmittingMood, setIsSubmittingMood] = useState(false);

    const isCashier = session?.user?.role === "CASHIER";
    const {
        todayData,
        isLoading: attendanceLoading,
        isChecking,
        hasCheckedIn,
        hasCheckedOut,
        isOnBreak,
        hasTakenBreak,
        handleCheckIn,
        handleStartBreak,
    } = useAttendance(isCashier ? session?.user?.id : undefined);

    const fetchDashboard = async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        try {
            const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
            if (response.ok) setData(await response.json());
        } catch (error) {
            console.error("Failed to fetch operations dashboard:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!session?.user?.id) return;
        void fetchDashboard();
        fetch("/api/announcements?limit=3")
            .then((response) => response.ok ? response.json() : null)
            .then((payload) => setAnnouncements(payload?.announcements ?? []))
            .catch(() => undefined);
        const timer = window.setInterval(() => setClockNow(new Date()), 30000);
        return () => window.clearInterval(timer);
    }, [session?.user?.id]);

    const onCheckOutClick = () => window.requestAnimationFrame(() => setIsMoodDialogOpen(true));

    const handleMoodSubmit = async (mood: string, note: string) => {
        setIsSubmittingMood(true);
        try {
            await fetch("/api/engagement/happiness", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood, note }),
            });
        } catch (error) {
            console.error("Failed to save checkout mood:", error);
        } finally {
            setIsSubmittingMood(false);
            setIsMoodDialogOpen(false);
            router.push("/qr-scan?action=checkout");
        }
    };

    if (status === "loading" || isLoading || (isCashier && attendanceLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f4efe4] dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
            </div>
        );
    }
    if (!session?.user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) redirect("/");

    const stats = data?.stats;
    const actionItems = data?.actionItems ?? [];
    const teamFeedback = data?.fuelCashierTeamFeedback ?? null;
    const stationLabel = data?.scope?.label || "ทุกสถานี";
    const urgentCount = actionItems.filter((item) => item.tone === "critical" || item.tone === "warning").reduce((sum, item) => sum + item.count, 0);
    const roleLabel = isCashier
        ? "STATION OPERATIONS"
        : session.user.role === "MANAGER"
            ? "STATION CONTROL"
            : session.user.role === "HR"
                ? "PEOPLE CONTROL CENTER"
                : "CONTROL CENTER";

    const quickActions = isCashier
        ? [
            { label: "เช็คอินแทน", sub: "พนักงานไม่มีมือถือ", href: "/admin/attendance?manual=true", icon: Plus },
            { label: "ลงเวลาทั้งหมด", sub: "ตรวจเข้า/ออกงาน", href: "/admin/attendance", icon: Clock3 },
            { label: "ตารางกะ", sub: "ดูคนประจำกะ", href: "/admin/shifts", icon: CalendarDays },
            { label: "เบิกค่าแรง", sub: "บันทึก/ตรวจรายการ", href: "/admin/advances", icon: Banknote },
        ]
        : [
            { label: "Attendance", sub: "ตรวจเวลาวันนี้", href: "/admin/attendance", icon: Clock3 },
            { label: "อนุมัติ", sub: `${stats?.pendingApprovals ?? 0} รายการค้าง`, href: "/admin/approvals", icon: UserCheck },
            { label: "League", sub: "Fair Play & รางวัล", href: "/admin/league", icon: Trophy },
            { label: "เสียงลูกค้า", sub: "เคสและคะแนน", href: "/admin/customer-feedback", icon: MessageSquareHeart },
        ];

    return (
        <div className="min-h-screen bg-[#f2ede1] dark:bg-zinc-950 pb-28 text-zinc-900 dark:text-zinc-100">
            <header className="relative overflow-hidden bg-[#fbbf24] px-4 pt-5 pb-7 text-black border-b border-black/20">
                <div className="absolute inset-0 opacity-[0.13] pointer-events-none" style={{ backgroundImage: "radial-gradient(#111 0.8px, transparent 0.8px)", backgroundSize: "9px 9px" }} />
                <div className="relative max-w-[560px] mx-auto">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase">{roleLabel}</p>
                            <h1 className="mt-1 text-[23px] font-black leading-tight truncate">สวัสดี, {session.user.name}</h1>
                            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-black/65">
                                <Building2 className="w-3.5 h-3.5" /> {stationLabel}
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => void fetchDashboard(true)}
                                className="w-9 h-9 rounded-xl border border-black/15 bg-white/25 flex items-center justify-center active:scale-95"
                                aria-label="รีเฟรช"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            </button>
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center active:scale-95"
                                aria-label="เมนู"
                            >
                                <Menu className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 rounded-[22px] border-[1.5px] border-black/70 bg-[#f6e7bd]/85 p-4 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.38),0_4px_0_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[9px] font-black tracking-[0.16em] uppercase text-black/55">TODAY STATUS</p>
                                <p className="mt-1 text-[20px] font-black leading-tight">
                                    {urgentCount > 0 ? `มี ${urgentCount} จุดต้องจัดการ` : "สถานการณ์วันนี้เรียบร้อย"}
                                </p>
                                <p className="mt-1 text-[10px] font-bold text-black/55">
                                    {format(clockNow, "EEEE d MMM • HH:mm น.", { locale: th })}
                                </p>
                            </div>
                            <div className={`w-16 h-16 rounded-full border-2 border-black/70 flex items-center justify-center ${urgentCount > 0 ? "bg-red-100" : "bg-emerald-100"}`}>
                                {urgentCount > 0 ? <ShieldAlert className="w-8 h-8 text-red-600" /> : <CheckCircle2 className="w-8 h-8 text-emerald-600" />}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[560px] mx-auto px-3.5 pt-3 space-y-3">
                <section className="grid grid-cols-4 gap-1.5">
                    {[
                        { label: "มาแล้ว", value: `${stats?.todayAttendance ?? 0}/${stats?.todayExpected ?? 0}`, icon: UserCheck, danger: false },
                        { label: "สาย", value: stats?.lateToday ?? 0, icon: Clock3, danger: (stats?.lateToday ?? 0) > 0 },
                        { label: "เลยเวลา", value: stats?.todayAbsent ?? 0, icon: AlertTriangle, danger: (stats?.todayAbsent ?? 0) > 0 },
                        { label: "พักเกิน", value: stats?.overBreak ?? 0, icon: Coffee, danger: (stats?.overBreak ?? 0) > 0 },
                    ].map((metric) => {
                        const Icon = metric.icon;
                        return (
                            <div key={metric.label} className="rounded-[15px] border border-zinc-700/25 bg-[#fbf5e8] dark:bg-zinc-900 p-2 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                                <Icon className={`w-4 h-4 mx-auto ${metric.danger ? "text-red-600" : "text-zinc-500"}`} />
                                <p className={`mt-1 text-[20px] leading-none font-black ${metric.danger ? "text-red-600" : ""}`}>{metric.value}</p>
                                <p className="mt-1 text-[8px] font-black text-zinc-500">{metric.label}</p>
                            </div>
                        );
                    })}
                </section>

                <section className="rounded-[20px] border border-zinc-700/30 bg-[#fbf5e8] dark:bg-zinc-900 p-3 shadow-[0_2px_0_rgba(0,0,0,0.07)]">
                    <div className="flex items-center justify-between mb-2.5">
                        <div>
                            <p className="text-[9px] font-black tracking-[0.16em] text-zinc-400 uppercase">ACTION CENTER</p>
                            <h2 className="text-[15px] font-black">สิ่งที่ต้องจัดการ</h2>
                        </div>
                        <Badge variant="outline" className="rounded-full text-[10px]">{actionItems.length} เรื่อง</Badge>
                    </div>
                    {actionItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-emerald-400/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 text-center">
                            <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-600" />
                            <p className="mt-2 text-[12px] font-black text-emerald-700 dark:text-emerald-400">ไม่มีเรื่องเร่งด่วนค้างอยู่</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {actionItems.slice(0, 7).map((item) => {
                                const Icon = actionIcon(item.category);
                                return (
                                    <Link key={item.id} href={item.href} className={`block rounded-[15px] border p-3 active:scale-[0.99] ${toneClass[item.tone]}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white/70 dark:bg-black/20 flex items-center justify-center shrink-0">
                                                <Icon className="w-4.5 h-4.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12px] font-black leading-tight">{item.title}</p>
                                                <p className="mt-0.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 leading-snug">{item.detail}</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 shrink-0 text-zinc-400" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                {isCashier && (
                    <section className="rounded-[20px] border-[1.5px] border-zinc-800 bg-zinc-900 text-white p-3.5 shadow-[0_3px_0_rgba(0,0,0,0.18)]">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-black tracking-[0.16em] text-[#fbbf24]">MY SHIFT</p>
                                <p className="mt-1 text-[14px] font-black">
                                    {!todayData?.shift ? "วันนี้ไม่มีกะ" : hasCheckedOut ? "ลงเวลาเรียบร้อยแล้ว" : hasCheckedIn ? "กำลังทำงาน" : "ยังไม่ได้เข้างาน"}
                                </p>
                                <p className="mt-0.5 text-[9px] font-bold text-zinc-400">
                                    {todayData?.shift ? `${todayData.shift.startTime} - ${todayData.shift.endTime}` : "ใช้ปุ่มนาฬิกาด้านล่างเพื่อจัดการเวลาของคุณ"}
                                </p>
                            </div>
                            <button
                                onClick={() => document.dispatchEvent(new CustomEvent("open-clock-modal"))}
                                className="shrink-0 rounded-xl bg-[#fbbf24] text-black px-3 py-2.5 text-[10px] font-black active:scale-95"
                            >
                                ลงเวลาของฉัน
                            </button>
                        </div>
                    </section>
                )}

                {teamFeedback && (
                    <section className="rounded-[20px] border border-zinc-700/30 bg-[#fbf5e8] dark:bg-zinc-900 p-3 shadow-[0_2px_0_rgba(0,0,0,0.07)]">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <p className="text-[9px] font-black tracking-[0.16em] text-zinc-400 uppercase">TEAM FEEDBACK</p>
                                <h2 className="text-[14px] font-black">ติดตามแบบประเมินทีมหน้าลาน</h2>
                                <p className="mt-0.5 text-[9px] font-bold text-zinc-400">วันนี้เป้าคนละ {teamFeedback.dailyTarget} แบบ · ดูความร่วมมือย้อนหลัง {teamFeedback.rollingWorkdayTarget} วันทำงาน</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[22px] leading-none font-black">{teamFeedback.teamMetTargetCount}/{teamFeedback.employees.length}</p>
                                <p className="mt-1 text-[8px] font-black text-zinc-400">ครบเป้าวันนี้</p>
                            </div>
                        </div>
                        {(teamFeedback.teamNeedsExplanationCount > 0 || teamFeedback.teamFollowUpCount > 0) && (
                            <div className="mb-2 flex flex-wrap gap-1.5">
                                {teamFeedback.teamNeedsExplanationCount > 0 && (
                                    <Badge variant="destructive" className="h-5 rounded-full px-2 text-[8px]">ต้องชี้แจง {teamFeedback.teamNeedsExplanationCount} คน</Badge>
                                )}
                                {teamFeedback.teamFollowUpCount > 0 && (
                                    <Badge variant="outline" className="h-5 rounded-full border-amber-300 bg-amber-50 px-2 text-[8px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">ติดตาม {teamFeedback.teamFollowUpCount} คน</Badge>
                                )}
                            </div>
                        )}
                        {teamFeedback.employees.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-3 text-center text-[10px] font-bold text-zinc-400">วันนี้ไม่มีพนักงานหน้าลานที่เข้ากะ</div>
                        ) : (
                            <div className="space-y-1.5">
                                {teamFeedback.employees.map((employee) => {
                                    const done = employee.dailyStatus === "DONE";
                                    const near = employee.dailyStatus === "NEAR";
                                    const needsExplanation = employee.cooperationStatus === "EXPLAIN";
                                    const needsFollowUp = employee.cooperationStatus === "FOLLOW_UP";
                                    const buildingHistory = employee.cooperationStatus === "BUILDING";
                                    const cooperationLabel = needsExplanation
                                        ? "ต้องชี้แจง"
                                        : needsFollowUp
                                            ? "ติดตาม"
                                            : buildingHistory
                                                ? `รอข้อมูล ${employee.rollingWorkdayCount}/${teamFeedback.rollingWorkdayTarget} วัน`
                                                : "ร่วมมือปกติ";
                                    const cooperationClass = needsExplanation
                                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                                        : needsFollowUp
                                            ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                                            : employee.cooperationStatus === "NORMAL"
                                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                                                : "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
                                    const dailyMessage = done
                                        ? "ครบเป้าวันนี้แล้ว"
                                        : employee.todayEvaluationCount <= 1
                                            ? `วันนี้ยังน้อย · ขอเพิ่มอีก ${employee.remainingToday} แบบ`
                                            : near
                                                ? `ใกล้ครบ · ขอเพิ่มอีก ${employee.remainingToday} แบบ`
                                                : `ขอเพิ่มอีก ${employee.remainingToday} แบบ`;
                                    return (
                                        <div key={employee.userId} className={`rounded-[14px] border px-3 py-2.5 ${needsExplanation ? "border-red-300/70 bg-red-50/70 dark:border-red-900/70 dark:bg-red-950/15" : "border-zinc-700/20 bg-white/60 dark:bg-white/[0.03]"}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <p className="truncate text-[11px] font-black">{employee.label}</p>
                                                        <Badge variant="outline" className={`h-5 rounded-full px-1.5 text-[8px] ${cooperationClass}`}>{cooperationLabel}</Badge>
                                                        {employee.leagueRank !== null && <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[8px]">League #{employee.leagueRank}</Badge>}
                                                        {employee.leagueNeedsReview && <Badge variant="destructive" className="h-5 rounded-full px-1.5 text-[8px]">ตรวจ Fair Play</Badge>}
                                                    </div>
                                                    <p className="mt-0.5 text-[8px] font-bold text-zinc-500 dark:text-zinc-400">
                                                        {dailyMessage}
                                                        {employee.leagueScore !== null ? ` • League ${employee.leagueScore.toFixed(1)} คะแนน` : " • อันดับ League ยังรอข้อมูลประเมินเพิ่ม"}
                                                    </p>
                                                    <p className={`mt-0.5 text-[8px] font-black ${needsExplanation ? "text-red-600 dark:text-red-300" : needsFollowUp ? "text-amber-700 dark:text-amber-300" : "text-zinc-400"}`}>
                                                        {buildingHistory
                                                            ? `ยังไม่ตัดสินความร่วมมือจนกว่าจะครบ ${teamFeedback.rollingWorkdayTarget} วันทำงาน`
                                                            : `ความร่วมมือ ${employee.cooperationRate ?? 0}% · ${employee.rollingEvaluationCount}/${employee.rollingTargetCount} แบบย้อนหลัง`}
                                                    </p>
                                                </div>
                                                <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center ${done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : near ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                                                    <p className="text-[15px] leading-none font-black">{employee.todayEvaluationCount}/{teamFeedback.dailyTarget}</p>
                                                    <p className="mt-1 text-[7px] font-black">แบบวันนี้</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                                <div className="h-full rounded-full bg-[#fbbf24]" style={{ width: `${Math.min(100, teamFeedback.dailyTarget > 0 ? (employee.todayEvaluationCount / teamFeedback.dailyTarget) * 100 : 0)}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                <section>
                    <div className="flex items-center justify-between px-1 mb-2">
                        <div>
                            <p className="text-[9px] font-black tracking-[0.14em] text-zinc-400 uppercase">OPERATIONS</p>
                            <h2 className="text-[14px] font-black">สถานะหน้างานตอนนี้</h2>
                        </div>
                        <button onClick={() => setIsPresentDialogOpen(true)} className="text-[9px] font-black underline underline-offset-2">ดูรายชื่อ</button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            ["กำลังทำงาน", stats?.workingNow ?? 0],
                            ["พักอยู่", stats?.onBreak ?? 0],
                            ["ออกงานแล้ว", stats?.checkedOutToday ?? 0],
                            ["ลาวันนี้", stats?.todayOnLeave ?? 0],
                        ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-[14px] border border-zinc-700/20 bg-white/55 dark:bg-zinc-900 px-1.5 py-2.5 text-center">
                                <p className="text-[18px] font-black leading-none">{value}</p>
                                <p className="mt-1.5 text-[8px] font-bold text-zinc-500">{label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {(stats?.absentEmployees?.length ?? 0) > 0 && (
                    <section className="rounded-[20px] border border-red-200 bg-red-50/70 dark:border-red-950 dark:bg-red-950/20 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-[12px] font-black text-red-700 dark:text-red-400">เลยเวลาเข้างาน</h2>
                            <button onClick={() => setIsAbsentDialogOpen(true)} className="text-[9px] font-black text-red-600">ดูทั้งหมด {stats?.absentEmployees.length}</button>
                        </div>
                        <div className="space-y-1.5">
                            {stats?.absentEmployees.slice(0, 3).map((employee) => (
                                <div key={employee.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/70 dark:bg-zinc-900/60 px-2.5 py-2">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black truncate">{employeeLabel(employee)}</p>
                                        <p className="text-[8px] font-bold text-zinc-400">{employee.shiftName} • {employee.shiftTime}</p>
                                    </div>
                                    {employee.phone && <a href={`tel:${employee.phone}`} className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center"><Phone className="w-3.5 h-3.5 text-red-600" /></a>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {(stats?.overBreakEmployees?.length ?? 0) > 0 && (
                    <section className="rounded-[20px] border border-amber-200 bg-amber-50/75 dark:border-amber-950 dark:bg-amber-950/20 p-3">
                        <h2 className="text-[12px] font-black text-amber-800 dark:text-amber-400 mb-2">พักเกินเวลา — ควรติดตาม</h2>
                        <div className="space-y-1.5">
                            {stats?.overBreakEmployees.slice(0, 3).map((employee) => (
                                <div key={employee.id} className="flex items-center justify-between rounded-xl bg-white/70 dark:bg-zinc-900/60 px-2.5 py-2">
                                    <div>
                                        <p className="text-[11px] font-black">{employeeLabel(employee)}</p>
                                        <p className="text-[8px] font-bold text-zinc-400">พัก {employee.durationMinutes} นาที • สิทธิ์ {employee.allowedMinutes} นาที</p>
                                    </div>
                                    <span className="text-[11px] font-black text-amber-700">+{employee.overMinutes}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {!isCashier && (
                    <section className="grid grid-cols-2 gap-2">
                        <Link href="/admin/league" className="rounded-[18px] border border-zinc-700/25 bg-zinc-900 text-white p-3.5 shadow-sm active:scale-[0.99]">
                            <div className="flex items-center justify-between">
                                <Trophy className="w-5 h-5 text-[#fbbf24]" />
                                <span className="text-[8px] font-black text-zinc-500">COMPETITION</span>
                            </div>
                            <p className="mt-3 text-[24px] font-black leading-none">{(stats?.leaguePendingReviews ?? 0) + (stats?.rewardsToFulfill ?? 0)}</p>
                            <p className="mt-1 text-[10px] font-black">League ต้องจัดการ</p>
                            <p className="mt-1 text-[8px] text-zinc-400">Fair Play {stats?.leaguePendingReviews ?? 0} • รอมอบ {stats?.rewardsToFulfill ?? 0}</p>
                        </Link>
                        <Link href="/admin/customer-feedback" className="rounded-[18px] border border-zinc-700/25 bg-[#fbf5e8] dark:bg-zinc-900 p-3.5 shadow-sm active:scale-[0.99]">
                            <div className="flex items-center justify-between">
                                <MessageSquareHeart className="w-5 h-5" />
                                <span className="text-[8px] font-black text-zinc-400">CUSTOMER</span>
                            </div>
                            <p className="mt-3 text-[24px] font-black leading-none">{(stats?.customerOpenCases ?? 0) + (stats?.customerReviewRequests ?? 0)}</p>
                            <p className="mt-1 text-[10px] font-black">เสียงลูกค้าต้องตาม</p>
                            <p className="mt-1 text-[8px] text-zinc-400">เคส {stats?.customerOpenCases ?? 0} • ทบทวน {stats?.customerReviewRequests ?? 0}</p>
                        </Link>
                    </section>
                )}

                <section className="rounded-[20px] border border-zinc-700/25 bg-[#fbf5e8] dark:bg-zinc-900 p-3">
                    <p className="px-1 text-[9px] font-black tracking-[0.14em] text-zinc-400 uppercase mb-2">QUICK TOOLS</p>
                    <div className="grid grid-cols-2 gap-2">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Link key={action.label} href={action.href} className="rounded-[15px] border border-zinc-700/20 bg-white/55 dark:bg-white/[0.03] p-3 active:scale-[0.99]">
                                    <div className="flex items-center justify-between">
                                        <Icon className="w-4.5 h-4.5" />
                                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                                    </div>
                                    <p className="mt-2.5 text-[11px] font-black">{action.label}</p>
                                    <p className="mt-0.5 text-[8px] font-bold text-zinc-400">{action.sub}</p>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {announcements.length > 0 && (
                    <section className="rounded-[20px] border border-zinc-700/25 bg-[#fbf5e8] dark:bg-zinc-900 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2"><Megaphone className="w-4 h-4" /><h2 className="text-[12px] font-black">ประกาศล่าสุด</h2></div>
                            <Link href="/announcements" className="text-[9px] font-black">ดูทั้งหมด</Link>
                        </div>
                        <div className="space-y-1.5">
                            {announcements.slice(0, 2).map((announcement) => (
                                <Link key={announcement.id} href={`/announcements/${announcement.id}`} className="block rounded-xl border border-zinc-700/15 bg-white/50 dark:bg-white/[0.03] px-3 py-2.5">
                                    <p className="text-[10px] font-black line-clamp-1">{announcement.isPinned ? "📌 " : ""}{announcement.title}</p>
                                    <p className="mt-0.5 text-[8px] text-zinc-500 line-clamp-1">{announcement.content}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {(data?.monthlyAttendance?.length ?? 0) > 0 && (
                    <AttendanceCalendar data={data?.monthlyAttendance ?? []} />
                )}
            </main>

            <Dialog open={isAbsentDialogOpen} onOpenChange={setIsAbsentDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>เลยเวลาเข้างาน ({stats?.absentEmployees.length ?? 0})</DialogTitle></DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-2">
                        {stats?.absentEmployees.map((employee) => (
                            <div key={employee.id} className="flex items-start gap-3 rounded-xl border p-3">
                                <Avatar><AvatarImage src={employee.photoUrl || undefined} /><AvatarFallback>{employee.name.charAt(0)}</AvatarFallback></Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold">{employeeLabel(employee)}</p>
                                    <p className="text-xs text-muted-foreground">{employee.station} • {employee.shiftName} {employee.shiftTime}</p>
                                    {employee.leaveStatus === "PENDING" && <Badge variant="outline" className="mt-1">มีใบลารออนุมัติ</Badge>}
                                </div>
                                {employee.phone && <a href={`tel:${employee.phone}`} className="p-2"><Phone className="w-4 h-4" /></a>}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPresentDialogOpen} onOpenChange={setIsPresentDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>พนักงานที่ลงเวลาแล้ว ({stats?.presentEmployees.length ?? 0})</DialogTitle></DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-2">
                        {stats?.presentEmployees.map((employee) => (
                            <div key={employee.id} className="flex items-center justify-between rounded-xl border p-3">
                                <div><p className="text-sm font-bold">{employeeLabel(employee)}</p><p className="text-xs text-muted-foreground">{employee.station}</p></div>
                                <Badge variant="outline" className={employee.checkedOut ? "" : "border-emerald-300 text-emerald-600"}>{employee.checkedOut ? "ออกงานแล้ว" : "กำลังทำงาน"}</Badge>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {isCashier && (
                <>
                    <MoodCheckOutDialog isOpen={isMoodDialogOpen} onClose={() => setIsMoodDialogOpen(false)} onConfirm={handleMoodSubmit} isLoading={isSubmittingMood} />
                    <ClockInModal
                        hasCheckedIn={hasCheckedIn}
                        hasCheckedOut={hasCheckedOut}
                        isOnBreak={isOnBreak}
                        hasTakenBreak={hasTakenBreak}
                        isChecking={isChecking}
                        onCheckIn={handleCheckIn}
                        onCheckOut={onCheckOutClick}
                        onStartBreak={handleStartBreak}
                        hasShift={Boolean(todayData?.shift)}
                        shiftTime={todayData?.shift ? `${todayData.shift.startTime} - ${todayData.shift.endTime}` : undefined}
                        checkInTime={todayData?.attendance?.checkInTime}
                        checkOutTime={todayData?.attendance?.checkOutTime}
                    />
                </>
            )}
            <RightMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} hasAdminAccess={true} />
        </div>
    );
}
