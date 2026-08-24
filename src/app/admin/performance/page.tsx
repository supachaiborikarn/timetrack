"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatThaiDate } from "@/lib/date-utils";
import type { ReviewPeriod } from "@/types/performance";

type PeriodWithClose = ReviewPeriod & { closedAt?: string | null };

interface FeedbackSnapshot {
    id: string;
    employeeId: string;
    employeeLabelSnapshot: string;
    dateFrom: string;
    dateTo: string;
    validCount: number;
    meetsMinimum: boolean;
    ratingAverage: number | null;
    positiveRate: number | null;
    negativeRate: number | null;
    suspectedExcludedCount: number;
    topReasonKeys: string[];
}

interface SnapshotResult {
    period: PeriodWithClose;
    minimumSample: number;
    snapshots: FeedbackSnapshot[];
}

export function formatSnapshotPercentage(value: number | null): string {
    if (value === null) return "-";
    return `${Math.round(value)}%`;
}

export default function AdminPerformancePage() {
    const { data: session, status } = useSession();
    const [periods, setPeriods] = useState<PeriodWithClose[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [closingPeriodId, setClosingPeriodId] = useState<string | null>(null);
    const [snapshotLoadingId, setSnapshotLoadingId] = useState<string | null>(null);
    const [snapshotResult, setSnapshotResult] = useState<SnapshotResult | null>(null);
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();

    const fetchPeriods = useCallback(async () => {
        try {
            const response = await fetch("/api/performance/periods", { cache: "no-store" });
            if (!response.ok) throw new Error("load failed");
            const data = (await response.json()) as { periods?: PeriodWithClose[] };
            setPeriods(data.periods ?? []);
        } catch {
            toast.error("โหลดรอบประเมินไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "authenticated") void fetchPeriods();
        if (status === "unauthenticated") setIsLoading(false);
    }, [fetchPeriods, status]);

    const handleCreatePeriod = async () => {
        if (!title.trim() || !startDate || !endDate) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }
        setIsCreating(true);
        try {
            const response = await fetch("/api/performance/periods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    startDate: format(startDate, "yyyy-MM-dd"),
                    endDate: format(endDate, "yyyy-MM-dd"),
                }),
            });
            const data = (await response.json().catch(() => ({}))) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "สร้างรอบประเมินไม่สำเร็จ");
            toast.success("สร้างรอบประเมินแล้ว");
            setTitle("");
            setStartDate(undefined);
            setEndDate(undefined);
            await fetchPeriods();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "สร้างรอบประเมินไม่สำเร็จ");
        } finally {
            setIsCreating(false);
        }
    };

    const viewSnapshots = async (period: PeriodWithClose) => {
        setSnapshotLoadingId(period.id);
        try {
            const response = await fetch(`/api/admin/performance/periods/${period.id}/close`, { cache: "no-store" });
            const data = (await response.json().catch(() => ({}))) as SnapshotResult & { error?: string };
            if (!response.ok) throw new Error(data.error ?? "โหลด Snapshot ไม่สำเร็จ");
            setSnapshotResult(data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "โหลด Snapshot ไม่สำเร็จ");
        } finally {
            setSnapshotLoadingId(null);
        }
    };

    const closePeriod = async (period: PeriodWithClose) => {
        const confirmed = window.confirm(
            `ปิดรอบ “${period.title}” และบันทึกผลเสียงลูกค้า ณ ตอนนี้หรือไม่\n\nหลังปิดแล้ว Snapshot จะไม่เปลี่ยนตามข้อมูลในอนาคต`
        );
        if (!confirmed) return;
        setClosingPeriodId(period.id);
        try {
            const response = await fetch(`/api/admin/performance/periods/${period.id}/close`, { method: "POST" });
            const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
            if (!response.ok) throw new Error(data.error ?? "ปิดรอบไม่สำเร็จ");
            toast.success(data.message ?? "ปิดรอบและสร้าง Snapshot แล้ว");
            await Promise.all([fetchPeriods(), viewSnapshots(period)]);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "ปิดรอบไม่สำเร็จ");
        } finally {
            setClosingPeriodId(null);
        }
    };

    if (status === "loading" || isLoading) {
        return <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin motion-reduce:animate-none" aria-label="กำลังโหลด" />;
    }

    if (!session?.user?.role || !["ADMIN", "HR"].includes(session.user.role)) {
        return <div className="mt-20 text-center">คุณไม่มีสิทธิ์เข้าหน้านี้</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-24">
            <div className="border-b bg-white p-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem><BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem><BreadcrumbPage>จัดการการประเมินผล</BreadcrumbPage></BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold">จัดการการประเมินผล</h1>
                    <p className="text-slate-500">สร้างรอบประเมิน ปิดรอบ และเก็บผลเสียงลูกค้าเป็นหลักฐานของรอบนั้น</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="h-fit lg:col-span-1">
                        <CardHeader><CardTitle className="text-lg">สร้างรอบประเมินใหม่</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="period-title">ชื่อรอบการประเมิน</Label>
                                <Input id="period-title" placeholder="เช่น ไตรมาส 1 ปี 2569" value={title} onChange={(event) => setTitle(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="period-start">วันที่เริ่มต้น</Label>
                                <Input id="period-start" type="date" value={startDate ? format(startDate, "yyyy-MM-dd") : ""} onChange={(event) => setStartDate(event.target.value ? new Date(`${event.target.value}T12:00:00`) : undefined)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="period-end">วันที่สิ้นสุด</Label>
                                <Input id="period-end" type="date" value={endDate ? format(endDate, "yyyy-MM-dd") : ""} onChange={(event) => setEndDate(event.target.value ? new Date(`${event.target.value}T12:00:00`) : undefined)} />
                            </div>
                            <Button className="w-full" onClick={() => void handleCreatePeriod()} disabled={isCreating}>
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Plus className="mr-2 h-4 w-4" />}
                                สร้างรอบประเมิน
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">รายการรอบการประเมิน</CardTitle>
                            <CardDescription>ปิดรอบได้หลังวันสิ้นสุด ระบบจะคำนวณเฉพาะคำตอบที่ผ่านการตรวจสอบแล้ว</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>ชื่อรอบ</TableHead><TableHead>ระยะเวลา</TableHead><TableHead>สถานะ</TableHead><TableHead>ผลเสียงลูกค้า</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {periods.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="py-8 text-center text-slate-500">ยังไม่มีข้อมูล</TableCell></TableRow>
                                        ) : periods.map((period) => (
                                            <TableRow key={period.id}>
                                                <TableCell className="font-medium">{period.title}</TableCell>
                                                <TableCell className="whitespace-nowrap text-sm">{formatThaiDate(new Date(period.startDate), "d MMM")} - {formatThaiDate(new Date(period.endDate), "d MMM yyyy")}</TableCell>
                                                <TableCell>{period.isActive ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">เปิดรับ</Badge> : <Badge variant="secondary">ปิดแล้ว</Badge>}</TableCell>
                                                <TableCell>
                                                    {period.isActive ? (
                                                        <Button size="sm" onClick={() => void closePeriod(period)} disabled={closingPeriodId === period.id}>
                                                            {closingPeriodId === period.id && <Loader2 className="mr-1 h-4 w-4 animate-spin motion-reduce:animate-none" />}
                                                            ปิดรอบและบันทึก Snapshot
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="outline" onClick={() => void viewSnapshots(period)} disabled={snapshotLoadingId === period.id}>
                                                            {snapshotLoadingId === period.id && <Loader2 className="mr-1 h-4 w-4 animate-spin motion-reduce:animate-none" />}
                                                            ดู Snapshot
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {snapshotResult && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Snapshot เสียงลูกค้า · {snapshotResult.period.title}</CardTitle>
                            <CardDescription>แสดงคะแนนเมื่อมีคำตอบที่ใช้ได้อย่างน้อย {snapshotResult.minimumSample} รายการต่อพนักงาน และตัดคำตอบต้องสงสัยออกจากคะแนน</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">ข้อมูลชุดนี้ถูกเก็บตอนปิดรอบและไม่เปลี่ยนตามการแก้ข้อมูลภายหลัง กรุณาใช้ร่วมกับหลักฐานการทำงานส่วนอื่น</p>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>พนักงาน</TableHead><TableHead>จำนวนคำตอบ</TableHead><TableHead>คะแนนเฉลี่ย</TableHead><TableHead>เชิงบวก</TableHead><TableHead>เชิงลบ</TableHead><TableHead>ตัดต้องสงสัย</TableHead><TableHead>เหตุผลหลัก</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {snapshotResult.snapshots.length === 0 ? (
                                            <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">รอบนี้ไม่มีคำตอบพนักงานที่ใช้สร้าง Snapshot</TableCell></TableRow>
                                        ) : snapshotResult.snapshots.map((snapshot) => (
                                            <TableRow key={snapshot.id}>
                                                <TableCell className="font-medium">{snapshot.employeeLabelSnapshot}</TableCell>
                                                <TableCell>{snapshot.validCount}</TableCell>
                                                {snapshot.meetsMinimum ? (
                                                    <>
                                                        <TableCell>{snapshot.ratingAverage?.toFixed(2) ?? "-"}</TableCell>
                                                        <TableCell>{formatSnapshotPercentage(snapshot.positiveRate)}</TableCell>
                                                        <TableCell>{formatSnapshotPercentage(snapshot.negativeRate)}</TableCell>
                                                    </>
                                                ) : (
                                                    <TableCell colSpan={3}><Badge variant="outline">ข้อมูลยังไม่พอ</Badge></TableCell>
                                                )}
                                                <TableCell>{snapshot.suspectedExcludedCount}</TableCell>
                                                <TableCell className="max-w-64 text-xs">{snapshot.topReasonKeys.join(", ") || "-"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
