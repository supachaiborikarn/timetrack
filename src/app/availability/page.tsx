"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Check,
    X,
    Clock,
    Info,
    CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";

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

    const fetchAvailability = useCallback(async () => {
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
    }, [currentMonth, currentYear]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

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
        } catch {
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
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

    const getStatusStyle = (status: AvailabilityStatus | undefined) => {
        switch (status) {
            case "AVAILABLE":
                return "border-emerald-500/50 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-black";
            case "UNAVAILABLE":
                return "border-rose-500/50 bg-rose-500/20 text-rose-800 dark:text-rose-300 font-black";
            case "PREFERRED_OFF":
                return "border-[#fbbf24] bg-[#fbbf24]/25 text-amber-950 dark:text-amber-300 font-black";
            default:
                return "border-zinc-700/20 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700/40";
        }
    };

    const getStatusIcon = (status: AvailabilityStatus | undefined) => {
        switch (status) {
            case "AVAILABLE":
                return <Check className="w-3.5 h-3.5" />;
            case "UNAVAILABLE":
                return <X className="w-3.5 h-3.5" />;
            case "PREFERRED_OFF":
                return <Clock className="w-3.5 h-3.5" />;
            default:
                return null;
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
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

    // Summary counts for current month
    const totalAvailable = Object.values(availability).filter(a => a.status === "AVAILABLE").length;
    const totalPreferredOff = Object.values(availability).filter(a => a.status === "PREFERRED_OFF").length;
    const totalUnavailable = Object.values(availability).filter(a => a.status === "UNAVAILABLE").length;

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="AVAILABILITY"
                title="แจ้งวันว่าง"
                subtitle="ระบุวันที่พร้อมหรือไม่พร้อมทำงานล่วงหน้า"
                backHref="/"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {/* Summary Meter Panel */}
                <section className="grid grid-cols-3 gap-2">
                    <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 shadow-[0_2px_0_rgba(0,0,0,0.06)] text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">พร้อมทำงาน</p>
                        <p className="mt-1 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{totalAvailable}</p>
                    </div>
                    <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 shadow-[0_2px_0_rgba(0,0,0,0.06)] text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">อยากหยุด</p>
                        <p className="mt-1 text-2xl font-black font-mono text-[#fbbf24]">{totalPreferredOff}</p>
                    </div>
                    <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-3 shadow-[0_2px_0_rgba(0,0,0,0.06)] text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">ไม่ว่าง</p>
                        <p className="mt-1 text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{totalUnavailable}</p>
                    </div>
                </section>

                {/* Legend Guide */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/30 dark:border-white/15 p-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                    <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-2.5">
                        คำอธิบายสัญลักษณ์ (กดที่วันเพื่อเปลี่ยนสถานะ)
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs font-black">
                        <div className="flex items-center gap-1.5 p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                            <span className="w-5 h-5 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                                <Check className="w-3 h-3" />
                            </span>
                            <span>ว่าง</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-2 rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-900 dark:text-amber-300">
                            <span className="w-5 h-5 rounded-lg bg-[#fbbf24] text-zinc-950 flex items-center justify-center shrink-0">
                                <Clock className="w-3 h-3" />
                            </span>
                            <span>อยากหยุด</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-2 rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-800 dark:text-rose-300">
                            <span className="w-5 h-5 rounded-lg bg-rose-600 flex items-center justify-center text-white shrink-0">
                                <X className="w-3 h-3" />
                            </span>
                            <span>ไม่ว่าง</span>
                        </div>
                    </div>
                </section>

                {/* Calendar Card */}
                <section className="tt-paper-card tt-instrument-frame rounded-[22px] border border-zinc-700/35 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.06)] space-y-4">
                    {/* Month Stepper Header */}
                    <div className="flex items-center justify-between border-b border-zinc-700/15 dark:border-white/10 pb-3">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="tt-retro-control grid h-10 w-10 place-items-center rounded-xl border border-zinc-700/30 bg-[#f5ecdc] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 active:scale-95 transition-transform"
                            aria-label="เดือนก่อนหน้า"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <div className="text-center min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">MONTH / YEAR</p>
                            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1.5 mt-0.5">
                                <CalendarDays className="w-4 h-4 text-[#fbbf24]" />
                                <span>{months[currentMonth - 1]}</span>
                                <span className="font-mono text-amber-700 dark:text-amber-400">{currentYear + 543}</span>
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={nextMonth}
                            className="tt-retro-control grid h-10 w-10 place-items-center rounded-xl border border-zinc-700/30 bg-[#f5ecdc] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 active:scale-95 transition-transform"
                            aria-label="เดือนถัดไป"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
                            <p className="text-xs font-bold text-zinc-500">กำลังโหลดปฏิทิน...</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Days of week header */}
                            <div className="grid grid-cols-7 gap-1">
                                {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day, i) => (
                                    <div
                                        key={day}
                                        className={`text-center text-[11px] font-black py-1.5 uppercase ${
                                            i === 0 || i === 6 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
                                        }`}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-1.5">
                                {/* Empty cells before first day */}
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
                                            type="button"
                                            onClick={() => !isPast && handleDateClick(dateStr)}
                                            disabled={isSaving || isPast}
                                            className={`
                                                aspect-square rounded-xl border flex flex-col items-center justify-center p-1
                                                transition-all relative text-center tt-retro-control
                                                ${getStatusStyle(dayData?.status)}
                                                ${isToday ? "ring-2 ring-[#fbbf24] shadow-sm" : ""}
                                                ${isPast ? "opacity-35 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                                            `}
                                        >
                                            <span
                                                className={`text-xs font-mono leading-none ${
                                                    dayData ? "" : isWeekend ? "text-rose-600 dark:text-rose-400 font-bold" : ""
                                                }`}
                                            >
                                                {day}
                                            </span>
                                            {dayData && (
                                                <span className="mt-1 shrink-0">
                                                    {getStatusIcon(dayData.status)}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                {/* Helpful Reminder Note */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-amber-500/30 bg-amber-500/10 p-4 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                    <div className="flex items-start gap-3 text-amber-900 dark:text-amber-300">
                        <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#f59e0b]" />
                        <div className="text-xs space-y-1">
                            <p className="font-black">คำแนะนำในการแจ้งวันว่าง</p>
                            <p className="font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                ข้อมูลนี้จะส่งตรงถึงผู้จัดการเพื่อใช้ในการวางตารางกะล่วงหน้าได้อย่างเหมาะสม กรุณาแจ้งหรือแก้ไขล่วงหน้าอย่างน้อย 1 สัปดาห์ก่อนวันทำงาน
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
