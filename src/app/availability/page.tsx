"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Check,
    X,
    Clock,
    Info,
} from "lucide-react";
import { toast } from "sonner";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "PREFERRED_OFF";

interface AvailabilityData {
    [date: string]: {
        status: AvailabilityStatus;
        note: string | null;
    };
}

export default function AvailabilityPage() {
    const { data: session, status } = useSession();
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [availability, setAvailability] = useState<AvailabilityData>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
        "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
        "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    useEffect(() => {
        fetchAvailability();
    }, [currentMonth, currentYear]);

    const fetchAvailability = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(
                `/api/availability?month=${currentMonth}&year=${currentYear}`
            );
            if (res.ok) {
                const data = await res.json();
                setAvailability(data.availability || {});
            }
        } catch (error) {
            console.error("Error fetching availability:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateClick = async (dateStr: string) => {
        const currentStatus = availability[dateStr]?.status;

        // Cycle through: none -> AVAILABLE -> PREFERRED_OFF -> UNAVAILABLE -> none
        let newStatus: AvailabilityStatus | null = null;
        if (!currentStatus) {
            newStatus = "AVAILABLE";
        } else if (currentStatus === "AVAILABLE") {
            newStatus = "PREFERRED_OFF";
        } else if (currentStatus === "PREFERRED_OFF") {
            newStatus = "UNAVAILABLE";
        } else {
            // Remove
            newStatus = null;
        }

        setIsSaving(true);
        try {
            if (newStatus === null) {
                // Delete
                await fetch("/api/availability", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ date: dateStr }),
                });
                setAvailability((prev) => {
                    const updated = { ...prev };
                    delete updated[dateStr];
                    return updated;
                });
            } else {
                // Set
                await fetch("/api/availability", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ date: dateStr, status: newStatus }),
                });
                setAvailability((prev) => ({
                    ...prev,
                    [dateStr]: { status: newStatus!, note: null },
                }));
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const prevMonth = () => {
        if (currentMonth === 1) {
            setCurrentMonth(12);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 12) {
            setCurrentMonth(1);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const getDaysInMonth = () => {
        return new Date(currentYear, currentMonth, 0).getDate();
    };

    const getFirstDayOfMonth = () => {
        return new Date(currentYear, currentMonth - 1, 1).getDay();
    };

    const getStatusColor = (status: AvailabilityStatus | undefined) => {
        switch (status) {
            case "AVAILABLE":
                return "bg-green-500";
            case "UNAVAILABLE":
                return "bg-red-500";
            case "PREFERRED_OFF":
                return "bg-yellow-500";
            default:
                return "bg-slate-600";
        }
    };

    const getStatusIcon = (status: AvailabilityStatus | undefined) => {
        switch (status) {
            case "AVAILABLE":
                return <Check className="w-4 h-4" />;
            case "UNAVAILABLE":
                return <X className="w-4 h-4" />;
            case "PREFERRED_OFF":
                return <Clock className="w-4 h-4" />;
            default:
                return null;
        }
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

    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                    <a href="/">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">แจ้งวันว่าง</h1>
                    <p className="text-sm text-slate-400">กดที่วันเพื่อเปลี่ยนสถานะ</p>
                </div>
            </div>

            {/* Legend */}
            <Card className="bg-slate-800/50 border-slate-700 mb-4">
                <CardContent className="py-3">
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-green-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                            </span>
                            <span className="text-slate-300">ว่าง</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-yellow-500 flex items-center justify-center">
                                <Clock className="w-3 h-3 text-white" />
                            </span>
                            <span className="text-slate-300">อยากหยุด</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                                <X className="w-3 h-3 text-white" />
                            </span>
                            <span className="text-slate-300">ไม่ว่าง</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={prevMonth}
                            className="text-slate-400"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <CardTitle className="text-white">
                            {months[currentMonth - 1]} {currentYear + 543}
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={nextMonth}
                            className="text-slate-400"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <>
                            {/* Days of week header */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day, i) => (
                                    <div
                                        key={day}
                                        className={`text-center text-sm py-2 ${i === 0 || i === 6 ? "text-red-400" : "text-slate-400"
                                            }`}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {/* Empty cells for days before first of month */}
                                {Array.from({ length: firstDay }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square" />
                                ))}

                                {/* Day cells */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${currentYear}-${currentMonth
                                        .toString()
                                        .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                                    const dayData = availability[dateStr];
                                    const isToday = dateStr === todayStr;
                                    const dayOfWeek = (firstDay + i) % 7;
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const isPast = new Date(dateStr) < new Date(todayStr);

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => !isPast && handleDateClick(dateStr)}
                                            disabled={isSaving || isPast}
                                            className={`
                                                aspect-square rounded-lg flex flex-col items-center justify-center
                                                transition-all relative
                                                ${isToday ? "ring-2 ring-blue-500" : ""}
                                                ${isPast ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-slate-700/50"}
                                                ${getStatusColor(dayData?.status)}
                                            `}
                                        >
                                            <span
                                                className={`text-sm font-medium ${dayData ? "text-white" : isWeekend ? "text-red-400" : "text-slate-300"
                                                    }`}
                                            >
                                                {day}
                                            </span>
                                            {dayData && (
                                                <span className="text-white">
                                                    {getStatusIcon(dayData.status)}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-blue-900/30 border-blue-500/50 mt-4">
                <CardContent className="py-3">
                    <div className="flex gap-2 text-blue-300 text-sm">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>
                            ข้อมูลนี้จะช่วยให้ผู้จัดการวางตารางกะได้เหมาะสมกับคุณมากขึ้น
                            กรุณาแจ้งล่วงหน้าอย่างน้อย 1 สัปดาห์
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
