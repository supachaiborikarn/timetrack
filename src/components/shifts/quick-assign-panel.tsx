"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
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
import {
    Loader2,
    Calendar,
    Users,
    Zap,
    Check,
    X,
} from "lucide-react";
import { toast } from "sonner";

interface Employee {
    id: string;
    name: string;
    nickName: string | null;
    employeeId: string;
    department: string;
}

interface Shift {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
}

interface QuickAssignPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    shifts: Shift[];
    selectedMonth: number;
    selectedYear: number;
    onSuccess: () => void;
    preSelectedEmployees?: string[];
}

type PatternType = "same_all" | "weekday_weekend" | "custom";

interface WeekPattern {
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
    sun: string;
}

const dayLabels: Record<keyof WeekPattern, string> = {
    mon: "จันทร์",
    tue: "อังคาร",
    wed: "พุธ",
    thu: "พฤหัส",
    fri: "ศุกร์",
    sat: "เสาร์",
    sun: "อาทิตย์",
};

export function QuickAssignPanel({
    open,
    onOpenChange,
    employees,
    shifts,
    selectedMonth,
    selectedYear,
    onSuccess,
    preSelectedEmployees = [],
}: QuickAssignPanelProps) {
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(preSelectedEmployees);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [patternType, setPatternType] = useState<PatternType>("weekday_weekend");
    const [sameShiftId, setSameShiftId] = useState<string>("");
    const [weekdayShiftId, setWeekdayShiftId] = useState<string>("");
    const [weekendAction, setWeekendAction] = useState<string>("DAYOFF");
    const [customPattern, setCustomPattern] = useState<WeekPattern>({
        mon: "",
        tue: "",
        wed: "",
        thu: "",
        fri: "",
        sat: "DAYOFF",
        sun: "DAYOFF",
    });
    const [isApplying, setIsApplying] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Set default dates when opening
    useEffect(() => {
        if (open) {
            const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
            const lastDay = new Date(selectedYear, selectedMonth, 0);
            setStartDate(formatDateInput(firstDay));
            setEndDate(formatDateInput(lastDay));
            setSelectedEmployeeIds(preSelectedEmployees);
        }
    }, [open, selectedMonth, selectedYear, preSelectedEmployees]);

    const formatDateInput = (date: Date) => {
        return date.toISOString().split("T")[0];
    };

    const getShiftColor = (code: string) => {
        const colors: Record<string, string> = {
            A: "bg-blue-500",
            B: "bg-green-500",
            C: "bg-purple-500",
            D: "bg-orange-500",
            E: "bg-pink-500",
            F: "bg-cyan-500",
            G: "bg-yellow-500",
            H: "bg-red-400",
            DAYOFF: "bg-red-900",
        };
        return colors[code] || "bg-gray-500";
    };

    const toggleEmployee = (empId: string) => {
        setSelectedEmployeeIds((prev) =>
            prev.includes(empId)
                ? prev.filter((id) => id !== empId)
                : [...prev, empId]
        );
    };

    const selectAllEmployees = () => {
        setSelectedEmployeeIds(employees.map((e) => e.id));
    };

    const clearEmployees = () => {
        setSelectedEmployeeIds([]);
    };

    const filteredEmployees = employees.filter(
        (emp) =>
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.nickName && emp.nickName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const generateAssignments = () => {
        const assignments: { userId: string; date: string; shiftId: string; isDayOff: boolean }[] = [];

        if (!startDate || !endDate || selectedEmployeeIds.length === 0) {
            return assignments;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay(); // 0 = Sunday
            const dateStr = formatDateInput(new Date(d));

            let shiftId = "";
            let isDayOff = false;

            if (patternType === "same_all") {
                if (sameShiftId === "DAYOFF") {
                    isDayOff = true;
                    shiftId = shifts[0]?.id || "";
                } else {
                    shiftId = sameShiftId;
                }
            } else if (patternType === "weekday_weekend") {
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    // Weekend
                    if (weekendAction === "DAYOFF") {
                        isDayOff = true;
                        shiftId = shifts[0]?.id || "";
                    } else if (weekendAction === "SKIP") {
                        continue; // Skip this day
                    } else {
                        shiftId = weekendAction;
                    }
                } else {
                    // Weekday
                    if (weekdayShiftId === "DAYOFF") {
                        isDayOff = true;
                        shiftId = shifts[0]?.id || "";
                    } else {
                        shiftId = weekdayShiftId;
                    }
                }
            } else if (patternType === "custom") {
                const dayKeys: (keyof WeekPattern)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                const patternValue = customPattern[dayKeys[dayOfWeek]];

                if (!patternValue || patternValue === "SKIP") {
                    continue;
                } else if (patternValue === "DAYOFF") {
                    isDayOff = true;
                    shiftId = shifts[0]?.id || "";
                } else {
                    shiftId = patternValue;
                }
            }

            if (shiftId) {
                selectedEmployeeIds.forEach((userId) => {
                    assignments.push({ userId, date: dateStr, shiftId, isDayOff });
                });
            }
        }

        return assignments;
    };

    const handleApply = async () => {
        const assignments = generateAssignments();

        if (assignments.length === 0) {
            toast.error("ไม่มีข้อมูลที่จะบันทึก กรุณาตรวจสอบการตั้งค่า");
            return;
        }

        setIsApplying(true);
        try {
            const res = await fetch("/api/admin/schedule/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "assign",
                    assignments,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || `บันทึก ${assignments.length} รายการสำเร็จ`);
                onOpenChange(false);
                onSuccess();
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsApplying(false);
        }
    };

    const previewCount = generateAssignments().length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        จัดกะเร็ว
                    </SheetTitle>
                    <SheetDescription>
                        กำหนดกะให้พนักงานหลายคนพร้อมกัน
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    {/* Step 1: Select Employees */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                1. เลือกพนักงาน
                            </Label>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={selectAllEmployees}>
                                    เลือกทั้งหมด
                                </Button>
                                <Button variant="ghost" size="sm" onClick={clearEmployees}>
                                    ล้าง
                                </Button>
                            </div>
                        </div>

                        <Input
                            placeholder="ค้นหาชื่อหรือรหัส..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <div className="border rounded-lg max-h-40 overflow-y-auto">
                            {filteredEmployees.map((emp) => (
                                <div
                                    key={emp.id}
                                    className={`flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer ${selectedEmployeeIds.includes(emp.id) ? "bg-blue-500/10" : ""
                                        }`}
                                    onClick={() => toggleEmployee(emp.id)}
                                >
                                    <Checkbox
                                        checked={selectedEmployeeIds.includes(emp.id)}
                                        onCheckedChange={() => toggleEmployee(emp.id)}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {emp.name}
                                            {emp.nickName && (
                                                <span className="text-muted-foreground ml-1">({emp.nickName})</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedEmployeeIds.length > 0 && (
                            <p className="text-sm text-blue-500">
                                เลือกแล้ว {selectedEmployeeIds.length} คน
                            </p>
                        )}
                    </div>

                    {/* Step 2: Select Date Range */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            2. เลือกช่วงวันที่
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">จากวันที่</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">ถึงวันที่</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Select Pattern */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">3. รูปแบบการจัดกะ</Label>

                        <Tabs value={patternType} onValueChange={(v) => setPatternType(v as PatternType)}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="weekday_weekend">วันธรรมดา/วันหยุด</TabsTrigger>
                                <TabsTrigger value="same_all">ทุกวันเหมือนกัน</TabsTrigger>
                                <TabsTrigger value="custom">กำหนดเอง</TabsTrigger>
                            </TabsList>

                            <TabsContent value="weekday_weekend" className="space-y-3 mt-3">
                                <div>
                                    <Label className="text-xs">จันทร์ - ศุกร์</Label>
                                    <Select value={weekdayShiftId} onValueChange={setWeekdayShiftId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกกะ" />
                                        </SelectTrigger>
                                        <SelectContent>
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
                                <div>
                                    <Label className="text-xs">เสาร์ - อาทิตย์</Label>
                                    <Select value={weekendAction} onValueChange={setWeekendAction}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือก" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DAYOFF">
                                                <span className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded bg-red-900" />
                                                    วันหยุด (X)
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="SKIP">ข้าม (ไม่กำหนด)</SelectItem>
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
                            </TabsContent>

                            <TabsContent value="same_all" className="mt-3">
                                <div>
                                    <Label className="text-xs">ทุกวันใช้กะ</Label>
                                    <Select value={sameShiftId} onValueChange={setSameShiftId}>
                                        <SelectTrigger>
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
                            </TabsContent>

                            <TabsContent value="custom" className="mt-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(dayLabels) as (keyof WeekPattern)[]).map((day) => (
                                        <div key={day} className="flex items-center gap-2">
                                            <span className="w-12 text-xs">{dayLabels[day]}</span>
                                            <Select
                                                value={customPattern[day]}
                                                onValueChange={(v) =>
                                                    setCustomPattern((prev) => ({ ...prev, [day]: v }))
                                                }
                                            >
                                                <SelectTrigger className="flex-1 h-8">
                                                    <SelectValue placeholder="-" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SKIP">ข้าม</SelectItem>
                                                    <SelectItem value="DAYOFF">หยุด (X)</SelectItem>
                                                    {shifts.map((shift) => (
                                                        <SelectItem key={shift.id} value={shift.id}>
                                                            {shift.code}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Preview */}
                    {previewCount > 0 && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <p className="text-green-600 text-sm">
                                <Check className="w-4 h-4 inline mr-1" />
                                จะสร้าง {previewCount} รายการ
                            </p>
                        </div>
                    )}
                </div>

                <SheetFooter className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1"
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={isApplying || previewCount === 0}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                        {isApplying ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4 mr-2" />
                                จัดกะ {previewCount} รายการ
                            </>
                        )}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
