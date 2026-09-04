"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    Clock,
    User,
    HandCoins,
    AlertCircle,
    Plus,
    CheckCircle2,
    Layers,
} from "lucide-react";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { formatThaiDate } from "@/lib/date-utils";

interface ShiftPoolItem {
    id: string;
    shiftId: string;
    date: string;
    releasedBy: string;
    reason: string | null;
    status: string;
    bonusAmount: number | null;
    shift: {
        code: string;
        name: string;
        startTime: string;
        endTime: string;
    } | null;
    releasedByUser: {
        name: string;
        department: string | null;
    } | null;
}

export default function ShiftPoolPage() {
    const { data: session, status } = useSession();
    const [shifts, setShifts] = useState<ShiftPoolItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedShift, setSelectedShift] = useState<ShiftPoolItem | null>(null);
    const [claimDialogOpen, setClaimDialogOpen] = useState(false);
    const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
    const [releaseReason, setReleaseReason] = useState("");
    const [releaseDate, setReleaseDate] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        void fetchOpenShifts();
    }, []);

    const fetchOpenShifts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/shift-pool");
            if (res.ok) {
                const data = await res.json();
                setShifts(data.shifts || []);
            }
        } catch (error) {
            console.error("Error fetching shifts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaimShift = async () => {
        if (!selectedShift) return;
        setIsProcessing(true);

        try {
            const res = await fetch("/api/shift-pool", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ poolId: selectedShift.id }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "รับกะสำเร็จ");
                setClaimDialogOpen(false);
                void fetchOpenShifts();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReleaseShift = async () => {
        if (!releaseDate) {
            toast.error("กรุณาเลือกวันที่");
            return;
        }

        setIsProcessing(true);

        try {
            const res = await fetch("/api/shift-pool", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: releaseDate,
                    reason: releaseReason,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "ปล่อยกะสำเร็จ");
                setReleaseDialogOpen(false);
                setReleaseReason("");
                setReleaseDate("");
                void fetchOpenShifts();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsProcessing(false);
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

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="SHIFT POOL"
                title="ตลาดกะว่าง"
                subtitle="รับกะทำงานเพิ่มเติมหรือปล่อยกะให้เพื่อนร่วมงาน"
                backHref="/"
                right={
                    <button
                        onClick={() => setReleaseDialogOpen(true)}
                        className="tt-retro-control mt-0.5 grid h-11 px-3.5 place-items-center rounded-full border-[1.5px] border-black/70 bg-zinc-950 text-[#fbbf24] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)] text-xs font-black flex-row gap-1.5 active:scale-95 transition-transform"
                    >
                        <Plus className="w-4 h-4 text-[#fbbf24]" />
                        <span>ปล่อยกะ</span>
                    </button>
                }
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[12px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        กะว่างที่เปิดให้รับ
                    </span>
                    <span className="font-mono text-[11px] font-bold text-zinc-500">
                        {shifts.length} กะว่าง
                    </span>
                </div>

                {/* Open Shifts List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-7 h-7 animate-spin text-[#fbbf24]" />
                    </div>
                ) : shifts.length === 0 ? (
                    <div className="tt-paper-card rounded-[18px] border border-zinc-700/25 p-10 text-center dark:border-white/10 space-y-2">
                        <Layers className="w-10 h-10 text-zinc-400 mx-auto opacity-40" />
                        <p className="text-xs font-black text-zinc-500">ไม่มีกะว่างในตลาดขณะนี้</p>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400">เมื่อมีเพื่อนร่วมงานปล่อยกะ รายการจะปรากฏที่นี่</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {shifts.map((shift) => (
                            <div
                                key={shift.id}
                                className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 p-4 dark:border-white/15 cursor-pointer hover:border-amber-500/50 transition-all shadow-[0_2px_0_rgba(0,0,0,0.06)] active:scale-[0.99]"
                                onClick={() => {
                                    setSelectedShift(shift);
                                    setClaimDialogOpen(true);
                                }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-[#fbbf24] text-zinc-950 border border-black/15">
                                                กะ {shift.shift?.code || "N/A"}
                                            </span>
                                            <span className="text-[13px] font-black text-zinc-900 dark:text-zinc-100">
                                                {formatThaiDate(new Date(shift.date), "EEEE d MMM yyyy")}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                                            <span className="flex items-center gap-1 font-mono">
                                                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                                {shift.shift?.startTime} - {shift.shift?.endTime}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3.5 h-3.5 text-zinc-400" />
                                                {shift.releasedByUser?.name}
                                            </span>
                                        </div>

                                        {shift.reason && (
                                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic bg-black/[0.03] dark:bg-white/[0.03] p-2 rounded-lg border border-zinc-700/10">
                                                &quot;{shift.reason}&quot;
                                            </p>
                                        )}
                                    </div>

                                    {shift.bonusAmount && (
                                        <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black shrink-0">
                                            <HandCoins className="w-3 h-3 mr-1" />+{shift.bonusAmount}฿
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Claim Dialog */}
            <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
                <DialogContent className="tt-paper-card border border-zinc-700/35 rounded-2xl p-6 text-zinc-950 dark:text-zinc-50 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-[#fbbf24]" />
                            ยืนยันรับกะนี้หรือไม่?
                        </DialogTitle>
                    </DialogHeader>
                    {selectedShift && (
                        <div className="py-3 space-y-3">
                            <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-xl p-3.5 border border-zinc-700/15 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#fbbf24] text-zinc-950">
                                        กะ {selectedShift.shift?.code}
                                    </span>
                                    <span className="text-xs font-black">
                                        {formatThaiDate(new Date(selectedShift.date), "EEEE d MMM yyyy")}
                                    </span>
                                </div>
                                <p className="text-[11px] font-mono font-bold text-zinc-500">
                                    เวลา {selectedShift.shift?.startTime} - {selectedShift.shift?.endTime} น.
                                </p>
                                <p className="text-[11px] text-zinc-500">
                                    ปล่อยโดย: {selectedShift.releasedByUser?.name}
                                </p>
                            </div>

                            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>เมื่อกดยืนยัน กะนี้จะถูกบรรจุเข้าสู่ตารางการทำงานของคุณทันที</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setClaimDialogOpen(false)}
                            className="tt-retro-control flex-1 h-11 rounded-xl border border-zinc-700/30 bg-white/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-black active:scale-95"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleClaimShift}
                            disabled={isProcessing}
                            className="tt-retro-control flex-1 h-11 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(251,191,36,0.25)] border border-black/20 active:scale-95 disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            ยืนยันรับกะ
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Release Dialog */}
            <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
                <DialogContent className="tt-paper-card border border-zinc-700/35 rounded-2xl p-6 text-zinc-950 dark:text-zinc-50 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-[#fbbf24]" />
                            ปล่อยกะของฉันเข้าสู่ตลาด
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-3 space-y-3">
                        <div>
                            <label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 mb-1 block">
                                วันที่ต้องการปล่อยกะ *
                            </label>
                            <input
                                type="date"
                                value={releaseDate}
                                onChange={(e) => setReleaseDate(e.target.value)}
                                className="w-full h-11 px-3 bg-white dark:bg-zinc-900 border border-zinc-700/30 rounded-xl text-xs font-black text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 mb-1 block">
                                เหตุผล (ไม่บังคับ)
                            </label>
                            <Textarea
                                value={releaseReason}
                                onChange={(e) => setReleaseReason(e.target.value)}
                                placeholder="เช่น ติดสอบ, ติดธุระฉุกเฉิน"
                                className="bg-white dark:bg-zinc-900 border border-zinc-700/30 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 resize-none focus-visible:ring-[#fbbf24]"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setReleaseDialogOpen(false)}
                            className="tt-retro-control flex-1 h-11 rounded-xl border border-zinc-700/30 bg-white/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-black active:scale-95"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleReleaseShift}
                            disabled={isProcessing || !releaseDate}
                            className="tt-retro-control flex-1 h-11 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(251,191,36,0.25)] border border-black/20 active:scale-95 disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            ปล่อยกะ
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

