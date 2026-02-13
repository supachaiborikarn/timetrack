"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Calendar, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Log {
    id: string;
    userId: string;
    supervisorId: string;
    date: string;
    topic: string;
    note: string;
    actionItems: string;
    user: {
        name: string;
        employeeId: string;
        photoUrl: string | null;
    };
    supervisor: {
        name: string;
    };
}

interface Employee {
    id: string;
    name: string;
    employeeId: string;
}

export default function OneOnOnePage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [topic, setTopic] = useState("");
    const [note, setNote] = useState("");
    const [actionItems, setActionItems] = useState("");

    useEffect(() => {
        fetchData();
        fetchEmployees();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/engagement/one-on-one");
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch("/api/admin/employees");
            if (res.ok) {
                const data = await res.json();
                // Adjust if data structure is wrapped
                setEmployees(Array.isArray(data) ? data : data.data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedEmployee || !date || !topic || !note) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/engagement/one-on-one", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedEmployee,
                    date,
                    topic,
                    note,
                    actionItems,
                }),
            });

            if (res.ok) {
                toast.success("บันทึกข้อมูลเรียบร้อย");
                setIsDialogOpen(false);
                fetchData();
                // Reset form
                setTopic("");
                setNote("");
                setActionItems("");
            } else {
                toast.error("บันทึกไม่สำเร็จ");
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">One-on-One Logs</h2>
                    <p className="text-muted-foreground">บันทึกการพูดคุยกับพนักงาน</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> บันทึกใหม่
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>บันทึกการพูดคุย (One-on-One)</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>พนักงาน</Label>
                                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกพนักงาน" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.employeeId} - {emp.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>วันที่คุย</Label>
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>หัวข้อเรื่อง</Label>
                                <Input
                                    placeholder="เช่น ปรึกษาเรื่องงาน, Feedback ประจำเดือน"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>รายละเอียด / บันทึกช่วยจำ</Label>
                                <Textarea
                                    placeholder="รายละเอียดการพูดคุย..."
                                    className="min-h-[100px]"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>สิ่งที่ต้องทำต่อ (Action Items)</Label>
                                <Textarea
                                    placeholder="ถ้ามี..."
                                    value={actionItems}
                                    onChange={(e) => setActionItems(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {logs.map((log) => (
                    <Card key={log.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <Avatar>
                                <AvatarImage src={log.user.photoUrl || ""} />
                                <AvatarFallback>{log.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <CardTitle className="text-base truncate">{log.user.name}</CardTitle>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(log.date), "d MMM yyyy", { locale: th })}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="font-medium text-primary flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    {log.topic}
                                </div>
                                <p className="text-muted-foreground line-clamp-3 whitespace-pre-line">
                                    {log.note}
                                </p>
                                {log.actionItems && (
                                    <div className="mt-2 pt-2 border-t border-dashed">
                                        <p className="font-semibold text-xs text-green-600 mb-1">Action Items:</p>
                                        <p className="text-xs text-muted-foreground">{log.actionItems}</p>
                                    </div>
                                )}
                                <div className="pt-2 text-xs text-slate-400 text-right">
                                    ผู้บันทึก: {log.supervisor.name}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {logs.length === 0 && !isLoading && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        ยังไม่มีรายการบันทึก
                    </div>
                )}
            </div>
        </div>
    );
}
