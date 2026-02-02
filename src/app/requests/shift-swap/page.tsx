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
    RefreshCw,
    Loader2,
    Send,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate, getBangkokNow, format, addDays } from "@/lib/date-utils";

interface Colleague {
    id: string;
    name: string;
    employeeId: string;
    department: string;
}

interface ShiftSwap {
    id: string;
    requesterDate: string;
    targetDate: string;
    reason: string;
    status: string;
    targetAccepted: boolean;
    target: { name: string };
    createdAt: string;
}

export default function ShiftSwapPage() {
    const { data: session, status } = useSession();
    const [requests, setRequests] = useState<ShiftSwap[]>([]);
    const [colleagues, setColleagues] = useState<Colleague[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [myDate, setMyDate] = useState(format(addDays(getBangkokNow(), 1), "yyyy-MM-dd"));
    const [targetId, setTargetId] = useState("");
    const [targetDate, setTargetDate] = useState(format(addDays(getBangkokNow(), 1), "yyyy-MM-dd"));
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (session?.user?.id) {
            fetchData();
        }
    }, [session?.user?.id]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [reqRes, colRes] = await Promise.all([
                fetch("/api/requests/shift-swap"),
                fetch("/api/requests/shift-swap/colleagues"),
            ]);

            if (reqRes.ok) {
                const data = await reqRes.json();
                setRequests(data.requests || []);
            }
            if (colRes.ok) {
                const data = await colRes.json();
                setColleagues(data.colleagues || []);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!targetId) {
            toast.error("กรุณาเลือกเพื่อนร่วมงาน");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/requests/shift-swap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requesterDate: myDate,
                    targetId,
                    targetDate,
                    reason,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("ส่งคำขอแลกกะสำเร็จ", {
                    description: "รอเพื่อนยืนยันและผู้จัดการอนุมัติ",
                });
                setReason("");
                fetchData();
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

    const getStatusBadge = (req: ShiftSwap) => {
        if (req.status === "APPROVED") {
            return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติแล้ว</Badge>;
        }
        if (req.status === "REJECTED") {
            return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
        }
        if (!req.targetAccepted) {
            return <Badge className="bg-orange-500/20 text-orange-400"><AlertCircle className="w-3 h-3 mr-1" />รอเพื่อนยืนยัน</Badge>;
        }
        return <Badge className="bg-yellow-500/20 text-yellow-400"><AlertCircle className="w-3 h-3 mr-1" />รอผู้จัดการอนุมัติ</Badge>;
    };

    // Generate date options (next 14 days)
    const dateOptions = Array.from({ length: 14 }, (_, i) => {
        const date = addDays(getBangkokNow(), i + 1);
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
                    <a href="/requests">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">ขอแลกกะ</h1>
                    <p className="text-sm text-slate-400">แลกกะกับเพื่อนร่วมงาน</p>
                </div>
            </div>

            {/* Request Form */}
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-blue-400" />
                        สร้างคำขอแลกกะ
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">วันที่ของฉัน (ที่อยากแลก)</Label>
                            <Select value={myDate} onValueChange={setMyDate}>
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
                            <Label className="text-slate-300">แลกกับ</Label>
                            <Select value={targetId} onValueChange={setTargetId}>
                                <SelectTrigger className="bg-slate-700 border-slate-600">
                                    <SelectValue placeholder="เลือกเพื่อนร่วมงาน" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {colleagues.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                {c.name} ({c.department})
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">วันที่ของเพื่อน</Label>
                            <Select value={targetDate} onValueChange={setTargetDate}>
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
                            <Label className="text-slate-300">เหตุผล (ถ้ามี)</Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="เช่น มีธุระส่วนตัว"
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={isSubmitting || !targetId}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            ส่งคำขอแลกกะ
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Request History */}
            <h2 className="text-lg font-semibold text-white mb-3">คำขอแลกกะของฉัน</h2>
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : requests.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-8 text-center">
                        <RefreshCw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">ยังไม่มีคำขอแลกกะ</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => (
                        <Card key={req.id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-white">แลกกับ {req.target.name}</p>
                                    {getStatusBadge(req)}
                                </div>
                                <div className="text-sm text-slate-400 space-y-1">
                                    <p>วันที่ของฉัน: {formatThaiDate(new Date(req.requesterDate), "d MMM yyyy")}</p>
                                    <p>วันที่ของเพื่อน: {formatThaiDate(new Date(req.targetDate), "d MMM yyyy")}</p>
                                    {req.reason && <p>เหตุผล: {req.reason}</p>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
