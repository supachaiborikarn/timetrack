"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Timer } from "lucide-react";
import { formatTime } from "@/lib/date-utils";
import { useLanguage } from "@/lib/language-context";

interface AttendanceData {
    checkInTime: string | null;
    checkOutTime: string | null;
    lateMinutes: number | null;
    breakStartTime: string | null;
    breakEndTime: string | null;
    breakDurationMin: number | null;
    breakPenaltyAmount: number | null;
}

interface ShiftData {
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
}

interface AttendanceStatusCardProps {
    attendance: AttendanceData | null;
    shift?: ShiftData | null;
}

export function AttendanceStatusCard({ attendance, shift }: AttendanceStatusCardProps) {
    const { t } = useLanguage();
    const hasCheckedIn = !!attendance?.checkInTime;
    const hasCheckedOut = !!attendance?.checkOutTime;
    const isOnBreak = !!attendance?.breakStartTime && !attendance?.breakEndTime;
    const hasTakenBreak = !!attendance?.breakEndTime;

    return (
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border mb-4">
            <div className="py-2">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-foreground">สถานะลงเวลาวันนี้</span>
                    {attendance?.lateMinutes ? (
                        <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {t("dashboard.late")} {attendance.lateMinutes} {t("dashboard.minutes")}
                        </Badge>
                    ) : hasCheckedIn ? (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                            {t("dashboard.onTime")}
                        </Badge>
                    ) : null}
                </div>

                {/* Break Status */}
                {isOnBreak && (
                    <div className="mb-5 p-3 bg-orange-100 border border-orange-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Timer className="w-5 h-5 text-orange-600" />
                            <span className="text-orange-800 font-bold">กำลังพักเบรก</span>
                        </div>
                        <span className="text-orange-600 font-bold">
                            {attendance?.breakStartTime ? formatTime(new Date(attendance.breakStartTime)) : ""}
                        </span>
                    </div>
                )}

                {hasTakenBreak && (
                    <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                        <span className="text-green-800 text-sm font-medium">พักแล้ว {attendance?.breakDurationMin} นาที</span>
                        {attendance?.breakPenaltyAmount && attendance.breakPenaltyAmount > 0 ? (
                            <Badge variant="destructive" className="rounded-full px-3">หัก -฿{attendance.breakPenaltyAmount}</Badge>
                        ) : (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-full border-none">ปกติ</Badge>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${hasCheckedIn ? "bg-green-500" : "bg-border"}`} />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("dashboard.clockIn")}</p>
                            <p className="text-lg font-bold text-foreground">
                                {attendance?.checkInTime
                                    ? formatTime(new Date(attendance.checkInTime))
                                    : "--:--"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${hasCheckedOut ? "bg-orange-500" : "bg-border"}`} />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("dashboard.clockOut")}</p>
                            <p className="text-lg font-bold text-foreground">
                                {attendance?.checkOutTime
                                    ? formatTime(new Date(attendance.checkOutTime))
                                    : shift?.endTime
                                        ? <span className="text-primary text-base">
                                            {shift.endTime} ({shift.name})
                                        </span>
                                        : "--:--"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
