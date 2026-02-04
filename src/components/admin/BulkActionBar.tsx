"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { ChevronDown, Building2, UserCheck, UserX, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Station {
    id: string;
    name: string;
    departments?: { id: string; name: string }[];
}

interface BulkActionBarProps {
    selectedIds: string[];
    stations: Station[];
    onSuccess: () => void;
    onClearSelection: () => void;
}

type BulkAction = "assign-station" | "change-status" | "change-role";

export function BulkActionBar({
    selectedIds,
    stations,
    onSuccess,
    onClearSelection
}: BulkActionBarProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentAction, setCurrentAction] = useState<BulkAction | null>(null);
    const [selectedValue, setSelectedValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    if (selectedIds.length === 0) return null;

    const openAction = (action: BulkAction) => {
        setCurrentAction(action);
        setSelectedValue("");
        setIsDialogOpen(true);
    };

    const handleExecute = async () => {
        if (!currentAction || !selectedValue) return;

        setIsLoading(true);
        try {
            let actionData: Record<string, unknown> = {};

            switch (currentAction) {
                case "assign-station":
                    actionData = { stationId: selectedValue };
                    break;
                case "change-status":
                    actionData = { isActive: selectedValue === "active" };
                    break;
                case "change-role":
                    actionData = { role: selectedValue };
                    break;
            }

            const res = await fetch("/api/admin/employees/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: currentAction,
                    ids: selectedIds,
                    data: actionData,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || `อัปเดต ${data.count} รายการสำเร็จ`);
                setIsDialogOpen(false);
                onClearSelection();
                onSuccess();
            } else {
                const error = await res.json();
                toast.error(error.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsLoading(false);
        }
    };

    const getDialogContent = () => {
        switch (currentAction) {
            case "assign-station":
                return {
                    title: "เปลี่ยนสถานี",
                    description: `เลือกสถานีใหม่สำหรับพนักงาน ${selectedIds.length} คน`,
                    content: (
                        <Select value={selectedValue} onValueChange={setSelectedValue}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกสถานี" />
                            </SelectTrigger>
                            <SelectContent>
                                {stations.map((station) => (
                                    <SelectItem key={station.id} value={station.id}>
                                        {station.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ),
                };
            case "change-status":
                return {
                    title: "เปลี่ยนสถานะ",
                    description: `เลือกสถานะใหม่สำหรับพนักงาน ${selectedIds.length} คน`,
                    content: (
                        <Select value={selectedValue} onValueChange={setSelectedValue}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกสถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">ใช้งาน</SelectItem>
                                <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                            </SelectContent>
                        </Select>
                    ),
                };
            case "change-role":
                return {
                    title: "เปลี่ยนตำแหน่ง",
                    description: `เลือกตำแหน่งใหม่สำหรับพนักงาน ${selectedIds.length} คน`,
                    content: (
                        <Select value={selectedValue} onValueChange={setSelectedValue}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกตำแหน่ง" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EMPLOYEE">พนักงาน</SelectItem>
                                <SelectItem value="CASHIER">เสมียน</SelectItem>
                                <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                                <SelectItem value="HR">ฝ่ายบุคคล (HR)</SelectItem>
                                <SelectItem value="ADMIN">ผู้ดูแลระบบ</SelectItem>
                            </SelectContent>
                        </Select>
                    ),
                };
            default:
                return { title: "", description: "", content: null };
        }
    };

    const dialogContent = getDialogContent();

    return (
        <>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                <span className="text-sm font-medium text-primary">
                    เลือก {selectedIds.length} รายการ
                </span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                            ดำเนินการ <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openAction("assign-station")}>
                            <Building2 className="w-4 h-4 mr-2" />
                            เปลี่ยนสถานี
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAction("change-status")}>
                            <UserCheck className="w-4 h-4 mr-2" />
                            เปลี่ยนสถานะ
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAction("change-role")}>
                            <Shield className="w-4 h-4 mr-2" />
                            เปลี่ยนตำแหน่ง
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="ghost" onClick={onClearSelection}>
                    ยกเลิก
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogContent.title}</DialogTitle>
                        <DialogDescription>{dialogContent.description}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">{dialogContent.content}</div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleExecute} disabled={!selectedValue || isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            ยืนยัน
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
