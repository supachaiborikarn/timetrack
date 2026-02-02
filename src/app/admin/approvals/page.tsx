"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Loader2,
    Clock,
    RefreshCw,
    CheckCircle,
    XCircle,
    DollarSign,
    Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate, format } from "@/lib/date-utils";

interface TimeCorrection {
    id: string;
    date: string;
    requestType: string;
    requestedTime: string;
    reason: string;
    status: string;
    createdAt: string;
    user: { name: string; employeeId: string };
}

interface ShiftSwap {
    id: string;
    requesterDate: string;
    targetDate: string;
    reason: string;
    status: string;
    targetAccepted: boolean;
    createdAt: string;
    requester: { name: string; employeeId: string };
    target: { name: string; employeeId: string };
}

interface WageRequest {
    id: string;
    amount: number;
    reason: string;
    status: string;
    createdAt: string;
    user: { name: string; employeeId: string };
}

export default function ApprovalsPage() {
    const { data: session, status } = useSession();
    const [timeCorrections, setTimeCorrections] = useState<TimeCorrection[]>([]);
    const [shiftSwaps, setShiftSwaps] = useState<ShiftSwap[]>([]);
    const [wageRequests, setWageRequests] = useState<WageRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            fetchRequests();
        }
    }, [session?.user?.id]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const [tcRes, ssRes, wrRes] = await Promise.all([
                fetch("/api/admin/requests/time-correction"),
                fetch("/api/admin/requests/shift-swap"),
                fetch("/api/admin/requests/wage").catch(() => ({ ok: false })),
            ]);

            if (tcRes.ok) {
                const data = await tcRes.json();
                setTimeCorrections(data.requests || []);
            }
            if (ssRes.ok) {
                const data = await ssRes.json();
                setShiftSwaps(data.requests || []);
            }
            if ('json' in wrRes && wrRes.ok) {
                const data = await wrRes.json();
                setWageRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveTimeCorrection = async (id: string, approved: boolean) => {
        try {
            const res = await fetch("/api/admin/requests/time-correction", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: approved ? "APPROVED" : "REJECTED" }),
            });
            if (res.ok) {
                toast.success(approved ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว");
                fetchRequests();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const handleApproveShiftSwap = async (id: string, approved: boolean) => {
        try {
            const res = await fetch("/api/admin/requests/shift-swap", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: approved ? "APPROVED" : "REJECTED" }),
            });
            if (res.ok) {
                toast.success(approved ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว");
                fetchRequests();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    const pendingTC = timeCorrections.filter((r) => r.status === "PENDING");
    const pendingSS = shiftSwaps.filter((r) => r.status === "PENDING" && r.targetAccepted);
    const pendingWR = wageRequests.filter((r) => r.status === "PENDING");
    const totalPending = pendingTC.length + pendingSS.length + pendingWR.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">อนุมัติคำขอ</h1>
                <p className="text-muted-foreground">
                    {totalPending > 0 ? `มี ${totalPending} รายการรอดำเนินการ` : "ไม่มีคำขอรอดำเนินการ"}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{pendingTC.length}</p>
                            <p className="text-xs text-muted-foreground">แก้เวลา</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{pendingSS.length}</p>
                            <p className="text-xs text-muted-foreground">แลกกะ</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{pendingWR.length}</p>
                            <p className="text-xs text-muted-foreground">เบิกค่าแรง</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="time-correction" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="time-correction">
                        <Clock className="w-4 h-4 mr-2" />
                        แก้เวลา ({pendingTC.length})
                    </TabsTrigger>
                    <TabsTrigger value="shift-swap">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        แลกกะ ({pendingSS.length})
                    </TabsTrigger>
                    <TabsTrigger value="wage">
                        <DollarSign className="w-4 h-4 mr-2" />
                        เบิกค่าแรง ({pendingWR.length})
                    </TabsTrigger>
                </TabsList>

                {/* Time Correction Tab */}
                <TabsContent value="time-correction" className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : pendingTC.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">ไม่มีคำขอรอดำเนินการ</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {pendingTC.map((req) => (
                                <Card key={req.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="font-medium text-foreground">{req.user.name}</p>
                                                    <Badge variant="outline" className="text-xs">
                                                        {req.user.employeeId}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <p>วันที่: {formatThaiDate(new Date(req.date), "d MMM yyyy")}</p>
                                                    <p>
                                                        ประเภท:{" "}
                                                        {req.requestType === "CHECK_IN"
                                                            ? "เข้าเวร"
                                                            : req.requestType === "CHECK_OUT"
                                                                ? "เลิกเวร"
                                                                : "ทั้งสอง"}
                                                    </p>
                                                    <p>เวลาที่ขอ: {format(new Date(req.requestedTime), "HH:mm")}</p>
                                                    <p>เหตุผล: {req.reason}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleApproveTimeCorrection(req.id, true)}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    อนุมัติ
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleApproveTimeCorrection(req.id, false)}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    ปฏิเสธ
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Shift Swap Tab */}
                <TabsContent value="shift-swap" className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : pendingSS.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">ไม่มีคำขอรอดำเนินการ</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {pendingSS.map((req) => (
                                <Card key={req.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="font-medium text-foreground">
                                                        {req.requester.name} ↔ {req.target.name}
                                                    </p>
                                                </div>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <p>
                                                        {req.requester.name} ({formatThaiDate(new Date(req.requesterDate), "d MMM")})
                                                    </p>
                                                    <p>
                                                        {req.target.name} ({formatThaiDate(new Date(req.targetDate), "d MMM")})
                                                    </p>
                                                    {req.reason && <p>เหตุผล: {req.reason}</p>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleApproveShiftSwap(req.id, true)}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    อนุมัติ
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleApproveShiftSwap(req.id, false)}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    ปฏิเสธ
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Wage Requests Tab */}
                <TabsContent value="wage" className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : pendingWR.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">ไม่มีคำขอรอดำเนินการ</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {pendingWR.map((req) => (
                                <Card key={req.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="font-medium text-foreground">{req.user.name}</p>
                                                    <Badge variant="outline" className="text-xs">
                                                        {req.user.employeeId}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <p className="text-lg font-bold text-green-500">
                                                        ฿{req.amount.toLocaleString()}
                                                    </p>
                                                    <p>เหตุผล: {req.reason}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    อนุมัติ
                                                </Button>
                                                <Button size="sm" variant="destructive">
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    ปฏิเสธ
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
