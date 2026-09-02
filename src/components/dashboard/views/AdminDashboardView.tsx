"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowRight,
    Banknote,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Coffee,
    FileText,
    Gift,
    Loader2,
    MessageSquareHeart,
    Plus,
    RefreshCw,
    ShieldAlert,
    Shuffle,
    Trophy,
    UserCheck,
    Users,
    Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttendanceCalendar } from "@/components/dashboard";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";

type ActionItem = {
    id: string;
    tone: "critical" | "warning" | "info" | "success";
    category: string;
    title: string;
    detail: string;
    count: number;
    href: string;
};

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
    absentEmployees: Array<{
        id: string;
        name: string;
        nickName: string | null;
        station: string;
        shiftName: string;
        shiftTime: string;
    }>;
    lateEmployees: Array<{
        id: string;
        name: string;
        nickName: string | null;
        station: string;
        lateMinutes: number;
    }>;
    overBreakEmployees: Array<{
        id: string;
        name: string;
        nickName: string | null;
        station: string;
        durationMinutes: number;
        allowedMinutes: number;
        overMinutes: number;
    }>;
}

interface DashboardData {
    role: string;
    scope: { station: { id: string; code: string; name: string } | null; label: string };
    stats: DashboardStats;
    actionItems: ActionItem[];
    recent: {
        requests: Array<{
            id: string;
            type: "shift_swap" | "leave" | "time_correction";
            employeeName: string;
            description: string;
            createdAt: string;
        }>;
    };
    monthlyAttendance: Array<{ date: string; onTime: number; late: number; absent: number }>;
}

const toneStyles = {
    critical: {
        box: "border-red-200 bg-red-50/60 dark:border-red-950 dark:bg-red-950/20",
        icon: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
    },
    warning: {
        box: "border-amber-200 bg-amber-50/60 dark:border-amber-950 dark:bg-amber-950/20",
        icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    },
    info: {
        box: "border-sky-200 bg-sky-50/60 dark:border-sky-950 dark:bg-sky-950/20",
        icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
    },
    success: {
        box: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-950 dark:bg-emerald-950/20",
        icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    },
} as const;

function actionIcon(category: string) {
    if (category === "league") return Trophy;
    if (category === "reward") return Gift;
    if (category === "feedback") return MessageSquareHeart;
    if (category === "break") return Coffee;
    if (category === "approval") return UserCheck;
    if (category === "shift") return Shuffle;
    if (category === "advance") return Banknote;
    return AlertTriangle;
}

function employeeLabel(employee: { name: string; nickName: string | null }) {
    return employee.nickName || employee.name;
}

export function AdminDashboardView() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchDashboard = async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        try {
            const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
            if (response.ok) setData(await response.json());
        } catch (error) {
            console.error("Failed to fetch admin control center:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (session?.user?.id) void fetchDashboard();
    }, [session?.user?.id]);

    if (status === "loading" || isLoading) {
        return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" /></div>;
    }
    if (!session?.user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) redirect("/");

    const role = session.user.role;
    const isCashier = role === "CASHIER";
    const stats = data?.stats;
    const actionItems = data?.actionItems ?? [];
    const urgentCount = actionItems.filter((item) => item.tone === "critical" || item.tone === "warning").reduce((sum, item) => sum + item.count, 0);
    const scopeLabel = data?.scope?.label || "ทุกสถานี";

    const quickActions = isCashier
        ? [
            { label: "เช็คอินแทน", href: "/admin/attendance?manual=true", icon: Plus, description: "ลงเวลาแทนพนักงานที่ไม่มีมือถือ" },
            { label: "Attendance", href: "/admin/attendance", icon: Clock3, description: "ตรวจเข้าออกงานของสถานี" },
            { label: "ตารางกะ", href: "/admin/shifts", icon: CalendarDays, description: "ดูคนประจำกะและตารางวันนี้" },
            { label: "เบิกค่าแรง", href: "/admin/advances", icon: Banknote, description: "บันทึกและติดตามรายการเบิก" },
        ]
        : [
            { label: "Attendance", href: "/admin/attendance", icon: Clock3, description: "ตรวจเวลาและความผิดปกติวันนี้" },
            { label: "คำขออนุมัติ", href: "/admin/approvals", icon: UserCheck, description: `${stats?.pendingApprovals ?? 0} รายการรอตัดสินใจ` },
            { label: "League & Rewards", href: "/admin/league", icon: Trophy, description: "Fair Play, แชมป์ และการมอบรางวัล" },
            { label: "เสียงลูกค้า", href: "/admin/customer-feedback", icon: MessageSquareHeart, description: "เคส คะแนน และคำขอทบทวน" },
            { label: "Shift Pool", href: "/admin/shift-pool", icon: Shuffle, description: `${stats?.openShifts ?? 0} กะเปิดรอคน` },
            { label: "รายงาน", href: "/admin/reports", icon: FileText, description: "สรุปเวลาทำงานและการจ่าย" },
        ];

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[28px] border border-zinc-800/20 bg-[#fbbf24] p-6 text-black shadow-sm">
                <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ backgroundImage: "radial-gradient(#111 0.8px, transparent 0.8px)", backgroundSize: "10px 10px" }} />
                <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div>
                        <p className="text-[10px] font-black tracking-[0.22em] uppercase">
                            {isCashier ? "STATION OPERATIONS" : role === "MANAGER" ? "STATION CONTROL" : role === "HR" ? "PEOPLE CONTROL CENTER" : "CONTROL CENTER"}
                        </p>
                        <h1 className="mt-2 text-3xl font-black">วันนี้ต้องจัดการอะไรบ้าง</h1>
                        <p className="mt-2 text-sm font-bold text-black/60">
                            {session.user.name} • {scopeLabel} • {new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" }).format(new Date())}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-black/20 bg-[#f7e6b7] px-5 py-4 min-w-[180px]">
                            <p className="text-[10px] font-black text-black/50 tracking-wider">TODAY STATUS</p>
                            <div className="mt-1 flex items-center gap-2">
                                {urgentCount > 0 ? <ShieldAlert className="w-6 h-6 text-red-600" /> : <CheckCircle2 className="w-6 h-6 text-emerald-700" />}
                                <span className="text-lg font-black">{urgentCount > 0 ? `${urgentCount} จุดต้องตาม` : "เรียบร้อย"}</span>
                            </div>
                        </div>
                        <Button onClick={() => void fetchDashboard(true)} variant="outline" className="h-14 bg-white/60 border-black/20 text-black hover:bg-white">
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} /> รีเฟรช
                        </Button>
                    </div>
                </div>
            </div>

            <AnnouncementBanner />

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { title: "เข้าทำงานแล้ว", value: `${stats?.todayAttendance ?? 0}/${stats?.todayExpected ?? 0}`, sub: `${stats?.attendanceRate ?? 0}% ของกะวันนี้`, icon: Users, alert: false, href: "/admin/attendance" },
                    { title: "เลยเวลาเข้างาน", value: stats?.todayAbsent ?? 0, sub: `ยังไม่มาอีก ${stats?.todayNotArrived ?? 0} คนรวมกะที่ยังไม่ถึงเวลา`, icon: AlertTriangle, alert: (stats?.todayAbsent ?? 0) > 0, href: "/admin/attendance" },
                    { title: "มาสายวันนี้", value: stats?.lateToday ?? 0, sub: "นับเมื่อเกิน grace 5 นาที", icon: Clock3, alert: (stats?.lateToday ?? 0) > 0, href: "/admin/attendance" },
                    { title: "พักเกินเวลา", value: stats?.overBreak ?? 0, sub: `${stats?.onBreak ?? 0} คนกำลังพัก`, icon: Coffee, alert: (stats?.overBreak ?? 0) > 0, href: isCashier ? "/admin/attendance" : "/admin/reports/break-summary" },
                ].map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <Link key={metric.title} href={metric.href}>
                            <Card className={`h-full transition-all hover:-translate-y-0.5 hover:shadow-md ${metric.alert ? "border-red-200 dark:border-red-950" : ""}`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className={`text-3xl font-black ${metric.alert ? "text-red-600" : ""}`}>{metric.value}</p>
                                            <p className="mt-1 text-sm font-bold">{metric.title}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{metric.sub}</p>
                                        </div>
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${metric.alert ? "bg-red-100 text-red-600 dark:bg-red-950" : "bg-muted text-muted-foreground"}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            <div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)] gap-6">
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/20">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl">Action Center</CardTitle>
                                <CardDescription>เรียงเรื่องที่ต้องตัดสินใจ/ติดตามก่อนตามความเร่งด่วน</CardDescription>
                            </div>
                            <Badge variant={urgentCount > 0 ? "destructive" : "secondary"}>{actionItems.length} เรื่อง</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {actionItems.length === 0 ? (
                            <div className="py-12 text-center">
                                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/70" />
                                <p className="mt-3 font-bold">ไม่มีงานเร่งด่วนค้างอยู่</p>
                                <p className="mt-1 text-sm text-muted-foreground">สถานการณ์วันนี้อยู่ในเกณฑ์ปกติ</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {actionItems.map((item) => {
                                    const Icon = actionIcon(item.category);
                                    const style = toneStyles[item.tone];
                                    return (
                                        <Link key={item.id} href={item.href} className={`block rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${style.box}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}><Icon className="w-5 h-5" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black">{item.title}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">หน้างานขณะนี้</CardTitle>
                            <CardDescription>สถานะคนที่อยู่ในระบบวันนี้</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3">
                            {[
                                ["กำลังทำงาน", stats?.workingNow ?? 0],
                                ["พักอยู่", stats?.onBreak ?? 0],
                                ["ออกงานแล้ว", stats?.checkedOutToday ?? 0],
                                ["ลาวันนี้", stats?.todayOnLeave ?? 0],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="rounded-xl border bg-muted/20 p-3 text-center">
                                    <p className="text-2xl font-black">{value}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {isCashier ? (
                        <Card className="border-[#fbbf24]/50 bg-[#fbbf24]/5">
                            <CardHeader>
                                <CardTitle className="text-lg">งานเสมียนสถานี</CardTitle>
                                <CardDescription>งานที่ควรใช้บ่อยระหว่างกะ</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button asChild className="w-full justify-between bg-[#fbbf24] text-black hover:bg-[#eeb31d]">
                                    <Link href="/admin/attendance?manual=true"><span className="flex items-center"><Plus className="w-4 h-4 mr-2" />เช็คอินแทน</span><ArrowRight className="w-4 h-4" /></Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full justify-between">
                                    <Link href="/"><span>กลับหน้า Station Operations / ลงเวลาของฉัน</span><ArrowRight className="w-4 h-4" /></Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">การแข่งขัน & ลูกค้า</CardTitle>
                                <CardDescription>งานใหม่ที่ต้องปิดก่อนประกาศผล/ใช้คะแนน</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Link href="/admin/league" className="flex items-center justify-between rounded-xl border p-3 hover:bg-muted/40">
                                    <div className="flex items-center gap-3"><Trophy className="w-5 h-5 text-amber-500" /><div><p className="text-sm font-bold">League</p><p className="text-xs text-muted-foreground">Fair Play {stats?.leaguePendingReviews ?? 0} • รอมอบ {stats?.rewardsToFulfill ?? 0}</p></div></div><ArrowRight className="w-4 h-4 text-muted-foreground" />
                                </Link>
                                <Link href="/admin/customer-feedback" className="flex items-center justify-between rounded-xl border p-3 hover:bg-muted/40">
                                    <div className="flex items-center gap-3"><MessageSquareHeart className="w-5 h-5 text-pink-500" /><div><p className="text-sm font-bold">เสียงลูกค้า</p><p className="text-xs text-muted-foreground">เคสเปิด {stats?.customerOpenCases ?? 0} • ทบทวน {stats?.customerReviewRequests ?? 0}</p></div></div><ArrowRight className="w-4 h-4 text-muted-foreground" />
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {(stats?.absentEmployees.length ?? 0) + (stats?.overBreakEmployees.length ?? 0) + (stats?.lateEmployees.length ?? 0) > 0 && (
                <div className="grid lg:grid-cols-3 gap-4">
                    <Card className="border-red-200 dark:border-red-950">
                        <CardHeader className="pb-3"><CardTitle className="text-base text-red-600">เลยเวลาเข้างาน</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {stats?.absentEmployees.slice(0, 5).map((employee) => (
                                <div key={employee.id} className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2"><p className="text-sm font-bold">{employeeLabel(employee)}</p><p className="text-xs text-muted-foreground">{employee.station} • {employee.shiftTime}</p></div>
                            ))}
                            {(stats?.absentEmployees.length ?? 0) > 5 && <p className="text-xs text-muted-foreground">และอีก {(stats?.absentEmployees.length ?? 0) - 5} คน</p>}
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 dark:border-amber-950">
                        <CardHeader className="pb-3"><CardTitle className="text-base text-amber-700 dark:text-amber-400">พักเกินเวลา</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {stats?.overBreakEmployees.slice(0, 5).map((employee) => (
                                <div key={employee.id} className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2 flex justify-between gap-2"><div><p className="text-sm font-bold">{employeeLabel(employee)}</p><p className="text-xs text-muted-foreground">พัก {employee.durationMinutes}/{employee.allowedMinutes} นาที</p></div><span className="font-black text-amber-700">+{employee.overMinutes}</span></div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">มาสายวันนี้</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {stats?.lateEmployees.slice(0, 5).map((employee) => (
                                <div key={employee.id} className="rounded-lg bg-muted/30 px-3 py-2 flex justify-between gap-2"><div><p className="text-sm font-bold">{employeeLabel(employee)}</p><p className="text-xs text-muted-foreground">{employee.station}</p></div><span className="font-black text-red-600">+{employee.lateMinutes} นาที</span></div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">เครื่องมือที่ใช้บ่อย</CardTitle>
                    <CardDescription>{isCashier ? "เฉพาะงานสถานีและสิทธิ์ของเสมียน" : "ลัดไปยังงานควบคุมหลัก"}</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link key={action.label} href={action.href} className="rounded-xl border p-4 hover:bg-muted/40 transition-colors">
                                <div className="flex items-center justify-between"><Icon className="w-5 h-5" /><ArrowRight className="w-4 h-4 text-muted-foreground" /></div>
                                <p className="mt-3 font-bold">{action.label}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                            </Link>
                        );
                    })}
                </CardContent>
            </Card>

            {(data?.monthlyAttendance.length ?? 0) > 0 && <AttendanceCalendar data={data?.monthlyAttendance ?? []} />}

            {new Date().getDate() >= 25 && ["ADMIN", "HR"].includes(role) && (
                <Card className="border-blue-300 bg-blue-50/60 dark:border-blue-950 dark:bg-blue-950/20">
                    <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center"><Wallet className="w-5 h-5 text-blue-600" /></div>
                            <div><p className="font-black">ใกล้รอบสรุปเงินเดือน</p><p className="text-sm text-muted-foreground">ตรวจ Attendance/รายการหัก/รายได้พิเศษให้เรียบร้อยก่อนปิดงวด</p></div>
                        </div>
                        <Button asChild><Link href="/admin/payroll">ไปตรวจเงินเดือน <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
