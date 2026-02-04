"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { ReviewPeriod } from "@/types/performance";
import { formatThaiDate } from "@/lib/date-utils";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export default function AdminPerformancePage() {
    const { data: session, status } = useSession();
    const [periods, setPeriods] = useState<ReviewPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New Period State
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
        fetchPeriods();
    }, []);

    const fetchPeriods = async () => {
        try {
            const res = await fetch("/api/performance/periods");
            if (res.ok) {
                const data = await res.json();
                setPeriods(data.periods);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePeriod = async () => {
        if (!title || !startDate || !endDate) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch("/api/performance/periods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    startDate,
                    endDate
                }),
            });

            if (res.ok) {
                toast.success("สร้างรอบการประเมินสำเร็จ");
                setTitle("");
                setStartDate(undefined);
                setEndDate(undefined);
                fetchPeriods();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsCreating(false);
        }
    };

    if (status === "loading" || isLoading) {
        return <Loader2 className="w-8 h-8 animate-spin mx-auto mt-20" />;
    }

    if (!session?.user?.role || !["ADMIN", "HR"].includes(session.user.role)) {
        return <div className="text-center mt-20">Access Denied</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-24">
            <div className="p-4 border-b bg-white">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>จัดการการประเมินผล</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">จัดการการประเมินผล</h1>
                        <p className="text-slate-500">สร้างและจัดการรอบการประเมินผลงานสำหรับพนักงาน</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Create New Period */}
                    <Card className="md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg">สร้างรอบประเมินใหม่</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>ชื่อรอบการประเมิน</Label>
                                <Input
                                    placeholder="เช่น Q1 2025"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>วันที่เริ่มต้น</Label>
                                <Input
                                    type="date"
                                    value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                                    onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>วันที่สิ้นสุด</Label>
                                <Input
                                    type="date"
                                    value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                                    onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                                />
                            </div>

                            <Button
                                className="w-full mt-4"
                                onClick={handleCreatePeriod}
                                disabled={isCreating}
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                สร้างรอบประเมิน
                            </Button>
                        </CardContent>
                    </Card>

                    {/* List Periods */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">รายการรอบการประเมิน</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ชือรอบ</TableHead>
                                        <TableHead>ระยะเวลา</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead>การส่ง</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {periods.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                                ยังไม่มีข้อมูล
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        periods.map((period) => (
                                            <TableRow key={period.id}>
                                                <TableCell className="font-medium">{period.title}</TableCell>
                                                <TableCell className="text-sm">
                                                    {formatThaiDate(new Date(period.startDate), "d MMM")} - {formatThaiDate(new Date(period.endDate), "d MMM yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    {period.isActive ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">เปิดรับ</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">ปิดแล้ว</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    -
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
