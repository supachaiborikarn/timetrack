"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    Loader2,
    CheckCircle,
    XCircle,
    RefreshCw,
    Calendar,
    User,
} from "lucide-react";
import { toast } from "sonner";
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
    const [processsingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user?.id) {
            fetchIncoming();
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
                    toast.success("ยืนยันแลกกะแล้ว", { description: "รอผู้จัดการอนุมัติ" });
                } else {
                    toast.info("ปฏิเสธคำขอแลกกะแล้ว");
                }
                fetchIncoming();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setProcessingId(null);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const pendingRequests = requests.filter(r => !r.targetAccepted && r.status === "PENDING");
    const respondedRequests = requests.filter(r => r.targetAccepted || r.status !== "PENDING");

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                    <a href="/requests">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">คำขอแลกกะที่ได้รับ</h1>
                    <p className="text-sm text-slate-400">คำขอจากเพื่อนร่วมงาน</p>
                </div>
            </div>

            {/* Pending Requests */}
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-orange-400" />
                รอการตอบรับ ({pendingRequests.length})
            </h2>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : pendingRequests.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700 mb-6">
                    <CardContent className="py-8 text-center">
                        <RefreshCw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">ไม่มีคำขอรอการตอบรับ</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3 mb-6">
                    {pendingRequests.map((req) => (
                        <Card key={req.id} className="bg-slate-800/50 border-slate-700 border-l-4 border-l-orange-500">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                                        <User className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">
                                            {req.requester.nickName || req.requester.name}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {req.requester.employeeId}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-slate-400 text-xs">กะของเขา (ที่จะได้)</p>
                                            <p className="text-white font-medium flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatThaiDate(new Date(req.requesterDate), "d MMM yyyy")}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-xs">กะของคุณ (ที่จะแลก)</p>
                                            <p className="text-white font-medium flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatThaiDate(new Date(req.targetDate), "d MMM yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    {req.reason && (
                                        <p className="text-slate-400 text-xs mt-2">
                                            เหตุผล: {req.reason}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => handleRespond(req.id, "accept")}
                                        disabled={processsingId === req.id}
                                    >
                                        {processsingId === req.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                ยืนยันแลก
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-red-500 text-red-400 hover:bg-red-500/20"
                                        onClick={() => handleRespond(req.id, "reject")}
                                        disabled={processsingId === req.id}
                                    >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        ปฏิเสธ
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* History */}
            {respondedRequests.length > 0 && (
                <>
                    <h2 className="text-lg font-semibold text-white mb-3">ประวัติการตอบรับ</h2>
                    <div className="space-y-3">
                        {respondedRequests.map((req) => (
                            <Card key={req.id} className="bg-slate-800/30 border-slate-700">
                                <CardContent className="py-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-white">
                                                {req.requester.nickName || req.requester.name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {formatThaiDate(new Date(req.requesterDate), "d MMM")} ↔ {formatThaiDate(new Date(req.targetDate), "d MMM")}
                                            </p>
                                        </div>
                                        <Badge className={
                                            req.status === "APPROVED" ? "bg-green-500/20 text-green-400" :
                                                req.status === "REJECTED" ? "bg-red-500/20 text-red-400" :
                                                    "bg-yellow-500/20 text-yellow-400"
                                        }>
                                            {req.status === "APPROVED" ? "อนุมัติแล้ว" :
                                                req.status === "REJECTED" ? "ปฏิเสธ" :
                                                    "รอผู้จัดการ"}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
