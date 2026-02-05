"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Coffee } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface LatenessMonitorCardProps {
    lateMinutes: number | null;
    latePenaltyAmount: number;
    breakDurationMin: number | null;
    breakPenaltyAmount: number | null;
    allowedBreakMinutes: number;
    isOnBreak: boolean;
    breakStartTime: string | null;
}

export function LatenessMonitorCard({
    lateMinutes,
    latePenaltyAmount,
    breakDurationMin,
    breakPenaltyAmount,
    allowedBreakMinutes,
    isOnBreak,
    breakStartTime,
}: LatenessMonitorCardProps) {
    const { t } = useLanguage();

    const isLate = (lateMinutes || 0) > 0;
    const hasBreakPenalty = (breakPenaltyAmount || 0) > 0;
    const breakExcessMinutes = breakDurationMin && allowedBreakMinutes
        ? Math.max(0, breakDurationMin - allowedBreakMinutes)
        : 0;

    // Calculate live break time if on break
    let currentBreakMinutes = 0;
    if (isOnBreak && breakStartTime) {
        const breakStart = new Date(breakStartTime);
        const now = new Date();
        currentBreakMinutes = Math.floor((now.getTime() - breakStart.getTime()) / 60000);
    }
    const isBreakExceeding = isOnBreak && currentBreakMinutes > allowedBreakMinutes;

    // If no attendance data yet (not checked in), don't show this card
    if (lateMinutes === null && breakDurationMin === null && !isOnBreak) {
        return null;
    }

    return (
        <Card className="bg-[#2a2420] border-orange-900/20">
            <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-[#F09410]" />
                    <h3 className="font-medium text-[#F0D0C7]">สถานะการมาทำงาน</h3>
                </div>

                <div className="space-y-3">
                    {/* Late Status */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1412]">
                        <div className="flex items-center gap-3">
                            {isLate ? (
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            ) : (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-[#F0D0C7]">
                                    {isLate ? "มาสาย" : t("dashboard.onTime")}
                                </p>
                                {isLate && (
                                    <p className="text-xs text-stone-500">
                                        สาย {lateMinutes} {t("dashboard.minutes")}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isLate && latePenaltyAmount > 0 && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                -฿{latePenaltyAmount}
                            </Badge>
                        )}
                        {!isLate && lateMinutes !== null && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                ตรงเวลา
                            </Badge>
                        )}
                    </div>

                    {/* Break Status */}
                    {(isOnBreak || breakDurationMin !== null) && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1412]">
                            <div className="flex items-center gap-3">
                                {hasBreakPenalty || isBreakExceeding ? (
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                ) : (
                                    <Coffee className="w-5 h-5 text-blue-400" />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-[#F0D0C7]">
                                        {isOnBreak ? "กำลังพัก" : t("dashboard.breakDone")}
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        {isOnBreak
                                            ? `${currentBreakMinutes}/${allowedBreakMinutes} นาที`
                                            : breakDurationMin
                                                ? `${breakDurationMin}/${allowedBreakMinutes} นาที`
                                                : null
                                        }
                                        {(breakExcessMinutes > 0 || isBreakExceeding) && (
                                            <span className="text-amber-400 ml-1">
                                                (เกิน {isOnBreak ? currentBreakMinutes - allowedBreakMinutes : breakExcessMinutes} นาที)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            {hasBreakPenalty && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                    -฿{breakPenaltyAmount}
                                </Badge>
                            )}
                            {isBreakExceeding && !hasBreakPenalty && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">
                                    พักเกินเวลา!
                                </Badge>
                            )}
                            {!hasBreakPenalty && !isBreakExceeding && breakDurationMin !== null && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    {t("dashboard.normal")}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
