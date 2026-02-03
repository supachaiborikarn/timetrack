
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, User, Wallet, Shield, Phone } from "lucide-react";
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
    nickname: string | null;
    realName: string | null;
    phone: string;
    email: string | null;
    role: string;
    hourlyRate: number;
    dailyRate: number | null;
    baseSalary: number | null;
    otRateMultiplier: number;
    isActive: boolean;
    station: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
    // New fields
    bankAccountNumber: string | null;
    bankName: string | null;
    socialSecurityStation: string | null;
    // Additional CSV data
    position?: string | null;
    housingCost?: number | null;
    specialPay?: number | null;
    workHours?: number | null;

    // Emergency Contact
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
}

const initialFormData = {
    employeeId: "",
    name: "",
    nickname: "",
    realName: "",
    phone: "",
    email: "",
    password: "",
    pin: "",
    role: "EMPLOYEE",
    stationId: "",
    departmentId: "",
    hourlyRate: 0,
    dailyRate: 0,
    baseSalary: 0,
    otRateMultiplier: 1.5,
    isActive: true,
    // Bank info
    bankAccountNumber: "",
    bankName: "TTB",
    // Social security
    socialSecurityStation: "",
    // Emergency contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    // Additional CSV data
    position: "",
    housingCost: 0,
    specialPay: 0,
    workHours: 12,
};

// Station options for social security
const socialSecurityStations = [
    "วัชรเกียรติออยล์",
    "พงษ์อนันต์ปิโตรเลียม",
    "ศุภชัยบริการ"
];

const bankOptions = [
    "TTB",
    "กสิกร",
    "กรุงไทย",
    "ไทยพาณิชย์",
    "กรุงเทพ",
    "ออมสิน",
    "ธ.ก.ส."
];

const relationOptions = [
    "บิดา",
    "มารดา",
    "สามี",
    "ภรรยา",
    "บุตร",
    "พี่/น้อง",
    "อื่นๆ"
];

const EmployeeFormWithTabs = ({
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
        <form onSubmit={onSubmit}>
            <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="basic" className="text-xs">
                        <User className="w-4 h-4 mr-1" />ข้อมูลหลัก
                    </TabsTrigger>
                    <TabsTrigger value="wage" className="text-xs">
                        <Wallet className="w-4 h-4 mr-1" />ค่าแรง
                    </TabsTrigger>
                    <TabsTrigger value="social" className="text-xs">
                        <Shield className="w-4 h-4 mr-1" />ประกัน
                    </TabsTrigger>
                    <TabsTrigger value="emergency" className="text-xs">
                        <Phone className="w-4 h-4 mr-1" />ฉุกเฉิน
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Basic Info */}
                <TabsContent value="basic" className="space-y-4">
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
                            <Label>ชื่อเล่น (สำหรับเรียก)</Label>
                            <Input
                                value={formData.nickname}
                                onChange={(e) => setFormData({ ...formData, nickname: e.target.value, name: e.target.value })}
                                placeholder="ชื่อเล่น"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>ชื่อจริง-นามสกุล</Label>
                        <Input
                            value={formData.realName}
                            onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                            placeholder="ชื่อจริง นามสกุล"
                        />
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
                            <Label>PIN {isEdit && "(เว้นว่างถ้าไม่เปลี่ยน)"}</Label>
                            <Input
                                value={formData.pin}
                                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "") })}
                                placeholder={isEdit ? "ไม่เปลี่ยน" : "1234"}
                                maxLength={6}
                                required={!isEdit}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>อีเมล (ไม่บังคับ)</Label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@example.com"
                        />
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
                                    <SelectItem value="CASHIER">เสมียน</SelectItem>
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
                    <div className="space-y-2">
                        <Label>ตำแหน่ง (Job Title)</Label>
                        <Input
                            value={formData.position || ""}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            placeholder="เช่น พนักงานเติมน้ำมัน, แม่บ้าน"
                        />
                    </div>
                </TabsContent>

                {/* Tab 2: Wage & Bank */}
                <TabsContent value="wage" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>ค่าแรง/วัน</Label>
                            <Input type="number" value={formData.dailyRate} onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                            <Label>เงินเดือน</Label>
                            <Input type="number" value={formData.baseSalary} onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ค่าแรง/ชม.</Label>
                            <Input type="number" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>OT Rate (x เท่า)</Label>
                        <Input type="number" step="0.1" value={formData.otRateMultiplier} onChange={(e) => setFormData({ ...formData, otRateMultiplier: parseFloat(e.target.value) || 0 })} required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>ชม.งาน/วัน</Label>
                            <Input type="number" step="0.5" value={formData.workHours || 12} onChange={(e) => setFormData({ ...formData, workHours: parseFloat(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <Label>เงินพิเศษ</Label>
                            <Input type="number" value={formData.specialPay || 0} onChange={(e) => setFormData({ ...formData, specialPay: parseFloat(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <Label>หักค่าที่พัก</Label>
                            <Input type="number" value={formData.housingCost || 0} onChange={(e) => setFormData({ ...formData, housingCost: parseFloat(e.target.value) })} />
                        </div>
                    </div>

                    <hr className="my-4" />
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Wallet className="w-4 h-4" /> บัญชีธนาคาร</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>ธนาคาร</Label>
                            <Select value={formData.bankName || ""} onValueChange={(v) => setFormData({ ...formData, bankName: v })}>
                                <SelectTrigger><SelectValue placeholder="เลือกธนาคาร" /></SelectTrigger>
                                <SelectContent>
                                    {bankOptions.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>เลขที่บัญชี</Label>
                            <Input
                                value={formData.bankAccountNumber || ""}
                                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                placeholder="1234567890"
                            />
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 3: Social Security */}
                <TabsContent value="social" className="space-y-4">
                    <div className="space-y-2">
                        <Label>สถานีที่ส่งประกันสังคม</Label>
                        <Select value={formData.socialSecurityStation || ""} onValueChange={(v) => setFormData({ ...formData, socialSecurityStation: v })}>
                            <SelectTrigger><SelectValue placeholder="เลือกสถานี" /></SelectTrigger>
                            <SelectContent>
                                {socialSecurityStations.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        สถานีที่ส่งประกันสังคมอาจแตกต่างจากสถานีที่ทำงานจริง
                    </p>
                </TabsContent>

                {/* Tab 4: Emergency Contact */}
                <TabsContent value="emergency" className="space-y-4">
                    <div className="space-y-2">
                        <Label>ชื่อผู้ติดต่อฉุกเฉิน</Label>
                        <Input
                            value={formData.emergencyContactName || ""}
                            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                            placeholder="ชื่อ นามสกุล"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>เบอร์โทรฉุกเฉิน</Label>
                            <Input
                                value={formData.emergencyContactPhone || ""}
                                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                placeholder="0812345678"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ความสัมพันธ์</Label>
                            <Select value={formData.emergencyContactRelation || ""} onValueChange={(v) => setFormData({ ...formData, emergencyContactRelation: v })}>
                                <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                                <SelectContent>
                                    {relationOptions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
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
                    hourlyRate: formData.hourlyRate,
                    dailyRate: formData.dailyRate || null,
                    baseSalary: formData.baseSalary || null,
                    otRateMultiplier: formData.otRateMultiplier,
                    specialPay: formData.specialPay || 0,
                    housingCost: formData.housingCost || 0,
                    workHours: formData.workHours || 12,
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
                <EmployeeFormWithTabs
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
                nickname: employee.nickname || "",
                realName: employee.realName || "",
                phone: employee.phone,
                email: employee.email || "",
                pin: "",
                role: employee.role,
                stationId: employee.station?.id || "",
                departmentId: employee.department?.id || "",
                hourlyRate: Number(employee.hourlyRate) || 0,
                dailyRate: Number(employee.dailyRate) || 0,
                baseSalary: Number(employee.baseSalary) || 0,
                otRateMultiplier: Number(employee.otRateMultiplier) || 1.5,
                isActive: employee.isActive,
                // New fields
                bankAccountNumber: employee.bankAccountNumber || "",
                bankName: employee.bankName || "TTB",
                socialSecurityStation: employee.socialSecurityStation || "",
                emergencyContactName: employee.emergencyContactName || "",
                emergencyContactPhone: employee.emergencyContactPhone || "",
                emergencyContactRelation: employee.emergencyContactRelation || "",
                position: employee.position || "",
                housingCost: Number(employee.housingCost) || 0,
                specialPay: Number(employee.specialPay) || 0,
                workHours: Number(employee.workHours) || 12,
                password: "",
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
                    hourlyRate: formData.hourlyRate,
                    dailyRate: formData.dailyRate || null,
                    baseSalary: formData.baseSalary || null,
                    otRateMultiplier: formData.otRateMultiplier,
                    specialPay: formData.specialPay || 0,
                    housingCost: formData.housingCost || 0,
                    workHours: formData.workHours || 12,
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
                <EmployeeFormWithTabs
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
