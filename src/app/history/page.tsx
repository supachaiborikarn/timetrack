"use client";

import { useState, useEffect } from "react";
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
    CheckCircle,
    XCircle,
    AlertCircle
} from "lucide-react";
import { formatThaiDate, formatTime, startOfMonth, endOfMonth, subMonths, addMonths } from "@/lib/date-utils";

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

export default function HistoryPage() {
    const { data: session, status } = useSession();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            fetchHistory();
        }
    }, [session?.user?.id, currentMonth]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const startDate = startOfMonth(currentMonth).toISOString().split("T")[0];
            const endDate = endOfMonth(currentMonth).toISOString().split("T")[0];

            const res = await fetch(`/api/attendance/history?startDate=${startDate}&endDate=${endDate}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const goToPreviousMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
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

    const getStatusBadge = (record: AttendanceRecord) => {
        if (record.status === "APPROVED") {
            return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">อนุมัติ</Badge>;
        }
        if (record.status === "ABSENT") {
            return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">ขาด</Badge>;
        }
        if (record.status === "LEAVE") {
            return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">ลา</Badge>;
        }
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">รอตรวจสอบ</Badge>;
    };

    // Calculate summary
    const summary = {
        totalDays: records.length,
        presentDays: records.filter(r => r.checkInTime).length,
        lateDays: records.filter(r => (r.lateMinutes || 0) > 0).length,
        totalHours: records.reduce((sum, r) => sum + (r.actualHours || 0), 0),
        totalPenalty: records.reduce((sum, r) => sum + r.latePenaltyAmount, 0),
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                    <a href="/">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">ประวัติการลงเวลา</h1>
                    <p className="text-sm text-slate-400">{session.user.name}</p>
                </div>
            </div>

            {/* Month Navigation */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                            <ChevronLeft className="w-5 h-5 text-slate-400" />
                        </Button>
                        <div className="text-center">
                            <p className="text-white font-medium flex items-center gap-2 justify-center">
                                <Calendar className="w-4 h-4" />
                                {formatThaiDate(currentMonth, "MMMM yyyy")}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-3 text-center">
                        <p className="text-2xl font-bold text-green-400">{summary.presentDays}</p>
                        <p className="text-xs text-slate-400">วันทำงาน</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{summary.totalHours.toFixed(1)}</p>
                        <p className="text-xs text-slate-400">ชั่วโมง</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-3 text-center">
                        <p className="text-2xl font-bold text-orange-400">{summary.lateDays}</p>
                        <p className="text-xs text-slate-400">วันสาย</p>
                    </CardContent>
                </Card>
            </div>

            {/* Records */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : records.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-8 text-center">
                        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">ไม่มีข้อมูลการลงเวลาในเดือนนี้</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {records.map((record) => (
                        <Card key={record.id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex flex-col items-center justify-center">
                                            <span className="text-xs text-slate-400">
                                                {formatThaiDate(new Date(record.date), "EEE")}
                                            </span>
                                            <span className="text-sm font-bold text-white">
                                                {formatThaiDate(new Date(record.date), "d")}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {formatThaiDate(new Date(record.date), "d MMMM yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    {getStatusBadge(record)}
                                </div>

                                <div className="flex justify-between items-center text-sm border-t border-slate-700 pt-3">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="text-slate-400">เข้า:</span>
                                            <span className="text-white font-medium">
                                                {record.checkInTime ? formatTime(new Date(record.checkInTime)) : "--:--"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                                            <span className="text-slate-400">ออก:</span>
                                            <span className="text-white font-medium">
                                                {record.checkOutTime ? formatTime(new Date(record.checkOutTime)) : "--:--"}
                                            </span>
                                        </div>
                                    </div>

                                    {(record.lateMinutes || 0) > 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                            สาย {record.lateMinutes} นาที
                                        </Badge>
                                    )}
                                </div>

                                {record.actualHours && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        รวม {record.actualHours.toFixed(1)} ชม.
                                        {record.latePenaltyAmount > 0 && (
                                            <span className="text-red-400 ml-2">
                                                (หัก ฿{record.latePenaltyAmount})
                                            </span>
                                        )}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
