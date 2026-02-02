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
    FileEdit,
    Loader2,
    Send,
    CheckCircle,
    XCircle,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate, getBangkokNow, format, subDays } from "@/lib/date-utils";

interface TimeCorrection {
    id: string;
    date: string;
    requestType: string;
    requestedTime: string;
    reason: string;
    status: string;
    createdAt: string;
}

export default function TimeCorrectionPage() {
    const { data: session, status } = useSession();
    const [requests, setRequests] = useState<TimeCorrection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [selectedDate, setSelectedDate] = useState(format(getBangkokNow(), "yyyy-MM-dd"));
    const [requestType, setRequestType] = useState("CHECK_IN");
    const [requestedTime, setRequestedTime] = useState("08:00");
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (session?.user?.id) {
            fetchRequests();
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
                    requestedTime: `${selectedDate}T${requestedTime}:00`,
                    reason,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("ส่งคำขอสำเร็จ", {
                    description: "รอผู้จัดการอนุมัติ",
                });
                setReason("");
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
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติ</Badge>;
            case "REJECTED":
                return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
            default:
                return <Badge className="bg-yellow-500/20 text-yellow-400"><AlertCircle className="w-3 h-3 mr-1" />รอดำเนินการ</Badge>;
        }
    };

    // Generate date options (last 7 days)
    const dateOptions = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(getBangkokNow(), i);
        return {
            value: format(date, "yyyy-MM-dd"),
            label: formatThaiDate(date, "EEEE d MMM"),
        };
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                    <a href="/">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">ขอแก้ไขเวลา</h1>
                    <p className="text-sm text-slate-400">ลืมกดเข้า-ออกเวร</p>
                </div>
            </div>

            {/* Request Form */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <FileEdit className="w-5 h-5 text-yellow-400" />
                        สร้างคำขอใหม่
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">วันที่</Label>
                                <Select value={selectedDate} onValueChange={setSelectedDate}>
                                    <SelectTrigger className="bg-slate-700 border-slate-600">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {dateOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">ประเภท</Label>
                                <Select value={requestType} onValueChange={setRequestType}>
                                    <SelectTrigger className="bg-slate-700 border-slate-600">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="CHECK_IN">เข้าเวร</SelectItem>
                                        <SelectItem value="CHECK_OUT">เลิกเวร</SelectItem>
                                        <SelectItem value="BOTH">ทั้งสอง</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">เวลาที่ขอแก้</Label>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <Input
                                    type="time"
                                    value={requestedTime}
                                    onChange={(e) => setRequestedTime(e.target.value)}
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">เหตุผล *</Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="เช่น ลืมกดเข้าเวร, โทรศัพท์หมดแบต"
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-yellow-600 hover:bg-yellow-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            ส่งคำขอ
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Request History */}
            <h2 className="text-lg font-semibold text-white mb-3">ประวัติคำขอ</h2>
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : requests.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-8 text-center">
                        <FileEdit className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">ยังไม่มีคำขอ</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => (
                        <Card key={req.id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-white">
                                        {formatThaiDate(new Date(req.date), "d MMM yyyy")}
                                    </p>
                                    {getStatusBadge(req.status)}
                                </div>
                                <div className="text-sm text-slate-400 space-y-1">
                                    <p>
                                        ประเภท: {req.requestType === "CHECK_IN" ? "เข้าเวร" : req.requestType === "CHECK_OUT" ? "เลิกเวร" : "ทั้งสอง"}
                                    </p>
                                    <p>เวลาที่ขอ: {format(new Date(req.requestedTime), "HH:mm")}</p>
                                    <p>เหตุผล: {req.reason}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
