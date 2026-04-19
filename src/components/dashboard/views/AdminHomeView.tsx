"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { AttendanceCalendar } from "@/components/dashboard";
import { RightMenuDrawer } from "@/components/layout/RightMenuDrawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Users,
    Clock,
    Calendar,
    AlertCircle,
    Loader2,
    CalendarDays,
    MapPin,
    Phone,
    LogIn,
    LogOut,
    CheckCircle2,
    MessageCircle,
    Shuffle,
    Menu,
    Megaphone,
    Plus,
    Pencil,
    Trash2,
    Pin,
    Send,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
    presentEmployees: any[];
}

interface AnnouncementItem {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    isActive: boolean;
    createdAt: string;
    readCount: number;
    author: { name: string; nickName: string | null };
}

export function AdminHomeView() {
    const { data: session, status } = useSession();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAbsentDialogOpen, setIsAbsentDialogOpen] = useState(false);
    const [isPresentDialogOpen, setIsPresentDialogOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Announcement management state
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
    const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
    const [annTitle, setAnnTitle] = useState("");
    const [annContent, setAnnContent] = useState("");
    const [annIsPinned, setAnnIsPinned] = useState(false);
    const [annSubmitting, setAnnSubmitting] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            void fetchDashboardData();
        }
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        
        const handleOpenPresent = () => setIsPresentDialogOpen(true);
        document.addEventListener("open-present-modal", handleOpenPresent);
        
        if (typeof window !== "undefined") {
            const sp = new URLSearchParams(window.location.search);
            if (sp.get("openPresent") === "true") {
                setIsPresentDialogOpen(true);
                window.history.replaceState({}, "", "/");
            }
        }

        return () => {
            clearInterval(timer);
            document.removeEventListener("open-present-modal", handleOpenPresent);
        };
    }, [session?.user?.id]);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch("/api/admin/dashboard");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setMonthlyAttendance(data.monthlyAttendance || []);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch("/api/announcements?limit=10");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data.announcements || []);
            }
        } catch (e) {
            console.error("Failed to fetch announcements:", e);
        }
    };

    useEffect(() => {
        if (session?.user?.id) fetchAnnouncements();
    }, [session?.user?.id]);

    const openCreateForm = () => {
        setEditingAnnouncement(null);
        setAnnTitle("");
        setAnnContent("");
        setAnnIsPinned(false);
        setIsAnnouncementFormOpen(true);
    };

    const openEditForm = (ann: AnnouncementItem) => {
        setEditingAnnouncement(ann);
        setAnnTitle(ann.title === "ข้อความ" ? "" : ann.title);
        setAnnContent(ann.content);
        setAnnIsPinned(ann.isPinned);
        setIsAnnouncementFormOpen(true);
    };

    const handleSubmitAnnouncement = async () => {
        if (!annContent.trim()) {
            toast.error("กรุณากรอกข้อความ");
            return;
        }
        setAnnSubmitting(true);
        try {
            const url = editingAnnouncement
                ? `/api/announcements/${editingAnnouncement.id}`
                : "/api/announcements";
            const method = editingAnnouncement ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: annTitle.trim() || "ข้อความ",
                    content: annContent.trim(),
                    isPinned: annIsPinned,
                }),
            });
            if (res.ok) {
                toast.success(editingAnnouncement ? "แก้ไขประกาศสำเร็จ" : "สร้างประกาศสำเร็จ");
                setIsAnnouncementFormOpen(false);
                fetchAnnouncements();
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setAnnSubmitting(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm("ต้องการลบประกาศนี้หรือไม่?")) return;
        try {
            const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("ลบประกาศสำเร็จ");
                fetchAnnouncements();
            } else {
                toast.error("ลบไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-zinc-900">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
            </div>
        );
    }

    if (!session || !session.user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
        redirect("/");
    }

    // Circular Progress helper Component
    const CircularProgress = ({ value, label, subtitle, color, isFraction }: { value: number, label: string, subtitle: string, color: string, isFraction?: boolean }) => {
        const radius = 35;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (isFraction ? ((value || 0) / 100) : (value / 100)) * circumference;

        return (
            <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center mb-2">
                    <svg className="transform -rotate-90 w-24 h-24">
                        <circle
                            cx="48" cy="48" r={radius}
                            stroke="currentColor" strokeWidth="4" fill="transparent"
                            className="text-gray-100 dark:text-zinc-700"
                        />
                        <circle
                            cx="48" cy="48" r={radius}
                            stroke={color} strokeWidth="4" fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            {isFraction ? value : `${Math.round(value)}%`}
                        </span>
                    </div>
                </div>
                <p className="text-[12px] font-bold text-gray-700 dark:text-gray-300">{label}</p>
                <div className="flex justify-between w-full mt-2 px-1 gap-2">
                    <div className="text-center font-semibold text-[9px] text-gray-400">
                        <p>{subtitle.split("|")[0]}</p>
                    </div>
                    <div className="text-center font-semibold text-[9px] text-gray-400">
                        <p>{subtitle.split("|")[1]}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f8f9fa] dark:bg-zinc-900 pb-28 font-sans relative overflow-x-hidden">
            {/* Header Area */}
            <div className="relative z-10">
                <div className="bg-[#fbbf24] pt-10 pb-6 px-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-[20px] font-black text-black leading-tight">
                                สวัสดี, {session.user.name}
                            </h1>
                            <p className="text-[12px] font-bold text-black/60 mt-0.5">
                                {session.user.role === "CASHIER" ? "แดชบอร์ดเสมียน" :
                                 session.user.role === "MANAGER" ? "แดชบอร์ดผู้จัดการ" :
                                 "แดชบอร์ดผู้ดูแลระบบ"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button className="p-2 bg-black/10 rounded-xl" onClick={() => setIsMenuOpen(true)}>
                                <Menu className="w-4 h-4 text-black" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2 pb-6">
                        <div className="text-center w-[28%]">
                            <p className="text-3xl font-black text-black leading-none">{stats?.todayAttendance || 0}</p>
                            <p className="text-[10px] font-bold text-black/70 uppercase tracking-wider mt-1.5">เข้างานแล้ว</p>
                        </div>
                        <div className="w-[36%]" />
                        <div className="text-center w-[28%]">
                            <p className="text-3xl font-black text-black leading-none">{stats?.absentEmployees?.length || 0}</p>
                            <p className="text-[10px] font-bold text-black/70 uppercase tracking-wider mt-1.5 leading-tight">ยังไม่เข้างาน</p>
                        </div>
                    </div>
                </div>

                {/* SVG Curve */}
                <svg viewBox="0 0 100 30" className="w-full block -mt-px pointer-events-none" preserveAspectRatio="none" style={{ height: '70px' }}>
                    <path d="M0,0 Q50,35 100,0 Z" fill="#fbbf24" />
                </svg>

                {/* Floating Metrics Circle */}
                <div className="absolute left-1/2 bottom-[25px] -translate-x-1/2 z-20 pointer-events-none">
                    <div className="w-[130px] h-[130px] rounded-full bg-[#fae075] shadow-[0_8px_32px_rgb(0,0,0,0.15)] flex flex-col items-center justify-center border-[3px] border-white/50">
                        <Link href="/admin/approvals" className="w-[110px] h-[110px] border-2 border-[#f3c740] rounded-full flex flex-col items-center justify-center bg-[#fae075] active:scale-95 transition-transform shadow-inner pointer-events-auto">
                            <p className="text-[34px] font-black text-black leading-none mt-1">{stats?.pendingApprovals || 0}</p>
                            <p className="text-[10px] font-bold text-black/70 text-center leading-tight mt-0.5 px-2 uppercase tracking-tight">คำขอรออนุมัติ</p>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="px-4 pt-12 pb-10 space-y-4 relative z-10 w-full max-w-[500px] mx-auto">
                {/* Date & Time */}
                <div className="bg-white dark:bg-zinc-800 rounded-[22px] py-4 px-5 flex items-center justify-center gap-3 shadow-[0_2px_14px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700">
                    <CalendarDays className="w-5 h-5 text-gray-400 shrink-0" />
                    <p className="text-[15px] font-bold text-gray-700 dark:text-gray-200">
                        วันนี้, {format(currentTime, "d MMM yyyy - HH:mm น.", { locale: th })}
                    </p>
                </div>

                {/* Manual Check In Button Card */}
                <Link href="/admin/attendance?manual=true" className="block relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[28px] p-5 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform border border-blue-400/30">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner overflow-hidden relative">
                                <Plus className="w-6 h-6 text-white" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20 pointer-events-none" />
                            </div>
                            <div>
                                <p className="text-[18px] font-black text-white leading-tight mb-0.5 mt-0.5">เช็คอินแทน</p>
                                <p className="text-[12px] font-medium text-blue-100 opacity-90 leading-tight">
                                    ลงเวลาแทนพนักงานที่ไม่มีมือถือ
                                </p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>

                {/* In / Out Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button className="bg-white dark:bg-zinc-800 rounded-2xl p-3 flex items-center justify-center gap-2 shadow-sm border border-gray-100 dark:border-zinc-700 active:scale-95 transition-transform" onClick={() => setIsPresentDialogOpen(true)}>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <LogIn className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-left leading-tight">
                            <p className="text-[11px] font-bold text-gray-500">พนักงานที่มา</p>
                            <p className="text-sm font-black text-black dark:text-white">{stats?.todayAttendance || 0}</p>
                        </div>
                    </button>
                    <button className="bg-white dark:bg-zinc-800 rounded-2xl p-3 flex items-center justify-center gap-2 shadow-sm border border-gray-100 dark:border-zinc-700 active:scale-95 transition-transform" onClick={() => setIsAbsentDialogOpen(true)}>
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="text-left leading-tight">
                            <p className="text-[11px] font-bold text-gray-500">ขาด / ยังไม่มา</p>
                            <p className="text-sm font-black text-black dark:text-white">{stats?.absentEmployees?.length || 0}</p>
                        </div>
                    </button>
                </div>

                {/* Grid Links */}
                <div className="bg-white dark:bg-zinc-800 rounded-[28px] p-5 shadow-[0_2px_14px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700 grid grid-cols-4 gap-4">
                    <Link href="/admin/employees" className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                        <div className="w-12 h-12 rounded-[18px] bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center relative">
                            <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                            <span className="absolute -bottom-1 absolute font-bold text-[10px] text-sky-600 dark:text-sky-400 drop-shadow-sm">{stats?.totalEmployees || 0}</span>
                        </div>
                        <p className="text-[10px] font-bold tracking-tight text-gray-600 dark:text-gray-300 text-center leading-tight mt-1">ทั้งหมด</p>
                    </Link>
                    <Link href="/admin/approvals?tab=swap" className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                        <div className="w-12 h-12 rounded-[18px] bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center relative">
                            <Shuffle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <span className="absolute -bottom-1 absolute font-bold text-[10px] text-purple-600 dark:text-purple-400 drop-shadow-sm">{stats?.pendingShiftSwaps || 0}</span>
                        </div>
                        <p className="text-[10px] font-bold tracking-tight text-gray-600 dark:text-gray-300 text-center leading-tight mt-1">สลับกะ</p>
                    </Link>
                    <Link href="/admin/approvals?tab=time" className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                        <div className="w-12 h-12 rounded-[18px] bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center relative">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <span className="absolute -bottom-1 absolute font-bold text-[10px] text-amber-600 dark:text-amber-400 drop-shadow-sm">{stats?.pendingTimeCorrections || 0}</span>
                        </div>
                        <p className="text-[10px] font-bold tracking-tight text-gray-600 dark:text-gray-300 text-center leading-tight mt-1">แก้ไขเวลา</p>
                    </Link>
                    <Link href="/admin/approvals?tab=leave" className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                        <div className="w-12 h-12 rounded-[18px] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center relative">
                            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <span className="absolute -bottom-1 absolute font-bold text-[10px] text-emerald-600 dark:text-emerald-400 drop-shadow-sm">{stats?.pendingLeaves || 0}</span>
                        </div>
                        <p className="text-[10px] font-bold tracking-tight text-gray-600 dark:text-gray-300 text-center leading-tight mt-1">ลางาน</p>
                    </Link>
                </div>

                {/* Circular Charts */}
                <div className="bg-white dark:bg-zinc-800 rounded-[28px] p-6 shadow-[0_2px_14px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700 grid grid-cols-2 gap-4">
                    <CircularProgress
                        value={stats?.attendanceRate || 0}
                        label="อัตราการเข้างาน"
                        color="#fbbf24"
                        subtitle={`มาแล้ว: ${stats?.todayAttendance || 0}|ทั้งหมด: ${stats?.todayExpected || 0}`}
                    />
                    <CircularProgress
                        value={stats?.openShifts || 0}
                        label="กะที่เปิดว่าง"
                        color="#a855f7"
                        isFraction={true}
                        subtitle={`ว่าจ้าง: 0|ขาดแคลน: ${stats?.openShifts || 0}`}
                    />
                </div>

                {/* Announcements Management */}
                <div className="bg-white dark:bg-zinc-800 rounded-[28px] p-5 shadow-[0_2px_14px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-zinc-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <Megaphone className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-[14px] font-black text-gray-800 dark:text-gray-200">จัดการประกาศ</h3>
                        </div>
                        <button
                            onClick={openCreateForm}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#fbbf24] text-black text-[11px] font-bold active:scale-95 transition-transform"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            สร้างประกาศ
                        </button>
                    </div>

                    {/* Create / Edit Form */}
                    {isAnnouncementFormOpen && (
                        <div className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                    {editingAnnouncement ? "✏️ แก้ไขประกาศ" : "📢 สร้างประกาศใหม่"}
                                </p>
                                <button onClick={() => setIsAnnouncementFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="หัวข้อ (ไม่บังคับ)"
                                value={annTitle}
                                onChange={(e) => setAnnTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-white dark:bg-zinc-800 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 mb-2"
                            />
                            <textarea
                                placeholder="พิมพ์ข้อความประกาศ..."
                                rows={3}
                                value={annContent}
                                onChange={(e) => setAnnContent(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-white dark:bg-zinc-800 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                            />
                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={() => setAnnIsPinned(!annIsPinned)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                                        annIsPinned
                                            ? "bg-amber-500 text-white"
                                            : "bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400"
                                    }`}
                                >
                                    <Pin className="w-3 h-3" />
                                    {annIsPinned ? "ปักหมุดอยู่" : "ปักหมุด"}
                                </button>
                                <button
                                    onClick={handleSubmitAnnouncement}
                                    disabled={annSubmitting || !annContent.trim()}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#fbbf24] text-black text-[12px] font-bold active:scale-95 transition-transform disabled:opacity-50"
                                >
                                    {annSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    {editingAnnouncement ? "บันทึก" : "ส่งประกาศ"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Announcements List */}
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                        {announcements.length === 0 ? (
                            <p className="text-center text-gray-400 text-xs py-6">ยังไม่มีประกาศ</p>
                        ) : (
                            announcements.map((ann) => (
                                <div
                                    key={ann.id}
                                    className="p-3 rounded-2xl border border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {ann.isPinned && (
                                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">📌 ปักหมุด</span>
                                                )}
                                                {ann.title !== "ข้อความ" && (
                                                    <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 truncate">{ann.title}</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[9px] text-gray-400">
                                                    {format(new Date(ann.createdAt), "d MMM HH:mm", { locale: th })}
                                                </span>
                                                <span className="text-[9px] text-gray-400">
                                                    โดย {ann.author.nickName || ann.author.name}
                                                </span>
                                                <span className="text-[9px] text-gray-400">
                                                    👁 {ann.readCount}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => openEditForm(ann)}
                                                className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-gray-400 hover:text-amber-600 transition-colors"
                                                title="แก้ไข"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                                                title="ลบ"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Calendar */}
                <div className="mt-4">
                    <AttendanceCalendar data={monthlyAttendance} />
                </div>
            </main>

            {/* Absent Employees Dialog */}
            <Dialog open={isAbsentDialogOpen} onOpenChange={setIsAbsentDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            รายชื่อผู้ขาดงานวันนี้ ({stats?.absentEmployees?.length || 0})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-4">
                        {stats?.absentEmployees?.map((emp) => (
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
                                                {emp.leaveStatus === "PENDING" ? "รอลา" : "ลาถูกปฏิเสธ"} ({emp.leaveType})
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

                                    {emp.overlaps?.length > 0 && (
                                        <div className="mt-2 text-xs bg-red-50 text-red-600 p-2 rounded-md border border-red-100 flex items-start gap-1">
                                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                            <span>
                                                <strong>หยดชนกัน:</strong> {emp.overlaps.join(", ")} ก็หยุดเช่นกัน
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

            {/* Present Employees Dialog */}
            <Dialog open={isPresentDialogOpen} onOpenChange={setIsPresentDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LogIn className="h-5 w-5 text-emerald-500" />
                            พนักงานที่มาทำงานวันนี้ ({stats?.presentEmployees?.length || 0})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-3">
                        {stats?.presentEmployees?.length === 0 ? (
                            <p className="text-center text-gray-500 py-6">ยังไม่มีผู้ลงเวลาเข้างานในขณะนี้</p>
                        ) : (
                            stats?.presentEmployees?.map((emp) => (
                                <div key={emp.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                            {(emp.nickName || emp.name).charAt(0)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-foreground truncate">
                                            {emp.nickName ? `${emp.nickName} (${emp.name})` : emp.name}
                                        </p>
                                        <div className="flex items-center text-xs text-muted-foreground mt-0.5 gap-1">
                                            <MapPin className="h-3 w-3" />
                                            <span className="truncate">{emp.station}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                                        Online
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <RightMenuDrawer
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                hasAdminAccess={true}
            />
        </div>
    );
}

