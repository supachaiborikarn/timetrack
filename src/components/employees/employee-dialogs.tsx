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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

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
    phone: string | null;
    email: string | null;
    role: string;
    hourlyRate: number;
    dailyRate: number | null;
    otRateMultiplier: number;
    isActive: boolean;
    station: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
    // New Fields
    isSocialSecurityRegistered?: boolean;
    socialSecurityNumber?: string | null;
    registeredStation?: { id: string; name: string } | null;
    registeredStationId?: string | null;

    nickName?: string | null;
    gender?: string | null;
    birthDate?: string | null;
    address?: string | null;
    citizenId?: string | null;
    startDate?: string | null;
    probationEndDate?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
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
    // Social Security
    isSocialSecurityRegistered: false,
    socialSecurityNumber: "",
    registeredStationId: "",

    // New Fields
    nickName: "",
    gender: "",
    birthDate: "",
    address: "",
    citizenId: "",
    startDate: new Date().toISOString().split('T')[0],
    probationEndDate: "",
    bankName: "",
    bankAccountNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
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
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">ทั่วไป</TabsTrigger>
                    <TabsTrigger value="personal">ส่วนตัว</TabsTrigger>
                    <TabsTrigger value="employment">การจ้างงาน</TabsTrigger>
                    <TabsTrigger value="emergency">ฉุกเฉิน</TabsTrigger>
                </TabsList>

                {/* Tab 1: ข้อมูลทั่วไป */}
                <TabsContent value="general" className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>รหัสพนักงาน <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.employeeId}
                                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                placeholder="EMP001"
                                required
                                disabled={isEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
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
                            <Label>ชื่อเล่น</Label>
                            <Input
                                value={formData.nickName}
                                onChange={(e) => setFormData({ ...formData, nickName: e.target.value })}
                                placeholder="ชาย"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทร</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="0812345678"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>PIN 6 หลัก {isEdit && "(เว้นว่างถ้าไม่เปลี่ยน)"} <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.pin}
                                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "") })}
                                placeholder={isEdit ? "ไม่เปลี่ยน" : "123456"}
                                maxLength={6}
                                required={!isEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>อีเมล</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>สถานี (ที่ทำงานจริง)</Label>
                            <Select value={formData.stationId} onValueChange={(v) => setFormData({ ...formData, stationId: v, departmentId: "" })}>
                                <SelectTrigger><SelectValue placeholder="เลือกสถานี" /></SelectTrigger>
                                <SelectContent>
                                    {stations.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>สถานี (ที่ขึ้นทะเบียน)</Label>
                            <Select value={formData.registeredStationId} onValueChange={(v) => setFormData({ ...formData, registeredStationId: v })}>
                                <SelectTrigger><SelectValue placeholder="เลือกสถานี (ถ้ามี)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                                    {stations.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>แผนก</Label>
                            <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })} disabled={!selectedStation}>
                                <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
                                <SelectContent>
                                    {selectedStation?.departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>สถานะการใช้งาน</Label>
                            <Select value={formData.isActive ? "active" : "inactive"} onValueChange={(v) => setFormData({ ...formData, isActive: v === "active" })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">ใช้งานปกติ</SelectItem>
                                    <SelectItem value="inactive">ปิดใช้งาน/ลาออก</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
                </TabsContent>

                {/* Tab 2: ข้อมูลส่วนตัว */}
                <TabsContent value="personal" className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>เลขบัตรประชาชน</Label>
                        <Input
                            value={formData.citizenId}
                            onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                            placeholder="1-2345-67890-12-3"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>วันเกิด</Label>
                            <Input
                                type="date"
                                value={formData.birthDate}
                                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>เพศ</Label>
                            <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                                <SelectTrigger><SelectValue placeholder="ระบุเพศ" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">ชาย</SelectItem>
                                    <SelectItem value="Female">หญิง</SelectItem>
                                    <SelectItem value="Other">อื่นๆ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>ที่อยู่ปัจจุบัน</Label>
                        <Textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="บ้านเลขที่ หมู่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                            rows={3}
                        />
                    </div>
                </TabsContent>

                {/* Tab 3: การจ้างงาน */}
                <TabsContent value="employment" className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>วันที่เริ่มงาน</Label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>วันผ่านโปร</Label>
                            <Input
                                type="date"
                                value={formData.probationEndDate}
                                onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                            />
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

                    <div className="flex items-center space-x-2 pt-2 pb-2">
                        <Switch
                            id="sso"
                            checked={formData.isSocialSecurityRegistered}
                            onCheckedChange={(c) => setFormData({ ...formData, isSocialSecurityRegistered: c })}
                        />
                        <Label htmlFor="sso">ขึ้นทะเบียนประกันสังคม</Label>
                    </div>

                    {formData.isSocialSecurityRegistered && (
                        <div className="space-y-2">
                            <Label>เลขบัตรประกันสังคม</Label>
                            <Input
                                value={formData.socialSecurityNumber}
                                onChange={(e) => setFormData({ ...formData, socialSecurityNumber: e.target.value })}
                                placeholder="เลขบัตร 13 หลัก"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                        <div className="space-y-2">
                            <Label>ธนาคาร</Label>
                            <Select value={formData.bankName} onValueChange={(v) => setFormData({ ...formData, bankName: v })}>
                                <SelectTrigger><SelectValue placeholder="เลือกธนาคาร" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="KASIKORN">กสิกรไทย</SelectItem>
                                    <SelectItem value="SCB">ไทยพาณิชย์</SelectItem>
                                    <SelectItem value="BANGKOK">กรุงเทพ</SelectItem>
                                    <SelectItem value="KRUNGTHAI">กรุงไทย</SelectItem>
                                    <SelectItem value="KRUNGSRI">กรุงศรี</SelectItem>
                                    <SelectItem value="TTB">ทหารไทยธนชาต</SelectItem>
                                    <SelectItem value="GSB">ออมสิน</SelectItem>
                                    <SelectItem value="BAAC">ธ.ก.ส.</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>เลขบัญชี</Label>
                            <Input
                                value={formData.bankAccountNumber}
                                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                placeholder="xxx-x-xxxxx-x"
                            />
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 4: ผู้ติดต่อฉุกเฉิน */}
                <TabsContent value="emergency" className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>ชื่อผู้ติดต่อฉุกเฉิน</Label>
                        <Input
                            value={formData.emergencyContactName}
                            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                            placeholder="ชื่อ-นามสกุล"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>ความสัมพันธ์</Label>
                            <Select value={formData.emergencyContactRelation} onValueChange={(v) => setFormData({ ...formData, emergencyContactRelation: v })}>
                                <SelectTrigger><SelectValue placeholder="เลือกความสัมพันธ์" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Parent">บิดา/มารดา</SelectItem>
                                    <SelectItem value="Spouse">คู่สมรส</SelectItem>
                                    <SelectItem value="Sibling">พี่น้อง</SelectItem>
                                    <SelectItem value="Child">บุตร</SelectItem>
                                    <SelectItem value="Relative">ญาติ</SelectItem>
                                    <SelectItem value="Friend">เพื่อน</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทรฉุกเฉิน</Label>
                            <Input
                                value={formData.emergencyContactPhone}
                                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                placeholder="08xxxxxxxx"
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={onCancel}>ยกเลิก</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {submitLabel}
                </Button>
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
                    registeredStationId: formData.registeredStationId === "none" ? null : formData.registeredStationId,
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>เพิ่มพนักงานใหม่</DialogTitle>
                    <DialogDescription>กรอกข้อมูลพนักงานให้ครบถ้วน</DialogDescription>
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
                phone: employee.phone || "",
                email: employee.email || "",
                pin: "",
                role: employee.role,
                stationId: employee.station?.id || "",
                departmentId: employee.department?.id || "",
                hourlyRate: employee.hourlyRate.toString(),
                dailyRate: employee.dailyRate?.toString() || "400",
                otRateMultiplier: employee.otRateMultiplier.toString(),
                isActive: employee.isActive,
                // Social Security
                isSocialSecurityRegistered: employee.isSocialSecurityRegistered || false,
                socialSecurityNumber: employee.socialSecurityNumber || "",
                registeredStationId: employee.registeredStation?.id || employee.registeredStationId || "",

                // New Fields
                nickName: employee.nickName || "",
                gender: employee.gender || "",
                birthDate: employee.birthDate ? new Date(employee.birthDate).toISOString().split('T')[0] : "",
                address: employee.address || "",
                citizenId: employee.citizenId || "",
                startDate: employee.startDate ? new Date(employee.startDate).toISOString().split('T')[0] : "",
                probationEndDate: employee.probationEndDate ? new Date(employee.probationEndDate).toISOString().split('T')[0] : "",
                bankName: employee.bankName || "",
                bankAccountNumber: employee.bankAccountNumber || "",
                emergencyContactName: employee.emergencyContactName || "",
                emergencyContactPhone: employee.emergencyContactPhone || "",
                emergencyContactRelation: employee.emergencyContactRelation || "",
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
                    registeredStationId: formData.registeredStationId === "none" ? null : formData.registeredStationId,
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
