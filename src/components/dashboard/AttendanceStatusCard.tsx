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
        <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-4">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-400">{t("dashboard.attendanceStatus")}</span>
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
                    <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Timer className="w-5 h-5 text-orange-400" />
                            <span className="text-orange-200">{t("dashboard.onBreak")}</span>
                        </div>
                        <span className="text-orange-400 font-mono">
                            {attendance?.breakStartTime ? formatTime(new Date(attendance.breakStartTime)) : ""}
                        </span>
                    </div>
                )}

                {hasTakenBreak && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-between">
                        <span className="text-green-200 text-sm">{t("dashboard.breakDone")} {attendance?.breakDurationMin} {t("dashboard.minutes")}</span>
                        {attendance?.breakPenaltyAmount && attendance.breakPenaltyAmount > 0 ? (
                            <Badge variant="destructive">{t("dashboard.penaltyDeducted")} -฿{attendance.breakPenaltyAmount}</Badge>
                        ) : (
                            <Badge className="bg-green-500/20 text-green-400">{t("dashboard.normal")}</Badge>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${hasCheckedIn ? "bg-green-500" : "bg-slate-600"}`} />
                        <div>
                            <p className="text-xs text-slate-400">{t("dashboard.clockIn")}</p>
                            <p className="text-lg font-semibold text-white">
                                {attendance?.checkInTime
                                    ? formatTime(new Date(attendance.checkInTime))
                                    : "--:--"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${hasCheckedOut ? "bg-orange-500" : "bg-slate-600"}`} />
                        <div>
                            <p className="text-xs text-slate-400">{t("dashboard.clockOut")}</p>
                            <p className="text-lg font-semibold text-white">
                                {attendance?.checkOutTime
                                    ? formatTime(new Date(attendance.checkOutTime))
                                    : shift?.endTime
                                        ? <span className="text-yellow-400 text-base">
                                            {shift.endTime} ({shift.name})
                                        </span>
                                        : "--:--"}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
