"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Timer } from "lucide-react";
import { formatTime } from "@/lib/date-utils";

interface AttendanceData {
    checkInTime: string | null;
    checkOutTime: string | null;
    lateMinutes: number | null;
    breakStartTime: string | null;
    breakEndTime: string | null;
    breakDurationMin: number | null;
    breakPenaltyAmount: number | null;
}

interface AttendanceStatusCardProps {
    attendance: AttendanceData | null;
}

export function AttendanceStatusCard({ attendance }: AttendanceStatusCardProps) {
    const hasCheckedIn = !!attendance?.checkInTime;
    const hasCheckedOut = !!attendance?.checkOutTime;
    const isOnBreak = !!attendance?.breakStartTime && !attendance?.breakEndTime;
    const hasTakenBreak = !!attendance?.breakEndTime;

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-4">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-400">สถานะการลงเวลา</span>
                    {attendance?.lateMinutes ? (
                        <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            สาย {attendance.lateMinutes} นาที
                        </Badge>
                    ) : hasCheckedIn ? (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                            ตรงเวลา
                        </Badge>
                    ) : null}
                </div>

                {/* Break Status */}
                {isOnBreak && (
                    <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Timer className="w-5 h-5 text-orange-400" />
                            <span className="text-orange-200">คุณกำลังพักเบรก</span>
                        </div>
                        <span className="text-orange-400 font-mono">
                            {attendance?.breakStartTime ? formatTime(new Date(attendance.breakStartTime)) : ""}
                        </span>
                    </div>
                )}

                {hasTakenBreak && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-between">
                        <span className="text-green-200 text-sm">พักแล้ว {attendance?.breakDurationMin} นาที</span>
                        {attendance?.breakPenaltyAmount && attendance.breakPenaltyAmount > 0 ? (
                            <Badge variant="destructive">โดนหัก -฿{attendance.breakPenaltyAmount}</Badge>
                        ) : (
                            <Badge className="bg-green-500/20 text-green-400">ปกติ</Badge>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${hasCheckedIn ? "bg-green-500" : "bg-slate-600"}`} />
                        <div>
                            <p className="text-xs text-slate-400">เข้างาน</p>
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
                            <p className="text-xs text-slate-400">ออกงาน</p>
                            <p className="text-lg font-semibold text-white">
                                {attendance?.checkOutTime
                                    ? formatTime(new Date(attendance.checkOutTime))
                                    : attendance?.checkInTime
                                        ? <span className="text-yellow-400 text-base">
                                            {formatTime(new Date(new Date(attendance.checkInTime).getTime() + 12 * 60 * 60 * 1000))} (ครบ 12 ชม.)
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
