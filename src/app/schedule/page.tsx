"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Loader2,
    Download,
    List,
    Grid3X3,
} from "lucide-react";
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

    useEffect(() => {
        if (session?.user?.id) {
            fetchSchedule();
        }
    }, [session?.user?.id, dateRange]);

    const fetchSchedule = async () => {
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
    };

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

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

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
        const startPadding = firstDay.getDay(); // Days to pad at start
        const daysInMonth = lastDay.getDate();

        const weeks: { date: Date | null; assignment: ShiftAssignment | undefined }[][] = [];
        let currentWeek: { date: Date | null; assignment: ShiftAssignment | undefined }[] = [];

        // Add padding for first week
        for (let i = 0; i < startPadding; i++) {
            currentWeek.push({ date: null, assignment: undefined });
        }

        // Add days
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

        // Add padding for last week
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push({ date: null, assignment: undefined });
            }
            weeks.push(currentWeek);
        }

        return weeks;
    }, [currentYear, currentMonth, assignments]);

    const weekEndDate = addDays(currentWeekStart, 6);
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

    const getShiftColor = (code: string) => {
        const colors: Record<string, string> = {
            A: "bg-blue-500", B: "bg-green-500", C: "bg-purple-500",
            D: "bg-orange-500", E: "bg-pink-500", F: "bg-cyan-500",
        };
        return colors[code] || "bg-slate-500";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                        <a href="/">
                            <ChevronLeft className="w-5 h-5" />
                        </a>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-white">ตารางกะ</h1>
                        <p className="text-sm text-slate-400">{session.user.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300"
                        onClick={() => handleExport("csv")}
                        disabled={isExporting}
                    >
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                    </Button>
                </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-center mb-4">
                <div className="bg-slate-800 rounded-lg p-1 flex gap-1">
                    <Button
                        variant={viewMode === "week" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("week")}
                        className={viewMode === "week" ? "bg-blue-600" : "text-slate-400"}
                    >
                        <List className="w-4 h-4 mr-1" />
                        สัปดาห์
                    </Button>
                    <Button
                        variant={viewMode === "month" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("month")}
                        className={viewMode === "month" ? "bg-blue-600" : "text-slate-400"}
                    >
                        <Grid3X3 className="w-4 h-4 mr-1" />
                        เดือน
                    </Button>
                </div>
            </div>

            {/* Navigation */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" onClick={viewMode === "week" ? goToPreviousWeek : goToPreviousMonth}>
                            <ChevronLeft className="w-5 h-5 text-slate-400" />
                        </Button>
                        <div className="text-center">
                            <p className="text-white font-medium">
                                {viewMode === "week"
                                    ? `${formatThaiDate(currentWeekStart, "d MMM")} - ${formatThaiDate(weekEndDate, "d MMM yyyy")}`
                                    : `${monthNames[currentMonth]} ${currentYear + 543}`
                                }
                            </p>
                            <Button
                                variant="link"
                                className="text-blue-400 text-xs p-0 h-auto"
                                onClick={viewMode === "week" ? goToCurrentWeek : goToCurrentMonth}
                            >
                                {viewMode === "week" ? "สัปดาห์นี้" : "เดือนนี้"}
                            </Button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={viewMode === "week" ? goToNextWeek : goToNextMonth}>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Schedule Content */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : viewMode === "week" ? (
                /* Week View */
                <div className="space-y-3">
                    {weekDays.map(({ date, assignment }) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isPast = date < new Date() && !isToday;

                        return (
                            <Card
                                key={date.toISOString()}
                                className={`border-slate-700 transition-all ${isToday
                                    ? "bg-blue-900/30 border-blue-500/50"
                                    : isPast
                                        ? "bg-slate-800/30 opacity-60"
                                        : "bg-slate-800/50"
                                    }`}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${isToday ? "bg-blue-500" : "bg-slate-700"}`}>
                                                <span className="text-xs text-slate-300">{formatThaiDate(date, "EEE")}</span>
                                                <span className="text-lg font-bold text-white">{formatThaiDate(date, "d")}</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{formatThaiDate(date, "EEEE")}</p>
                                                <p className="text-sm text-slate-400">{formatThaiDate(date, "d MMMM yyyy")}</p>
                                            </div>
                                        </div>

                                        {assignment ? (
                                            assignment.isDayOff ? (
                                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">วันหยุด</Badge>
                                            ) : (
                                                <div className="text-right">
                                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                                        กะ{assignment.shift.name}
                                                    </Badge>
                                                    <p className="text-sm text-slate-300 mt-1 flex items-center gap-1 justify-end">
                                                        <Clock className="w-3 h-3" />
                                                        {assignment.shift.startTime} - {assignment.shift.endTime}
                                                    </p>
                                                </div>
                                            )
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500 border-slate-600">ไม่มีกะ</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                /* Month View */
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-4">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map((day, i) => (
                                <div key={day} className={`text-center text-xs font-medium py-2 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>
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
                                        const isWeekend = dayIdx === 0 || dayIdx === 6;

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative
                                                    ${isToday ? "ring-2 ring-blue-500" : ""}
                                                    ${assignment
                                                        ? assignment.isDayOff
                                                            ? "bg-red-900/30"
                                                            : getShiftColor(assignment.shift.code) + "/30"
                                                        : "bg-slate-700/30"}
                                                `}
                                            >
                                                <span className={`font-medium ${isToday ? "text-blue-400" : isWeekend ? (dayIdx === 0 ? "text-red-400" : "text-blue-400") : "text-white"}`}>
                                                    {date.getDate()}
                                                </span>
                                                {assignment && !assignment.isDayOff && (
                                                    <span className={`text-xs font-bold ${getShiftColor(assignment.shift.code).replace("/30", "")} text-white px-1 rounded`}>
                                                        {assignment.shift.code}
                                                    </span>
                                                )}
                                                {assignment?.isDayOff && (
                                                    <span className="text-xs text-red-400">X</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
