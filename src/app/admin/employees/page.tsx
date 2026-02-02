"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Loader2,
    Users,
    Filter,
    Download,
    UserCheck,
    UserX,
} from "lucide-react";
import { toast } from "sonner";

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

interface Station {
    id: string;
    name: string;
    departments: { id: string; name: string }[];
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
                    <Input value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} placeholder="EMP001" required disabled={isEdit} />
                </div>
                <div className="space-y-2">
                    <Label>ชื่อ-นามสกุล</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="สมชาย ใจดี" required />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>เบอร์โทร</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0812345678" required />
                </div>
                <div className="space-y-2">
                    <Label>PIN 6 หลัก {isEdit && "(เว้นว่างถ้าไม่เปลี่ยน)"}</Label>
                    <Input value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "") })} placeholder={isEdit ? "ไม่เปลี่ยน" : "123456"} maxLength={6} required={!isEdit} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>อีเมล (ไม่บังคับ - ใช้สำหรับการกู้คืนรหัสผ่าน)</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
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

const AddEmployeeDialog = ({
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

const EditEmployeeDialog = ({
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

export default function EmployeesPage() {
    const { data: session, status } = useSession();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchEmployees();
            fetchStations();
        }
    }, [session?.user?.id]);

    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/employees");
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.employees || []);
            }
        } catch (error) {
            console.error("Failed to fetch employees:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStations = async () => {
        try {
            const res = await fetch("/api/admin/stations");
            if (res.ok) {
                const data = await res.json();
                setStations(data.stations || []);
            }
        } catch (error) {
            console.error("Failed to fetch stations:", error);
        }
    };

    const handleDelete = async () => {
        if (!selectedEmployee) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/employees/${selectedEmployee.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("ลบพนักงานสำเร็จ");
                setIsDeleteDialogOpen(false);
                setSelectedEmployee(null);
                fetchEmployees();
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditDialog = (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsDeleteDialogOpen(true);
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

    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch =
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.phone.includes(searchTerm);
        const matchesStatus =
            filterStatus === "all" ||
            (filterStatus === "active" && emp.isActive) ||
            (filterStatus === "inactive" && !emp.isActive);
        const matchesRole = filterRole === "all" || emp.role === filterRole;
        return matchesSearch && matchesStatus && matchesRole;
    });

    const activeCount = employees.filter((e) => e.isActive).length;
    const inactiveCount = employees.filter((e) => !e.isActive).length;

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "ADMIN":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            case "HR":
                return "bg-purple-500/10 text-purple-500 border-purple-500/20";
            case "MANAGER":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            default:
                return "bg-muted text-muted-foreground border-border";
        }
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">จัดการพนักงาน</h1>
                        <p className="text-muted-foreground">{employees.length} คน</p>
                    </div>
                    <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />เพิ่มพนักงาน</Button>
                    <AddEmployeeDialog
                        open={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                        stations={stations}
                        onSuccess={fetchEmployees}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus("all")}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Users className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{employees.length}</p>
                                    <p className="text-xs text-muted-foreground">ทั้งหมด</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus("active")}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                    <UserCheck className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                                    <p className="text-xs text-muted-foreground">ใช้งาน</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus("inactive")}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <UserX className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{inactiveCount}</p>
                                    <p className="text-xs text-muted-foreground">ปิดใช้งาน</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อ, รหัส หรือเบอร์โทร..." className="pl-10" />
                            </div>
                            <div className="flex gap-2">
                                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | "active" | "inactive")}>
                                    <SelectTrigger className="w-32">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                        <SelectItem value="active">ใช้งาน</SelectItem>
                                        <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={filterRole} onValueChange={setFilterRole}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="ตำแหน่ง" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทุกตำแหน่ง</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                        <SelectItem value="HR">HR</SelectItem>
                                        <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                                        <SelectItem value="EMPLOYEE">พนักงาน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Employee Table */}
                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filteredEmployees.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-muted-foreground">ไม่พบข้อมูลพนักงาน</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รหัส</TableHead>
                                    <TableHead>ชื่อ-นามสกุล</TableHead>
                                    <TableHead className="hidden sm:table-cell">เบอร์โทร</TableHead>
                                    <TableHead className="hidden md:table-cell">สถานี/แผนก</TableHead>
                                    <TableHead>ตำแหน่ง</TableHead>
                                    <TableHead className="hidden lg:table-cell">ค่าแรง</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.map((emp) => (
                                    <TableRow key={emp.id}>
                                        <TableCell className="font-medium">{emp.employeeId}</TableCell>
                                        <TableCell>{emp.name}</TableCell>
                                        <TableCell className="hidden sm:table-cell text-muted-foreground">{emp.phone}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground">
                                            {emp.station?.name || "-"}
                                            {emp.department && <span className="text-xs block">{emp.department.name}</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getRoleBadgeColor(emp.role)}>{emp.role}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                                            {emp.dailyRate ? `฿${emp.dailyRate}/วัน` : `฿${emp.hourlyRate}/ชม.`}
                                            <span className="text-xs block">OT x{emp.otRateMultiplier}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={emp.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                                                {emp.isActive ? "ใช้งาน" : "ปิด"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(emp)}><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog(emp)}><Trash2 className="w-4 h-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* Edit Dialog */}
            <EditEmployeeDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                employee={selectedEmployee}
                stations={stations}
                onSuccess={fetchEmployees}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบพนักงาน</AlertDialogTitle>
                        <AlertDialogDescription>
                            คุณต้องการลบ <span className="font-medium text-foreground">{selectedEmployee?.name}</span> ({selectedEmployee?.employeeId}) ใช่หรือไม่?<br />การดำเนินการนี้ไม่สามารถยกเลิกได้
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}ลบพนักงาน
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
