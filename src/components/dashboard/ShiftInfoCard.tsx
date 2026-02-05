"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface ShiftInfoCardProps {
    shift: {
        name: string;
        startTime: string;
        endTime: string;
        breakMinutes: number;
    } | null;
    hourlyRate: number;
}

export function ShiftInfoCard({ shift, hourlyRate }: ShiftInfoCardProps) {
    const { t } = useLanguage();

    const getExpectedHours = () => {
        if (!shift) return null;
        const [startH, startM] = shift.startTime.split(":").map(Number);
        const [endH, endM] = shift.endTime.split(":").map(Number);
        let hours = endH - startH + (endM - startM) / 60;
        if (hours < 0) hours += 24; // Night shift
        return hours - (shift.breakMinutes / 60);
    };

    const expectedHours = getExpectedHours();

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-400">{t("shift.today")}</p>
                        <p className="font-medium text-white">
                            {shift?.name || t("shift.noShift")}
                        </p>
                    </div>
                    {shift && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                            {shift.startTime} - {shift.endTime}
                        </Badge>
                    )}
                </div>

                {shift && (
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">
                                {expectedHours?.toFixed(1) || "-"}
                            </p>
                            <p className="text-xs text-slate-400">{t("shift.hoursRequired")}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">
                                {shift.breakMinutes}
                            </p>
                            <p className="text-xs text-slate-400">{t("shift.breakMinutes")}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-400">
                                ฿{hourlyRate || 0}
                            </p>
                            <p className="text-xs text-slate-400">{t("shift.perHour")}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
