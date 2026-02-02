"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
    Plus,
    Pencil,
    Trash2,
    Clock,
    Moon,
} from "lucide-react";
import { toast } from "sonner";

interface ShiftType {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    stationId: string | null;
    breakMinutes: number;
    isNightShift: boolean;
    isActive: boolean;
    sortOrder: number;
    station?: { id: string; name: string } | null;
}

export default function ShiftTypesPage() {
    const { data: session, status } = useSession();
    const [shifts, setShifts] = useState<ShiftType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<ShiftType | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        startTime: "06:00",
        endTime: "14:00",
        breakMinutes: 60,
        isNightShift: false,
        sortOrder: 0,
    });

    useEffect(() => {
        if (session?.user?.id) {
            fetchShifts();
        }
    }, [session?.user?.id]);

    const fetchShifts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/shift-types");
            if (res.ok) {
                const data = await res.json();
                setShifts(data.shifts || []);
            }
        } catch (error) {
            console.error("Failed to fetch shifts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingShift(null);
        setFormData({
            code: "",
            name: "",
            startTime: "06:00",
            endTime: "14:00",
            breakMinutes: 60,
            isNightShift: false,
            sortOrder: shifts.length,
        });
        setDialogOpen(true);
    };

    const openEditDialog = (shift: ShiftType) => {
        setEditingShift(shift);
        setFormData({
            code: shift.code,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            breakMinutes: shift.breakMinutes,
            isNightShift: shift.isNightShift,
            sortOrder: shift.sortOrder,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.code || !formData.name || !formData.startTime || !formData.endTime) {
            toast.error("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        setIsSaving(true);
        try {
            const method = editingShift ? "PUT" : "POST";
            const body = editingShift
                ? { id: editingShift.id, ...formData }
                : formData;

            const res = await fetch("/api/admin/shift-types", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "บันทึกสำเร็จ");
                setDialogOpen(false);
                fetchShifts();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingShift) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/shift-types?id=${editingShift.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "ลบสำเร็จ");
                setDeleteDialogOpen(false);
                setDialogOpen(false);
                fetchShifts();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">ประเภทกะ</h1>
                    <p className="text-muted-foreground">จัดการประเภทกะทำงาน (เพิ่ม/แก้ไข/ลบ)</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มกะใหม่
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{shifts.length}</p>
                            <p className="text-xs text-muted-foreground">ประเภทกะทั้งหมด</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {shifts.filter((s) => s.isActive).length}
                            </p>
                            <p className="text-xs text-muted-foreground">ใช้งานอยู่</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Moon className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {shifts.filter((s) => s.isNightShift).length}
                            </p>
                            <p className="text-xs text-muted-foreground">กะดึก</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">รหัส</TableHead>
                                <TableHead>ชื่อกะ</TableHead>
                                <TableHead>เวลาเริ่ม</TableHead>
                                <TableHead>เวลาสิ้นสุด</TableHead>
                                <TableHead className="text-center">พักกลางวัน</TableHead>
                                <TableHead className="text-center">กะดึก</TableHead>
                                <TableHead className="text-center">สถานะ</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shifts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                                        ยังไม่มีประเภทกะ
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shifts.map((shift) => (
                                    <TableRow key={shift.id}>
                                        <TableCell>
                                            <Badge className="bg-blue-500 text-white">{shift.code}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{shift.name}</TableCell>
                                        <TableCell className="font-mono">{shift.startTime}</TableCell>
                                        <TableCell className="font-mono">{shift.endTime}</TableCell>
                                        <TableCell className="text-center">{shift.breakMinutes} นาที</TableCell>
                                        <TableCell className="text-center">
                                            {shift.isNightShift ? (
                                                <Moon className="w-4 h-4 text-purple-500 mx-auto" />
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {shift.isActive ? (
                                                <Badge className="bg-green-500/10 text-green-500">ใช้งาน</Badge>
                                            ) : (
                                                <Badge className="bg-muted text-muted-foreground">ปิดใช้งาน</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditDialog(shift)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingShift ? "แก้ไขกะ" : "เพิ่มกะใหม่"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>รหัสกะ *</Label>
                                <Input
                                    placeholder="เช่น A, B, C"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                    }
                                    maxLength={5}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ลำดับ</Label>
                                <Input
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) =>
                                        setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>ชื่อกะ *</Label>
                            <Input
                                placeholder="เช่น กะเช้า"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>เวลาเริ่ม *</Label>
                                <Input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>เวลาสิ้นสุด *</Label>
                                <Input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>เวลาพักกลางวัน (นาที)</Label>
                            <Input
                                type="number"
                                value={formData.breakMinutes}
                                onChange={(e) =>
                                    setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">กะดึก (ข้ามวัน)</p>
                                <p className="text-sm text-muted-foreground">เวลาสิ้นสุดอยู่วันถัดไป</p>
                            </div>
                            <Switch
                                checked={formData.isNightShift}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isNightShift: checked })
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        {editingShift && (
                            <Button
                                variant="destructive"
                                onClick={() => setDeleteDialogOpen(true)}
                                className="mr-auto"
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                ลบ
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ยืนยันการลบ</DialogTitle>
                    </DialogHeader>
                    <p className="py-4">
                        ต้องการลบกะ <strong>{editingShift?.code}</strong> - {editingShift?.name} หรือไม่?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            ลบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
