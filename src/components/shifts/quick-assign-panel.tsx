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
    SheetClose,
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
    Search,
    Clock,
    CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

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

type PatternType = "weekday_weekend" | "same_all" | "custom";

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
            // Only overwrite if we have pre-selections passed in, otherwise keep current selection if user re-opens
            if (preSelectedEmployees.length > 0) {
                setSelectedEmployeeIds(preSelectedEmployees);
            }
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
                    shiftId = shifts[0]?.id || ""; // Assign a dummy ID for DB constraints if needed, or handle in API
                } else if (sameShiftId) {
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
                    } else if (weekendAction) {
                        shiftId = weekendAction;
                    }
                } else {
                    // Weekday
                    if (weekdayShiftId === "DAYOFF") {
                        isDayOff = true;
                        shiftId = shifts[0]?.id || "";
                    } else if (weekdayShiftId) {
                        shiftId = weekdayShiftId;
                    }
                }
            } else if (patternType === "custom") {
                const dayKeys: (keyof WeekPattern)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                const patternValue = customPattern[dayKeys[dayOfWeek]];

                if (patternValue === "SKIP" || !patternValue) {
                    continue;
                } else if (patternValue === "DAYOFF") {
                    isDayOff = true;
                    shiftId = shifts[0]?.id || "";
                } else {
                    shiftId = patternValue;
                }
            }

            // Only push if we determined a valid action (shift or dayoff)
            if (shiftId || isDayOff) {
                // Determine a fallback shiftId if isDayOff is true but we have no shiftId selected. 
                // Usually for dayoff we might need a valid shiftId relation or it can be null depending on schema. 
                // Based on previous code: shiftId = shifts[0]?.id || "" for dayoff.
                const finalShiftId = shiftId || (shifts[0]?.id || "");

                selectedEmployeeIds.forEach((userId) => {
                    assignments.push({ userId, date: dateStr, shiftId: finalShiftId, isDayOff });
                });
            }
        }

        return assignments;
    };

    const handleApply = async () => {
        const assignments = generateAssignments();

        if (assignments.length === 0) {
            toast.error("กรุณาเลือกพนักงาน ช่วงวันที่ และรูปแบบกะให้ครบถ้วน");
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
                toast.success(`บันทึกสำเร็จ`, {
                    description: `สร้างรายการกะทั้งหมด ${assignments.length} รายการ`
                });
                onOpenChange(false);
                onSuccess();
            } else {
                const data = await res.json();
                toast.error("เกิดข้อผิดพลาด", {
                    description: data.error
                });
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
            <SheetContent className="sm:max-w-xl p-0 gap-0 bg-slate-950 border-slate-800 text-slate-100 shadow-2xl overflow-hidden flex flex-col">
                <SheetHeader className="px-6 py-5 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Zap className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <SheetTitle className="text-lg font-bold text-white">จัดกะเร็ว</SheetTitle>
                                <SheetDescription className="text-slate-400 text-xs">
                                    กำหนดกะให้พนักงานหลายคนพร้อมกันในครั้งเดียว
                                </SheetDescription>
                            </div>
                        </div>
                        <SheetClose className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </SheetClose>
                    </div>
                </SheetHeader>

                <div className="flex-1 px-6 py-6 overflow-y-auto">
                    <div className="space-y-8 max-w-lg mx-auto">

                        {/* Step 1: Employee Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-200">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">1</div>
                                    <h3 className="font-semibold text-sm">เลือกพนักงาน</h3>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={selectAllEmployees} className="text-xs h-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50">
                                        เลือกทั้งหมด
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={clearEmployees} className="text-xs h-7 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50">
                                        ล้าง
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <Input
                                        placeholder="ค้นหาชื่อหรือรหัส..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 bg-slate-900/50 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500/50"
                                    />
                                </div>

                                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30 h-[200px]">
                                    <div className="h-full overflow-y-auto">
                                        <div className="p-1 space-y-1">
                                            {filteredEmployees.map((emp) => {
                                                const isSelected = selectedEmployeeIds.includes(emp.id);
                                                return (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => toggleEmployee(emp.id)}
                                                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all border border-transparent
                                                            ${isSelected
                                                                ? "bg-indigo-500/10 border-indigo-500/20"
                                                                : "hover:bg-slate-800/50 hover:border-slate-800"
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                                            ${isSelected
                                                                ? "bg-indigo-500 border-indigo-500 text-white"
                                                                : "border-slate-600 bg-transparent"
                                                            }`}>
                                                            {isSelected && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-sm font-medium truncate ${isSelected ? "text-indigo-200" : "text-slate-300"}`}>
                                                                {emp.name} {emp.nickName && <span className="text-slate-500">({emp.nickName})</span>}
                                                            </div>
                                                            <div className="text-xs text-slate-600 truncate">{emp.employeeId} · {emp.department}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {filteredEmployees.length === 0 && (
                                                <div className="text-center py-8 text-slate-600 text-sm">ไม่พบพนักงาน</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 text-right">
                                    เลือกแล้ว <span className="text-indigo-400 font-medium">{selectedEmployeeIds.length}</span> คน
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-800/50" />

                        {/* Step 2: Date Range */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-200">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">2</div>
                                <h3 className="font-semibold text-sm">เลือกช่วงวันที่</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">จากวันที่</Label>
                                    <div className="relative">
                                        <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="pl-9 bg-slate-900/50 border-slate-800 text-slate-200 focus-visible:ring-indigo-500/50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">ถึงวันที่</Label>
                                    <div className="relative">
                                        <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="pl-9 bg-slate-900/50 border-slate-800 text-slate-200 focus-visible:ring-indigo-500/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-800/50" />

                        {/* Step 3: Pattern */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-200">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">3</div>
                                <h3 className="font-semibold text-sm">รูปแบบการจัดกะ</h3>
                            </div>

                            <Tabs value={patternType} onValueChange={(v) => setPatternType(v as PatternType)} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 bg-slate-900 border border-slate-800 p-1 rounded-lg h-auto">
                                    <TabsTrigger value="weekday_weekend" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 py-2 text-xs">วันธรรมดา/วันหยุด</TabsTrigger>
                                    <TabsTrigger value="same_all" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 py-2 text-xs">เหมือนกันทุกวัน</TabsTrigger>
                                    <TabsTrigger value="custom" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 py-2 text-xs">กำหนดเอง</TabsTrigger>
                                </TabsList>

                                <div className="mt-4 bg-slate-900/30 border border-slate-800 rounded-lg p-4">
                                    <TabsContent value="weekday_weekend" className="mt-0 space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-400">จันทร์ - ศุกร์</Label>
                                            <Select value={weekdayShiftId} onValueChange={setWeekdayShiftId}>
                                                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                                                    <SelectValue placeholder="เลือกกะ" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                    {shifts.map((shift) => (
                                                        <SelectItem key={shift.id} value={shift.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${getShiftColor(shift.code)}`} />
                                                                <span>{shift.code}: {shift.startTime} - {shift.endTime}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-400">เสาร์ - อาทิตย์</Label>
                                            <Select value={weekendAction} onValueChange={setWeekendAction}>
                                                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                                                    <SelectValue placeholder="เลือก" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                    <SelectItem value="DAYOFF">
                                                        <div className="flex items-center gap-2 text-red-300">
                                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                                            <span>วันหยุด (X)</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="SKIP">
                                                        <span className="text-slate-400">เว้นว่าง (ไม่กำหนด)</span>
                                                    </SelectItem>
                                                    {shifts.map((shift) => (
                                                        <SelectItem key={shift.id} value={shift.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${getShiftColor(shift.code)}`} />
                                                                <span>{shift.code}: {shift.startTime} - {shift.endTime}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="same_all" className="mt-0">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-400">ทุกวันใช้กะ</Label>
                                            <Select value={sameShiftId} onValueChange={setSameShiftId}>
                                                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                                                    <SelectValue placeholder="เลือกกะ" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                    <SelectItem value="DAYOFF">
                                                        <div className="flex items-center gap-2 text-red-300">
                                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                                            <span>วันหยุด (X)</span>
                                                        </div>
                                                    </SelectItem>
                                                    {shifts.map((shift) => (
                                                        <SelectItem key={shift.id} value={shift.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${getShiftColor(shift.code)}`} />
                                                                <span>{shift.code}: {shift.startTime} - {shift.endTime}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="custom" className="mt-0">
                                        <div className="grid grid-cols-2 gap-3">
                                            {(Object.keys(dayLabels) as (keyof WeekPattern)[]).map((day) => (
                                                <div key={day} className="space-y-1">
                                                    <Label className="text-[10px] uppercase text-slate-500 font-semibold">{dayLabels[day]}</Label>
                                                    <Select
                                                        value={customPattern[day]}
                                                        onValueChange={(v) =>
                                                            setCustomPattern((prev) => ({ ...prev, [day]: v }))
                                                        }
                                                    >
                                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs">
                                                            <SelectValue placeholder="-" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                            <SelectItem value="SKIP">เว้นว่าง</SelectItem>
                                                            <SelectItem value="DAYOFF">วันหยุด (X)</SelectItem>
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
                                </div>
                            </Tabs>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-10 w-full">
                    <div className="flex items-center gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={isApplying || previewCount === 0}
                            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-900/20"
                        >
                            {isApplying ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-2 text-yellow-300" />
                                    จัดกะ {previewCount} รายการ
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
