"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Loader2
} from "lucide-react";
import { formatThaiDate, addDays, subDays, startOfDay } from "@/lib/date-utils";

interface ShiftAssignment {
    id: string;
    date: string;
    shift: {
        name: string;
        startTime: string;
        endTime: string;
    };
}

export default function SchedulePage() {
    const { data: session, status } = useSession();
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return startOfDay(new Date(today.setDate(diff)));
    });
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            fetchSchedule();
        }
    }, [session?.user?.id, currentWeekStart]);

    const fetchSchedule = async () => {
        setIsLoading(true);
        try {
            const startDate = currentWeekStart.toISOString().split("T")[0];
            const endDate = addDays(currentWeekStart, 6).toISOString().split("T")[0];

            const res = await fetch(`/api/shifts/my-schedule?startDate=${startDate}&endDate=${endDate}`);
            if (res.ok) {
                const data = await res.json();
                setAssignments(data.assignments || []);
            }
        } catch (error) {
            console.error("Failed to fetch schedule:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const goToPreviousWeek = () => {
        setCurrentWeekStart(subDays(currentWeekStart, 7));
    };

    const goToNextWeek = () => {
        setCurrentWeekStart(addDays(currentWeekStart, 7));
    };

    const goToCurrentWeek = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        setCurrentWeekStart(startOfDay(new Date(today.setDate(diff))));
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

    // Generate week days
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(currentWeekStart, i);
        const assignment = assignments.find(
            (a) => new Date(a.date).toDateString() === date.toDateString()
        );
        return { date, assignment };
    });

    const weekEndDate = addDays(currentWeekStart, 6);

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
                    <h1 className="text-xl font-bold text-white">ตารางกะ</h1>
                    <p className="text-sm text-slate-400">{session.user.name}</p>
                </div>
            </div>

            {/* Week Navigation */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
                            <ChevronLeft className="w-5 h-5 text-slate-400" />
                        </Button>
                        <div className="text-center">
                            <p className="text-white font-medium">
                                {formatThaiDate(currentWeekStart, "d MMM")} - {formatThaiDate(weekEndDate, "d MMM yyyy")}
                            </p>
                            <Button
                                variant="link"
                                className="text-blue-400 text-xs p-0 h-auto"
                                onClick={goToCurrentWeek}
                            >
                                สัปดาห์นี้
                            </Button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Week Schedule */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="space-y-3">
                    {weekDays.map(({ date, assignment }) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isPast = date < new Date() && !isToday;

                        return (
                            <Card
                                key={date.toISOString()}
                                className={`border-slate-700 transition-all ${isToday
                                        ? "bg-blue-900/30 border-blue-500/50"
                                        : isPast
                                            ? "bg-slate-800/30 opacity-60"
                                            : "bg-slate-800/50"
                                    }`}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${isToday ? "bg-blue-500" : "bg-slate-700"
                                                }`}>
                                                <span className="text-xs text-slate-300">
                                                    {formatThaiDate(date, "EEE")}
                                                </span>
                                                <span className="text-lg font-bold text-white">
                                                    {formatThaiDate(date, "d")}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {formatThaiDate(date, "EEEE")}
                                                </p>
                                                <p className="text-sm text-slate-400">
                                                    {formatThaiDate(date, "d MMMM yyyy")}
                                                </p>
                                            </div>
                                        </div>

                                        {assignment ? (
                                            <div className="text-right">
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                                    กะ{assignment.shift.name}
                                                </Badge>
                                                <p className="text-sm text-slate-300 mt-1 flex items-center gap-1 justify-end">
                                                    <Clock className="w-3 h-3" />
                                                    {assignment.shift.startTime} - {assignment.shift.endTime}
                                                </p>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500 border-slate-600">
                                                ไม่มีกะ
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
