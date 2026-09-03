"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Loader2,
    Download,
    List,
    Grid3X3,
} from "lucide-react";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { formatThaiDate, addDays, subDays, startOfDay, format } from "@/lib/date-utils";
import { toast } from "sonner";

interface ShiftAssignment {
    id: string;
    date: string;
    isDayOff?: boolean;
    shift: {
        name: string;
        code: string;
        startTime: string;
        endTime: string;
    };
}

type ViewMode = "week" | "month";

export default function SchedulePage() {
    const { data: session, status } = useSession();
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return startOfDay(new Date(today.setDate(diff)));
    });
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Calculate date range based on view mode
    const dateRange = useMemo(() => {
        if (viewMode === "week") {
            return {
                start: currentWeekStart,
                end: addDays(currentWeekStart, 6),
            };
        } else {
            const firstDay = new Date(currentYear, currentMonth, 1);
            const lastDay = new Date(currentYear, currentMonth + 1, 0);
            return { start: firstDay, end: lastDay };
        }
    }, [viewMode, currentWeekStart, currentMonth, currentYear]);

    const fetchSchedule = useCallback(async () => {
        setIsLoading(true);
        try {
            const startDate = format(dateRange.start, "yyyy-MM-dd");
            const endDate = format(dateRange.end, "yyyy-MM-dd");

            const res = await fetch(`/api/shifts/my-schedule?startDate=${startDate}&endDate=${endDate}`);
            if (res.ok) {
                const data = await res.json();
                setAssignments(data.assignments || []);
            }
        } catch (error) {
            console.error("Failed to fetch schedule:", error);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        if (session?.user?.id) {
            void fetchSchedule();
        }
    }, [session?.user?.id, fetchSchedule]);

    // Week navigation
    const goToPreviousWeek = () => setCurrentWeekStart(subDays(currentWeekStart, 7));
    const goToNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
    const goToCurrentWeek = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        setCurrentWeekStart(startOfDay(new Date(today.setDate(diff))));
    };

    // Month navigation
    const goToPreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };
    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };
    const goToCurrentMonth = () => {
        setCurrentMonth(new Date().getMonth());
        setCurrentYear(new Date().getFullYear());
    };

    // Export handler
    const handleExport = async (exportFormat: "csv" | "pdf") => {
        setIsExporting(true);
        try {
            const startDate = format(dateRange.start, "yyyy-MM-dd");
            const endDate = format(dateRange.end, "yyyy-MM-dd");

            const res = await fetch(`/api/schedule/export?startDate=${startDate}&endDate=${endDate}&format=${exportFormat}`);

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `schedule_${startDate}_${endDate}.${exportFormat}`;
                a.click();
                window.URL.revokeObjectURL(url);
                toast.success("ดาวน์โหลดสำเร็จ");
            } else {
                toast.error("ไม่สามารถดาวน์โหลดได้");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsExporting(false);
        }
    };

    // Generate week days
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(currentWeekStart, i);
        const dateStr = format(date, "yyyy-MM-dd");
        const assignment = assignments.find((a) => a.date.split("T")[0] === dateStr);
        return { date, assignment };
    });

    // Generate month calendar
    const monthCalendar = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startPadding = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const weeks: { date: Date | null; assignment: ShiftAssignment | undefined }[][] = [];
        let currentWeek: { date: Date | null; assignment: ShiftAssignment | undefined }[] = [];

        for (let i = 0; i < startPadding; i++) {
            currentWeek.push({ date: null, assignment: undefined });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = format(date, "yyyy-MM-dd");
            const assignment = assignments.find((a) => a.date.split("T")[0] === dateStr);
            currentWeek.push({ date, assignment });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push({ date: null, assignment: undefined });
            }
            weeks.push(currentWeek);
        }

        return weeks;
    }, [currentYear, currentMonth, assignments]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const weekEndDate = addDays(currentWeekStart, 6);
    const monthNames = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];
    const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

    const getShiftColor = (code: string) => {
        const colors: Record<string, string> = {
            A: "bg-blue-500", B: "bg-emerald-500", C: "bg-purple-500",
            D: "bg-amber-500", E: "bg-rose-500", F: "bg-cyan-500",
        };
        return colors[code] || "bg-zinc-500";
    };

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="SCHEDULE"
                title="ตารางกะการทำงาน"
                subtitle="ตรวจสอบตารางกะเวรและวันหยุดประจำรอบ"
                backHref="/"
                right={
                    <button
                        onClick={() => handleExport("csv")}
                        disabled={isExporting}
                        className="tt-retro-control mt-0.5 grid h-11 px-3 place-items-center rounded-full border-[1.5px] border-black/70 bg-zinc-950 text-[#fbbf24] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)] text-[11px] font-black flex-row gap-1 active:scale-95 disabled:opacity-50"
                        title="ดาวน์โหลดตารางกะ CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                    </button>
                }
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-3.5">
                {/* View Mode Toggle */}
                <div className="tt-paper-card tt-instrument-frame p-1 rounded-2xl border border-zinc-700/30 flex gap-1">
                    <button
                        onClick={() => setViewMode("week")}
                        className={`flex-1 h-9 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                            viewMode === "week"
                                ? "bg-[#fbbf24] text-zinc-950 shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-black/15"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                        }`}
                    >
                        <List className="w-3.5 h-3.5" />
                        มุมมองสัปดาห์
                    </button>
                    <button
                        onClick={() => setViewMode("month")}
                        className={`flex-1 h-9 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                            viewMode === "month"
                                ? "bg-[#fbbf24] text-zinc-950 shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-black/15"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                        }`}
                    >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        มุมมองเดือน
                    </button>
                </div>

                {/* Stepper Navigation */}
                <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 dark:border-white/15 p-2.5 flex items-center justify-between shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                    <button
                        onClick={viewMode === "week" ? goToPreviousWeek : goToPreviousMonth}
                        className="tt-retro-control w-9 h-9 rounded-full border border-black/20 bg-white/60 dark:bg-zinc-800 flex items-center justify-center active:scale-95 text-zinc-800 dark:text-zinc-100"
                        aria-label="ย้อนหลัง"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-center">
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 block">
                            {viewMode === "week"
                                ? `${formatThaiDate(currentWeekStart, "d MMM")} - ${formatThaiDate(weekEndDate, "d MMM yyyy")}`
                                : `${monthNames[currentMonth]} ${currentYear + 543}`}
                        </span>
                        <button
                            onClick={viewMode === "week" ? goToCurrentWeek : goToCurrentMonth}
                            className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
                        >
                            {viewMode === "week" ? "กลับสู่สัปดาห์นี้" : "กลับสู่เดือนนี้"}
                        </button>
                    </div>
                    <button
                        onClick={viewMode === "week" ? goToNextWeek : goToNextMonth}
                        className="tt-retro-control w-9 h-9 rounded-full border border-black/20 bg-white/60 dark:bg-zinc-800 flex items-center justify-center active:scale-95 text-zinc-800 dark:text-zinc-100"
                        aria-label="ถัดไป"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Schedule Content */}
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-7 h-7 animate-spin text-[#fbbf24]" />
                    </div>
                ) : viewMode === "week" ? (
                    /* Week View */
                    <div className="space-y-2">
                        {weekDays.map(({ date, assignment }) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isPast = date < new Date() && !isToday;

                            return (
                                <div
                                    key={date.toISOString()}
                                    className={`tt-paper-card tt-instrument-frame rounded-[18px] border p-3 transition-all ${
                                        isToday
                                            ? "border-amber-500/80 bg-amber-500/10 shadow-[0_2px_8px_rgba(251,191,36,0.15)]"
                                            : isPast
                                                ? "border-zinc-700/20 opacity-70"
                                                : "border-zinc-700/30"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border ${
                                                    isToday
                                                        ? "bg-[#fbbf24] text-zinc-950 border-black/20 font-black"
                                                        : "bg-black/[0.04] dark:bg-white/[0.04] border-zinc-700/15"
                                                }`}
                                            >
                                                <span className="text-[9px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
                                                    {formatThaiDate(date, "EEE")}
                                                </span>
                                                <span className="text-base font-black leading-none mt-0.5">
                                                    {formatThaiDate(date, "d")}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">
                                                        {formatThaiDate(date, "EEEE")}
                                                    </p>
                                                    {isToday && (
                                                        <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-[#fbbf24] text-zinc-950">
                                                            วันนี้
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                                    {formatThaiDate(date, "d MMMM yyyy")}
                                                </p>
                                            </div>
                                        </div>

                                        {assignment ? (
                                            assignment.isDayOff ? (
                                                <Badge className="border border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400 text-[10px] font-black">
                                                    วันหยุดประจำสัปดาห์
                                                </Badge>
                                            ) : (
                                                <div className="text-right">
                                                    <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black">
                                                        กะ {assignment.shift.name} ({assignment.shift.code})
                                                    </Badge>
                                                    <p className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 mt-1 flex items-center gap-1 justify-end">
                                                        <Clock className="w-3 h-3 text-zinc-400" />
                                                        {assignment.shift.startTime} - {assignment.shift.endTime}
                                                    </p>
                                                </div>
                                            )
                                        ) : (
                                            <Badge variant="outline" className="border-zinc-700/20 text-zinc-400 text-[10px] font-bold">
                                                ไม่มีกะ
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Month View */
                    <div className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 p-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map((day, i) => (
                                <div
                                    key={day}
                                    className={`text-center text-[10px] font-mono font-black py-1 ${
                                        i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-zinc-400"
                                    }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>
                        {/* Calendar grid */}
                        <div className="space-y-1">
                            {monthCalendar.map((week, weekIdx) => (
                                <div key={weekIdx} className="grid grid-cols-7 gap-1">
                                    {week.map(({ date, assignment }, dayIdx) => {
                                        if (!date) {
                                            return <div key={dayIdx} className="aspect-square" />;
                                        }
                                        const isToday = date.toDateString() === new Date().toDateString();
                                        const isSunday = dayIdx === 0;
                                        const isSaturday = dayIdx === 6;

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-xs relative border transition-all ${
                                                    isToday
                                                        ? "border-amber-500 bg-amber-500/15 font-black ring-2 ring-[#fbbf24]/50"
                                                        : assignment
                                                            ? assignment.isDayOff
                                                                ? "bg-red-500/10 border-red-500/20"
                                                                : "bg-black/[0.02] dark:bg-white/[0.02] border-zinc-700/15"
                                                            : "bg-transparent border-transparent"
                                                }`}
                                            >
                                                <span
                                                    className={`text-[11px] font-bold ${
                                                        isToday
                                                            ? "text-amber-700 dark:text-amber-300 font-black"
                                                            : isSunday
                                                                ? "text-red-500"
                                                                : isSaturday
                                                                    ? "text-blue-500"
                                                                    : "text-zinc-800 dark:text-zinc-200"
                                                    }`}
                                                >
                                                    {date.getDate()}
                                                </span>
                                                {assignment && !assignment.isDayOff && (
                                                    <span
                                                        className={`text-[8px] font-mono font-black text-white px-1 rounded mt-0.5 ${getShiftColor(
                                                            assignment.shift.code
                                                        )}`}
                                                    >
                                                        {assignment.shift.code}
                                                    </span>
                                                )}
                                                {assignment?.isDayOff && (
                                                    <span className="text-[8px] font-bold text-red-500 mt-0.5">
                                                        หยุด
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

