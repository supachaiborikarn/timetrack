"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Calendar,
    CircleCheck,
    Clock3,
    Download,
    FileText,
    Loader2,
    ReceiptText,
} from "lucide-react";
import {
    type CompanyInfo,
    type PayslipPdfData,
} from "@/lib/pdf-generator";
import { formatPayrollDate } from "@/lib/payroll-document-format";
import { generatePaymentReceiptPDF, generatePayslipPDF } from "@/lib/payroll-pdf-download";
import { DEFAULT_PAYROLL_DOCUMENT_SETTINGS } from "@/lib/payroll-document-settings";

interface Payslip extends PayslipPdfData {
    id: string;
}

function formatCurrency(value: number | string | null | undefined) {
    return Number(value ?? 0).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getPayslipTotals(slip: Payslip) {
    const adjustment = Number(slip.adjustment ?? 0);
    const earnings = Number(slip.basePay)
        + Number(slip.overtimePay)
        + Math.max(0, adjustment)
        + Number(slip.specialIncome ?? 0);
    const deductions = Number(slip.latePenalty)
        + Number(slip.advanceDeduct)
        + Number(slip.otherDeduct)
        + Number(slip.socialSecurity ?? 0)
        + Number(slip.taxWithheld ?? 0)
        + Math.max(0, -adjustment);
    return { earnings, deductions };
}

function PaymentBadge({ status }: { status?: string | null }) {
    if (status === "PAID") {
        return (
            <Badge className="border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CircleCheck className="h-3 w-3" /> ชำระแล้ว
            </Badge>
        );
    }
    if (status === "FAILED") {
        return <Badge variant="destructive">ชำระไม่สำเร็จ</Badge>;
    }
    return (
        <Badge className="border-0 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock3 className="h-3 w-3" /> รอชำระ
        </Badge>
    );
}

export default function EmployeeDocumentsPage() {
    const { data: session, status } = useSession();
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_PAYROLL_DOCUMENT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingKey, setDownloadingKey] = useState("");

    useEffect(() => {
        if (!session?.user?.id) return;

        const fetchPayslips = async () => {
            try {
                const response = await fetch("/api/payslip");
                if (!response.ok) throw new Error("โหลดเอกสารไม่สำเร็จ");
                const data = await response.json();
                setPayslips(data.payslips || []);
                setCompanyInfo(data.companyInfo || DEFAULT_PAYROLL_DOCUMENT_SETTINGS);
            } catch (error) {
                console.error("Failed to fetch payslips:", error);
                toast.error("โหลดเอกสารเงินเดือนไม่สำเร็จ");
            } finally {
                setIsLoading(false);
            }
        };

        void fetchPayslips();
    }, [session?.user?.id]);

    const handlePayslipDownload = async (slip: Payslip) => {
        setDownloadingKey(`payslip-${slip.id}`);
        try {
            await generatePayslipPDF(slip, companyInfo);
        } catch (error) {
            console.error("Generate payslip error:", error);
            toast.error("สร้างสลิปเงินเดือนไม่สำเร็จ");
        } finally {
            setDownloadingKey("");
        }
    };

    const handleReceiptDownload = async (slip: Payslip) => {
        setDownloadingKey(`receipt-${slip.id}`);
        try {
            await generatePaymentReceiptPDF(slip, companyInfo);
        } catch (error) {
            console.error("Generate payment receipt error:", error);
            toast.error("หลักฐานการจ่ายจะดาวน์โหลดได้หลังบันทึกว่าชำระแล้ว");
        } finally {
            setDownloadingKey("");
        }
    };

    if (status === "loading") {
        return <div className="p-8 text-center text-muted-foreground">กำลังโหลด...</div>;
    }
    if (!session) redirect("/login");

    const paidCount = payslips.filter((slip) => slip.paymentStatus === "PAID").length;

    return (
        <div className="container mx-auto max-w-6xl space-y-6 py-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <h1 className="text-2xl font-bold">เอกสารเงินเดือนของฉัน</h1>
                    <p className="text-muted-foreground">ดาวน์โหลดสลิปและหลักฐานการจ่ายเงินจากงวดที่ปิดแล้ว</p>
                </div>
                {payslips.length > 0 && (
                    <div className="flex gap-2 text-sm text-muted-foreground">
                        <span>{payslips.length} งวด</span>
                        <span>•</span>
                        <span className="text-emerald-600">ชำระแล้ว {paidCount} งวด</span>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        สลิปเงินเดือนและหลักฐานการจ่าย
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-10">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : payslips.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-10 text-center">
                            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                            <p className="font-medium">ยังไม่มีเอกสารเงินเดือน</p>
                            <p className="mt-1 text-sm text-muted-foreground">เอกสารจะแสดงหลังผู้ดูแลปิดงวดเงินเดือน</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-52">งวดเงินเดือน</TableHead>
                                        <TableHead className="min-w-40">เอกสารและสถานะ</TableHead>
                                        <TableHead className="min-w-32">วันที่จ่าย</TableHead>
                                        <TableHead className="text-right">รายได้</TableHead>
                                        <TableHead className="text-right">รายการหัก</TableHead>
                                        <TableHead className="text-right font-bold">สุทธิ</TableHead>
                                        <TableHead className="min-w-64 text-right">ดาวน์โหลด</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payslips.map((slip) => {
                                        const totals = getPayslipTotals(slip);
                                        const isPaid = slip.paymentStatus === "PAID";
                                        return (
                                            <TableRow key={slip.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 font-medium">
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        {slip.period.name || "งวดเงินเดือน"}
                                                    </div>
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {formatPayrollDate(slip.period.startDate)} - {formatPayrollDate(slip.period.endDate)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        {slip.documentNumber || "-"}
                                                    </div>
                                                    <div className="mt-1.5"><PaymentBadge status={slip.paymentStatus} /></div>
                                                </TableCell>
                                                <TableCell>
                                                    {formatPayrollDate(isPaid ? slip.paidAt : slip.period.payDate)}
                                                    {!isPaid && <div className="text-xs text-muted-foreground">กำหนดจ่าย</div>}
                                                </TableCell>
                                                <TableCell className="text-right text-blue-600">฿{formatCurrency(totals.earnings)}</TableCell>
                                                <TableCell className="text-right text-red-500">-฿{formatCurrency(totals.deductions)}</TableCell>
                                                <TableCell className="text-right font-bold text-emerald-600">฿{formatCurrency(slip.netPay)}</TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={Boolean(downloadingKey)}
                                                            onClick={() => void handlePayslipDownload(slip)}
                                                        >
                                                            {downloadingKey === `payslip-${slip.id}`
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Download className="h-4 w-4" />}
                                                            สลิป
                                                        </Button>
                                                        <Button
                                                            variant={isPaid ? "default" : "outline"}
                                                            size="sm"
                                                            disabled={!isPaid || Boolean(downloadingKey)}
                                                            onClick={() => void handleReceiptDownload(slip)}
                                                            title={isPaid ? "ดาวน์โหลดหลักฐานการจ่าย" : "พร้อมหลังบันทึกว่าชำระแล้ว"}
                                                        >
                                                            {downloadingKey === `receipt-${slip.id}`
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <ReceiptText className="h-4 w-4" />}
                                                            ใบรับเงิน
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-orange-600" />
                        เอกสารภาษีประจำปี
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                        ระบบยังไม่มีข้อมูลภาษีหัก ณ ที่จ่ายสำหรับออกหนังสือรับรอง 50 ทวิ จึงยังไม่เปิดให้ดาวน์โหลดเอกสารส่วนนี้
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
