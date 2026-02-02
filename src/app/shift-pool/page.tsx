"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    ChevronLeft,
    Loader2,
    Calendar,
    Clock,
    User,
    MapPin,
    HandCoins,
    AlertCircle,
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
        fetchOpenShifts();
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
                fetchOpenShifts();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
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
                fetchOpenShifts();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
        return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() + 543
            }`;
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                        <a href="/">
                            <ChevronLeft className="w-5 h-5" />
                        </a>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-white">กะว่าง</h1>
                        <p className="text-sm text-slate-400">รับกะเพิ่มเติมหรือปล่อยกะ</p>
                    </div>
                </div>
                <Button
                    onClick={() => setReleaseDialogOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                >
                    ปล่อยกะ
                </Button>
            </div>

            {/* Open Shifts List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : shifts.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">ไม่มีกะว่างในขณะนี้</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {shifts.map((shift) => (
                        <Card
                            key={shift.id}
                            className="bg-slate-800/50 border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors"
                            onClick={() => {
                                setSelectedShift(shift);
                                setClaimDialogOpen(true);
                            }}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-blue-500 text-white">
                                                {shift.shift?.code || "N/A"}
                                            </Badge>
                                            <span className="text-white font-medium">
                                                {formatDate(shift.date)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {shift.shift?.startTime} - {shift.shift?.endTime}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {shift.releasedByUser?.name}
                                            </span>
                                        </div>
                                        {shift.reason && (
                                            <p className="text-sm text-slate-500 italic">
                                                &quot;{shift.reason}&quot;
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
                    ))}
                </div>
            )}

            {/* Claim Dialog */}
            <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
                <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">รับกะนี้?</DialogTitle>
                    </DialogHeader>
                    {selectedShift && (
                        <div className="py-4 space-y-4">
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-blue-500 text-white">
                                        {selectedShift.shift?.code}
                                    </Badge>
                                    <span className="text-white font-medium">
                                        {formatDate(selectedShift.date)}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    {selectedShift.shift?.startTime} - {selectedShift.shift?.endTime}
                                </p>
                                <p className="text-slate-500 text-sm mt-1">
                                    จาก: {selectedShift.releasedByUser?.name}
                                </p>
                            </div>

                            <div className="flex items-start gap-2 text-yellow-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>เมื่อกดยืนยัน กะนี้จะถูกเพิ่มในตารางของคุณ</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setClaimDialogOpen(false)}
                            className="border-slate-600 text-slate-300"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleClaimShift}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            ยืนยันรับกะ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Release Dialog */}
            <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
                <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">ปล่อยกะ</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">
                                วันที่ต้องการปล่อย
                            </label>
                            <input
                                type="date"
                                value={releaseDate}
                                onChange={(e) => setReleaseDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">
                                เหตุผล (ไม่บังคับ)
                            </label>
                            <Textarea
                                value={releaseReason}
                                onChange={(e) => setReleaseReason(e.target.value)}
                                placeholder="เช่น ติดธุระครอบครัว"
                                className="bg-slate-700 border-slate-600 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setReleaseDialogOpen(false)}
                            className="border-slate-600 text-slate-300"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleReleaseShift}
                            disabled={isProcessing || !releaseDate}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            ปล่อยกะ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
