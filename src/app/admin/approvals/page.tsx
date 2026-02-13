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
    UserCog,
    Banknote,
    Building2,
    Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate, format } from "@/lib/date-utils";
import { Checkbox } from "@/components/ui/checkbox";

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

interface Station {
    id: string;
    name: string;
    code: string;
}

interface WageRequest {
    id: string;
    amount: number;
    reason: string;
    status: string;
    createdAt: string;
    user: {
        name: string;
        employeeId: string;
        registeredStation?: { id: string; name: string; code: string } | null;
    };
}

interface ProfileEditRequest {
    id: string;
    fieldName: string;
    fieldLabel: string;
    oldValue: string | null;
    newValue: string;
    status: string;
    createdAt: string;
    user: { name: string; employeeId: string; nickName: string | null };
}

export default function ApprovalsPage() {
    const { data: session, status } = useSession();
    const [timeCorrections, setTimeCorrections] = useState<TimeCorrection[]>([]);
    const [shiftSwaps, setShiftSwaps] = useState<ShiftSwap[]>([]);
    const [wageRequests, setWageRequests] = useState<WageRequest[]>([]);

    const [profileEditRequests, setProfileEditRequests] = useState<ProfileEditRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Wage tab extras
    const [wageStations, setWageStations] = useState<Station[]>([]);
    const [wageFilterStation, setWageFilterStation] = useState("");
    const [wageTotalAmount, setWageTotalAmount] = useState(0);

    // Bulk Actions State
    const [activeTab, setActiveTab] = useState("time-correction");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchRequests();
        }
    }, [session?.user?.id]);

    // Re-fetch when station filter changes
    useEffect(() => {
        if (session?.user?.id) {
            fetchRequests();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wageFilterStation]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const wrParams = new URLSearchParams();
            if (wageFilterStation) wrParams.set("stationId", wageFilterStation);

            const [tcRes, ssRes, wrRes, peRes] = await Promise.all([
                fetch("/api/admin/requests/time-correction"),
                fetch("/api/admin/requests/shift-swap"),
                fetch(`/api/admin/requests/wage?${wrParams}`).catch(() => ({ ok: false })),
                fetch("/api/admin/requests/profile-edit").catch(() => ({ ok: false })),
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
                setWageStations(data.stations || []);
                setWageTotalAmount(data.totalAmount || 0);
            }
            if ('json' in peRes && peRes.ok) {
                const data = await peRes.json();
                setProfileEditRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkAction = async (approved: boolean) => {
        if (selectedIds.size === 0) return;
        setIsBulkProcessing(true);
        const ids = Array.from(selectedIds);

        try {
            if (activeTab === "time-correction") await handleApproveTimeCorrection(ids, approved);
            else if (activeTab === "shift-swap") await handleApproveShiftSwap(ids, approved);
            else if (activeTab === "wage") await handleApproveWageRequest(ids, approved);
            else if (activeTab === "profile-edit") await handleApproveProfileEdit(ids, approved);

            setSelectedIds(new Set()); // Clear selection on success
        } catch (error) {
            console.error("Bulk action failed:", error);
            toast.error("เกิดข้อผิดพลาดในการทำรายการบางรายการ");
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleApproveTimeCorrection = async (ids: string[], approved: boolean) => {
        try {
            const res = await fetch("/api/admin/requests/time-correction", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, status: approved ? "APPROVED" : "REJECTED" }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(approved ? `อนุมัติ ${data.processed} รายการแล้ว` : `ปฏิเสธ ${data.processed} รายการแล้ว`);
                fetchRequests();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
    };

    const handleApproveShiftSwap = async (ids: string[], approved: boolean) => {
        try {
            const res = await fetch("/api/admin/requests/shift-swap", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, status: approved ? "APPROVED" : "REJECTED" }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(approved ? `อนุมัติ ${data.processed} รายการแล้ว` : `ปฏิเสธ ${data.processed} รายการแล้ว`);
                fetchRequests();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
    };

    const handleApproveProfileEdit = async (ids: string[], approved: boolean) => {
        try {
            const res = await fetch("/api/admin/requests/profile-edit", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, status: approved ? "APPROVED" : "REJECTED" }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(approved ? `อนุมัติ ${data.processed} รายการแล้ว` : `ปฏิเสธ ${data.processed} รายการแล้ว`);
                fetchRequests();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
    };

    const handleApproveWageRequest = async (ids: string[], approved: boolean) => {
        try {
            const res = await fetch("/api/admin/requests/wage", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, status: approved ? "APPROVED" : "REJECTED" }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(approved ? `อนุมัติ ${data.processed} รายการแล้ว` : `ปฏิเสธ ${data.processed} รายการแล้ว`);
                fetchRequests();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
    };

    // Selection Helpers
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = (ids: string[]) => {
        if (ids.every(id => selectedIds.has(id))) {
            // Deselect all
            const newSet = new Set(selectedIds);
            ids.forEach(id => newSet.delete(id));
            setSelectedIds(newSet);
        } else {
            // Select all
            const newSet = new Set(selectedIds);
            ids.forEach(id => newSet.add(id));
            setSelectedIds(newSet);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !session.user || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    const pendingTC = timeCorrections.filter((r) => r.status === "PENDING");
    const pendingSS = shiftSwaps.filter((r) => r.status === "PENDING" && r.targetAccepted);
    const pendingWR = wageRequests.filter((r) => r.status === "PENDING");
    const pendingPE = profileEditRequests.filter((r) => r.status === "PENDING");
    const totalPending = pendingTC.length + pendingSS.length + pendingWR.length + pendingPE.length;

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
            <div className="grid grid-cols-4 gap-4">
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
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <UserCog className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{pendingPE.length}</p>
                            <p className="text-xs text-muted-foreground">แก้ไขข้อมูล</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds(new Set()); }} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
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
                    <TabsTrigger value="profile-edit">
                        <UserCog className="w-4 h-4 mr-2" />
                        ข้อมูล ({pendingPE.length})
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
                            <div className="flex justify-end pb-2">
                                <Button variant="outline" size="sm" onClick={() => handleSelectAll(pendingTC.map(r => r.id))}>
                                    {pendingTC.every(r => selectedIds.has(r.id)) ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                                </Button>
                            </div>
                            {pendingTC.map((req) => (
                                <Card key={req.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start gap-4">
                                            <Checkbox
                                                checked={selectedIds.has(req.id)}
                                                onCheckedChange={() => toggleSelection(req.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 flex items-start justify-between">
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
                                                        onClick={() => handleApproveTimeCorrection([req.id], true)}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        อนุมัติ
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleApproveTimeCorrection([req.id], false)}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        ปฏิเสธ
                                                    </Button>
                                                </div>
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
                            <div className="flex justify-end pb-2">
                                <Button variant="outline" size="sm" onClick={() => handleSelectAll(pendingSS.map(r => r.id))}>
                                    {pendingSS.every(r => selectedIds.has(r.id)) ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                                </Button>
                            </div>
                            {pendingSS.map((req) => (
                                <Card key={req.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start gap-4">
                                            <Checkbox
                                                checked={selectedIds.has(req.id)}
                                                onCheckedChange={() => toggleSelection(req.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 flex items-start justify-between">
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
                                                        onClick={() => handleApproveShiftSwap([req.id], true)}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        อนุมัติ
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleApproveShiftSwap([req.id], false)}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        ปฏิเสธ
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Wage Requests Tab */}
                <TabsContent value="wage" className="mt-4 space-y-4">
                    {/* Station Filter + Summary */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Station Filter */}
                        <Card className="flex-1">
                            <CardContent className="py-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Filter className="w-4 h-4 text-blue-500" />
                                </div>
                                <select
                                    value={wageFilterStation}
                                    onChange={(e) => setWageFilterStation(e.target.value)}
                                    className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                >
                                    <option value="">ทุกสถานี</option>
                                    {wageStations.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </CardContent>
                        </Card>

                        {/* Total Amount Summary */}
                        <Card className="flex-1">
                            <CardContent className="py-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Banknote className="w-4 h-4 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">ยอดรวมรออนุมัติ</p>
                                    <p className="text-lg font-bold text-green-500">
                                        ฿{wageTotalAmount.toLocaleString()}
                                    </p>
                                </div>
                                <Badge variant="outline" className="ml-auto text-xs">
                                    {pendingWR.length} รายการ
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : pendingWR.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">
                                    {wageFilterStation ? "ไม่มีรายการสำหรับสถานีนี้" : "ไม่มีคำขอรอดำเนินการ"}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end pb-2">
                                <Button variant="outline" size="sm" onClick={() => handleSelectAll(pendingWR.map(r => r.id))}>
                                    {pendingWR.every(r => selectedIds.has(r.id)) ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                                </Button>
                            </div>
                            {pendingWR.map((req) => (
                                <Card key={req.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start gap-4">
                                            <Checkbox
                                                checked={selectedIds.has(req.id)}
                                                onCheckedChange={() => toggleSelection(req.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="font-medium text-foreground">{req.user.name}</p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {req.user.employeeId}
                                                        </Badge>
                                                        {req.user.registeredStation && (
                                                            <Badge variant="secondary" className="text-xs gap-1">
                                                                <Building2 className="w-3 h-3" />
                                                                {req.user.registeredStation.name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground space-y-1">
                                                        <p className="text-lg font-bold text-green-500">
                                                            ฿{req.amount.toLocaleString()}
                                                        </p>
                                                        <p>เหตุผล: {req.reason}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleApproveWageRequest([req.id], true)}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        อนุมัติ
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleApproveWageRequest([req.id], false)}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        ปฏิเสธ
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Profile Edit Requests Tab */}
                <TabsContent value="profile-edit" className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : pendingPE.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">ไม่มีคำขอรอดำเนินการ</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end pb-2">
                                <Button variant="outline" size="sm" onClick={() => handleSelectAll(pendingPE.map(r => r.id))}>
                                    {pendingPE.every(r => selectedIds.has(r.id)) ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                                </Button>
                            </div>
                            {pendingPE.map((req) => (
                                <Card key={req.id}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start gap-4">
                                            <Checkbox
                                                checked={selectedIds.has(req.id)}
                                                onCheckedChange={() => toggleSelection(req.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="font-medium text-foreground">{req.user.name}</p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {req.user.employeeId}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{req.fieldLabel}:</span>
                                                            <span className="text-red-400 line-through decoration-red-400/50">{req.oldValue || "-"}</span>
                                                            <span>→</span>
                                                            <span className="text-green-500 font-medium">{req.newValue}</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            ขอเมื่อ: {formatThaiDate(new Date(req.createdAt), "d MMM yyyy HH:mm")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleApproveProfileEdit([req.id], true)}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        อนุมัติ
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleApproveProfileEdit([req.id], false)}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        ปฏิเสธ
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-in slide-in-from-bottom-5">
                    <span className="font-medium text-sm whitespace-nowrap">
                        เลือก {selectedIds.size} รายการ
                    </span>
                    <div className="h-4 w-px bg-background/20" />
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="bg-green-600 text-white hover:bg-green-700 h-8"
                            onClick={() => handleBulkAction(true)}
                            disabled={isBulkProcessing}
                        >
                            {isBulkProcessing && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            อนุมัติ
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            onClick={() => handleBulkAction(false)}
                            disabled={isBulkProcessing}
                        >
                            ปฏิเสธ
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
