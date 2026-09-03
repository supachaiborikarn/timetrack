"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    CheckCircle2,
    Calendar,
    User,
    Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { formatThaiDate } from "@/lib/date-utils";

interface IncomingSwap {
    id: string;
    requesterDate: string;
    targetDate: string;
    reason: string | null;
    status: string;
    targetAccepted: boolean;
    requester: {
        name: string;
        nickName: string | null;
        employeeId: string;
    };
    createdAt: string;
}

export default function IncomingSwapRequestsPage() {
    const { data: session, status } = useSession();
    const [requests, setRequests] = useState<IncomingSwap[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user?.id) {
            void fetchIncoming();
        }
    }, [session?.user?.id]);

    const fetchIncoming = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/requests/shift-swap/incoming");
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch incoming requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRespond = async (swapId: string, action: "accept" | "reject") => {
        setProcessingId(swapId);
        try {
            const res = await fetch("/api/requests/shift-swap/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ swapId, action }),
            });

            const data = await res.json();

            if (res.ok) {
                if (action === "accept") {
                    toast.success("ยืนยันแลกกะเรียบร้อย", { description: "ส่งต่อให้ผู้จัดการอนุมัติ" });
                } else {
                    toast.info("ปฏิเสธคำขอแลกกะแล้ว");
                }
                void fetchIncoming();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setProcessingId(null);
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

    const pendingRequests = requests.filter((r) => !r.targetAccepted && r.status === "PENDING");
    const respondedRequests = requests.filter((r) => r.targetAccepted || r.status !== "PENDING");

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="INCOMING SWAPS"
                title="คำขอที่ส่งถึงฉัน"
                subtitle="คำขอแลกกะจากเพื่อนร่วมงานในทีม"
                backHref="/requests"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {/* Pending Requests Section */}
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-[12px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <Inbox className="w-4 h-4 text-amber-500" />
                        รอการตอบรับ
                    </h2>
                    <span className="font-mono text-[11px] font-bold text-zinc-500">
                        {pendingRequests.length} รายการ
                    </span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-7 h-7 animate-spin text-[#fbbf24]" />
                    </div>
                ) : pendingRequests.length === 0 ? (
                    <div className="tt-paper-card rounded-[18px] border border-zinc-700/25 p-8 text-center dark:border-white/10">
                        <Inbox className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-black text-zinc-500">ไม่มีคำขอแลกกะที่รอการตอบรับ</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingRequests.map((req) => (
                            <div
                                key={req.id}
                                className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 p-4 dark:border-white/15 space-y-3 shadow-[0_2px_0_rgba(0,0,0,0.06)]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full border border-black/15 bg-amber-500/20 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-amber-800 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                                            {req.requester.nickName || req.requester.name}
                                        </h3>
                                        <p className="text-[10px] font-mono font-bold text-zinc-400">
                                            รหัส: {req.requester.employeeId}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-black/[0.03] dark:bg-white/[0.03] p-2.5 rounded-xl border border-zinc-700/10 dark:border-white/5">
                                    <div>
                                        <span className="text-zinc-400 block text-[9px] uppercase tracking-wider font-mono">
                                            กะของเขา (เราจะได้)
                                        </span>
                                        <span className="font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mt-0.5">
                                            <Calendar className="w-3 h-3 text-zinc-400" />
                                            {formatThaiDate(new Date(req.requesterDate), "d MMM yyyy")}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-400 block text-[9px] uppercase tracking-wider font-mono">
                                            กะของเรา (เขาจะได้)
                                        </span>
                                        <span className="font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mt-0.5">
                                            <Calendar className="w-3 h-3 text-zinc-400" />
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

                                <div className="flex gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => handleRespond(req.id, "reject")}
                                        disabled={processingId === req.id}
                                        className="tt-retro-control flex-1 h-11 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-black active:scale-95 transition-all"
                                    >
                                        ปฏิเสธ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRespond(req.id, "accept")}
                                        disabled={processingId === req.id}
                                        className="tt-retro-control flex-1 h-11 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(251,191,36,0.25)] border border-black/20 active:scale-95 disabled:opacity-50 transition-all"
                                    >
                                        {processingId === req.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        ยินยอมแลกกะ
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Responded History */}
                {respondedRequests.length > 0 && (
                    <div className="space-y-2.5 pt-4">
                        <h2 className="text-[12px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 px-1">
                            ประวัติการตอบรับแล้ว
                        </h2>
                        <div className="space-y-2">
                            {respondedRequests.map((req) => (
                                <div
                                    key={req.id}
                                    className="tt-paper-card rounded-[16px] border border-zinc-700/25 p-3 dark:border-white/10 flex items-center justify-between"
                                >
                                    <div>
                                        <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                                            {req.requester.nickName || req.requester.name}
                                        </p>
                                        <p className="text-[10px] font-mono text-zinc-400">
                                            {formatThaiDate(new Date(req.requesterDate), "d MMM")} ↔ {formatThaiDate(new Date(req.targetDate), "d MMM")}
                                        </p>
                                    </div>
                                    <Badge
                                        className={
                                            req.status === "APPROVED"
                                                ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black"
                                                : req.status === "REJECTED"
                                                    ? "border border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400 text-[10px] font-black"
                                                    : "border border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-black"
                                        }
                                    >
                                        {req.status === "APPROVED"
                                            ? "อนุมัติแล้ว"
                                            : req.status === "REJECTED"
                                                ? "ปฏิเสธ"
                                                : "รอผู้จัดการอนุมัติ"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

