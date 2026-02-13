"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, Users } from "lucide-react";
import { getShiftPastelColor, dayOffPastelColor } from "@/lib/pastel-colors";

interface Shift {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
}

interface ScheduleEmployee {
    employee: {
        id: string;
        name: string;
        nickName: string | null;
        employeeId: string;
        department: string;
        departmentCode: string;
    };
    schedule: Record<string, { shiftId: string; shiftCode: string; isDayOff: boolean } | null>;
}

interface ScheduleData {
    month: number;
    year: number;
    daysInMonth: number;
    shifts: Shift[];
    scheduleData: ScheduleEmployee[];
}

interface ShiftCalendarViewProps {
    scheduleData: ScheduleData;
}

const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

interface DaySummary {
    day: number;
    isWeekend: boolean;
    isToday: boolean;
    shiftCounts: Record<string, number>;
    dayOffCount: number;
    totalAssigned: number;
    unassigned: number;
}

interface EmployeeAssignment {
    employeeId: string;
    name: string;
    nickName: string | null;
    department: string;
    shiftCode: string | null;
    isDayOff: boolean;
    startTime: string;
    endTime: string;
}

export function ShiftCalendarView({ scheduleData }: ShiftCalendarViewProps) {
    const now = new Date();
    const [expandedDay, setExpandedDay] = useState<number | null>(null);

    // Helper to build yyyy-MM-dd date key matching the API format
    const makeDateKey = (year: number, month: number, day: number) => {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };

    const { calendarWeeks, totalEmployees } = useMemo(() => {
        const { month, year, daysInMonth, scheduleData: employees } = scheduleData;
        const total = employees.length;
        const firstDay = new Date(year, month - 1, 1).getDay();

        const days: (DaySummary | null)[] = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = makeDateKey(year, month, d);
            const dayOfWeek = (firstDay + d - 1) % 7;
            const isToday =
                d === now.getDate() &&
                month === now.getMonth() + 1 &&
                year === now.getFullYear();

            const shiftCounts: Record<string, number> = {};
            let dayOffCount = 0;
            let totalAssigned = 0;

            employees.forEach((emp) => {
                const assignment = emp.schedule[dateKey];
                if (assignment) {
                    totalAssigned++;
                    if (assignment.isDayOff) {
                        dayOffCount++;
                    } else {
                        shiftCounts[assignment.shiftCode] = (shiftCounts[assignment.shiftCode] || 0) + 1;
                    }
                }
            });

            days.push({
                day: d,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isToday,
                shiftCounts,
                dayOffCount,
                totalAssigned,
                unassigned: total - totalAssigned,
            });
        }

        while (days.length % 7 !== 0) {
            days.push(null);
        }

        const weeks: (DaySummary | null)[][] = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }

        return { calendarWeeks: weeks, totalEmployees: total };
    }, [scheduleData]);

    // Get detailed employee assignments for the expanded day
    const expandedDayDetails = useMemo<EmployeeAssignment[]>(() => {
        if (expandedDay === null) return [];

        const dateKey = makeDateKey(scheduleData.year, scheduleData.month, expandedDay);
        const shifts = scheduleData.shifts;

        return scheduleData.scheduleData.map((emp) => {
            const assignment = emp.schedule[dateKey];
            const shift = assignment ? shifts.find((s) => s.id === assignment.shiftId) : null;

            return {
                employeeId: emp.employee.employeeId,
                name: emp.employee.nickName || emp.employee.name,
                nickName: emp.employee.nickName,
                department: emp.employee.department,
                shiftCode: assignment?.isDayOff ? "X" : (assignment?.shiftCode || null),
                isDayOff: assignment?.isDayOff || false,
                startTime: shift?.startTime || "-",
                endTime: shift?.endTime || "-",
            };
        }).sort((a, b) => {
            // Sort: assigned first, then by shift code, then unassigned
            if (!a.shiftCode && !b.shiftCode) return 0;
            if (!a.shiftCode) return 1;
            if (!b.shiftCode) return -1;
            if (a.isDayOff && !b.isDayOff) return 1;
            if (!a.isDayOff && b.isDayOff) return -1;
            return (a.startTime || "").localeCompare(b.startTime || "");
        });
    }, [expandedDay, scheduleData]);

    // Group assignments by shift for the detail panel
    const groupedAssignments = useMemo(() => {
        const groups: Record<string, EmployeeAssignment[]> = {};
        const unassigned: EmployeeAssignment[] = [];

        expandedDayDetails.forEach((emp) => {
            if (!emp.shiftCode) {
                unassigned.push(emp);
            } else {
                const key = emp.isDayOff ? "X" : emp.shiftCode;
                if (!groups[key]) groups[key] = [];
                groups[key].push(emp);
            }
        });

        return { groups, unassigned };
    }, [expandedDayDetails]);

    const handleDayClick = (day: number) => {
        setExpandedDay(expandedDay === day ? null : day);
    };

    return (
        <div className="space-y-3">
            <Card className="bg-card border-border">
                <CardContent className="p-4">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {DAY_NAMES.map((name, i) => (
                            <div
                                key={name}
                                className={`text-center text-xs font-semibold py-2 rounded-md ${i === 0 || i === 6
                                    ? "text-rose-400 bg-rose-500/5"
                                    : "text-muted-foreground bg-muted/30"
                                    }`}
                            >
                                {name}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="space-y-2">
                        {calendarWeeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="grid grid-cols-7 gap-2">
                                {week.map((cell, dayIdx) => {
                                    const isExpanded = cell?.day === expandedDay;
                                    return (
                                        <div
                                            key={dayIdx}
                                            className={`
                                                min-h-[100px] rounded-lg border p-2 transition-all
                                                ${cell === null ? "border-transparent" : ""}
                                                ${isExpanded ? "ring-2 ring-primary border-primary/50 bg-primary/5" : ""}
                                                ${cell?.isToday && !isExpanded ? "ring-2 ring-primary/30 border-primary/20 bg-primary/5" : ""}
                                                ${cell && !cell.isToday && !isExpanded && cell.isWeekend ? "border-border/50 bg-amber-50/30 dark:bg-amber-900/5" : ""}
                                                ${cell && !cell.isToday && !isExpanded && !cell.isWeekend ? "border-border/50 bg-card hover:border-border hover:bg-muted/20" : ""}
                                                ${cell ? "cursor-pointer" : ""}
                                            `}
                                            onClick={() => cell && handleDayClick(cell.day)}
                                        >
                                            {cell && (
                                                <>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span
                                                            className={`text-sm font-bold ${cell.isToday
                                                                ? "text-primary"
                                                                : cell.isWeekend
                                                                    ? "text-rose-400"
                                                                    : "text-foreground"
                                                                }`}
                                                        >
                                                            {cell.day}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {cell.totalAssigned > 0 && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {cell.totalAssigned}/{totalEmployees}
                                                                </span>
                                                            )}
                                                            {isExpanded && (
                                                                <ChevronDown className="w-3 h-3 text-primary" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(cell.shiftCounts)
                                                            .sort(([a], [b]) => a.localeCompare(b))
                                                            .map(([code, count]) => {
                                                                const color = getShiftPastelColor(code);
                                                                return (
                                                                    <span
                                                                        key={code}
                                                                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${color.bg} ${color.text} ${color.border}`}
                                                                        title={`${code}: ${count} คน`}
                                                                    >
                                                                        {code}
                                                                        <span className="opacity-70">{count}</span>
                                                                    </span>
                                                                );
                                                            })}
                                                        {cell.dayOffCount > 0 && (
                                                            <span
                                                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${dayOffPastelColor.bg} ${dayOffPastelColor.text} ${dayOffPastelColor.border}`}
                                                                title={`วันหยุด: ${cell.dayOffCount} คน`}
                                                            >
                                                                X
                                                                <span className="opacity-70">{cell.dayOffCount}</span>
                                                            </span>
                                                        )}
                                                        {cell.unassigned > 0 && cell.totalAssigned > 0 && (
                                                            <span
                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed border-muted-foreground/30 text-muted-foreground/50"
                                                                title={`ยังไม่กำหนด: ${cell.unassigned} คน`}
                                                            >
                                                                ?{cell.unassigned}
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Bottom legend */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                        <div className="flex flex-wrap gap-2">
                            {scheduleData.shifts.map((shift) => {
                                const color = getShiftPastelColor(shift.code);
                                return (
                                    <span
                                        key={shift.id}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${color.bg} ${color.text} ${color.border}`}
                                    >
                                        {shift.code}: {shift.startTime}-{shift.endTime}
                                    </span>
                                );
                            })}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${dayOffPastelColor.bg} ${dayOffPastelColor.text} ${dayOffPastelColor.border}`}>
                                X: วันหยุด
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {totalEmployees} พนักงาน
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Expanded Day Detail Panel */}
            {expandedDay !== null && (
                <Card className="bg-card border-primary/30 animate-in slide-in-from-top-2 duration-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-foreground">
                                    วันที่ {expandedDay} — รายละเอียดกะ
                                </h3>
                                <span className="text-sm text-muted-foreground">
                                    ({expandedDayDetails.filter(e => e.shiftCode).length} คนทำงาน)
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedDay(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Grouped by shift */}
                        <div className="space-y-3">
                            {Object.entries(groupedAssignments.groups)
                                .sort(([, a], [, b]) => {
                                    // Sort by start time
                                    const aTime = a[0]?.startTime || "99:99";
                                    const bTime = b[0]?.startTime || "99:99";
                                    return aTime.localeCompare(bTime);
                                })
                                .map(([code, employees]) => {
                                    const color = code === "X" ? dayOffPastelColor : getShiftPastelColor(code);
                                    const shift = scheduleData.shifts.find(s => s.code === code);
                                    return (
                                        <div key={code} className={`rounded-lg border p-3 ${color.bg} ${color.border}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`font-semibold text-sm ${color.text}`}>
                                                    {code === "X" ? "วันหยุด" : `กะ ${code}`}
                                                </span>
                                                {shift && (
                                                    <span className={`text-xs ${color.text} opacity-70`}>
                                                        {shift.startTime} - {shift.endTime}
                                                    </span>
                                                )}
                                                <span className={`ml-auto text-xs font-medium ${color.text}`}>
                                                    {employees.length} คน
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                                                {employees.map((emp) => (
                                                    <div
                                                        key={emp.employeeId}
                                                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-background/50 text-xs"
                                                    >
                                                        <span className="font-medium text-foreground truncate">
                                                            {emp.name}
                                                        </span>
                                                        <span className="text-muted-foreground text-[10px] shrink-0">
                                                            {emp.department}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                            {/* Unassigned employees */}
                            {groupedAssignments.unassigned.length > 0 && (
                                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold text-sm text-muted-foreground">
                                            ยังไม่กำหนดกะ
                                        </span>
                                        <span className="ml-auto text-xs font-medium text-muted-foreground">
                                            {groupedAssignments.unassigned.length} คน
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                                        {groupedAssignments.unassigned.map((emp) => (
                                            <div
                                                key={emp.employeeId}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 text-xs"
                                            >
                                                <span className="font-medium text-muted-foreground truncate">
                                                    {emp.name}
                                                </span>
                                                <span className="text-muted-foreground/60 text-[10px] shrink-0">
                                                    {emp.department}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
