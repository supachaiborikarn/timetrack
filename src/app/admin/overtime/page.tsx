"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Timer,
    Search,
    User,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";

interface OvertimeRequest {
    id: string;
    userId: string;
    date: string;
    hours: number;
    reason: string;
    status: string;
    createdAt: string;
    rejectReason?: string;
    user?: {
        name: string;
        employeeId: string;
        nickName?: string;
    };
}

export default function AdminOvertimePage() {
    const { data: session, status } = useSession();
    const [requests, setRequests] = useState<OvertimeRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("PENDING");
    const [searchTerm, setSearchTerm] = useState("");

    // Reject dialog state
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus !== "all") params.append("status", filterStatus);

            const res = await fetch(`/api/requests/overtime?${params}`);
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setIsLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchRequests();
        }
    }, [session?.user?.id, fetchRequests]);

    const handleApprove = async (request: OvertimeRequest) => {
        setIsProcessing(true);
        try {
            const res = await fetch("/api/requests/overtime", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: request.id,
                    action: "approve",
                }),
            });

            if (res.ok) {
                toast.success("อนุมัติโอทีสำเร็จ");
                fetchRequests();
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/requests/overtime", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selectedRequest.id,
                    action: "reject",
                    rejectReason: rejectReason || "ไม่ระบุเหตุผล",
                }),
            });

            if (res.ok) {
                toast.success("ปฏิเสธคำขอโอทีแล้ว");
                setIsRejectDialogOpen(false);
                setRejectReason("");
                setSelectedRequest(null);
                fetchRequests();
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsProcessing(false);
        }
    };

    const openRejectDialog = (request: OvertimeRequest) => {
        setSelectedRequest(request);
        setRejectReason("");
        setIsRejectDialogOpen(true);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !session.user || !["ADMIN", "HR", "MANAGER", "CLERK"].includes(session.user.role)) {
        redirect("/");
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติแล้ว</Badge>;
            case "REJECTED":
                return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธแล้ว</Badge>;
            default:
                return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30"><AlertCircle className="w-3 h-3 mr-1" />รอดำเนินการ</Badge>;
        }
    };

    const filteredRequests = requests.filter((req) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            (req.user?.name?.toLowerCase() || "").includes(searchLower) ||
            (req.user?.employeeId?.toLowerCase() || "").includes(searchLower) ||
            (req.user?.nickName?.toLowerCase() || "").includes(searchLower)
        );
    });

    const pendingCount = requests.filter((r) => r.status === "PENDING").length;

    return (
        <div className="space-y-6 pb-12 font-sans">
            <div className="max-w-4xl mx-auto space-y-4">
                {/* Header */}
                <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.06)] text-zinc-950 dark:text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                                <Timer className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">OVERTIME DESK</p>
                                <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">จัดการคำขอโอที</h1>
                                <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5">อนุมัติหรือปฏิเสธคำขอทำงานล่วงเวลาของพนักงาน</p>
                            </div>
                        </div>
                        {pendingCount > 0 && (
                            <span className="font-mono text-xs font-black px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-[#fbbf24] self-start sm:self-auto">
                                รอดำเนินการ {pendingCount} รายการ
                            </span>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                placeholder="ค้นหาชื่อพนักงาน หรือรหัสพนักงาน..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-700/30 font-bold"
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-700/30 font-bold">
                                <SelectValue placeholder="สถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
                                <SelectItem value="APPROVED">อนุมัติแล้ว</SelectItem>
                                <SelectItem value="REJECTED">ปฏิเสธแล้ว</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Requests List */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
                        <p className="text-xs font-bold text-zinc-500">กำลังโหลดคำขอโอที...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-dashed border-zinc-700/30 p-12 text-center">
                        <Timer className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
                        <p className="font-bold text-zinc-700 dark:text-zinc-300">ไม่พบคำขอโอที</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredRequests.map((req) => (
                            <div key={req.id} className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-9 h-9 rounded-xl bg-zinc-700/15 border border-zinc-700/30 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shrink-0 font-black">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                                                    {req.user?.nickName || req.user?.name || "ไม่ทราบชื่อ"}
                                                </p>
                                                <p className="text-[11px] font-mono font-bold text-zinc-500">{req.user?.employeeId}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300 mb-2 font-bold">
                                            <p>📅 <span className="font-mono">{formatThaiDate(new Date(req.date), "d MMM yyyy")}</span></p>
                                            <p className="text-amber-700 dark:text-amber-400 font-mono">⏱️ {req.hours} ชม.</p>
                                        </div>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">เหตุผล: {req.reason}</p>
                                        {req.status === "REJECTED" && req.rejectReason && (
                                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                                                ❌ {req.rejectReason}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        {getStatusBadge(req.status)}
                                        {req.status === "PENDING" && (
                                            <div className="flex gap-1.5">
                                                <Button
                                                    size="sm"
                                                    className="tt-retro-control bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 rounded-lg shadow-sm"
                                                    onClick={() => handleApprove(req)}
                                                    disabled={isProcessing}
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                    อนุมัติ
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="tt-retro-control border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold h-8 rounded-lg"
                                                    onClick={() => openRejectDialog(req)}
                                                    disabled={isProcessing}
                                                >
                                                    <XCircle className="w-3.5 h-3.5 mr-1" />
                                                    ปฏิเสธ
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ปฏิเสธคำขอโอที</DialogTitle>
                        <DialogDescription>
                            กรุณาระบุเหตุผลในการปฏิเสธคำขอนี้
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="เหตุผลในการปฏิเสธ (ถ้ามี)"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleReject}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            ยืนยันปฏิเสธ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
