"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AttendanceChart, LatenessTrendChart } from "@/components/analytics";
import { AttendanceCalendar } from "@/components/dashboard";
import { statCardColors } from "@/lib/pastel-colors";

import {
    Users,
    Clock,
    ClipboardCheck,
    TrendingUp,
    ArrowRight,
    Shuffle,
    Calendar,
    FileText,
    QrCode,
    Wallet,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    CalendarDays,
    Building2,
    BarChart3,
    Banknote,
} from "lucide-react";

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
}

interface DashboardStats {
    totalEmployees: number;
    todayAttendance: number;
    todayExpected: number;
    attendanceRate: number;
    pendingApprovals: number;
    pendingShiftSwaps: number;
    pendingTimeCorrections: number;
    pendingLeaves: number;
    openShifts: number;
    absentEmployees: AbsentEmployee[];
}

interface RecentRequest {
    id: string;
    type: "shift_swap" | "leave" | "time_correction";
    employeeName: string;
    description: string;
    createdAt: string;
}

interface AnalyticsData {
    weekly: Array<{ day: string; onTime: number; late: number; absent: number }>;
    trend: Array<{ date: string; lateCount: number; avgLateMinutes: number }>;
}

interface MonthlyAttendanceDay {
    date: string;
    onTime: number;
    late: number;
    absent: number;
}

// Helper functions moved outside component for performance
const getRequestIcon = (type: string) => {
    switch (type) {
        case "shift_swap":
            return <Shuffle className="w-4 h-4 text-purple-500" />;
        case "leave":
            return <Calendar className="w-4 h-4 text-blue-500" />;
        case "time_correction":
            return <Clock className="w-4 h-4 text-amber-500" />;
        default:
            return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
};

const getRequestLabel = (type: string) => {
    switch (type) {
        case "shift_swap":
            return "สลับกะ";
        case "leave":
            return "ลางาน";
        case "time_correction":
            return "แก้ไขเวลา";
        default:
            return type;
    }
};

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Clock, MapPin, UserCheck } from "lucide-react";

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [monthlyAttendance, setMonthlyAttendance] = useState<MonthlyAttendanceDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAbsentDialogOpen, setIsAbsentDialogOpen] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchDashboardData();
            fetchAnalytics();
        }
    }, [session?.user?.id]);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch("/api/admin/dashboard");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setRecentRequests(data.recent?.requests || []);
                setMonthlyAttendance(data.monthlyAttendance || []);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await fetch("/api/admin/analytics");
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !session.user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
        redirect("/");
    }

    const { role } = session.user;

    const allStatsCards = [
        {
            title: "พนักงานทั้งหมด",
            value: stats?.totalEmployees || 0,
            icon: Users,
            color: statCardColors.employees.icon,
            bgColor: statCardColors.employees.iconBg,
            href: "/admin/employees",
            roles: ["ADMIN", "HR"],
        },
        {
            title: "เข้างานวันนี้",
            value: `${stats?.todayAttendance || 0}/${stats?.todayExpected || 0}`,
            subtitle: `${stats?.attendanceRate || 0}%`,
            icon: Clock,
            color: statCardColors.attendance.icon,
            bgColor: statCardColors.attendance.iconBg,
            href: "/admin/attendance",
        },
        {
            title: "รอการอนุมัติ",
            value: stats?.pendingApprovals || 0,
            icon: ClipboardCheck,
            color: stats?.pendingApprovals && stats.pendingApprovals > 0 ? "text-amber-500 dark:text-amber-400" : "text-slate-500",
            bgColor: stats?.pendingApprovals && stats.pendingApprovals > 0 ? statCardColors.approvals.iconBg : "bg-slate-100 dark:bg-slate-800/40",
            href: "/admin/approvals",
            badge: stats?.pendingApprovals ? stats.pendingApprovals : undefined,
        },
        {
            title: "Open Shifts",
            value: stats?.openShifts || 0,
            icon: Shuffle,
            color: statCardColors.shifts.icon,
            bgColor: statCardColors.shifts.iconBg,
            href: "/admin/shift-pool",
        },
    ];

    const statsCards = allStatsCards.filter(card => !card.roles || card.roles.includes(role));

    const allQuickActions = [
        { title: "จัดการพนักงาน", icon: Users, href: "/admin/employees", color: "text-blue-500", roles: ["ADMIN", "HR"] },
        { title: "สถานี/แผนก", icon: Building2, href: "/admin/stations", color: "text-cyan-500", roles: ["ADMIN", "HR"] },
        { title: "ตารางกะ", icon: Calendar, href: "/admin/shifts", color: "text-indigo-500" },
        { title: "ลงเวลาทำงาน", icon: Clock, href: "/admin/attendance", color: "text-green-500" },
        { title: "Shift Pool", icon: Shuffle, href: "/admin/shift-pool", color: "text-purple-500" },
        { title: "Availability", icon: CalendarDays, href: "/admin/availability", color: "text-pink-500" },
        { title: "เงินเดือน", icon: Wallet, href: "/admin/payroll", color: "text-green-500", roles: ["ADMIN", "HR"] },
        { title: "เบิกค่าแรง", icon: Banknote, href: "/admin/advances", color: "text-green-500", roles: ["ADMIN", "HR", "MANAGER", "CASHIER"] },
        { title: "รายงาน", icon: FileText, href: "/admin/reports", color: "text-orange-500", roles: ["ADMIN", "HR", "MANAGER"] },
        { title: "QR Codes", icon: QrCode, href: "/admin/qr-codes", color: "text-teal-500", roles: ["ADMIN", "HR"] },
    ];

    const quickActions = allQuickActions.filter(action => !action.roles || action.roles.includes(role));

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                        <p className="text-muted-foreground">
                            สวัสดี, {session.user.name} • {new Date().toLocaleDateString("th-TH", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                </div>

                {/* Absent Employees Dialog */}
                <Dialog open={isAbsentDialogOpen} onOpenChange={setIsAbsentDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                รายชื่อผู้ขาดงานวันนี้ ({stats?.absentEmployees.length || 0})
                            </DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto space-y-4">
                            {stats?.absentEmployees.map((emp) => (
                                <div key={emp.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card relative">
                                    <Avatar>
                                        <AvatarImage src={emp.photoUrl || undefined} />
                                        <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium text-sm">
                                                {emp.name} {emp.nickName ? `(${emp.nickName})` : ""}
                                            </p>
                                            {emp.leaveStatus && (
                                                <Badge variant={emp.leaveStatus === "PENDING" ? "outline" : "destructive"}>
                                                    {emp.leaveStatus === "PENDING" ? "รออนุมัติลา" : "ลาถูกปฏิเสธ"}
                                                    ({emp.leaveType})
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {emp.station}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                                            <Clock className="h-3 w-3" />
                                            {emp.shiftName} ({emp.shiftTime})
                                        </div>

                                        {/* Overlap Warning */}
                                        {emp.overlaps.length > 0 && (
                                            <div className="mt-2 text-xs bg-red-50 text-red-600 p-2 rounded-md border border-red-100 flex items-start gap-1">
                                                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                                <span>
                                                    <strong>หยุดชนกัน:</strong> {emp.overlaps.join(", ")} ก็หยุดที่สถานีนี้เช่นกัน
                                                </span>
                                            </div>
                                        )}

                                        {emp.phone && (
                                            <div className="pt-1">
                                                <a href={`tel:${emp.phone}`} className="inline-flex items-center text-xs text-blue-600 hover:underline gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {emp.phone}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Pending Requests */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg">คำขอรออนุมัติ</CardTitle>
                                <CardDescription>คำขอล่าสุดที่รอการอนุมัติ</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/admin/approvals">
                                    ดูทั้งหมด <ArrowRight className="w-4 h-4 ml-1" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                                    ))}
                                </div>
                            ) : recentRequests.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                                    <p>ไม่มีคำขอที่รออนุมัติ</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentRequests.slice(0, 5).map((request) => (
                                        <div
                                            key={request.id}
                                            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                        >
                                            <div className="p-2 rounded-lg bg-background">
                                                {getRequestIcon(request.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-foreground truncate">
                                                    {request.employeeName}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {request.description}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="shrink-0">
                                                {getRequestLabel(request.type)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">เมนูด่วน</CardTitle>
                            <CardDescription>ลัดไปยังเมนูที่ใช้บ่อย</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-2">
                                {quickActions.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <Link key={action.title} href={action.href}>
                                            <Button
                                                variant="outline"
                                                className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-muted"
                                            >
                                                <Icon className={`w-5 h-5 ${action.color}`} />
                                                <span className="text-xs">{action.title}</span>
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Attendance Calendar Widget */}
                <AttendanceCalendar data={monthlyAttendance} />

                {/* Analytics Charts */}
                {analytics && (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Weekly Attendance Chart */}
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    <CardTitle className="text-lg">สถิติ Attendance รายสัปดาห์</CardTitle>
                                </div>
                                <CardDescription>ข้อมูล 7 วันล่าสุด</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AttendanceChart data={analytics.weekly} />
                            </CardContent>
                        </Card>

                        {/* Lateness Trend Chart */}
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-orange-500" />
                                    <CardTitle className="text-lg">Trend การมาสาย</CardTitle>
                                </div>
                                <CardDescription>ข้อมูล 30 วันล่าสุด</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <LatenessTrendChart data={analytics.trend} />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Approval Summary (if pending) */}
                {stats && stats.pendingApprovals > 0 && (
                    <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                        <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">
                                            มี {stats.pendingApprovals} รายการรออนุมัติ
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            สลับกะ: {stats.pendingShiftSwaps} • ลางาน: {stats.pendingLeaves} • แก้ไขเวลา: {stats.pendingTimeCorrections}
                                        </p>
                                    </div>
                                </div>
                                <Button asChild className="shrink-0">
                                    <Link href="/admin/approvals">
                                        ไปอนุมัติ <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Payroll Due Alert (Shows from 25th of month) */}
                {new Date().getDate() >= 25 && ["ADMIN", "HR"].includes(role) && (
                    <Card className="border-blue-500/50 bg-blue-500/5">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10">
                                        <Wallet className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">
                                            ใกล้ถึงกำหนดจ่ายเงินเดือน
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            กรุณาตรวจสอบและปิดงวดบัญชีประจำเดือน
                                        </p>
                                    </div>
                                </div>
                                <Button asChild className="shrink-0" variant="secondary">
                                    <Link href="/admin/reports/payroll">
                                        จัดการเงินเดือน <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
