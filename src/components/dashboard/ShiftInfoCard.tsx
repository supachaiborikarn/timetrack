"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDays } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface ShiftData {
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
}

interface ShiftInfoCardProps {
    shift: ShiftData | null;
    tomorrowShift?: ShiftData | null;
    hourlyRate: number;
}

export function ShiftInfoCard({ shift, tomorrowShift, hourlyRate }: ShiftInfoCardProps) {
    const { t } = useLanguage();

    const getExpectedHours = (shiftData: ShiftData | null) => {
        if (!shiftData) return null;
        const [startH, startM] = shiftData.startTime.split(":").map(Number);
        const [endH, endM] = shiftData.endTime.split(":").map(Number);
        let hours = endH - startH + (endM - startM) / 60;
        if (hours < 0) hours += 24; // Night shift
        return hours - (shiftData.breakMinutes / 60);
    };

    const expectedHours = getExpectedHours(shift);

    return (
        <Card className="bg-[#2a2420] border-orange-900/20">
            <CardContent className="py-4">
                {/* Today's Shift */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-stone-400">{t("shift.today")}</p>
                        <p className="font-medium text-[#F0D0C7]">
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
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-orange-900/20">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[#F0D0C7]">
                                {expectedHours?.toFixed(1) || "-"}
                            </p>
                            <p className="text-xs text-stone-500">{t("shift.hoursRequired")}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[#F0D0C7]">
                                {shift.breakMinutes}
                            </p>
                            <p className="text-xs text-stone-500">{t("shift.breakMinutes")}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-400">
                                ฿{hourlyRate || 0}
                            </p>
                            <p className="text-xs text-stone-500">{t("shift.perHour")}</p>
                        </div>
                    </div>
                )}

                {/* Tomorrow's Shift */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-orange-900/20">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-stone-400">กะพรุ่งนี้</p>
                        <p className="font-medium text-[#F0D0C7]">
                            {tomorrowShift?.name || "ไม่มีกะ"}
                        </p>
                    </div>
                    {tomorrowShift && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {tomorrowShift.startTime} - {tomorrowShift.endTime}
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

