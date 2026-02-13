"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { statusPastelColors } from "@/lib/pastel-colors";

interface DailyAttendance {
    date: string;     // "2026-02-01"
    onTime: number;
    late: number;
    absent: number;
}

interface AttendanceCalendarProps {
    data: DailyAttendance[];
    currentMonth?: number; // 0-indexed
    currentYear?: number;
}

const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function AttendanceCalendar({ data, currentMonth, currentYear }: AttendanceCalendarProps) {
    const now = new Date();
    const month = currentMonth ?? now.getMonth();
    const year = currentYear ?? now.getFullYear();

    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = now.getDate();

        // Build lookup
        const lookup = new Map<number, DailyAttendance>();
        data.forEach((d) => {
            const parts = d.date.split("-");
            const day = parseInt(parts[2], 10);
            lookup.set(day, d);
        });

        const cells: Array<{
            day: number | null;
            isToday: boolean;
            isWeekend: boolean;
            data: DailyAttendance | null;
        }> = [];

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            cells.push({ day: null, isToday: false, isWeekend: false, data: null });
        }

        // Days of month
        for (let d = 1; d <= daysInMonth; d++) {
            const dayOfWeek = (firstDay + d - 1) % 7;
            cells.push({
                day: d,
                isToday: d === today && month === now.getMonth() && year === now.getFullYear(),
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                data: lookup.get(d) || null,
            });
        }

        return cells;
    }, [data, month, year]);

    const monthName = new Date(year, month).toLocaleDateString("th-TH", {
        month: "long",
        year: "numeric",
    });

    // Max dots to show
    const MAX_DOTS = 5;

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">ภาพรวม Attendance</CardTitle>
                </div>
                <CardDescription>{monthName}</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAY_NAMES.map((name, i) => (
                        <div
                            key={name}
                            className={`text-center text-xs font-medium py-1 ${i === 0 || i === 6 ? "text-rose-400" : "text-muted-foreground"
                                }`}
                        >
                            {name}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cell, idx) => (
                        <div
                            key={idx}
                            className={`
                                relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors
                                ${cell.day === null ? "" : "hover:bg-muted/50 cursor-pointer"}
                                ${cell.isToday ? "ring-2 ring-primary/50 bg-primary/5" : ""}
                                ${cell.isWeekend && cell.day !== null ? "bg-amber-50/40 dark:bg-amber-900/5" : ""}
                            `}
                        >
                            {cell.day !== null && (
                                <Link
                                    href={`/admin/attendance?date=${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`}
                                    className="flex flex-col items-center gap-0.5 w-full h-full justify-center"
                                >
                                    <span className={`text-xs font-medium ${cell.isToday ? "text-primary font-bold" : "text-foreground"}`}>
                                        {cell.day}
                                    </span>
                                    {cell.data && (
                                        <div className="flex gap-[2px] flex-wrap justify-center max-w-[32px]">
                                            {/* On-time dots */}
                                            {Array.from({ length: Math.min(cell.data.onTime, MAX_DOTS) }).map((_, i) => (
                                                <span key={`g${i}`} className={`w-1.5 h-1.5 rounded-full ${statusPastelColors.onTime.dot}`} />
                                            ))}
                                            {/* Late dots */}
                                            {Array.from({ length: Math.min(cell.data.late, MAX_DOTS) }).map((_, i) => (
                                                <span key={`a${i}`} className={`w-1.5 h-1.5 rounded-full ${statusPastelColors.late.dot}`} />
                                            ))}
                                            {/* Absent dots */}
                                            {Array.from({ length: Math.min(cell.data.absent, MAX_DOTS) }).map((_, i) => (
                                                <span key={`r${i}`} className={`w-1.5 h-1.5 rounded-full ${statusPastelColors.absent.dot}`} />
                                            ))}
                                        </div>
                                    )}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusPastelColors.onTime.dot}`} />
                        <span className="text-xs text-muted-foreground">ตรงเวลา</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusPastelColors.late.dot}`} />
                        <span className="text-xs text-muted-foreground">สาย</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusPastelColors.absent.dot}`} />
                        <span className="text-xs text-muted-foreground">ขาด</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
