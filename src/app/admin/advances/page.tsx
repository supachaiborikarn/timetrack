"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Banknote,
    Download,
    Plus,
    Search,
    Edit2,
    Trash2,
    Check,
    X,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

interface Advance {
    id: string;
    userId: string;
    amount: number;
    date: string;
    month: number;
    year: number;
    reason: string | null;
    note: string | null;
    status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
    approvedBy: string | null;
    approvedAt: string | null;
    paidAt: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        employeeId: string;
        registeredStationId: string | null;
        registeredStation: { id: string; name: string; code: string } | null;
        station: { id: string; name: string; code: string } | null;
    };
}

interface Station {
    id: string;
    name: string;
    code: string;
}

interface Employee {
    id: string;
    name: string;
    employeeId: string;
    registeredStation?: { name: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    PENDING: { label: "รออนุมัติ", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
    APPROVED: { label: "อนุมัติแล้ว", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: CheckCircle },
    PAID: { label: "จ่ายแล้ว", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: DollarSign },
    REJECTED: { label: "ปฏิเสธ", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

export default function AdminAdvancesPage() {
    const { data: session, status: authStatus } = useSession();
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [summary, setSummary] = useState({ totalCount: 0, totalAmount: 0, pendingCount: 0, approvedAmount: 0 });
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
    const [filterYear, setFilterYear] = useState(now.getFullYear());
    const [filterStatus, setFilterStatus] = useState("");
    const [filterStation, setFilterStation] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form
    const [formUserId, setFormUserId] = useState("");
    const [formAmount, setFormAmount] = useState("");
    const [formReason, setFormReason] = useState("");
    const [formNote, setFormNote] = useState("");
    const [formStatus, setFormStatus] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    if (authStatus === "unauthenticated") redirect("/login");

    const fetchAdvances = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("month", String(filterMonth));
            params.set("year", String(filterYear));
            if (filterStatus) params.set("status", filterStatus);
            if (filterStation) params.set("stationId", filterStation);
            if (searchQuery) params.set("search", searchQuery);

            const res = await fetch(`/api/admin/advances?${params}`);
            if (res.ok) {
                const data = await res.json();
                setAdvances(data.advances);
                setSummary(data.summary);
                setStations(data.stations);
            }
        } catch (error) {
            console.error("Error fetching advances:", error);
        } finally {
            setIsLoading(false);
        }
    }, [filterMonth, filterYear, filterStatus, filterStation, searchQuery]);

    const fetchEmployees = async () => {
        try {
            const res = await fetch("/api/admin/employees?limit=500");
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.employees || data);
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    useEffect(() => {
        fetchAdvances();
    }, [fetchAdvances]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleCreate = async () => {
        if (!formUserId || !formAmount) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/advances", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: formUserId,
                    amount: formAmount,
                    reason: formReason,
                    note: formNote,
                    month: filterMonth,
                    year: filterYear,
                }),
            });
            if (res.ok) {
                setShowCreateModal(false);
                resetForm();
                fetchAdvances();
            }
        } catch (error) {
            console.error("Error creating advance:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingAdvance) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/advances", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingAdvance.id,
                    amount: formAmount || undefined,
                    reason: formReason,
                    note: formNote,
                    status: formStatus || undefined,
                }),
            });
            if (res.ok) {
                setShowEditModal(false);
                setEditingAdvance(null);
                resetForm();
                fetchAdvances();
            }
        } catch (error) {
            console.error("Error updating advance:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/advances?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setDeleteConfirm(null);
                fetchAdvances();
            }
        } catch (error) {
            console.error("Error deleting advance:", error);
        }
    };

    const handleQuickStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch("/api/admin/advances", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            });
            if (res.ok) fetchAdvances();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        params.set("month", String(filterMonth));
        params.set("year", String(filterYear));
        if (filterStatus) params.set("status", filterStatus);
        if (filterStation) params.set("stationId", filterStation);
        window.open(`/api/admin/advances/export?${params}`, "_blank");
    };

    const openEdit = (adv: Advance) => {
        setEditingAdvance(adv);
        setFormAmount(String(adv.amount));
        setFormReason(adv.reason || "");
        setFormNote(adv.note || "");
        setFormStatus(adv.status);
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormUserId("");
        setFormAmount("");
        setFormReason("");
        setFormNote("");
        setFormStatus("");
    };

    const changeMonth = (delta: number) => {
        let m = filterMonth + delta;
        let y = filterYear;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
        setFilterMonth(m);
        setFilterYear(y);
    };

    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

    if (authStatus === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Banknote className="w-7 h-7 text-green-500" />
                        เบิกค่าแรง
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">จัดการรายการเบิกค่าแรงพนักงาน</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export Excel
                    </Button>
                    <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4" />
                        เพิ่มรายการเบิก
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Banknote className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
                                <p className="text-xl font-bold">{summary.totalCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <DollarSign className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">ยอดรวม</p>
                                <p className="text-xl font-bold">{summary.totalAmount.toLocaleString()} ฿</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10">
                                <Clock className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">รออนุมัติ</p>
                                <p className="text-xl font-bold">{summary.pendingCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">ยอดอนุมัติ</p>
                                <p className="text-xl font-bold">{summary.approvedAmount.toLocaleString()} ฿</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="bg-card border-border">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                        {/* Month Picker */}
                        <div className="flex items-center gap-2 bg-background rounded-lg border border-border px-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="font-medium text-sm min-w-[100px] text-center">
                                {thaiMonths[filterMonth - 1]} {filterYear + 543}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                        >
                            <option value="">ทุกสถานะ</option>
                            <option value="PENDING">รออนุมัติ</option>
                            <option value="APPROVED">อนุมัติแล้ว</option>
                            <option value="PAID">จ่ายแล้ว</option>
                            <option value="REJECTED">ปฏิเสธ</option>
                        </select>

                        {/* Station Filter */}
                        <select
                            value={filterStation}
                            onChange={(e) => setFilterStation(e.target.value)}
                            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                        >
                            <option value="">ทุกห้าง</option>
                            {stations.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อพนักงาน..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-card border-border">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : advances.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>ไม่มีรายการเบิกค่าแรง</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">พนักงาน</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">ห้างประกันสังคม</th>
                                        <th className="text-right p-3 font-medium text-muted-foreground">ยอดเบิก</th>
                                        <th className="text-center p-3 font-medium text-muted-foreground">สถานะ</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">เหตุผล</th>
                                        <th className="text-center p-3 font-medium text-muted-foreground">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {advances.map((adv, i) => {
                                        const sc = statusConfig[adv.status];
                                        const StatusIcon = sc.icon;
                                        return (
                                            <tr key={adv.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                                <td className="p-3 text-muted-foreground">{i + 1}</td>
                                                <td className="p-3">
                                                    <div>
                                                        <p className="font-medium text-foreground">{adv.user.name}</p>
                                                        <p className="text-xs text-muted-foreground">{adv.user.employeeId}</p>
                                                    </div>
                                                </td>
                                                <td className="p-3 hidden md:table-cell">
                                                    <span className="text-muted-foreground">
                                                        {adv.user.registeredStation?.name || "ไม่ระบุ"}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className="font-semibold text-foreground">
                                                        {Number(adv.amount).toLocaleString()} ฿
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Badge variant="outline" className={`${sc.color} gap-1`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {sc.label}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 hidden lg:table-cell">
                                                    <span className="text-muted-foreground text-xs line-clamp-1">
                                                        {adv.reason || "-"}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {adv.status === "PENDING" && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                                                    onClick={() => handleQuickStatus(adv.id, "APPROVED")}
                                                                    title="อนุมัติ"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                                    onClick={() => handleQuickStatus(adv.id, "REJECTED")}
                                                                    title="ปฏิเสธ"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {adv.status === "APPROVED" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                                                onClick={() => handleQuickStatus(adv.id, "PAID")}
                                                                title="จ่ายแล้ว"
                                                            >
                                                                <DollarSign className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                            onClick={() => openEdit(adv)}
                                                            title="แก้ไข"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                                            onClick={() => setDeleteConfirm(adv.id)}
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Plus className="w-5 h-5 text-green-500" />
                            เพิ่มรายการเบิกค่าแรง
                        </h2>

                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">พนักงาน *</label>
                                <select
                                    value={formUserId}
                                    onChange={(e) => setFormUserId(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                >
                                    <option value="">เลือกพนักงาน</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.employeeId} - {emp.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">จำนวนเงิน (บาท) *</label>
                                <input
                                    type="number"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">เหตุผล</label>
                                <input
                                    type="text"
                                    value={formReason}
                                    onChange={(e) => setFormReason(e.target.value)}
                                    placeholder="ระบุเหตุผล (ถ้ามี)"
                                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">หมายเหตุ</label>
                                <textarea
                                    value={formNote}
                                    onChange={(e) => setFormNote(e.target.value)}
                                    placeholder="หมายเหตุจากแอดมิน"
                                    rows={2}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none"
                                />
                            </div>

                            <p className="text-xs text-muted-foreground">
                                งวด: {thaiMonths[filterMonth - 1]} {filterYear + 543}
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" onClick={() => setShowCreateModal(false)}>ยกเลิก</Button>
                            <Button
                                onClick={handleCreate}
                                disabled={!formUserId || !formAmount || isSaving}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                บันทึก
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingAdvance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-blue-500" />
                            แก้ไขรายการเบิก
                        </h2>

                        <div className="p-3 rounded-lg bg-muted/30 border border-border">
                            <p className="font-medium">{editingAdvance.user.name}</p>
                            <p className="text-xs text-muted-foreground">{editingAdvance.user.employeeId} • {editingAdvance.user.registeredStation?.name || "ไม่ระบุห้าง"}</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">จำนวนเงิน (บาท)</label>
                                <input
                                    type="number"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">สถานะ</label>
                                <select
                                    value={formStatus}
                                    onChange={(e) => setFormStatus(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                >
                                    <option value="PENDING">รออนุมัติ</option>
                                    <option value="APPROVED">อนุมัติแล้ว</option>
                                    <option value="PAID">จ่ายแล้ว</option>
                                    <option value="REJECTED">ปฏิเสธ</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">เหตุผล</label>
                                <input
                                    type="text"
                                    value={formReason}
                                    onChange={(e) => setFormReason(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">หมายเหตุ</label>
                                <textarea
                                    value={formNote}
                                    onChange={(e) => setFormNote(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" onClick={() => setShowEditModal(false)}>ยกเลิก</Button>
                            <Button onClick={handleUpdate} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                บันทึก
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-red-500 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            ยืนยันการลบ
                        </h2>
                        <p className="text-sm text-muted-foreground">ต้องการลบรายการเบิกนี้หรือไม่? การลบไม่สามารถย้อนกลับได้</p>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
                            <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>ลบ</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
