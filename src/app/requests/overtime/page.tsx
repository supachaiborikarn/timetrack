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
    Clock,
    Loader2,
    Send,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Timer,
    Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { formatThaiDate, getBangkokNow, format, subDays, addDays } from "@/lib/date-utils";

interface OvertimeRequest {
    id: string;
    date: string;
    hours: number;
    reason: string;
    status: string;
    createdAt: string;
    rejectReason?: string;
}

export default function OvertimeRequestPage() {
    const { data: session, status } = useSession();
    const [requests, setRequests] = useState<OvertimeRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [selectedDate, setSelectedDate] = useState(format(getBangkokNow(), "yyyy-MM-dd"));
    const [hours, setHours] = useState("2");
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (session?.user?.id) {
            void fetchRequests();
        }
    }, [session?.user?.id]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/requests/overtime");
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            toast.error("กรุณาระบุเหตุผล");
            return;
        }

        const hoursNum = parseFloat(hours);
        if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 12) {
            toast.error("จำนวนชั่วโมงต้องอยู่ระหว่าง 0.5 - 12 ชั่วโมง");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/requests/overtime", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: selectedDate,
                    hours: hoursNum,
                    reason,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("ส่งคำขอโอทีสำเร็จ", {
                    description: "รอผู้จัดการตรวจสอบและอนุมัติ",
                });
                setReason("");
                setHours("2");
                void fetchRequests();
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

    const getStatusBadge = (reqStatus: string) => {
        switch (reqStatus) {
            case "APPROVED":
                return (
                    <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 gap-1 text-[10px] font-black">
                        <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
                    </Badge>
                );
            case "REJECTED":
                return (
                    <Badge className="border border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400 gap-1 text-[10px] font-black">
                        <XCircle className="w-3 h-3" /> ปฏิเสธ
                    </Badge>
                );
            default:
                return (
                    <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300 gap-1 text-[10px] font-black">
                        <AlertCircle className="w-3 h-3" /> รอดำเนินการ
                    </Badge>
                );
        }
    };

    // Generate date options (last 7 days + next 7 days)
    const dateOptions = [
        ...Array.from({ length: 7 }, (_, i) => {
            const date = subDays(getBangkokNow(), 6 - i);
            return {
                value: format(date, "yyyy-MM-dd"),
                label: formatThaiDate(date, "EEEE d MMM"),
            };
        }),
        ...Array.from({ length: 7 }, (_, i) => {
            const date = addDays(getBangkokNow(), i + 1);
            return {
                value: format(date, "yyyy-MM-dd"),
                label: formatThaiDate(date, "EEEE d MMM"),
            };
        }),
    ];

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="OVERTIME"
                title="ขอทำโอที"
                subtitle="ขออนุมัติการทำงานล่วงเวลา (OT)"
                backHref="/requests"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {/* Form Card */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 p-4 dark:border-white/15">
                    <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-700/15 dark:border-white/10 pb-3">
                        <div className="w-9 h-9 rounded-full border border-black/15 bg-amber-500/20 flex items-center justify-center shrink-0">
                            <Timer className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black leading-tight">สร้างคำขอทำงานล่วงเวลา</h2>
                            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                ระบุวันที่ จำนวนชั่วโมง และเหตุผลความจำเป็น
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                    วันที่ทำโอที
                                </Label>
                                <Select value={selectedDate} onValueChange={setSelectedDate}>
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
                                    จำนวนชั่วโมง
                                </Label>
                                <Select value={hours} onValueChange={setHours}>
                                    <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-bold text-xs focus:ring-[#fbbf24]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#fbf6ee] dark:bg-zinc-900 border border-zinc-700/30">
                                        {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                                            <SelectItem key={h} value={h.toString()} className="text-xs font-bold">
                                                {h} ชั่วโมง
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                เหตุผล / รายละเอียดงาน *
                            </Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="เช่น ปิดงานรอบกะดึก, เติมน้ำมันรถบริการฉุกเฉิน"
                                className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-bold text-xs placeholder:text-zinc-400 focus-visible:ring-[#fbbf24]"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="tt-retro-control w-full h-12 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black text-[13px] flex items-center justify-center gap-2 shadow-[0_3px_10px_rgba(251,191,36,0.25)] border border-black/20 active:scale-[0.98] disabled:opacity-50 transition-all mt-3"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            ส่งคำขอโอที
                        </button>
                    </form>
                </section>

                {/* History Section */}
                <div className="flex items-center justify-between pt-2 px-1">
                    <h3 className="text-[12px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        ประวัติคำขอโอที
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
                        <Clock className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-black text-zinc-500">ยังไม่มีประวัติคำขอโอที</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 p-3.5 dark:border-white/15 space-y-2 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-[13px] font-black text-zinc-900 dark:text-zinc-100">
                                            {formatThaiDate(new Date(req.date), "d MMM yyyy")}
                                        </span>
                                    </div>
                                    {getStatusBadge(req.status)}
                                </div>

                                <div className="flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.03] p-2.5 rounded-xl border border-zinc-700/10 dark:border-white/5">
                                    <div>
                                        <span className="text-zinc-600 dark:text-zinc-400 block text-[9px] uppercase tracking-wider font-mono">
                                            จำนวนชั่วโมง
                                        </span>
                                        <span className="font-mono font-black text-base text-amber-600 dark:text-[#fbbf24]">
                                            {req.hours} ชม.
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-zinc-600 dark:text-zinc-400 block text-[9px] uppercase tracking-wider font-mono">
                                            วันที่ยื่นขอ
                                        </span>
                                        <span className="font-mono text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                                            {formatThaiDate(new Date(req.createdAt), "d/M/yy HH:mm")}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 px-1">
                                    <p className="line-clamp-2">
                                        <span className="font-bold text-zinc-700 dark:text-zinc-300">เหตุผล: </span>
                                        {req.reason}
                                    </p>
                                    {req.status === "REJECTED" && req.rejectReason && (
                                        <p className="text-red-600 dark:text-red-400 font-bold mt-1 text-[11px]">
                                            เหตุผลที่ปฏิเสธ: {req.rejectReason}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

