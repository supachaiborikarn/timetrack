"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    ArrowLeft,
    Sparkles,
    MinusCircle,
} from "lucide-react";

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
    overtimeHours: number;
    dailyWage: number;
    overtimePay: number;
    latePenalty: number;
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
        <div className="min-h-screen bg-[#1a1412] pb-8">
            {/* Header */}
            <header className="bg-gradient-to-r from-[#241705] to-[#3a2510] border-b border-orange-900/20 px-4 py-4 shadow-lg shadow-black/20 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <a href="/" className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition">
                        <ArrowLeft className="w-5 h-5 text-stone-400" />
                    </a>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-[#FEEAF0] text-lg">กระเป๋าเงิน</h1>
                        <p className="text-xs text-stone-400">{data?.employee.station || "..."} • {data?.employee.department || "..."}</p>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4 max-w-lg mx-auto">
                {/* Month Navigator */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="text-stone-400 hover:text-white hover:bg-white/5">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="text-[#F0D0C7] font-semibold text-lg">
                        {THAI_MONTHS[currentMonth]} {currentYear + 543}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextMonth}
                        disabled={isCurrentMonth}
                        className="text-stone-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#F09410]" />
                    </div>
                ) : data && summary ? (
                    <>
                        {/* Hero Card — Projected Net Pay */}
                        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-700/30 shadow-xl shadow-emerald-900/10">
                            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-emerald-400/5 rounded-full blur-2xl" />
                            <CardContent className="p-5 relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-emerald-300/80 text-sm font-medium">
                                        {isCurrentMonth ? "ยอดคาดการณ์" : "ยอดรวม"}
                                    </span>
                                    {summary.pendingItems > 0 && (
                                        <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
                                            {summary.pendingItems} รายการรออนุมัติ
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-4xl font-bold text-white tracking-tight mb-1">
                                    ฿{formatMoney(summary.projectedNetPay)}
                                </div>
                                <div className="text-emerald-300/60 text-sm">
                                    ทำงาน {summary.workDays} วัน • เฉลี่ย ฿{summary.workDays > 0 ? formatMoney(summary.projectedNetPay / summary.workDays) : "0"}/วัน
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats Strip */}
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="bg-[#2a2420] border-orange-900/20">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10">
                                        <Banknote className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-stone-500 text-[11px]">ค่าแรง</p>
                                        <p className="text-[#F0D0C7] font-semibold text-sm">฿{formatMoney(summary.totalDailyWage)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#2a2420] border-orange-900/20">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10">
                                        <Clock className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-stone-500 text-[11px]">OT</p>
                                        <p className="text-[#F0D0C7] font-semibold text-sm">฿{formatMoney(summary.totalOT)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#2a2420] border-orange-900/20">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10">
                                        <Sparkles className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-stone-500 text-[11px]">รายได้พิเศษ</p>
                                        <p className="text-emerald-400 font-semibold text-sm">฿{formatMoney(summary.totalApprovedSpecialIncome)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#2a2420] border-orange-900/20">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-red-500/10">
                                        <MinusCircle className="w-4 h-4 text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-stone-500 text-[11px]">หัก (สาย+เบิก)</p>
                                        <p className="text-red-400 font-semibold text-sm">-฿{formatMoney(summary.totalPenalty + summary.totalAdvanceDeduct)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Advance Deductions (if any) */}
                        {data.advances.length > 0 && (
                            <Card className="bg-[#2a2420] border-orange-900/20">
                                <CardContent className="p-4">
                                    <h3 className="text-[#F0D0C7] font-semibold text-sm mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        เบิกล่วงหน้า (หักจากเงินเดือน)
                                    </h3>
                                    <div className="space-y-2">
                                        {data.advances.map((adv) => (
                                            <div key={adv.id} className="flex items-center justify-between text-sm">
                                                <span className="text-stone-400">{adv.date} — {adv.reason || "เบิกค่าแรง"}</span>
                                                <span className="text-red-400 font-medium">-฿{formatMoney(adv.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Daily Timeline */}
                        <div>
                            <h2 className="text-[#F0D0C7] font-semibold mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[#F09410]" />
                                รายการรายวัน
                            </h2>

                            {data.dailyBreakdown.length === 0 ? (
                                <Card className="bg-[#2a2420] border-orange-900/20">
                                    <CardContent className="p-8 text-center">
                                        <Wallet className="w-10 h-10 text-stone-600 mx-auto mb-3" />
                                        <p className="text-stone-500">ยังไม่มีข้อมูลเดือนนี้</p>
                                    </CardContent>
                                </Card>
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
                                            <Card
                                                key={day.date}
                                                className={`bg-[#2a2420] border-orange-900/20 cursor-pointer transition-all hover:border-orange-900/40 ${isExpanded ? "ring-1 ring-[#F09410]/30" : ""}`}
                                                onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                                            >
                                                <CardContent className="p-3">
                                                    {/* Main row */}
                                                    <div className="flex items-center gap-3">
                                                        {/* Date badge */}
                                                        <div className="flex flex-col items-center w-10 flex-shrink-0">
                                                            <span className="text-stone-500 text-[10px]">{dayOfWeek}</span>
                                                            <span className="text-[#F0D0C7] font-bold text-lg leading-none">{dayNum}</span>
                                                        </div>

                                                        {/* Time & badges */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 text-stone-400 text-xs">
                                                                <Clock className="w-3 h-3" />
                                                                <span>
                                                                    {day.checkIn ? formatTime(day.checkIn) : "--:--"}
                                                                    {" - "}
                                                                    {day.checkOut ? formatTime(day.checkOut) : "--:--"}
                                                                </span>
                                                                {day.actualHours && (
                                                                    <span className="text-stone-500">({day.actualHours.toFixed(1)} ชม.)</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                                {day.overtimeHours > 0 && (
                                                                    <Badge className="bg-purple-500/15 text-purple-400 border-0 text-[10px] px-1.5 py-0">
                                                                        OT {day.overtimeHours.toFixed(1)} ชม.
                                                                    </Badge>
                                                                )}
                                                                {hasSpecial && (
                                                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] px-1.5 py-0">
                                                                        +พิเศษ
                                                                    </Badge>
                                                                )}
                                                                {hasPenalty && (
                                                                    <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px] px-1.5 py-0">
                                                                        หัก ฿{formatMoney(day.totalPenalty)}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Net amount */}
                                                        <div className="text-right flex-shrink-0 flex items-center gap-1">
                                                            <span className={`font-semibold ${day.netDaily >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                                ฿{formatMoney(day.netDaily)}
                                                            </span>
                                                            {isExpanded ? (
                                                                <ChevronUp className="w-4 h-4 text-stone-500" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4 text-stone-500" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Expanded detail */}
                                                    {isExpanded && (
                                                        <div className="mt-3 pt-3 border-t border-stone-700/50 space-y-2 text-sm">
                                                            <div className="flex justify-between text-stone-400">
                                                                <span>ค่าแรงวันนี้</span>
                                                                <span className="text-[#F0D0C7]">฿{formatMoney(day.dailyWage)}</span>
                                                            </div>
                                                            {day.overtimePay > 0 && (
                                                                <div className="flex justify-between text-stone-400">
                                                                    <span>OT ({day.overtimeHours.toFixed(1)} ชม.)</span>
                                                                    <span className="text-purple-400">+฿{formatMoney(day.overtimePay)}</span>
                                                                </div>
                                                            )}
                                                            {day.specialIncomes.map((si) => (
                                                                <div key={si.id} className="flex justify-between items-center text-stone-400">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span>{getTypeLabel(si.type)}</span>
                                                                        {getStatusBadge(si.status)}
                                                                    </div>
                                                                    <span className="text-emerald-400">+฿{formatMoney(si.amount)}</span>
                                                                </div>
                                                            ))}
                                                            {day.specialIncomes.some((si) => si.salesAmount) && (
                                                                <div className="bg-stone-800/40 rounded-lg p-2 text-xs text-stone-500 mt-1">
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
                                                                <div className="flex justify-between text-stone-400">
                                                                    <span>หักมาสาย</span>
                                                                    <span className="text-red-400">-฿{formatMoney(day.latePenalty)}</span>
                                                                </div>
                                                            )}
                                                            {day.breakPenalty > 0 && (
                                                                <div className="flex justify-between text-stone-400">
                                                                    <span>หักพักเกิน</span>
                                                                    <span className="text-red-400">-฿{formatMoney(day.breakPenalty)}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between font-semibold pt-2 border-t border-stone-700/50">
                                                                <span className="text-stone-300">รวมวันนี้</span>
                                                                <span className={day.netDaily >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                                    ฿{formatMoney(day.netDaily)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <Card className="bg-[#2a2420] border-orange-900/20">
                        <CardContent className="p-8 text-center">
                            <Wallet className="w-10 h-10 text-stone-600 mx-auto mb-3" />
                            <p className="text-stone-500">ไม่สามารถโหลดข้อมูลได้</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
