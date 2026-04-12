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
        <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">สถานะการมาทำงาน</h3>
                </div>

                <div className="space-y-3">
                    {/* Late Status */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                        <div className="flex items-center gap-3">
                            {isLate ? (
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                            ) : (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                            )}
                            <div>
                                <p className="text-sm font-bold text-foreground">
                                    {isLate ? "มาสาย" : t("dashboard.onTime")}
                                </p>
                                {isLate && (
                                    <p className="text-xs text-muted-foreground">
                                        สาย {lateMinutes} {t("dashboard.minutes")}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isLate && latePenaltyAmount > 0 && (
                            <Badge className="bg-destructive/15 text-destructive border-none font-bold">
                                -฿{latePenaltyAmount}
                            </Badge>
                        )}
                        {!isLate && lateMinutes !== null && (
                            <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-none font-bold">
                                ตรงเวลา
                            </Badge>
                        )}
                    </div>

                    {/* Break Status */}
                    {(isOnBreak || breakDurationMin !== null) && (
                        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                            <div className="flex items-center gap-3">
                                {hasBreakPenalty || isBreakExceeding ? (
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                ) : (
                                    <Coffee className="w-5 h-5 text-primary" />
                                )}
                                <div>
                                    <p className="text-sm font-bold text-foreground">
                                        {isOnBreak ? "กำลังพัก" : t("dashboard.breakDone")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {isOnBreak
                                            ? `${currentBreakMinutes}/${allowedBreakMinutes} นาที`
                                            : breakDurationMin
                                                ? `${breakDurationMin}/${allowedBreakMinutes} นาที`
                                                : null
                                        }
                                        {(breakExcessMinutes > 0 || isBreakExceeding) && (
                                            <span className="text-amber-500 ml-1">
                                                (เกิน {isOnBreak ? currentBreakMinutes - allowedBreakMinutes : breakExcessMinutes} นาที)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            {hasBreakPenalty && (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none font-bold">
                                    -฿{breakPenaltyAmount}
                                </Badge>
                            )}
                            {isBreakExceeding && !hasBreakPenalty && (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none font-bold animate-pulse">
                                    พักเกินเวลา!
                                </Badge>
                            )}
                            {!hasBreakPenalty && !isBreakExceeding && breakDurationMin !== null && (
                                <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-none font-bold">
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
