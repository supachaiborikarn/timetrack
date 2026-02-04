"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2,
    Check,
    X,
    Clock,
    User,
    RefreshCw,
    ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";

interface EditRequest {
    id: string;
    userId: string;
    fieldName: string;
    fieldLabel: string;
    oldValue: string | null;
    newValue: string;
    status: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        employeeId: string;
        nickName: string | null;
        station: { name: string } | null;
    };
}

export default function ProfileRequestsPage() {
    const { data: session, status } = useSession();
    const [requests, setRequests] = useState<EditRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [filter, setFilter] = useState("PENDING");

    const fetchRequests = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/profile-requests?status=${filter}`);
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setIsLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchRequests();
        }
    }, [session?.user?.id, fetchRequests]);

    const handleAction = async (requestId: string, action: "approve" | "reject") => {
        setIsProcessing(requestId);
        try {
            const res = await fetch("/api/admin/profile-requests", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, action }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                fetchRequests();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsProcessing(null);
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">รอดำเนินการ</Badge>;
            case "APPROVED":
                return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">อนุมัติแล้ว</Badge>;
            case "REJECTED":
                return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">ปฏิเสธ</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <a href="/admin"><ChevronLeft className="w-5 h-5" /></a>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">คำขอแก้ไขข้อมูลส่วนตัว</h1>
                        <p className="text-muted-foreground">อนุมัติหรือปฏิเสธคำขอจากพนักงาน</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <Button
                        variant={filter === "PENDING" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("PENDING")}
                    >
                        <Clock className="w-4 h-4 mr-1" />
                        รอดำเนินการ
                    </Button>
                    <Button
                        variant={filter === "APPROVED" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("APPROVED")}
                    >
                        <Check className="w-4 h-4 mr-1" />
                        อนุมัติแล้ว
                    </Button>
                    <Button
                        variant={filter === "REJECTED" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("REJECTED")}
                    >
                        <X className="w-4 h-4 mr-1" />
                        ปฏิเสธ
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchRequests}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>

                {/* Requests Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            คำขอแก้ไขข้อมูล ({requests.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {requests.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                ไม่มีคำขอ
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>พนักงาน</TableHead>
                                        <TableHead>สถานี</TableHead>
                                        <TableHead>ฟิลด์</TableHead>
                                        <TableHead>ค่าเดิม</TableHead>
                                        <TableHead>ค่าใหม่</TableHead>
                                        <TableHead>วันที่ขอ</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        {filter === "PENDING" && <TableHead className="text-center">จัดการ</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{req.user.nickName || req.user.name}</div>
                                                    <div className="text-xs text-muted-foreground">{req.user.employeeId}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{req.user.station?.name || "-"}</TableCell>
                                            <TableCell>{req.fieldLabel}</TableCell>
                                            <TableCell className="text-muted-foreground">{req.oldValue || "-"}</TableCell>
                                            <TableCell className="font-medium text-blue-600">{req.newValue}</TableCell>
                                            <TableCell>{formatThaiDate(new Date(req.createdAt), "d MMM yy HH:mm")}</TableCell>
                                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                                            {filter === "PENDING" && (
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10"
                                                            onClick={() => handleAction(req.id, "approve")}
                                                            disabled={isProcessing === req.id}
                                                        >
                                                            {isProcessing === req.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Check className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-500/10"
                                                            onClick={() => handleAction(req.id, "reject")}
                                                            disabled={isProcessing === req.id}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
