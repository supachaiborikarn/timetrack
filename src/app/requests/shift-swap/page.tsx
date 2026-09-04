"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    RefreshCw,
    Loader2,
    Send,
    CheckCircle2,
    XCircle,
    AlertCircle,
    User,
    ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { formatThaiDate, getBangkokNow, format, addDays } from "@/lib/date-utils";

interface Colleague {
    id: string;
    name: string;
    employeeId: string;
    department: string;
}

interface ShiftSwap {
    id: string;
    requesterDate: string;
    targetDate: string;
    reason: string;
    status: string;
    targetAccepted: boolean;
    target: { name: string };
    createdAt: string;
}

export default function ShiftSwapPage() {
    const { data: session, status } = useSession();
    const [requests, setRequests] = useState<ShiftSwap[]>([]);
    const [colleagues, setColleagues] = useState<Colleague[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [myDate, setMyDate] = useState(format(addDays(getBangkokNow(), 1), "yyyy-MM-dd"));
    const [targetId, setTargetId] = useState("");
    const [targetDate, setTargetDate] = useState(format(addDays(getBangkokNow(), 1), "yyyy-MM-dd"));
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (session?.user?.id) {
            void fetchData();
        }
    }, [session?.user?.id]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [reqRes, colRes] = await Promise.all([
                fetch("/api/requests/shift-swap"),
                fetch("/api/requests/shift-swap/colleagues"),
            ]);

            if (reqRes.ok) {
                const data = await reqRes.json();
                setRequests(data.requests || []);
            }
            if (colRes.ok) {
                const data = await colRes.json();
                setColleagues(data.colleagues || []);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!targetId) {
            toast.error("กรุณาเลือกเพื่อนร่วมงาน");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/requests/shift-swap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requesterDate: myDate,
                    targetId,
                    targetDate,
                    reason,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("ส่งคำขอแลกกะสำเร็จ", {
                    description: "รอเพื่อนร่วมงานตอบรับและผู้จัดการอนุมัติ",
                });
                setReason("");
                void fetchData();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
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

    const getStatusBadge = (req: ShiftSwap) => {
        if (req.status === "APPROVED") {
            return (
                <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 gap-1 text-[10px] font-black">
                    <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
                </Badge>
            );
        }
        if (req.status === "REJECTED") {
            return (
                <Badge className="border border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400 gap-1 text-[10px] font-black">
                    <XCircle className="w-3 h-3" /> ปฏิเสธ
                </Badge>
            );
        }
        if (!req.targetAccepted) {
            return (
                <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300 gap-1 text-[10px] font-black">
                    <AlertCircle className="w-3 h-3" /> รอเพื่อนยินยอม
                </Badge>
            );
        }
        return (
            <Badge className="border border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300 gap-1 text-[10px] font-black">
                <AlertCircle className="w-3 h-3" /> รอผู้จัดการอนุมัติ
            </Badge>
        );
    };

    // Generate date options (next 14 days)
    const dateOptions = Array.from({ length: 14 }, (_, i) => {
        const date = addDays(getBangkokNow(), i + 1);
        return {
            value: format(date, "yyyy-MM-dd"),
            label: formatThaiDate(date, "EEEE d MMM"),
        };
    });

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="SHIFT SWAP"
                title="ขอแลกกะทำงาน"
                subtitle="ส่งคำขอแลกเปลี่ยนกะทำงานกับเพื่อนร่วมงาน"
                backHref="/requests"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {/* Form Card */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 p-4 dark:border-white/15">
                    <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-700/15 dark:border-white/10 pb-3">
                        <div className="w-9 h-9 rounded-full border border-black/15 bg-blue-500/20 flex items-center justify-center shrink-0">
                            <ArrowRightLeft className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black leading-tight">สร้างคำขอแลกกะ</h2>
                            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                เลือกวันที่ต้องการแลกและเพื่อนร่วมงานเป้าหมาย
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                วันที่ของฉัน (วันที่อยากให้เพื่อนมาแทน)
                            </Label>
                            <Select value={myDate} onValueChange={setMyDate}>
                                <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-bold text-xs focus:ring-[#fbbf24]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#fbf6ee] dark:bg-zinc-900 border border-zinc-700/30">
                                    {dateOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                แลกกับเพื่อนร่วมงาน *
                            </Label>
                            <Select value={targetId} onValueChange={setTargetId}>
                                <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-bold text-xs focus:ring-[#fbbf24]">
                                    <SelectValue placeholder="เลือกเพื่อนร่วมงานในทีม" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#fbf6ee] dark:bg-zinc-900 border border-zinc-700/30">
                                    {colleagues.map((c) => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs font-bold">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-zinc-400" />
                                                <span>{c.name}</span>
                                                <span className="text-[10px] text-zinc-400">({c.department})</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                วันที่ของเพื่อน (วันที่เราจะไปแทนเพื่อน)
                            </Label>
                            <Select value={targetDate} onValueChange={setTargetDate}>
                                <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-bold text-xs focus:ring-[#fbbf24]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#fbf6ee] dark:bg-zinc-900 border border-zinc-700/30">
                                    {dateOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                เหตุผลความจำเป็น
                            </Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="เช่น ติดธุระครอบครัว, แลกเวรหยุดสุดสัปดาห์"
                                className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-bold text-xs placeholder:text-zinc-400 focus-visible:ring-[#fbbf24]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !targetId}
                            className="tt-retro-control w-full h-12 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black text-[13px] flex items-center justify-center gap-2 shadow-[0_3px_10px_rgba(251,191,36,0.25)] border border-black/20 active:scale-[0.98] disabled:opacity-50 transition-all mt-3"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            ส่งคำขอแลกกะ
                        </button>
                    </form>
                </section>

                {/* History Section */}
                <div className="flex items-center justify-between pt-2 px-1">
                    <h3 className="text-[12px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        ประวัติคำขอแลกกะของฉัน
                    </h3>
                    <span className="font-mono text-[11px] font-bold text-zinc-500">
                        {requests.length} รายการ
                    </span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-7 h-7 animate-spin text-[#fbbf24]" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="tt-paper-card rounded-[18px] border border-zinc-700/25 p-8 text-center dark:border-white/10">
                        <RefreshCw className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-black text-zinc-500">ยังไม่มีประวัติคำขอแลกกะ</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 p-3.5 dark:border-white/15 space-y-2.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[13px] font-black text-zinc-900 dark:text-zinc-100">
                                            แลกกับ {req.target.name}
                                        </span>
                                    </div>
                                    {getStatusBadge(req)}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-black/[0.03] dark:bg-white/[0.03] p-2.5 rounded-xl border border-zinc-700/10 dark:border-white/5">
                                    <div>
                                        <span className="text-zinc-600 dark:text-zinc-400 block text-[9px] uppercase tracking-wider font-mono">
                                            วันที่ของฉัน
                                        </span>
                                        <span className="font-black text-zinc-800 dark:text-zinc-200">
                                            {formatThaiDate(new Date(req.requesterDate), "d MMM yyyy")}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-600 dark:text-zinc-400 block text-[9px] uppercase tracking-wider font-mono">
                                            วันที่ของเพื่อน
                                        </span>
                                        <span className="font-black text-zinc-800 dark:text-zinc-200">
                                            {formatThaiDate(new Date(req.targetDate), "d MMM yyyy")}
                                        </span>
                                    </div>
                                </div>

                                {req.reason && (
                                    <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 px-1">
                                        <span className="font-bold text-zinc-700 dark:text-zinc-300">เหตุผล: </span>
                                        {req.reason}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

