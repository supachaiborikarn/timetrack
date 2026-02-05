"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    ChevronLeft,
    Clock,
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

    useEffect(() => {
        if (session?.user?.id) {
            fetchRequests();
        }
    }, [session?.user?.id, filterStatus]);

    const fetchRequests = async () => {
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
    };

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
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 pb-24">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="icon" className="text-slate-500" asChild>
                        <a href="/admin">
                            <ChevronLeft className="w-5 h-5" />
                        </a>
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-slate-800">จัดการคำขอโอที</h1>
                        <p className="text-sm text-slate-500">อนุมัติหรือปฏิเสธคำขอทำงานล่วงเวลา</p>
                    </div>
                    {pendingCount > 0 && (
                        <Badge className="bg-amber-500 text-white">
                            รอดำเนินการ {pendingCount}
                        </Badge>
                    )}
                </div>

                {/* Filters */}
                <Card className="border-none shadow-md mb-6">
                    <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="ค้นหาชื่อพนักงาน..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-full sm:w-[180px]">
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
                    </CardContent>
                </Card>

                {/* Requests List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <Card className="border-none shadow-md">
                        <CardContent className="py-12 text-center">
                            <Timer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">ไม่พบคำขอโอที</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredRequests.map((req) => (
                            <Card key={req.id} className="border-none shadow-md">
                                <CardContent className="py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">
                                                        {req.user?.nickName || req.user?.name || "ไม่ทราบชื่อ"}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{req.user?.employeeId}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                                                <p>📅 {formatThaiDate(new Date(req.date), "d MMM yyyy")}</p>
                                                <p className="text-orange-600 font-medium">⏱️ {req.hours} ชม.</p>
                                            </div>
                                            <p className="text-sm text-slate-500">เหตุผล: {req.reason}</p>
                                            {req.status === "REJECTED" && req.rejectReason && (
                                                <p className="text-sm text-red-500 mt-1">❌ {req.rejectReason}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(req.status)}
                                            {req.status === "PENDING" && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleApprove(req)}
                                                        disabled={isProcessing}
                                                    >
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        อนุมัติ
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                                        onClick={() => openRejectDialog(req)}
                                                        disabled={isProcessing}
                                                    >
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        ปฏิเสธ
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
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
