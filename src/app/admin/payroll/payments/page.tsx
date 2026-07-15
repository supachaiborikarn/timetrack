"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, CircleCheck, Clock3, Loader2, RefreshCw, WalletCards } from "lucide-react";
import { formatPayrollDate } from "@/lib/payroll-document-format";
import { maskBankAccountNumber } from "@/lib/payroll-document-settings";

interface PayrollPeriodOption {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    payDate: string;
    status: string;
    _count: { records: number };
}

interface PaymentRecord {
    id: string;
    employeeName: string;
    employeeCode: string;
    stationName: string;
    departmentName: string;
    bankName: string | null;
    bankAccountNumber: string | null;
    netPay: string | number;
    documentNumber: string | null;
    paymentStatus: string;
    paymentMethod: string;
    paidAt: string | null;
    paymentReference: string | null;
}

function todayInBangkok() {
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Bangkok",
    }).format(new Date());
}

function formatMoney(value: string | number) {
    return Number(value).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function PaymentStatusBadge({ status }: { status: string }) {
    if (status === "PAID") {
        return (
            <Badge className="border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CircleCheck className="h-3 w-3" /> ชำระแล้ว
            </Badge>
        );
    }
    if (status === "FAILED") return <Badge variant="destructive">ชำระไม่สำเร็จ</Badge>;
    return (
        <Badge className="border-0 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock3 className="h-3 w-3" /> รอชำระ
        </Badge>
    );
}

export default function PayrollPaymentsPage() {
    const { data: session, status } = useSession();
    const [periods, setPeriods] = useState<PayrollPeriodOption[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState("");
    const [records, setRecords] = useState<PaymentRecord[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
    const [paidDate, setPaidDate] = useState(todayInBangkok());
    const [reference, setReference] = useState("");
    const [note, setNote] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadPayments = useCallback(async (periodId?: string) => {
        setIsLoading(true);
        try {
            const query = periodId ? `?periodId=${encodeURIComponent(periodId)}` : "";
            const response = await fetch(`/api/admin/payroll/payments${query}`);
            if (!response.ok) throw new Error("โหลดข้อมูลการจ่ายไม่สำเร็จ");
            const data = await response.json();
            setPeriods(data.periods || []);
            setRecords(data.records || []);
            setSelectedPeriodId(data.selectedPeriodId || "");
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Load payroll payments error:", error);
            toast.error("โหลดข้อมูลการจ่ายเงินเดือนไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.id && ["ADMIN", "HR"].includes(session.user.role)) {
            void loadPayments();
        }
    }, [loadPayments, session?.user?.id, session?.user?.role]);

    const summary = useMemo(() => records.reduce((result, record) => {
        const amount = Number(record.netPay);
        result.total += amount;
        if (record.paymentStatus === "PAID") {
            result.paid += amount;
            result.paidCount += 1;
        } else {
            result.pending += amount;
            result.pendingCount += 1;
        }
        return result;
    }, { total: 0, paid: 0, pending: 0, paidCount: 0, pendingCount: 0 }), [records]);

    const toggleAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(records.map((record) => record.id)) : new Set());
    };

    const toggleOne = (recordId: string, checked: boolean) => {
        setSelectedIds((previous) => {
            const next = new Set(previous);
            if (checked) next.add(recordId);
            else next.delete(recordId);
            return next;
        });
    };

    const updatePaymentStatus = async (paymentStatus: "PAID" | "PENDING") => {
        if (selectedIds.size === 0) {
            toast.error("กรุณาเลือกรายการเงินเดือน");
            return;
        }
        if (paymentStatus === "PAID" && !paidDate) {
            toast.error("กรุณาระบุวันที่จ่าย");
            return;
        }
        if (!window.confirm(
            paymentStatus === "PAID"
                ? `ยืนยันว่าจ่ายเงินแล้ว ${selectedIds.size} รายการ`
                : `ย้าย ${selectedIds.size} รายการกลับเป็นรอชำระ`,
        )) return;

        setIsSaving(true);
        try {
            const response = await fetch("/api/admin/payroll/payments", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recordIds: Array.from(selectedIds),
                    paymentStatus,
                    paymentMethod,
                    paidAt: paymentStatus === "PAID" ? `${paidDate}T12:00:00+07:00` : null,
                    paymentReference: reference,
                    paymentNote: note,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
            toast.success(
                paymentStatus === "PAID"
                    ? `บันทึกว่าชำระแล้ว ${data.updatedCount} รายการ`
                    : `ย้ายกลับเป็นรอชำระ ${data.updatedCount} รายการ`,
            );
            await loadPayments(selectedPeriodId);
        } catch (error) {
            console.error("Update payment status error:", error);
            toast.error(error instanceof Error ? error.message : "บันทึกข้อมูลการจ่ายไม่สำเร็จ");
        } finally {
            setIsSaving(false);
        }
    };

    if (status === "loading") {
        return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
    }
    if (!session || !["ADMIN", "HR"].includes(session.user.role)) redirect("/");

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <h1 className="text-2xl font-bold">การจ่ายเงินเดือน</h1>
                    <p className="text-muted-foreground">บันทึกวันจ่าย วิธีจ่าย และเลขอ้างอิงหลังโอนเงินจริง</p>
                </div>
                <div className="flex items-end gap-2">
                    <div className="space-y-2">
                        <Label>งวดเงินเดือน</Label>
                        <Select
                            value={selectedPeriodId}
                            onValueChange={(value) => void loadPayments(value)}
                            disabled={isLoading}
                        >
                            <SelectTrigger className="w-72">
                                <SelectValue placeholder="เลือกงวดเงินเดือน" />
                            </SelectTrigger>
                            <SelectContent>
                                {periods.map((period) => (
                                    <SelectItem key={period.id} value={period.id}>
                                        {period.name} ({period._count.records} คน)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => void loadPayments(selectedPeriodId)} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        <span className="sr-only">โหลดข้อมูลใหม่</span>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div><p className="text-sm text-muted-foreground">ยอดสุทธิทั้งงวด</p><p className="mt-1 text-2xl font-bold">฿{formatMoney(summary.total)}</p></div>
                            <WalletCards className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div><p className="text-sm text-muted-foreground">ชำระแล้ว {summary.paidCount} คน</p><p className="mt-1 text-2xl font-bold text-emerald-600">฿{formatMoney(summary.paid)}</p></div>
                            <CircleCheck className="h-8 w-8 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div><p className="text-sm text-muted-foreground">รอชำระ {summary.pendingCount} คน</p><p className="mt-1 text-2xl font-bold text-amber-600">฿{formatMoney(summary.pending)}</p></div>
                            <Clock3 className="h-8 w-8 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" />ข้อมูลการจ่ายสำหรับรายการที่เลือก</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <Label>วิธีจ่าย</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BANK_TRANSFER">โอนเข้าบัญชีธนาคาร</SelectItem>
                                    <SelectItem value="CASH">เงินสด</SelectItem>
                                    <SelectItem value="CHEQUE">เช็ค</SelectItem>
                                    <SelectItem value="OTHER">วิธีอื่น</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paid-date">วันที่จ่าย</Label>
                            <Input id="paid-date" type="date" value={paidDate} onChange={(event) => setPaidDate(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment-reference">เลขอ้างอิงการโอน</Label>
                            <Input id="payment-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="เลขชุดโอนหรือเลขรายการ" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment-note">หมายเหตุ</Label>
                            <Textarea id="payment-note" rows={1} value={note} onChange={(event) => setNote(event.target.value)} />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        <p className="text-sm text-muted-foreground">เลือกแล้ว {selectedIds.size} รายการ</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => void updatePaymentStatus("PENDING")} disabled={isSaving || selectedIds.size === 0}>ย้ายกลับเป็นรอชำระ</Button>
                            <Button onClick={() => void updatePaymentStatus("PAID")} disabled={isSaving || selectedIds.size === 0}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
                                บันทึกว่าจ่ายแล้ว
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin" /></div>
                    ) : records.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">ยังไม่มีรายการในงวดนี้</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"><Checkbox checked={selectedIds.size === records.length && records.length > 0} onCheckedChange={(checked) => toggleAll(checked === true)} aria-label="เลือกทั้งหมด" /></TableHead>
                                        <TableHead className="min-w-52">พนักงาน</TableHead>
                                        <TableHead className="min-w-44">บัญชีรับเงิน</TableHead>
                                        <TableHead>เลขสลิป</TableHead>
                                        <TableHead className="text-right">ยอดสุทธิ</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead>วันที่จ่าย</TableHead>
                                        <TableHead>เลขอ้างอิง</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((record) => (
                                        <TableRow key={record.id} data-state={selectedIds.has(record.id) ? "selected" : undefined}>
                                            <TableCell><Checkbox checked={selectedIds.has(record.id)} onCheckedChange={(checked) => toggleOne(record.id, checked === true)} aria-label={`เลือก ${record.employeeName}`} /></TableCell>
                                            <TableCell><div className="font-medium">{record.employeeName}</div><div className="text-xs text-muted-foreground">{record.employeeCode} • {record.stationName}</div></TableCell>
                                            <TableCell><div>{record.bankName || "ยังไม่ระบุธนาคาร"}</div><div className="font-mono text-xs text-muted-foreground">{maskBankAccountNumber(record.bankAccountNumber)}</div></TableCell>
                                            <TableCell className="font-mono text-xs">{record.documentNumber || "-"}</TableCell>
                                            <TableCell className="text-right font-semibold">฿{formatMoney(record.netPay)}</TableCell>
                                            <TableCell><PaymentStatusBadge status={record.paymentStatus} /></TableCell>
                                            <TableCell>{record.paidAt ? formatPayrollDate(record.paidAt) : "-"}</TableCell>
                                            <TableCell>{record.paymentReference || "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
