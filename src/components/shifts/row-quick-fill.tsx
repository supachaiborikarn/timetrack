"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import {
    Calendar,
    CalendarDays,
    Copy,
    Trash2,
    ChevronDown,
    Loader2,
    User,
    FileText,
} from "lucide-react";
import { toast } from "sonner";

interface Employee {
    id: string;
    name: string;
    nickName: string | null;
    employeeId: string;
    department: string;
    schedule: Record<string, { shiftId: string; shiftCode: string; isDayOff: boolean } | null>;
}

interface Shift {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
}

interface RowQuickFillProps {
    employee: Employee;
    allEmployees: Employee[];
    shifts: Shift[];
    selectedMonth: number;
    selectedYear: number;
    daysInMonth: number;
    onSuccess: () => void;
}

export function RowQuickFill({
    employee,
    allEmployees,
    shifts,
    selectedMonth,
    selectedYear,
    daysInMonth,
    onSuccess,
}: RowQuickFillProps) {
    const [isApplying, setIsApplying] = useState(false);
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string>("");
    const [fillDialogOpen, setFillDialogOpen] = useState(false);
    const [fillShiftId, setFillShiftId] = useState<string>("");
    const [fillType, setFillType] = useState<"week" | "month">("week");

    const getWeekDates = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: monday, end: sunday };
    };

    const formatDateStr = (date: Date) => {
        return date.toISOString().split("T")[0];
    };

    const handleFillShift = async () => {
        if (!fillShiftId) return;
        setIsApplying(true);

        try {
            const assignments: { userId: string; date: string; shiftId: string; isDayOff: boolean }[] = [];
            const isDayOff = fillShiftId === "DAYOFF";
            const shiftId = isDayOff ? shifts[0]?.id : fillShiftId;

            if (fillType === "week") {
                const { start, end } = getWeekDates();
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    // Only add if date is in current month view
                    if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear) {
                        assignments.push({
                            userId: employee.id,
                            date: formatDateStr(d),
                            shiftId,
                            isDayOff,
                        });
                    }
                }
            } else {
                // Fill entire month
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(selectedYear, selectedMonth - 1, day);
                    assignments.push({
                        userId: employee.id,
                        date: formatDateStr(date),
                        shiftId,
                        isDayOff,
                    });
                }
            }

            if (assignments.length === 0) {
                toast.error("ไม่มีวันที่จะกำหนด");
                return;
            }

            const res = await fetch("/api/admin/schedule/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "assign", assignments }),
            });

            if (res.ok) {
                toast.success(`กำหนดกะ ${assignments.length} วันสำเร็จ`);
                setFillDialogOpen(false);
                onSuccess();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsApplying(false);
        }
    };

    const handleCopyFromEmployee = async () => {
        if (!selectedSourceId) return;
        setIsApplying(true);

        try {
            const sourceEmployee = allEmployees.find((e) => e.id === selectedSourceId);
            if (!sourceEmployee) {
                toast.error("ไม่พบพนักงานต้นทาง");
                return;
            }

            const assignments: { userId: string; date: string; shiftId: string; isDayOff: boolean }[] = [];

            // Copy all assignments from source employee
            Object.entries(sourceEmployee.schedule).forEach(([dateKey, assignment]) => {
                if (assignment) {
                    assignments.push({
                        userId: employee.id,
                        date: dateKey,
                        shiftId: assignment.shiftId,
                        isDayOff: assignment.isDayOff,
                    });
                }
            });

            if (assignments.length === 0) {
                toast.error("พนักงานต้นทางไม่มีกะในเดือนนี้");
                return;
            }

            const res = await fetch("/api/admin/schedule/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "assign", assignments }),
            });

            if (res.ok) {
                toast.success(`คัดลอก ${assignments.length} วันสำเร็จ`);
                setCopyDialogOpen(false);
                onSuccess();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsApplying(false);
        }
    };

    const handleClearMonth = async () => {
        setIsApplying(true);

        try {
            const toDelete: { userId: string; date: string }[] = [];

            Object.keys(employee.schedule).forEach((dateKey) => {
                if (employee.schedule[dateKey]) {
                    toDelete.push({ userId: employee.id, date: dateKey });
                }
            });

            if (toDelete.length === 0) {
                toast.info("ไม่มีกะที่จะลบ");
                return;
            }

            const res = await fetch("/api/admin/schedule", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignments: toDelete }),
            });

            if (res.ok) {
                toast.success(`ลบ ${toDelete.length} รายการสำเร็จ`);
                onSuccess();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsApplying(false);
        }
    };

    const getShiftColor = (code: string) => {
        const colors: Record<string, string> = {
            A: "bg-blue-500",
            B: "bg-green-500",
            C: "bg-purple-500",
            D: "bg-orange-500",
            DAYOFF: "bg-red-900",
        };
        return colors[code] || "bg-gray-500";
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                        <div className="flex items-center gap-1">
                            <div>
                                <p className="text-sm font-medium">{employee.name}</p>
                                <p className="text-xs text-slate-500">{employee.employeeId}</p>
                            </div>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </div>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem
                        onClick={() => {
                            setFillType("week");
                            setFillShiftId("");
                            setFillDialogOpen(true);
                        }}
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        กำหนดกะสัปดาห์นี้
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            setFillType("month");
                            setFillShiftId("");
                            setFillDialogOpen(true);
                        }}
                    >
                        <CalendarDays className="w-4 h-4 mr-2" />
                        กำหนดกะทั้งเดือน
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => {
                            setSelectedSourceId("");
                            setCopyDialogOpen(true);
                        }}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        คัดลอกจากพนักงานอื่น
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={handleClearMonth}
                        disabled={isApplying}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        ลบกะทั้งเดือน
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Fill Shift Dialog */}
            <Dialog open={fillDialogOpen} onOpenChange={setFillDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            กำหนดกะ{fillType === "week" ? "สัปดาห์นี้" : "ทั้งเดือน"} - {employee.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>เลือกกะ</Label>
                        <Select value={fillShiftId} onValueChange={setFillShiftId}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="เลือกกะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DAYOFF">
                                    <span className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded bg-red-900" />
                                        วันหยุด (X)
                                    </span>
                                </SelectItem>
                                {shifts.map((shift) => (
                                    <SelectItem key={shift.id} value={shift.id}>
                                        <span className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded ${getShiftColor(shift.code)}`} />
                                            {shift.code}: {shift.startTime}-{shift.endTime}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFillDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleFillShift} disabled={!fillShiftId || isApplying}>
                            {isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            กำหนดกะ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Copy From Employee Dialog */}
            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            <Copy className="w-5 h-5 inline mr-2" />
                            คัดลอกกะจากพนักงานอื่น
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>เลือกพนักงานต้นทาง</Label>
                        <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="เลือกพนักงาน" />
                            </SelectTrigger>
                            <SelectContent>
                                {allEmployees
                                    .filter((e) => e.id !== employee.id)
                                    .map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            <span className="flex items-center gap-2">
                                                <User className="w-3 h-3" />
                                                {emp.name}
                                                {emp.nickName && ` (${emp.nickName})`}
                                            </span>
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                            ตารางกะของพนักงานที่เลือกจะถูกคัดลอกมาแทนที่ตารางกะเดิม
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleCopyFromEmployee} disabled={!selectedSourceId || isApplying}>
                            {isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            คัดลอก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
