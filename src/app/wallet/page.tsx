"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Wallet,
    TrendingUp,
    Clock,
    AlertTriangle,
    Banknote,
    ChevronDown,
    ChevronUp,
    Sparkles,
    MinusCircle,
} from "lucide-react";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { formatWorkDays } from "@/lib/payroll-day";

interface SpecialIncomeItem {
    id: string;
    type: string;
    description: string | null;
    salesAmount: number | null;
    percentage: number | null;
    amount: number;
    status: string;
}

interface DailyEntry {
    date: string;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    actualHours: number | null;
    dayFactor: number;
    overtimeHours: number;
    dailyWage: number;
    overtimePay: number;
    latePenalty: number;
    earlyLeavePenalty: number;
    breakPenalty: number;
    totalPenalty: number;
    specialIncomes: SpecialIncomeItem[];
    netDaily: number;
    hasOverride: boolean;
}

interface WalletData {
    employee: {
        name: string;
        employeeId: string;
        station: string | null;
        department: string | null;
        dailyRate: number;
    };
    period: { month: number; year: number };
    dailyBreakdown: DailyEntry[];
    monthSummary: {
        totalDailyWage: number;
        totalOT: number;
        totalSpecialIncome: number;
        totalApprovedSpecialIncome: number;
        totalPenalty: number;
        totalAdvanceDeduct: number;
        projectedNetPay: number;
        workDays: number;
        fullDayCount: number;
        halfDayCount: number;
        pendingItems: number;
    };
    advances: { id: string; amount: number; date: string; status: string; reason: string | null }[];
}

const THAI_MONTHS = [
    "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const THAI_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function formatMoney(amount: number): string {
    return amount.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getTypeLabel(type: string): string {
    switch (type) {
        case "SALES_COMMISSION": return "คอมมิชชั่น";
        case "BONUS": return "โบนัส";
        case "TIP": return "ทิป";
        default: return "อื่นๆ";
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case "APPROVED":
        case "PAID":
            return <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px]">อนุมัติ</Badge>;
        case "PENDING":
            return <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">รออนุมัติ</Badge>;
        case "REJECTED":
            return <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">ปฏิเสธ</Badge>;
        default:
            return <Badge className="bg-stone-500/20 text-stone-400 border-0 text-[10px]">{status}</Badge>;
    }
}

export default function WalletPage() {
    const { data: session, status: authStatus } = useSession();
    const [data, setData] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    const fetchWallet = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/wallet?month=${currentMonth}&year=${currentYear}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (err) {
            console.error("Failed to fetch wallet:", err);
        } finally {
            setLoading(false);
        }
    }, [currentMonth, currentYear]);

    useEffect(() => {
        if (authStatus === "authenticated") {
            fetchWallet();
        }
    }, [authStatus, fetchWallet]);

    if (authStatus === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1a1412]">
                <Loader2 className="w-8 h-8 animate-spin text-[#F09410]" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const goToPrevMonth = () => {
        if (currentMonth === 1) {
            setCurrentMonth(12);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        const now = new Date();
        const isCurrentOrFuture = currentYear > now.getFullYear() ||
            (currentYear === now.getFullYear() && currentMonth >= now.getMonth() + 1);
        if (isCurrentOrFuture) return;
        if (currentMonth === 12) {
            setCurrentMonth(1);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const summary = data?.monthSummary;
    const isCurrentMonth = currentMonth === new Date().getMonth() + 1 && currentYear === new Date().getFullYear();

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="WALLET & EARNINGS"
                title="กระเป๋าเงิน"
                subtitle={data?.employee ? `${data.employee.station || ""} • ${data.employee.department || ""}` : "สรุปรายได้และค่าแรงสะสม"}
                backHref="/"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {/* Month Navigator */}
                <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 dark:border-white/15 p-2 flex items-center justify-between shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                    <button
                        onClick={goToPrevMonth}
                        className="tt-retro-control w-9 h-9 rounded-full border border-black/20 bg-white/60 dark:bg-zinc-800 flex items-center justify-center active:scale-95 text-zinc-800 dark:text-zinc-100"
                        aria-label="เดือนก่อนหน้า"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                        {THAI_MONTHS[currentMonth]} {currentYear + 543}
                    </span>
                    <button
                        onClick={goToNextMonth}
                        disabled={isCurrentMonth}
                        className="tt-retro-control w-9 h-9 rounded-full border border-black/20 bg-white/60 dark:bg-zinc-800 flex items-center justify-center active:scale-95 text-zinc-800 dark:text-zinc-100 disabled:opacity-30"
                        aria-label="เดือนถัดไป"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
                    </div>
                ) : data && summary ? (
                    <>
                        {/* Hero Card — Projected Net Pay */}
                        <section className="tt-paper-card tt-instrument-frame rounded-[22px] border border-zinc-700/35 p-5 dark:border-white/15 space-y-3 shadow-[0_2px_0_rgba(0,0,0,0.06)] bg-gradient-to-b from-[#fbbf24]/10 to-transparent">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider font-mono text-zinc-500 dark:text-zinc-400">
                                    {isCurrentMonth ? "ยอดคาดการณ์สุทธิรอบนี้" : "ยอดรวมสุทธิรอบนี้"}
                                </span>
                                {summary.pendingItems > 0 && (
                                    <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-black">
                                        {summary.pendingItems} รายการรออนุมัติ
                                    </Badge>
                                )}
                            </div>

                            <div className="text-4xl font-black font-mono tracking-tight text-zinc-950 dark:text-zinc-50">
                                ฿{formatMoney(summary.projectedNetPay)}
                            </div>

                            <div className="flex flex-col gap-0.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-700/10 dark:border-white/5">
                                <div>
                                    ทำงาน <span className="font-black text-zinc-900 dark:text-zinc-100">{formatWorkDays(summary.workDays)} วัน</span>
                                    {" • "}เฉลี่ย <span className="font-mono font-black text-zinc-900 dark:text-zinc-100">฿{summary.workDays > 0 ? formatMoney(summary.projectedNetPay / summary.workDays) : "0"}</span>/วัน
                                </div>
                                <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                    กะเต็ม {summary.fullDayCount} วัน / กะครึ่ง {summary.halfDayCount} วัน
                                </div>
                            </div>
                        </section>

                        {/* Quick Stats Strip */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 p-3 dark:border-white/15 shadow-[0_2px_0_rgba(0,0,0,0.04)] flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-700 dark:text-blue-400 shrink-0">
                                    <Banknote className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-zinc-500">ค่าแรงหลัก</p>
                                    <p className="text-xs font-black font-mono text-zinc-900 dark:text-zinc-100 truncate">฿{formatMoney(summary.totalDailyWage)}</p>
                                </div>
                            </div>

                            <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 p-3 dark:border-white/15 shadow-[0_2px_0_rgba(0,0,0,0.04)] flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/20 text-purple-700 dark:text-purple-400 shrink-0">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-zinc-500">ค่าล่วงเวลา (OT)</p>
                                    <p className="text-xs font-black font-mono text-zinc-900 dark:text-zinc-100 truncate">฿{formatMoney(summary.totalOT)}</p>
                                </div>
                            </div>

                            <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 p-3 dark:border-white/15 shadow-[0_2px_0_rgba(0,0,0,0.04)] flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-zinc-500">รายได้พิเศษ</p>
                                    <p className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-400 truncate">฿{formatMoney(summary.totalApprovedSpecialIncome)}</p>
                                </div>
                            </div>

                            <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 p-3 dark:border-white/15 shadow-[0_2px_0_rgba(0,0,0,0.04)] flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/20 text-red-700 dark:text-red-400 shrink-0">
                                    <MinusCircle className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-zinc-500">หัก (สาย+เบิก)</p>
                                    <p className="text-xs font-black font-mono text-red-700 dark:text-red-400 truncate">-฿{formatMoney(summary.totalPenalty + summary.totalAdvanceDeduct)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Advance Deductions (if any) */}
                        {data.advances.length > 0 && (
                            <div className="tt-paper-card tt-instrument-frame rounded-[20px] border border-amber-500/30 bg-amber-500/5 p-4 dark:border-white/15 space-y-2">
                                <h3 className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4" />
                                    เบิกล่วงหน้า (หักจากเงินเดือนรอบนี้)
                                </h3>
                                <div className="space-y-1.5 pt-1">
                                    {data.advances.map((adv) => (
                                        <div key={adv.id} className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-zinc-600 dark:text-zinc-400">{adv.date} — {adv.reason || "เบิกค่าแรง"}</span>
                                            <span className="text-red-600 dark:text-red-400 font-mono font-black">-฿{formatMoney(adv.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Daily Timeline */}
                        <div className="space-y-2.5 pt-2">
                            <h2 className="text-[12px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 px-1 flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-[#fbbf24]" />
                                รายการแจกแจงรายวัน
                            </h2>

                            {data.dailyBreakdown.length === 0 ? (
                                <div className="tt-paper-card rounded-[18px] border border-zinc-700/25 p-8 text-center dark:border-white/10">
                                    <Wallet className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs font-black text-zinc-500">ยังไม่มีข้อมูลในเดือนนี้</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {[...data.dailyBreakdown].reverse().map((day) => {
                                        const dateObj = new Date(day.date + "T00:00:00");
                                        const dayOfWeek = THAI_DAYS[dateObj.getDay()];
                                        const dayNum = dateObj.getDate();
                                        const isExpanded = expandedDay === day.date;
                                        const hasSpecial = day.specialIncomes.length > 0;
                                        const hasPenalty = day.totalPenalty > 0;

                                        return (
                                            <div
                                                key={day.date}
                                                className={`tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 dark:border-white/15 cursor-pointer p-3.5 transition-all shadow-[0_2px_0_rgba(0,0,0,0.04)] ${
                                                    isExpanded ? "ring-2 ring-[#fbbf24]/50" : ""
                                                }`}
                                                onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                                            >
                                                {/* Main row */}
                                                <div className="flex items-center gap-3">
                                                    {/* Date badge */}
                                                    <div className="flex flex-col items-center w-9 shrink-0 bg-black/[0.04] dark:bg-white/[0.04] p-1 rounded-lg border border-zinc-700/10">
                                                        <span className="text-zinc-500 text-[9px] font-black">{dayOfWeek}</span>
                                                        <span className="text-zinc-900 dark:text-zinc-100 font-black text-base leading-none">{dayNum}</span>
                                                    </div>

                                                    {/* Time & badges */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-mono">
                                                            <Clock className="w-3 h-3 text-zinc-400" />
                                                            <span>
                                                                {day.checkIn ? formatTime(day.checkIn) : "--:--"}
                                                                {" - "}
                                                                {day.checkOut ? formatTime(day.checkOut) : "--:--"}
                                                            </span>
                                                            {day.actualHours && (
                                                                <span className="text-zinc-400">({day.actualHours.toFixed(1)} ชม.)</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                            {day.overtimeHours > 0 && (
                                                                <span className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20 text-[9px] font-black px-1.5 py-0.2 rounded">
                                                                    OT {day.overtimeHours.toFixed(1)} ชม.
                                                                </span>
                                                            )}
                                                            {hasSpecial && (
                                                                <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-black px-1.5 py-0.2 rounded">
                                                                    +พิเศษ
                                                                </span>
                                                            )}
                                                            {hasPenalty && (
                                                                <span className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20 text-[9px] font-black px-1.5 py-0.2 rounded">
                                                                    หัก ฿{formatMoney(day.totalPenalty)}
                                                                </span>
                                                            )}
                                                            {day.dayFactor === 0.5 && (
                                                                <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-[9px] font-black px-1.5 py-0.2 rounded">
                                                                    ครึ่งวัน
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Net amount */}
                                                    <div className="text-right shrink-0 flex items-center gap-1">
                                                        <span className={`font-mono font-black text-sm ${day.netDaily >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                            ฿{formatMoney(day.netDaily)}
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded detail */}
                                                {isExpanded && (
                                                    <div className="mt-3 pt-3 border-t border-zinc-700/15 dark:border-white/10 space-y-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                                        <div className="flex justify-between">
                                                            <span>ค่าแรงประจำวัน</span>
                                                            <span className="font-mono text-zinc-900 dark:text-zinc-100">฿{formatMoney(day.dailyWage)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>สัดส่วนวันทำงาน</span>
                                                            <span className="text-amber-700 dark:text-amber-300">{day.dayFactor > 0 ? formatWorkDays(day.dayFactor) : "-"}</span>
                                                        </div>
                                                        {day.overtimePay > 0 && (
                                                            <div className="flex justify-between">
                                                                <span>ค่าล่วงเวลา ({day.overtimeHours.toFixed(1)} ชม.)</span>
                                                                <span className="font-mono text-purple-700 dark:text-purple-400">+฿{formatMoney(day.overtimePay)}</span>
                                                            </div>
                                                        )}
                                                        {day.specialIncomes.map((si) => (
                                                            <div key={si.id} className="flex justify-between items-center">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span>{getTypeLabel(si.type)}</span>
                                                                    {getStatusBadge(si.status)}
                                                                </div>
                                                                <span className="font-mono text-emerald-700 dark:text-emerald-400">+฿{formatMoney(si.amount)}</span>
                                                            </div>
                                                        ))}
                                                        {day.specialIncomes.some((si) => si.salesAmount) && (
                                                            <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-lg p-2 text-[10px] text-zinc-500 mt-1 border border-zinc-700/10">
                                                                {day.specialIncomes
                                                                    .filter((si) => si.salesAmount)
                                                                    .map((si) => (
                                                                        <div key={si.id}>
                                                                            💡 ยอดขาย ฿{formatMoney(si.salesAmount!)} × {si.percentage}% = ฿{formatMoney(si.amount)}
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        )}
                                                        {day.latePenalty > 0 && (
                                                            <div className="flex justify-between">
                                                                <span>หักมาสาย</span>
                                                                <span className="font-mono text-red-600 dark:text-red-400">-฿{formatMoney(day.latePenalty)}</span>
                                                            </div>
                                                        )}
                                                        {day.earlyLeavePenalty > 0 && (
                                                            <div className="flex justify-between">
                                                                <span>หักกลับก่อนเวลา</span>
                                                                <span className="font-mono text-red-600 dark:text-red-400">-฿{formatMoney(day.earlyLeavePenalty)}</span>
                                                            </div>
                                                        )}
                                                        {day.breakPenalty > 0 && (
                                                            <div className="flex justify-between">
                                                                <span>หักเวลาพักเกิน</span>
                                                                <span className="font-mono text-red-600 dark:text-red-400">-฿{formatMoney(day.breakPenalty)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between font-black pt-2 border-t border-zinc-700/10 dark:border-white/5 text-[13px]">
                                                            <span className="text-zinc-900 dark:text-zinc-100">รวมสุทธิวันนี้</span>
                                                            <span className={day.netDaily >= 0 ? "font-mono text-emerald-700 dark:text-emerald-400" : "font-mono text-red-600 dark:text-red-400"}>
                                                                ฿{formatMoney(day.netDaily)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="tt-paper-card rounded-[18px] border border-zinc-700/25 p-8 text-center dark:border-white/10">
                        <Wallet className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-black text-zinc-500">ไม่สามารถโหลดข้อมูลกระเป๋าเงินได้</p>
                    </div>
                )}
            </main>
        </div>
    );
}
