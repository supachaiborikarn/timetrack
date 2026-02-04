"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    Plus,
    Trash2,
    FileText,
    Save,
    Edit2,
    Check,
} from "lucide-react";
import { toast } from "sonner";

interface Shift {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
}

interface Template {
    id: string;
    name: string;
    pattern: WeekPattern;
    createdAt: string;
}

interface WeekPattern {
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
    sun: string;
}

interface ShiftTemplateManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shifts: Shift[];
    onApplyTemplate?: (pattern: WeekPattern) => void;
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

const STORAGE_KEY = "shift-templates";

const defaultPattern: WeekPattern = {
    mon: "",
    tue: "",
    wed: "",
    thu: "",
    fri: "",
    sat: "DAYOFF",
    sun: "DAYOFF",
};

export function ShiftTemplateManager({
    open,
    onOpenChange,
    shifts,
    onApplyTemplate,
}: ShiftTemplateManagerProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newPattern, setNewPattern] = useState<WeekPattern>(defaultPattern);

    // Load templates from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    setTemplates(JSON.parse(saved));
                } catch {
                    console.error("Failed to parse templates");
                }
            }
        }
    }, [open]);

    // Save templates to localStorage
    const saveTemplates = (newTemplates: Template[]) => {
        setTemplates(newTemplates);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
    };

    const getShiftColor = (code: string) => {
        const colors: Record<string, string> = {
            A: "bg-blue-500",
            B: "bg-green-500",
            C: "bg-purple-500",
            D: "bg-orange-500",
            E: "bg-pink-500",
            DAYOFF: "bg-red-900",
        };
        return colors[code] || "bg-gray-500";
    };

    const getShiftCodeById = (shiftId: string): string => {
        if (shiftId === "DAYOFF") return "X";
        if (shiftId === "SKIP" || !shiftId) return "-";
        const shift = shifts.find((s) => s.id === shiftId);
        return shift?.code || "-";
    };

    const handleCreate = () => {
        if (!newTemplateName.trim()) {
            toast.error("กรุณาใส่ชื่อ Template");
            return;
        }

        const template: Template = {
            id: Date.now().toString(),
            name: newTemplateName.trim(),
            pattern: { ...newPattern },
            createdAt: new Date().toISOString(),
        };

        saveTemplates([...templates, template]);
        toast.success("บันทึก Template สำเร็จ");
        setIsCreating(false);
        setNewTemplateName("");
        setNewPattern(defaultPattern);
    };

    const handleUpdate = (id: string) => {
        const updated = templates.map((t) =>
            t.id === id ? { ...t, name: newTemplateName, pattern: newPattern } : t
        );
        saveTemplates(updated);
        toast.success("อัพเดท Template สำเร็จ");
        setEditingId(null);
        setNewTemplateName("");
        setNewPattern(defaultPattern);
    };

    const handleDelete = (id: string) => {
        const updated = templates.filter((t) => t.id !== id);
        saveTemplates(updated);
        toast.success("ลบ Template สำเร็จ");
    };

    const handleEdit = (template: Template) => {
        setEditingId(template.id);
        setNewTemplateName(template.name);
        setNewPattern({ ...template.pattern });
    };

    const handleApply = (template: Template) => {
        if (onApplyTemplate) {
            onApplyTemplate(template.pattern);
            onOpenChange(false);
            toast.success(`นำ Template "${template.name}" ไปใช้`);
        }
    };

    const renderPatternPreview = (pattern: WeekPattern) => {
        const days = Object.keys(dayLabels) as (keyof WeekPattern)[];
        return (
            <div className="flex gap-1">
                {days.map((day) => {
                    const code = getShiftCodeById(pattern[day]);
                    const isOff = code === "X";
                    const isEmpty = code === "-";
                    return (
                        <div
                            key={day}
                            className={`w-6 h-6 rounded text-[10px] flex items-center justify-center text-white font-medium ${isOff
                                    ? "bg-red-900"
                                    : isEmpty
                                        ? "bg-gray-700"
                                        : getShiftColor(code)
                                }`}
                            title={dayLabels[day]}
                        >
                            {code}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderPatternEditor = () => (
        <div className="grid grid-cols-2 gap-2 mt-4">
            {(Object.keys(dayLabels) as (keyof WeekPattern)[]).map((day) => (
                <div key={day} className="flex items-center gap-2">
                    <span className="w-14 text-sm">{dayLabels[day]}</span>
                    <Select
                        value={newPattern[day] || "SKIP"}
                        onValueChange={(v) =>
                            setNewPattern((prev) => ({ ...prev, [day]: v === "SKIP" ? "" : v }))
                        }
                    >
                        <SelectTrigger className="flex-1 h-8">
                            <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SKIP">ข้าม (-)</SelectItem>
                            <SelectItem value="DAYOFF">หยุด (X)</SelectItem>
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
            ))}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        จัดการ Template กะ
                    </DialogTitle>
                    <DialogDescription>
                        สร้างและจัดการ Template สำหรับใช้ซ้ำในการจัดกะ
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Template List */}
                    {templates.length === 0 && !isCreating && (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>ยังไม่มี Template</p>
                            <p className="text-sm">กดปุ่ม "สร้าง Template" เพื่อเริ่มต้น</p>
                        </div>
                    )}

                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className={`border rounded-lg p-3 ${editingId === template.id ? "border-blue-500 bg-blue-500/5" : ""
                                }`}
                        >
                            {editingId === template.id ? (
                                <>
                                    <Input
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        placeholder="ชื่อ Template"
                                        className="mb-2"
                                    />
                                    {renderPatternEditor()}
                                    <div className="flex gap-2 mt-3">
                                        <Button size="sm" onClick={() => handleUpdate(template.id)}>
                                            <Save className="w-4 h-4 mr-1" /> บันทึก
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setEditingId(null);
                                                setNewTemplateName("");
                                                setNewPattern(defaultPattern);
                                            }}
                                        >
                                            ยกเลิก
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">{template.name}</h4>
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => handleEdit(template)}
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                                onClick={() => handleDelete(template.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        {renderPatternPreview(template.pattern)}
                                        {onApplyTemplate && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleApply(template)}
                                            >
                                                <Check className="w-4 h-4 mr-1" /> ใช้
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {/* Create New Template */}
                    {isCreating && (
                        <div className="border border-blue-500 rounded-lg p-3 bg-blue-500/5">
                            <h4 className="font-medium mb-2">สร้าง Template ใหม่</h4>
                            <Input
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                placeholder="ชื่อ Template (เช่น กะปกติ Mon-Sat)"
                                className="mb-2"
                            />
                            {renderPatternEditor()}
                            <div className="flex gap-2 mt-3">
                                <Button size="sm" onClick={handleCreate}>
                                    <Save className="w-4 h-4 mr-1" /> บันทึก
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewTemplateName("");
                                        setNewPattern(defaultPattern);
                                    }}
                                >
                                    ยกเลิก
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {!isCreating && !editingId && (
                        <Button onClick={() => setIsCreating(true)} className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> สร้าง Template
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
