"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Loader2,
    Calendar,
    Menu
} from "lucide-react";
import { formatThaiDate, formatTime, startOfMonth, endOfMonth, subMonths, addMonths, setDate, startOfDay, endOfDay, format } from "@/lib/date-utils";
import { CurvedHeader } from "@/components/layout/CurvedHeader";

interface AttendanceRecord {
    id: string;
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: string;
    lateMinutes: number | null;
    actualHours: number | null;
    latePenaltyAmount: number;
}

/**
 * Calculate payroll period dates for a given month.
 * - Frontyard: 26th prev month → 25th current month
 * - Other: 1st → end of month
 */
function getHistoryPeriod(referenceMonth: Date, isFrontYard: boolean) {
    if (isFrontYard) {
        const prevMonth = subMonths(referenceMonth, 1);
        const startDate = startOfDay(setDate(prevMonth, 26));
        const endDate = endOfDay(setDate(referenceMonth, 25));
        return { startDate, endDate };
    } else {
        return {
            startDate: startOfMonth(referenceMonth),
            endDate: endOfMonth(referenceMonth),
        };
    }
}

/**
 * Format period label for display.
 * - Frontyard: "26 มี.ค. - 25 เม.ย. 2569"
 * - Other: "เมษายน 2569"
 */
function getPeriodLabel(referenceMonth: Date, isFrontYard: boolean): string {
    if (isFrontYard) {
        const { startDate, endDate } = getHistoryPeriod(referenceMonth, true);
        return `${formatThaiDate(startDate, "d MMM")} - ${formatThaiDate(endDate, "d MMM yyyy")}`;
    }
    return formatThaiDate(referenceMonth, "MMMM yyyy");
}

export default function HistoryPage() {
    const { data: session, status } = useSession();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFrontYard, setIsFrontYard] = useState<boolean | null>(null);

    const fetchHistory = useCallback(async (month: Date, frontyard: boolean | null) => {
        setIsLoading(true);
        try {
            // Use detected frontyard status, default to normal period on first load
            const useFrontYard = frontyard ?? false;
            const { startDate: periodStart, endDate: periodEnd } = getHistoryPeriod(month, useFrontYard);

            const startStr = format(periodStart, "yyyy-MM-dd");
            const endStr = format(periodEnd, "yyyy-MM-dd");

            const res = await fetch(`/api/attendance/history?startDate=${startStr}&endDate=${endStr}`);
            if (res.ok) {
                const json = await res.json();
                const fetchedRecords = json.data?.records || json.records || [];
                setRecords(fetchedRecords);

                // On first fetch, detect frontyard and re-fetch if needed
                const apiFrontYard = json.data?.isFrontYard ?? false;
                if (frontyard === null && apiFrontYard !== useFrontYard) {
                    setIsFrontYard(apiFrontYard);
                    // Re-fetch with correct date range
                    const corrected = getHistoryPeriod(month, apiFrontYard);
                    const correctedStart = format(corrected.startDate, "yyyy-MM-dd");
                    const correctedEnd = format(corrected.endDate, "yyyy-MM-dd");
                    const res2 = await fetch(`/api/attendance/history?startDate=${correctedStart}&endDate=${correctedEnd}`);
                    if (res2.ok) {
                        const json2 = await res2.json();
                        setRecords(json2.data?.records || json2.records || []);
                    }
                } else if (frontyard === null) {
                    setIsFrontYard(apiFrontYard);
                }
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.id) {
            fetchHistory(currentMonth, isFrontYard);
        }
    }, [session?.user?.id, currentMonth, fetchHistory]);

    // Don't re-fetch when isFrontYard changes from null to a value
    // because fetchHistory already handles the initial detection

    const goToPreviousMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const getStatusBadge = (record: AttendanceRecord) => {
        if (record.status === "APPROVED") {
            return <Badge className="bg-green-100 text-green-700 border-green-200">อนุมัติ</Badge>;
        }
        if (record.status === "ABSENT") {
            return <Badge className="bg-red-100 text-red-700 border-red-200">ขาด</Badge>;
        }
        if (record.status === "LEAVE") {
            return <Badge className="bg-amber-100 text-amber-700 border-amber-200">ลา</Badge>;
        }
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">รอตรวจสอบ</Badge>;
    };

    // Calculate summary
    const summary = {
        totalDays: records.length,
        presentDays: records.filter(r => r.checkInTime).length,
        lateDays: records.filter(r => (r.lateMinutes || 0) > 0).length,
        totalHours: records.reduce((sum, r) => sum + (r.actualHours || 0), 0),
        totalPenalty: records.reduce((sum, r) => sum + r.latePenaltyAmount, 0),
    };

    // Period label for the header
    const periodLabel = getPeriodLabel(currentMonth, isFrontYard ?? false);

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Curved Header */}
            <CurvedHeader>
                <div className="flex items-center gap-3 pt-4 mb-2 shadow-none">
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-black/10 rounded-full" asChild>
                        <a href="/">
                            <ChevronLeft className="w-6 h-6" />
                        </a>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-primary-foreground">ประวัติลงเวลา</h1>
                        <p className="text-sm text-primary-foreground/80">{session.user.name}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6 bg-white/20 backdrop-blur-md rounded-2xl p-2 border border-white/30 text-primary-foreground">
                    <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="hover:bg-black/10 rounded-xl text-primary-foreground">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="text-center">
                        <p className="font-bold flex items-center gap-2 justify-center drop-shadow-sm">
                            <Calendar className="w-4 h-4" />
                            {periodLabel}
                        </p>
                        {isFrontYard && (
                            <p className="text-[10px] text-primary-foreground/60 font-medium mt-0.5">
                                รอบเงินเดือนหน้าลาน
                            </p>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={goToNextMonth} className="hover:bg-black/10 rounded-xl text-primary-foreground">
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </CurvedHeader>

            <div className="px-4 -mt-6 relative z-10">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 text-center transform hover:-translate-y-1 transition-transform">
                        <p className="text-2xl font-black text-[#34D399]">{summary.presentDays}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">วันทำงาน</p>
                    </div>
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 text-center transform hover:-translate-y-1 transition-transform">
                        <p className="text-2xl font-black text-primary">{summary.totalHours.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">ชั่วโมง</p>
                    </div>
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 text-center transform hover:-translate-y-1 transition-transform">
                        <p className="text-2xl font-black text-orange-500">{summary.lateDays}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">วันสาย</p>
                    </div>
                </div>

                {/* Records */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : records.length === 0 ? (
                <div className="bg-card rounded-3xl border border-border shadow-sm p-12 text-center mt-4">
                    <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">ไม่มีข้อมูลการลงเวลาในรอบนี้</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {records.map((record) => (
                        <div key={record.id} className="bg-card rounded-3xl p-5 shadow-sm border border-border">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-muted flex flex-col items-center justify-center">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            {formatThaiDate(new Date(record.date), "EEE")}
                                        </span>
                                        <span className="text-lg font-black text-foreground leading-tight">
                                            {formatThaiDate(new Date(record.date), "d")}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground">
                                            {formatThaiDate(new Date(record.date), "d MMMM yyyy")}
                                        </p>
                                    </div>
                                </div>
                                {getStatusBadge(record)}
                            </div>

                            <div className="flex justify-between items-center bg-muted/50 rounded-2xl p-4">
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
                                            <span className="text-xs text-muted-foreground font-bold">เข้างาน</span>
                                        </div>
                                        <span className="text-sm font-bold text-foreground">
                                            {record.checkInTime ? formatTime(new Date(record.checkInTime)) : "--:--"}
                                        </span>
                                    </div>
                                    
                                    <div className="h-px w-full bg-border" />

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                            <span className="text-xs text-muted-foreground font-bold">ออกงาน</span>
                                        </div>
                                        <span className="text-sm font-bold text-foreground">
                                            {record.checkOutTime ? formatTime(new Date(record.checkOutTime)) : "--:--"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {((record.lateMinutes || 0) > 0 || record.actualHours) && (
                                <div className="flex items-center justify-between mt-4 px-2">
                                    {record.actualHours ? (
                                        <p className="text-xs font-bold text-muted-foreground">
                                            รวม {record.actualHours.toFixed(1)} ชม.
                                        </p>
                                    ) : <div/>}
                                    
                                    <div className="flex items-center gap-2">
                                        {(record.lateMinutes || 0) > 0 && (
                                            <span className="text-xs font-bold text-orange-500">
                                                สาย {record.lateMinutes} นาที
                                            </span>
                                        )}
                                        {record.latePenaltyAmount > 0 && (
                                            <span className="text-xs font-bold text-red-500">
                                                (ปรับ -฿{record.latePenaltyAmount})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
}
