"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
    Loader2,
    Pencil,
    Trash2,
    Building2,
    Users,
    Plus,
    FolderKanban,
} from "lucide-react";
import { toast } from "sonner";

interface Department {
    id: string;
    name: string;
    code: string;
    stationId: string;
    stationName: string;
    stationCode: string;
    isFrontYard: boolean;
    weeklyDayOff: number | null;
    employeeCount: number;
}

interface Station {
    id: string;
    name: string;
    code: string;
}

export default function DepartmentsPage() {
    const { data: session, status } = useSession();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        stationId: "",
        isFrontYard: false,
    });

    useEffect(() => {
        if (session?.user?.id) {
            fetchData();
        }
    }, [session?.user?.id]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [deptRes, stationRes] = await Promise.all([
                fetch("/api/admin/departments"),
                fetch("/api/admin/stations"),
            ]);

            if (deptRes.ok) {
                const data = await deptRes.json();
                setDepartments(data.departments || []);
            }

            if (stationRes.ok) {
                const data = await stationRes.json();
                setStations(data.stations || []);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingDepartment(null);
        setFormData({
            name: "",
            code: "",
            stationId: stations[0]?.id || "",
            isFrontYard: false,
        });
        setDialogOpen(true);
    };

    const openEditDialog = (department: Department) => {
        setEditingDepartment(department);
        setFormData({
            name: department.name,
            code: department.code,
            stationId: department.stationId,
            isFrontYard: department.isFrontYard,
        });
        setDialogOpen(true);
    };

    const openDeleteDialog = (department: Department) => {
        setDeletingDepartment(department);
        setDeleteDialogOpen(true);
    };

    const handleSave = async () => {
        const isCreating = !editingDepartment;

        if (!formData.name || !formData.code || !formData.stationId) {
            toast.error("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/departments", {
                method: isCreating ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(editingDepartment && { id: editingDepartment.id }),
                    ...formData,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "บันทึกสำเร็จ");
                setDialogOpen(false);
                fetchData();
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
        if (!deletingDepartment) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/departments?id=${deletingDepartment.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "ลบสำเร็จ");
                setDeleteDialogOpen(false);
                fetchData();
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
                    <h1 className="text-2xl font-bold text-foreground">แผนก</h1>
                    <p className="text-muted-foreground">จัดการแผนกในแต่ละสถานี</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มแผนก
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <FolderKanban className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{departments.length}</p>
                            <p className="text-xs text-muted-foreground">แผนกทั้งหมด</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stations.length}</p>
                            <p className="text-xs text-muted-foreground">สถานีทั้งหมด</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {departments.reduce((sum, d) => sum + d.employeeCount, 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">พนักงานทั้งหมด</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <CardHeader>
                    <CardTitle>รายการแผนก</CardTitle>
                </CardHeader>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">รหัส</TableHead>
                                <TableHead>ชื่อแผนก</TableHead>
                                <TableHead>สถานี</TableHead>
                                <TableHead className="text-center">หน้าลาน</TableHead>
                                <TableHead className="text-center">พนักงาน</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {departments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                        ยังไม่มีแผนก
                                    </TableCell>
                                </TableRow>
                            ) : (
                                departments.map((dept) => (
                                    <TableRow key={dept.id}>
                                        <TableCell>
                                            <Badge className="bg-blue-500 text-white">{dept.code}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{dept.name}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{dept.stationName}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {dept.isFrontYard ? (
                                                <Badge className="bg-green-500/10 text-green-500">ใช่</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">{dept.employeeCount}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(dept)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => openDeleteDialog(dept)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
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
                            {editingDepartment ? `แก้ไขแผนก: ${editingDepartment.name}` : "เพิ่มแผนกใหม่"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>สถานี</Label>
                            <Select
                                value={formData.stationId}
                                onValueChange={(value) => setFormData({ ...formData, stationId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกสถานี" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stations.map((station) => (
                                        <SelectItem key={station.id} value={station.id}>
                                            {station.name} ({station.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>รหัสแผนก</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="เช่น FY, COFFEE"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ชื่อแผนก</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="เช่น หน้าลาน"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isFrontYard"
                                checked={formData.isFrontYard}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isFrontYard: checked as boolean })
                                }
                            />
                            <label
                                htmlFor="isFrontYard"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                เป็นแผนกหน้าลาน (คิดเงินเดือนรอบ 26-25)
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
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
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>ยืนยันการลบแผนก</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                        คุณต้องการลบแผนก <strong>{deletingDepartment?.name}</strong> ใช่หรือไม่?
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
