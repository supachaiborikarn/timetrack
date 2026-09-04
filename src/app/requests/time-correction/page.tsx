"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
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
    FileEdit,
    Loader2,
    Send,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Paperclip,
    Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { AssetAttachmentField, type PendingAsset } from "@/components/media/asset-fields";
import { formatThaiDate, getBangkokNow, format, subDays } from "@/lib/date-utils";

interface TimeCorrection {
    id: string;
    date: string;
    requestType: string;
    requestedTime: string;
    reason: string;
    status: string;
    attachmentUrl: string | null;
    createdAt: string;
}

function TimeCorrectionForm() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const paramDate = searchParams.get("date");

    const [requests, setRequests] = useState<TimeCorrection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state - prefill with paramDate if valid YYYY-MM-DD
    const initialDate = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)
        ? paramDate
        : format(getBangkokNow(), "yyyy-MM-dd");

    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [requestType, setRequestType] = useState("CHECK_IN");
    const [requestedTime, setRequestedTime] = useState("08:00");
    const [reason, setReason] = useState("");
    const [attachment, setAttachment] = useState<PendingAsset | null>(null);

    useEffect(() => {
        if (session?.user?.id) {
            void fetchRequests();
        }
    }, [session?.user?.id]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/requests/time-correction");
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

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/requests/time-correction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: selectedDate,
                    requestType,
                    requestedTime: new Date(`${selectedDate}T${requestedTime}:00`).toISOString(),
                    reason,
                    attachmentId: attachment?.id ?? null,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("ส่งคำขอสำเร็จ", {
                    description: "รอผู้จัดการตรวจสอบและอนุมัติ",
                });
                setReason("");
                setAttachment(null);
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

    // Generate date options (last 14 days)
    const dateOptions = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(getBangkokNow(), i);
        return {
            value: format(date, "yyyy-MM-dd"),
            label: formatThaiDate(date, "EEEE d MMM yyyy"),
        };
    });

    // Make sure initial/param date is in options if older than 14 days
    const isSelectedDateInOptions = dateOptions.some((opt) => opt.value === selectedDate);
    if (!isSelectedDateInOptions) {
        dateOptions.push({
            value: selectedDate,
            label: formatThaiDate(new Date(selectedDate), "EEEE d MMM yyyy"),
        });
    }

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="TIME CORRECTION"
                title="ขอแก้ไขเวลา"
                subtitle="แจ้งลืมกดเข้า-ออกงานหรือเวลาไม่ตรง"
                backHref="/"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {/* Form Card */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 p-4 dark:border-white/15">
                    <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-700/15 dark:border-white/10 pb-3">
                        <div className="w-9 h-9 rounded-full border border-black/15 bg-[#ffc62c]/35 flex items-center justify-center shrink-0">
                            <FileEdit className="w-4 h-4 text-black dark:text-white" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black leading-tight">สร้างคำขอแก้ไขเวลา</h2>
                            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                ส่งข้อมูลเวลาจริงและเหตุผลให้ผู้จัดการตรวจสอบ
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                    วันที่เกิดปัญหา
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
                                    ประเภทรายการ
                                </Label>
                                <Select value={requestType} onValueChange={setRequestType}>
                                    <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-bold text-xs focus:ring-[#fbbf24]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#fbf6ee] dark:bg-zinc-900 border border-zinc-700/30">
                                        <SelectItem value="CHECK_IN" className="text-xs font-bold">เข้าเวร (Check-in)</SelectItem>
                                        <SelectItem value="CHECK_OUT" className="text-xs font-bold">เลิกเวร (Check-out)</SelectItem>
                                        <SelectItem value="BOTH" className="text-xs font-bold">ทั้งสองรายการ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                เวลาจริงที่ต้องการลง
                            </Label>
                            <div className="relative flex items-center">
                                <Clock className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                                <Input
                                    type="time"
                                    value={requestedTime}
                                    onChange={(e) => setRequestedTime(e.target.value)}
                                    className="h-11 pl-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-mono font-black text-sm focus-visible:ring-[#fbbf24]"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                เหตุผลความจำเป็น *
                            </Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="เช่น ลืมกดเข้าเวร, เครื่องสแกนแบตหมด"
                                className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-700/30 text-zinc-900 dark:text-zinc-100 font-bold text-xs placeholder:text-zinc-400 focus-visible:ring-[#fbbf24]"
                                required
                            />
                        </div>

                        <div className="space-y-1 pt-1">
                            <Label className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">
                                แนบหลักฐาน (ถ้ามี)
                            </Label>
                            <AssetAttachmentField
                                kind="REQUEST_ATTACHMENT"
                                value={attachment}
                                onChange={setAttachment}
                                buttonLabel="แนบรูปภาพหลักฐาน"
                                helpText="เช่น รูปหน้าจอเวลา, รูปถ่ายหน้าลาน หรือใบรับรองยืนยันเวลา"
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
                            ส่งคำขอแก้ไขเวลา
                        </button>
                    </form>
                </section>

                {/* History Section */}
                <div className="flex items-center justify-between pt-2 px-1">
                    <h3 className="text-[12px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        ประวัติคำขอของคุณ
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
                        <FileEdit className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-black text-zinc-500">ยังไม่มีประวัติคำขอแก้ไขเวลา</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {requests.map((req) => {
                            const reqDate = new Date(req.date);
                            const reqTime = new Date(req.requestedTime);
                            return (
                                <div
                                    key={req.id}
                                    className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 p-3.5 dark:border-white/15 space-y-2 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                            <span className="text-[13px] font-black text-zinc-900 dark:text-zinc-100">
                                                {formatThaiDate(reqDate, "d MMM yyyy")}
                                            </span>
                                        </div>
                                        {getStatusBadge(req.status)}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-black/[0.03] dark:bg-white/[0.03] p-2.5 rounded-xl border border-zinc-700/10 dark:border-white/5">
                                        <div>
                                            <span className="text-zinc-600 dark:text-zinc-400 block text-[9px] uppercase tracking-wider font-mono">
                                                ประเภท
                                            </span>
                                            <span className="font-black text-zinc-800 dark:text-zinc-200">
                                                {req.requestType === "CHECK_IN"
                                                    ? "เข้าเวร"
                                                    : req.requestType === "CHECK_OUT"
                                                        ? "เลิกเวร"
                                                        : "เข้า/เลิกเวร"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-600 dark:text-zinc-400 block text-[9px] uppercase tracking-wider font-mono">
                                                เวลาที่ขอแก้
                                            </span>
                                            <span className="font-mono font-black text-zinc-800 dark:text-zinc-200">
                                                {format(reqTime, "HH:mm")} น.
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 px-1">
                                        <p className="line-clamp-2">
                                            <span className="font-bold text-zinc-700 dark:text-zinc-300">เหตุผล: </span>
                                            {req.reason}
                                        </p>
                                    </div>

                                    {req.attachmentUrl && (
                                        <div className="pt-1 border-t border-zinc-700/10 dark:border-white/5 flex items-center justify-between">
                                            <a
                                                href={req.attachmentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 hover:underline"
                                            >
                                                <Paperclip className="w-3.5 h-3.5" /> ดูหลักฐานแนบ
                                            </a>
                                            <span className="text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-400">
                                                ยื่นเมื่อ {formatThaiDate(new Date(req.createdAt), "d/M/yy HH:mm")}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function TimeCorrectionPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                    <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
                </div>
            }
        >
            <TimeCorrectionForm />
        </Suspense>
    );
}
