
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Interfaces
interface Station {
    id: string;
    name: string;
    departments: { id: string; name: string }[];
}

interface Employee {
    id: string;
    employeeId: string;
    name: string;
    phone: string;
    email: string | null;
    role: string;
    hourlyRate: number;
    dailyRate: number | null;
    otRateMultiplier: number;
    isActive: boolean;
    station: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
}

const initialFormData = {
    employeeId: "",
    name: "",
    phone: "",
    email: "",
    pin: "",
    role: "EMPLOYEE",
    stationId: "",
    departmentId: "",
    hourlyRate: "60",
    dailyRate: "400",
    otRateMultiplier: "1.5",
    isActive: true,
};

const EmployeeForm = ({
    formData,
    setFormData,
    stations,
    onSubmit,
    submitLabel,
    isSubmitting,
    onCancel,
    isEdit = false
}: {
    formData: typeof initialFormData;
    setFormData: (data: typeof initialFormData) => void;
    stations: Station[];
    onSubmit: (e: React.FormEvent) => void;
    submitLabel: string;
    isSubmitting: boolean;
    onCancel: () => void;
    isEdit?: boolean;
}) => {
    const selectedStation = stations.find((s) => s.id === formData.stationId);

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>รหัสพนักงาน</Label>
                    <Input
                        value={formData.employeeId}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        placeholder="EMP001"
                        required
                        disabled={isEdit}
                    />
                </div>
                <div className="space-y-2">
                    <Label>ชื่อ-นามสกุล</Label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="สมชาย ใจดี"
                        required
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>เบอร์โทร</Label>
                    <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0812345678"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label>PIN 6 หลัก {isEdit && "(เว้นว่างถ้าไม่เปลี่ยน)"}</Label>
                    <Input
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "") })}
                        placeholder={isEdit ? "ไม่เปลี่ยน" : "123456"}
                        maxLength={6}
                        required={!isEdit}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label>อีเมล (ไม่บังคับ - ใช้สำหรับการกู้คืนรหัสผ่าน)</Label>
                <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                />
            </div>
            <div className="space-y-2">
                <p className="text-xs text-muted-foreground bg-blue-50 text-blue-700 p-2 rounded">
                    * พนักงานสามารถเข้าสู่ระบบด้วย <b>ชื่อ</b> และรหัสผ่าน <b>123456</b> ได้ทันทีโดยไม่ต้องใช้อีเมล
                </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>สถานี</Label>
                    <Select value={formData.stationId} onValueChange={(v) => setFormData({ ...formData, stationId: v, departmentId: "" })}>
                        <SelectTrigger><SelectValue placeholder="เลือกสถานี" /></SelectTrigger>
                        <SelectContent>
                            {stations.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>แผนก</Label>
                    <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })} disabled={!selectedStation}>
                        <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
                        <SelectContent>
                            {selectedStation?.departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>ตำแหน่ง</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EMPLOYEE">พนักงาน</SelectItem>
                            <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>สถานะ</Label>
                    <Select value={formData.isActive ? "active" : "inactive"} onValueChange={(v) => setFormData({ ...formData, isActive: v === "active" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">ใช้งาน</SelectItem>
                            <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>ค่าแรง/วัน</Label>
                    <Input type="number" value={formData.dailyRate} onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>ค่าแรง/ชม.</Label>
                    <Input type="number" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })} required />
                </div>
                <div className="space-y-2">
                    <Label>OT Rate</Label>
                    <Input type="number" step="0.1" value={formData.otRateMultiplier} onChange={(e) => setFormData({ ...formData, otRateMultiplier: e.target.value })} required />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>ยกเลิก</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{submitLabel}</Button>
            </div>
        </form>
    );
};

export const AddEmployeeDialog = ({
    open,
    onOpenChange,
    stations,
    onSuccess
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stations: Station[];
    onSuccess: () => void;
}) => {
    const [formData, setFormData] = useState(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    hourlyRate: parseFloat(formData.hourlyRate),
                    dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
                    otRateMultiplier: parseFloat(formData.otRateMultiplier),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("เพิ่มพนักงานสำเร็จ");
                onOpenChange(false);
                setFormData(initialFormData);
                onSuccess();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>เพิ่มพนักงานใหม่</DialogTitle>
                    <DialogDescription>กรอกข้อมูลพนักงานด้านล่าง</DialogDescription>
                </DialogHeader>
                <EmployeeForm
                    formData={formData}
                    setFormData={setFormData}
                    stations={stations}
                    onSubmit={handleSubmit}
                    submitLabel="บันทึก"
                    isSubmitting={isSubmitting}
                    onCancel={() => { onOpenChange(false); setFormData(initialFormData); }}
                />
            </DialogContent>
        </Dialog>
    );
};

export const EditEmployeeDialog = ({
    open,
    onOpenChange,
    employee,
    stations,
    onSuccess
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    stations: Station[];
    onSuccess: () => void;
}) => {
    const [formData, setFormData] = useState(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (employee) {
            setFormData({
                employeeId: employee.employeeId,
                name: employee.name,
                phone: employee.phone,
                email: employee.email || "",
                pin: "",
                role: employee.role,
                stationId: employee.station?.id || "",
                departmentId: employee.department?.id || "",
                hourlyRate: employee.hourlyRate.toString(),
                dailyRate: employee.dailyRate?.toString() || "400",
                otRateMultiplier: employee.otRateMultiplier.toString(),
                isActive: employee.isActive,
            });
        }
    }, [employee]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/employees/${employee.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    hourlyRate: parseFloat(formData.hourlyRate),
                    dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
                    otRateMultiplier: parseFloat(formData.otRateMultiplier),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("แก้ไขพนักงานสำเร็จ");
                onOpenChange(false);
                onSuccess();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>แก้ไขพนักงาน</DialogTitle>
                    <DialogDescription>แก้ไขข้อมูล {employee?.name}</DialogDescription>
                </DialogHeader>
                <EmployeeForm
                    formData={formData}
                    setFormData={setFormData}
                    stations={stations}
                    onSubmit={handleSubmit}
                    submitLabel="บันทึกการแก้ไข"
                    isSubmitting={isSubmitting}
                    onCancel={() => onOpenChange(false)}
                    isEdit
                />
            </DialogContent>
        </Dialog>
    );
};
