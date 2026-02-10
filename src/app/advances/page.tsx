"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Banknote,
    Plus,
    Clock,
    CheckCircle,
    DollarSign,
    XCircle,
    Loader2,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

interface Advance {
    id: string;
    amount: number;
    month: number;
    year: number;
    reason: string | null;
    note: string | null;
    status: string;
    createdAt: string;
    paidAt: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    PENDING: { label: "รออนุมัติ", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
    APPROVED: { label: "อนุมัติแล้ว", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: CheckCircle },
    PAID: { label: "จ่ายแล้ว", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: DollarSign },
    REJECTED: { label: "ปฏิเสธ", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

export default function EmployeeAdvancesPage() {
    const { data: session, status: authStatus } = useSession();
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [formAmount, setFormAmount] = useState("");
    const [formReason, setFormReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
    const [filterYear, setFilterYear] = useState(now.getFullYear());

    if (authStatus === "unauthenticated") redirect("/login");

    const fetchAdvances = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("month", String(filterMonth));
            params.set("year", String(filterYear));
            const res = await fetch(`/api/advances?${params}`);
            if (res.ok) {
                const data = await res.json();
                setAdvances(data.advances);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [filterMonth, filterYear]);

    useEffect(() => {
        fetchAdvances();
    }, [fetchAdvances]);

    const handleRequest = async () => {
        if (!formAmount) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/advances", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: formAmount, reason: formReason }),
            });
            if (res.ok) {
                setShowRequestModal(false);
                setFormAmount("");
                setFormReason("");
                fetchAdvances();
            } else {
                const err = await res.json();
                alert(err.error || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const changeMonth = (delta: number) => {
        let m = filterMonth + delta;
        let y = filterYear;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
        setFilterMonth(m);
        setFilterYear(y);
    };

    const totalAmount = advances.reduce((s, a) => s + Number(a.amount), 0);
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

    if (authStatus === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1a1412]">
                <Loader2 className="w-8 h-8 animate-spin text-[#F09410]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1a1412] pb-24">
            {/* Header */}
            <header className="bg-gradient-to-r from-[#241705] to-[#3a2510] border-b border-orange-900/20 px-4 py-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="p-2 rounded-lg hover:bg-white/5 transition">
                            <ArrowLeft className="w-5 h-5 text-[#F09410]" />
                        </a>
                        <div>
                            <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FEEAF0] to-[#F0D0C7] text-lg">
                                เบิกค่าแรง
                            </h1>
                            <p className="text-xs text-stone-400">รายการขอเบิกเงินค่าแรง</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowRequestModal(true)}
                        size="sm"
                        className="bg-gradient-to-r from-[#F09410] to-[#BC430D] hover:opacity-90 text-white gap-1.5 shadow-lg shadow-orange-900/30"
                    >
                        <Plus className="w-4 h-4" />
                        ขอเบิก
                    </Button>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {/* Month Picker */}
                <div className="flex items-center justify-center gap-3">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-stone-400 hover:text-[#F09410]" onClick={() => changeMonth(-1)}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="font-semibold text-[#F0D0C7] min-w-[120px] text-center">
                        {thaiMonths[filterMonth - 1]} {filterYear + 543}
                    </span>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-stone-400 hover:text-[#F09410]" onClick={() => changeMonth(1)}>
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>

                {/* Summary */}
                <Card className="bg-gradient-to-br from-[#2a2420] to-[#241705] border-orange-900/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-stone-400">ยอดเบิกรวม</p>
                                <p className="text-2xl font-bold text-[#F09410]">{totalAmount.toLocaleString()} ฿</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-stone-400">จำนวนรายการ</p>
                                <p className="text-2xl font-bold text-[#F0D0C7]">{advances.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Advances List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
                    </div>
                ) : advances.length === 0 ? (
                    <div className="text-center py-12">
                        <Banknote className="w-12 h-12 mx-auto mb-3 text-stone-600" />
                        <p className="text-stone-500">ไม่มีรายการเบิกค่าแรงในเดือนนี้</p>
                        <Button
                            onClick={() => setShowRequestModal(true)}
                            variant="ghost"
                            className="mt-3 text-[#F09410] hover:text-[#F09410] hover:bg-[#F09410]/10"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            ขอเบิกค่าแรง
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {advances.map((adv) => {
                            const sc = statusConfig[adv.status] || statusConfig.PENDING;
                            const StatusIcon = sc.icon;
                            return (
                                <Card key={adv.id} className="bg-[#2a2420] border-orange-900/30 overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <p className="text-lg font-bold text-[#F0D0C7]">
                                                    {Number(adv.amount).toLocaleString()} ฿
                                                </p>
                                                {adv.reason && (
                                                    <p className="text-xs text-stone-400">{adv.reason}</p>
                                                )}
                                                <p className="text-[10px] text-stone-500">
                                                    {new Date(adv.createdAt).toLocaleDateString("th-TH", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className={`${sc.color} gap-1 text-xs`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {sc.label}
                                            </Badge>
                                        </div>
                                        {adv.note && (
                                            <div className="mt-2 pt-2 border-t border-orange-900/20">
                                                <p className="text-xs text-stone-400">
                                                    <span className="text-stone-500">หมายเหตุ:</span> {adv.note}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setShowRequestModal(false)}>
                    <div
                        className="bg-[#2a2420] border-t sm:border border-orange-900/30 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-[#F0D0C7] flex items-center gap-2">
                            <Banknote className="w-5 h-5 text-[#F09410]" />
                            ขอเบิกค่าแรง
                        </h2>

                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-[#F0D0C7] mb-1.5 block">จำนวนเงิน (บาท) *</label>
                                <input
                                    type="number"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full h-12 rounded-lg border border-orange-900/30 bg-[#1a1412] px-4 text-lg font-bold text-[#F09410] placeholder:text-stone-600 focus:outline-none focus:border-[#F09410]/50"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-[#F0D0C7] mb-1.5 block">เหตุผล</label>
                                <textarea
                                    value={formReason}
                                    onChange={(e) => setFormReason(e.target.value)}
                                    placeholder="ระบุเหตุผลในการขอเบิก (ถ้ามี)"
                                    rows={3}
                                    className="w-full rounded-lg border border-orange-900/30 bg-[#1a1412] px-4 py-3 text-sm text-[#F0D0C7] placeholder:text-stone-600 resize-none focus:outline-none focus:border-[#F09410]/50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowRequestModal(false)}
                                className="flex-1 border-orange-900/30 text-stone-400 hover:text-[#F0D0C7] hover:bg-[#1a1412]"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                onClick={handleRequest}
                                disabled={!formAmount || isSaving}
                                className="flex-1 bg-gradient-to-r from-[#F09410] to-[#BC430D] hover:opacity-90 text-white font-semibold shadow-lg shadow-orange-900/30"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                ส่งคำขอเบิก
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
