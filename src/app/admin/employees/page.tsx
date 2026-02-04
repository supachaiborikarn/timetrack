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

import { AddEmployeeDialog, EditEmployeeDialog } from "@/components/employees/employee-dialogs";
import { BulkActionBar } from "@/components/admin/BulkActionBar";

// Interfaces
interface Employee {
    id: string;
    employeeId: string;
    name: string;
    nickName: string | null;
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
    // Bank info
    bankAccountNumber: string | null;
    bankName: string | null;
    // Social security

    // Remote fields (merged)
    registeredStation: { id: string; name: string } | null;
    isSocialSecurityRegistered: boolean;
    socialSecurityNumber: string | null;
}

interface Station {
    id: string;
    name: string;
    departments: { id: string; name: string }[];
}

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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

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
        setDeleteConfirmation("");
        setIsDeleteDialogOpen(true);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredEmployees.map((e) => e.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter((sid) => sid !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            const res = await fetch("/api/admin/employees", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`ลบพนักงานสำเร็จ ${data.count} คน`);
                setIsBulkDeleteDialogOpen(false);
                setSelectedIds([]);
                fetchEmployees();
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !session.user || !["ADMIN", "HR"].includes(session.user.role)) {
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

    const getRoleNameTh = (role: string) => {
        switch (role) {
            case "ADMIN": return "ผู้ดูแลระบบ";
            case "HR": return "ฝ่ายบุคคล (HR)";
            case "MANAGER": return "ผู้จัดการ";
            case "CASHIER": return "เสมียน";
            case "EMPLOYEE": return "พนักงาน";
            default: return role;
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
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <BulkActionBar
                                selectedIds={selectedIds}
                                stations={stations}
                                onSuccess={fetchEmployees}
                                onClearSelection={() => setSelectedIds([])}
                            />
                        )}
                        {selectedIds.length > 0 && (
                            <Button variant="destructive" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                ลบ {selectedIds.length} รายการ
                            </Button>
                        )}
                        <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />เพิ่มพนักงาน</Button>
                    </div>
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
                                        <SelectItem value="ADMIN">ผู้ดูแลระบบ</SelectItem>
                                        <SelectItem value="HR">ฝ่ายบุคคล (HR)</SelectItem>
                                        <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                                        <SelectItem value="CASHIER">เสมียน</SelectItem>
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
                                    <TableHead className="w-[40px]">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </TableHead>
                                    <TableHead>รหัส</TableHead>
                                    <TableHead>ชื่อ-นามสกุล / ชื่อเล่น</TableHead>
                                    <TableHead className="hidden sm:table-cell">เบอร์โทร</TableHead>
                                    <TableHead className="hidden md:table-cell">สถานี/แผนก</TableHead>
                                    <TableHead>ตำแหน่ง</TableHead>
                                    <TableHead className="hidden lg:table-cell">ค่าแรง</TableHead>
                                    <TableHead>ประกันสังคม</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.map((emp) => (
                                    <TableRow key={emp.id} className={selectedIds.includes(emp.id) ? "bg-muted/50" : ""}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={selectedIds.includes(emp.id)}
                                                onChange={(e) => handleSelectOne(emp.id, e.target.checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{emp.employeeId}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{emp.name}</span>
                                                {emp.nickName && <span className="text-sm text-muted-foreground">({emp.nickName})</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-muted-foreground">{emp.phone}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground">
                                            <div>
                                                {emp.station?.name || "-"}
                                                {emp.department && <span className="text-xs block">{emp.department.name}</span>}
                                            </div>
                                            {emp.registeredStation && emp.registeredStation.id !== emp.station?.id && (
                                                <div className="text-xs text-orange-500/80 mt-1" title="สถานีที่ขึ้นทะเบียน">
                                                    ® {emp.registeredStation.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <Badge variant="outline" className={getRoleBadgeColor(emp.role)}>{getRoleNameTh(emp.role)}</Badge>

                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                                            <div className="flex flex-col gap-0.5">
                                                <span>{emp.dailyRate ? `฿${emp.dailyRate}/วัน` : (emp.baseSalary ? `฿${emp.baseSalary.toLocaleString()}/ด.` : `฿${emp.hourlyRate}/ชม.`)}</span>
                                                <span className="text-xs">OT x{emp.otRateMultiplier}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {emp.isSocialSecurityRegistered ? (
                                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                    มี ({emp.socialSecurityNumber})
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
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
                        <AlertDialogTitle className="text-destructive">⚠️ ยืนยันการลบพนักงานถาวร</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p>
                                    คุณกำลังจะลบ <span className="font-bold text-foreground">{selectedEmployee?.name}</span> ({selectedEmployee?.employeeId}) ออกจากระบบ
                                </p>
                                <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3 text-sm">
                                    <strong>⚠️ คำเตือน:</strong> การลบนี้เป็นการลบถาวร ข้อมูลจะถูกลบออกจากฐานข้อมูลทันทีและไม่สามารถกู้คืนได้
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="delete-confirm">พิมพ์ <span className="font-bold text-destructive">ลบ</span> เพื่อยืนยัน:</Label>
                                    <Input
                                        id="delete-confirm"
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        placeholder="พิมพ์ 'ลบ' เพื่อยืนยัน"
                                        className="border-destructive/50 focus:border-destructive"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting || deleteConfirmation !== "ลบ"}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}ลบพนักงานถาวร
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation */}
            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบพนักงานหลายรายการ</AlertDialogTitle>
                        <AlertDialogDescription>
                            คุณต้องการลบพนักงานที่เลือกจำนวน <span className="font-medium text-foreground">{selectedIds.length}</span> รายการใช่หรือไม่?<br />การดำเนินการนี้ไม่สามารถยกเลิกได้
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90" disabled={isBulkDeleting}>
                            {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}ลบ {selectedIds.length} รายการ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
