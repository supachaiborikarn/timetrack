"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    ChevronLeft,
    Clock,
    Loader2,
    Send,
    CheckCircle,
    XCircle,
    AlertCircle,
    Timer,
} from "lucide-react";
import { toast } from "sonner";
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
            fetchRequests();
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
                    description: "รอผู้จัดการอนุมัติ",
                });
                setReason("");
                setHours("2");
                fetchRequests();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1a1412]">
                <Loader2 className="w-8 h-8 animate-spin text-[#F09410]" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติ</Badge>;
            case "REJECTED":
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
            default:
                return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><AlertCircle className="w-3 h-3 mr-1" />รอดำเนินการ</Badge>;
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
        <div className="min-h-screen bg-[#1a1412] p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="text-stone-400 hover:text-[#F09410] hover:bg-orange-500/10" asChild>
                    <a href="/requests">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-[#F0D0C7]">ขอทำโอที</h1>
                    <p className="text-sm text-stone-500">ขออนุมัติการทำงานล่วงเวลา</p>
                </div>
            </div>

            {/* Request Form */}
            <Card className="bg-[#2a2420] border-orange-900/20 mb-6 shadow-xl shadow-black/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[#F0D0C7] flex items-center gap-2">
                        <Timer className="w-5 h-5 text-[#F09410]" />
                        สร้างคำขอโอที
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-stone-400">วันที่ทำโอที</Label>
                                <Select value={selectedDate} onValueChange={setSelectedDate}>
                                    <SelectTrigger className="bg-[#1a1412] border-orange-900/30 text-[#F0D0C7]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#2a2420] border-orange-900/30">
                                        {dateOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-[#F0D0C7] focus:bg-orange-500/20 focus:text-[#F0D0C7]">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-stone-400">จำนวนชั่วโมง</Label>
                                <Select value={hours} onValueChange={setHours}>
                                    <SelectTrigger className="bg-[#1a1412] border-orange-900/30 text-[#F0D0C7]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#2a2420] border-orange-900/30">
                                        {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                                            <SelectItem key={h} value={h.toString()} className="text-[#F0D0C7] focus:bg-orange-500/20 focus:text-[#F0D0C7]">
                                                {h} ชั่วโมง
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-stone-400">เหตุผล / รายละเอียดงาน *</Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="เช่น ปิดงานด่วน, เตรียมข้อมูลประชุม"
                                className="bg-[#1a1412] border-orange-900/30 text-[#F0D0C7] placeholder:text-stone-600"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-[#F09410] to-[#BC430D] hover:from-[#d88310] hover:to-[#a33a0b] text-white border-0 shadow-lg shadow-orange-900/20"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            ส่งคำขอโอที
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Request History */}
            <h2 className="text-lg font-semibold text-[#F0D0C7] mb-3">ประวัติคำขอโอที</h2>
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#F09410]" />
                </div>
            ) : requests.length === 0 ? (
                <Card className="bg-[#2a2420] border-orange-900/20">
                    <CardContent className="py-8 text-center">
                        <Clock className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                        <p className="text-stone-500">ยังไม่มีคำขอโอที</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => (
                        <Card key={req.id} className="bg-[#2a2420] border-orange-900/20">
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-[#F0D0C7]">
                                        {formatThaiDate(new Date(req.date), "d MMM yyyy")}
                                    </p>
                                    {getStatusBadge(req.status)}
                                </div>
                                <div className="text-sm text-stone-400 space-y-1">
                                    <p className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                                        จำนวน: <span className="text-[#F09410] font-medium">{req.hours} ชั่วโมง</span>
                                    </p>
                                    <p>เหตุผล: {req.reason}</p>
                                    {req.status === "REJECTED" && req.rejectReason && (
                                        <p className="text-red-400">เหตุผลที่ปฏิเสธ: {req.rejectReason}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
