"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
} from "lucide-react";

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
}

interface RecentRequest {
    id: string;
    type: "shift_swap" | "leave" | "time_correction";
    employeeName: string;
    description: string;
    createdAt: string;
}

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            fetchDashboardData();
        }
    }, [session?.user?.id]);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch("/api/admin/dashboard");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setRecentRequests(data.recent?.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !session.user || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    const statsCards = [
        {
            title: "พนักงานทั้งหมด",
            value: stats?.totalEmployees || 0,
            icon: Users,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            href: "/admin/employees",
        },
        {
            title: "เข้างานวันนี้",
            value: `${stats?.todayAttendance || 0}/${stats?.todayExpected || 0}`,
            subtitle: `${stats?.attendanceRate || 0}%`,
            icon: Clock,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            href: "/admin/attendance",
        },
        {
            title: "รอการอนุมัติ",
            value: stats?.pendingApprovals || 0,
            icon: ClipboardCheck,
            color: stats?.pendingApprovals && stats.pendingApprovals > 0 ? "text-amber-500" : "text-slate-500",
            bgColor: stats?.pendingApprovals && stats.pendingApprovals > 0 ? "bg-amber-500/10" : "bg-slate-500/10",
            href: "/admin/approvals",
            badge: stats?.pendingApprovals ? stats.pendingApprovals : undefined,
        },
        {
            title: "Open Shifts",
            value: stats?.openShifts || 0,
            icon: Shuffle,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            href: "/admin/shift-pool",
        },
    ];

    const quickActions = [
        { title: "จัดการพนักงาน", icon: Users, href: "/admin/employees", color: "text-blue-500" },
        { title: "สถานี/แผนก", icon: Building2, href: "/admin/stations", color: "text-cyan-500" },
        { title: "ตารางกะ", icon: Calendar, href: "/admin/shifts", color: "text-indigo-500" },
        { title: "Shift Pool", icon: Shuffle, href: "/admin/shift-pool", color: "text-purple-500" },
        { title: "Availability", icon: CalendarDays, href: "/admin/availability", color: "text-pink-500" },
        { title: "เงินเดือน", icon: Wallet, href: "/admin/payroll", color: "text-green-500" },
        { title: "รายงาน", icon: FileText, href: "/admin/reports", color: "text-orange-500" },
        { title: "QR Codes", icon: QrCode, href: "/admin/qr-codes", color: "text-teal-500" },
    ];

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

                {/* Stats Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="p-6">
                                    <div className="h-16 bg-muted rounded" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statsCards.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <Link key={stat.title} href={stat.href}>
                                    <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                                        <CardContent className="p-4 lg:p-6">
                                            <div className="flex items-start justify-between">
                                                <div className={`p-2 lg:p-3 rounded-xl ${stat.bgColor}`}>
                                                    <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`} />
                                                </div>
                                                {stat.badge && stat.badge > 0 && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        {stat.badge}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="mt-3 lg:mt-4">
                                                <p className="text-xl lg:text-2xl font-bold text-foreground">
                                                    {stat.value}
                                                </p>
                                                {stat.subtitle && (
                                                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                                                )}
                                                <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                                                    {stat.title}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}

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

                {/* Approval Summary (if pending) */}
                {stats && stats.pendingApprovals > 0 && (
                    <Card className="border-amber-500/50 bg-amber-500/5">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/10">
                                        <AlertCircle className="w-5 h-5 text-amber-500" />
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
            </div>
        </>
    );
}
