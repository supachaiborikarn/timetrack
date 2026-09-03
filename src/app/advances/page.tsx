"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AssetAttachmentField, type PendingAsset } from "@/components/media/asset-fields";
import {
    Banknote,
    Plus,
    Clock,
    CheckCircle2,
    DollarSign,
    XCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    Calendar,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { formatThaiDate } from "@/lib/date-utils";

interface Advance {
    id: string;
    amount: number;
    month: number;
    year: number;
    reason: string | null;
    note: string | null;
    status: string;
    attachmentUrl: string | null;
    createdAt: string;
    paidAt: string | null;
}

const statusConfig: Record<string, { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }> = {
    PENDING: {
        label: "รออนุมัติ",
        badgeClass: "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300",
        icon: Clock,
    },
    APPROVED: {
        label: "อนุมัติแล้ว",
        badgeClass: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300",
        icon: CheckCircle2,
    },
    PAID: {
        label: "จ่ายเงินแล้ว",
        badgeClass: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        icon: DollarSign,
    },
    REJECTED: {
        label: "ปฏิเสธ",
        badgeClass: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400",
        icon: XCircle,
    },
};

export default function EmployeeAdvancesPage() {
    const { status: authStatus } = useSession();
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [formAmount, setFormAmount] = useState("");
    const [formReason, setFormReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [attachment, setAttachment] = useState<PendingAsset | null>(null);

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
                setAdvances(data.advances || []);
            }
        } catch (error) {
            console.error("Error fetching advances:", error);
            toast.error("ไม่สามารถโหลดข้อมูลการเบิกได้");
        } finally {
            setIsLoading(false);
        }
    }, [filterMonth, filterYear]);

    useEffect(() => {
        void fetchAdvances();
    }, [fetchAdvances]);

    const handleRequest = async () => {
        if (!formAmount || Number(formAmount) <= 0) {
            toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/advances", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: formAmount,
                    reason: formReason,
                    attachmentId: attachment?.id ?? null,
                }),
            });
            if (res.ok) {
                toast.success("ส่งคำขอเบิกค่าแรงสำเร็จ", {
                    description: "รอฝ่ายบุคคลหรือผู้จัดการตรวจสอบ",
                });
                setShowRequestModal(false);
                setFormAmount("");
                setFormReason("");
                setAttachment(null);
                void fetchAdvances();
            } else {
                const err = await res.json();
                toast.error(err.error || "เกิดข้อผิดพลาดในการยื่นคำขอ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSaving(false);
        }
    };

    const changeMonth = (delta: number) => {
        let m = filterMonth + delta;
        let y = filterYear;
        if (m > 12) {
            m = 1;
            y++;
        }
        if (m < 1) {
            m = 12;
            y--;
        }
        setFilterMonth(m);
        setFilterYear(y);
    };

    const totalAmount = advances.reduce((s, a) => s + Number(a.amount), 0);
    const thaiMonths = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];

    if (authStatus === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="SALARY ADVANCE"
                title="เบิกค่าแรง"
                subtitle="ขอเบิกเงินค่าแรงล่วงหน้าและตรวจสถานะ"
                backHref="/"
                right={
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="tt-retro-control mt-0.5 grid h-11 px-3.5 place-items-center rounded-full border-[1.5px] border-black/70 bg-zinc-950 text-[#fbbf24] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)] text-xs font-black flex-row gap-1.5 active:scale-95 transition-transform"
                        aria-label="ขอเบิกค่าแรง"
                    >
                        <Plus className="w-4 h-4 text-[#fbbf24]" />
                        <span>ขอเบิก</span>
                    </button>
                }
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {/* Month Picker Stepper */}
                <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 dark:border-white/15 p-2 flex items-center justify-between shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="tt-retro-control w-10 h-10 rounded-full border border-black/20 bg-white/60 dark:bg-zinc-800 flex items-center justify-center active:scale-95 text-zinc-800 dark:text-zinc-100 hover:bg-white transition-colors"
                        aria-label="เดือนก่อนหน้า"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                            ประจำเดือน
                        </span>
                        <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                            {thaiMonths[filterMonth - 1]} {filterYear + 543}
                        </span>
                    </div>
                    <button
                        onClick={() => changeMonth(1)}
                        className="tt-retro-control w-10 h-10 rounded-full border border-black/20 bg-white/60 dark:bg-zinc-800 flex items-center justify-center active:scale-95 text-zinc-800 dark:text-zinc-100 hover:bg-white transition-colors"
                        aria-label="เดือนถัดไป"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Summary Meter Panel */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                    <div className="grid grid-cols-2 gap-3 divide-x divide-zinc-700/15 dark:divide-white/10">
                        <div>
                            <p className="font-mono text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                ยอดขอเบิกรวม
                            </p>
                            <p className="mt-1 font-mono text-2xl font-black text-amber-600 dark:text-[#fbbf24]">
                                ฿{totalAmount.toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-500">ในรอบเดือนนี้</p>
                        </div>
                        <div className="pl-4">
                            <p className="font-mono text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                จำนวนคำขอ
                            </p>
                            <p className="mt-1 font-mono text-2xl font-black text-zinc-900 dark:text-zinc-100">
                                {advances.length}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-500">รายการทั้งหมด</p>
                        </div>
                    </div>
                </section>

                {/* Advances List */}
                <div className="flex items-center justify-between pt-1 px-1">
                    <h3 className="text-[12px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        ประวัติการขอเบิก
                    </h3>
                    <span className="font-mono text-[11px] font-bold text-zinc-500">
                        {advances.length} รายการ
                    </span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-7 h-7 animate-spin text-[#fbbf24]" />
                    </div>
                ) : advances.length === 0 ? (
                    <div className="tt-paper-card rounded-[18px] border border-zinc-700/25 p-8 text-center dark:border-white/10 space-y-3">
                        <Banknote className="w-10 h-10 text-zinc-400 mx-auto opacity-50" />
                        <p className="text-xs font-black text-zinc-500">
                            ไม่มีรายการเบิกค่าแรงในเดือนนี้
                        </p>
                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="tt-retro-control inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#fbbf24] text-zinc-950 text-xs font-black shadow-[0_2px_8px_rgba(251,191,36,0.25)] active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            ขอเบิกค่าแรงตอนนี้
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {advances.map((adv) => {
                            const sc = statusConfig[adv.status] || statusConfig.PENDING;
                            const StatusIcon = sc.icon;
                            return (
                                <div
                                    key={adv.id}
                                    className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 p-3.5 dark:border-white/15 space-y-2 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                                                จำนวนเงินที่ขอเบิก
                                            </p>
                                            <p className="text-xl font-mono font-black text-zinc-900 dark:text-zinc-100">
                                                ฿{Number(adv.amount).toLocaleString()}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className={`${sc.badgeClass} gap-1 text-[10px] font-black`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {sc.label}
                                        </Badge>
                                    </div>

                                    {adv.reason && (
                                        <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-black/[0.03] dark:bg-white/[0.03] p-2.5 rounded-xl border border-zinc-700/10 dark:border-white/5">
                                            <span className="font-bold text-zinc-700 dark:text-zinc-300">เหตุผล: </span>
                                            {adv.reason}
                                        </div>
                                    )}

                                    {adv.note && (
                                        <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                                            <span className="font-black">บันทึกจากผู้ดูแล: </span>
                                            {adv.note}
                                        </div>
                                    )}

                                    <div className="pt-1 border-t border-zinc-700/10 dark:border-white/5 flex items-center justify-between text-[9px] font-mono font-bold text-zinc-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            <span>
                                                ยื่นเมื่อ {formatThaiDate(new Date(adv.createdAt), "d MMM yyyy HH:mm")}
                                            </span>
                                        </div>
                                        {adv.attachmentUrl && (
                                            <a
                                                href={adv.attachmentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline font-bold text-[10px]"
                                            >
                                                <Paperclip className="w-3 h-3" /> เอกสารแนบ
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Request Modal */}
            {showRequestModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
                    onClick={() => setShowRequestModal(false)}
                >
                    <div
                        className="tt-paper-card border-t sm:border border-zinc-700/35 dark:border-white/20 rounded-t-[28px] sm:rounded-[24px] shadow-2xl w-full sm:max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-700/15 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full border border-black/15 bg-[#ffc62c]/35 flex items-center justify-center shrink-0">
                                    <Banknote className="w-4 h-4 text-black dark:text-white" />
                                </div>
                                <div>
                                    <h2 className="text-[16px] font-black text-zinc-900 dark:text-zinc-100">
                                        ขอเบิกค่าแรงล่วงหน้า
                                    </h2>
                                    <p className="text-[10px] font-bold text-zinc-500">
                                        ระบุจำนวนเงินที่ต้องการขอเบิก
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowRequestModal(false)}
                                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                aria-label="ปิด"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3.5">
                            <div>
                                <label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 mb-1 block">
                                    จำนวนเงินที่ต้องการเบิก (บาท) *
                                </label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-4 font-mono font-black text-lg text-zinc-400">
                                        ฿
                                    </span>
                                    <input
                                        type="number"
                                        value={formAmount}
                                        onChange={(e) => setFormAmount(e.target.value)}
                                        placeholder="0"
                                        min="1"
                                        step="100"
                                        className="w-full h-12 rounded-xl border border-zinc-700/30 bg-white dark:bg-zinc-900 pl-9 pr-4 text-xl font-mono font-black text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 mb-1 block">
                                    เหตุผลความจำเป็น
                                </label>
                                <textarea
                                    value={formReason}
                                    onChange={(e) => setFormReason(e.target.value)}
                                    placeholder="ระบุเหตุผลในการขอเบิก เช่น ค่ารักษาพยาบาล, ค่าใช้จ่ายฉุกเฉิน"
                                    rows={3}
                                    className="w-full rounded-xl border border-zinc-700/30 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 mb-1 block">
                                    แนบหลักฐานประกอบ (ถ้ามี)
                                </label>
                                <AssetAttachmentField
                                    kind="REQUEST_ATTACHMENT"
                                    value={attachment}
                                    onChange={setAttachment}
                                    buttonLabel="แนบรูปเอกสาร/ใบเสร็จ"
                                    helpText="เช่น ใบเสร็จ ใบรับรองแพทย์ หรือเอกสารประกอบการพิจารณา"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRequestModal(false)}
                                className="tt-retro-control flex-1 h-11 rounded-xl border border-zinc-700/30 bg-white/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-black active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleRequest}
                                disabled={!formAmount || isSaving}
                                className="tt-retro-control flex-1 h-11 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(251,191,36,0.25)] border border-black/20 active:scale-95 disabled:opacity-50 transition-all"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                                ยืนยันขอเบิก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

