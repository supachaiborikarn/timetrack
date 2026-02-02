"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Loader2,
    Calendar,
    Clock,
    User,
    HandCoins,
    Check,
    X,
} from "lucide-react";
import { toast } from "sonner";

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
    claimedByUser?: {
        name: string;
    } | null;
}

export default function AdminShiftPoolPage() {
    const { data: session, status } = useSession();
    const [shifts, setShifts] = useState<ShiftPoolItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedShift, setSelectedShift] = useState<ShiftPoolItem | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchShifts();
        }
    }, [session?.user?.id]);

    const fetchShifts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/shift-pool?all=true");
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

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
        return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() + 543}`;
    };

    const handleApprove = async () => {
        if (!selectedShift) return;
        setIsProcessing(true);
        try {
            const res = await fetch("/api/shift-pool/admin", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ poolId: selectedShift.id, action: "approve" }),
            });
            if (res.ok) {
                toast.success("อนุมัติแล้ว");
                setActionDialogOpen(false);
                fetchShifts();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedShift) return;
        setIsProcessing(true);
        try {
            const res = await fetch("/api/shift-pool/admin", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ poolId: selectedShift.id, action: "reject" }),
            });
            if (res.ok) {
                toast.success("ปฏิเสธแล้ว");
                setActionDialogOpen(false);
                fetchShifts();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsProcessing(false);
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

    const getStatusBadge = (status: string) => {
        const statuses: Record<string, { label: string; class: string }> = {
            OPEN: { label: "เปิดรับ", class: "bg-green-500/10 text-green-500" },
            CLAIMED: { label: "รับแล้ว", class: "bg-blue-500/10 text-blue-500" },
            CANCELLED: { label: "ยกเลิก", class: "bg-muted text-muted-foreground" },
        };
        return statuses[status] || { label: status, class: "bg-muted text-muted-foreground" };
    };

    const pendingShifts = shifts.filter((s) => s.status === "OPEN");
    const claimedShifts = shifts.filter((s) => s.status === "CLAIMED");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Shift Pool</h1>
                <p className="text-muted-foreground">จัดการกะที่ปล่อยและรับ</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{pendingShifts.length}</p>
                            <p className="text-xs text-muted-foreground">กะเปิดรับ</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{claimedShifts.length}</p>
                            <p className="text-xs text-muted-foreground">รับแล้ว</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Shifts List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : shifts.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">ไม่มีกะใน pool</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {shifts.map((shift) => {
                        const statusBadge = getStatusBadge(shift.status);
                        return (
                            <Card
                                key={shift.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => {
                                    setSelectedShift(shift);
                                    setActionDialogOpen(true);
                                }}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-blue-500 text-white">
                                                    {shift.shift?.code || "N/A"}
                                                </Badge>
                                                <span className="font-medium text-foreground">
                                                    {formatDate(shift.date)}
                                                </span>
                                                <Badge className={statusBadge.class}>{statusBadge.label}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {shift.shift?.startTime} - {shift.shift?.endTime}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    ปล่อยโดย: {shift.releasedByUser?.name}
                                                </span>
                                            </div>
                                            {shift.claimedByUser && (
                                                <p className="text-sm text-green-500">
                                                    รับโดย: {shift.claimedByUser.name}
                                                </p>
                                            )}
                                        </div>
                                        {shift.bonusAmount && (
                                            <Badge className="bg-green-600 text-white">
                                                <HandCoins className="w-3 h-3 mr-1" />+{shift.bonusAmount}฿
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Action Dialog */}
            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>รายละเอียดกะ</DialogTitle>
                    </DialogHeader>
                    {selectedShift && (
                        <div className="py-4 space-y-4">
                            <div className="bg-muted rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-blue-500 text-white">
                                        {selectedShift.shift?.code}
                                    </Badge>
                                    <span className="font-medium">
                                        {formatDate(selectedShift.date)}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {selectedShift.shift?.startTime} - {selectedShift.shift?.endTime}
                                </p>
                                <p className="text-sm mt-2">
                                    ปล่อยโดย: {selectedShift.releasedByUser?.name}
                                </p>
                                {selectedShift.reason && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        เหตุผล: {selectedShift.reason}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                            ปิด
                        </Button>
                        {selectedShift?.status === "OPEN" && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={handleReject}
                                    disabled={isProcessing}
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    ยกเลิก
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={handleApprove}
                                    disabled={isProcessing}
                                >
                                    <Check className="w-4 h-4 mr-1" />
                                    อนุมัติ
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
