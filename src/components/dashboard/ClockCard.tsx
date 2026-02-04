"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatThaiDate, formatTime } from "@/lib/date-utils";

interface ClockCardProps {
    currentTime: Date;
}

export function ClockCard({ currentTime }: ClockCardProps) {
    return (
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
            <CardContent className="py-6 text-center">
                <p className="text-blue-200 text-sm mb-1">
                    {formatThaiDate(currentTime, "EEEE d MMMM yyyy")}
                </p>
                <p className="text-5xl font-bold text-white tracking-wider font-mono">
                    {formatTime(currentTime)}
                </p>
            </CardContent>
        </Card>
    );
}
