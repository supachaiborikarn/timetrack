"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Loader2, Calendar } from "lucide-react";
import { formatThaiDate } from "@/lib/date-utils";
import { generatePayslipPDF } from "@/lib/pdf-generator";

interface Payslip {
    id: string;
    period: {
        name: string;
        startDate: string;
        endDate: string;
    };
    basePay: number;
    overtimePay: number;
    latePenalty: number;
    advanceDeduct: number;
    otherDeduct: number;
    socialSecurity: number;
    netPay: number;
    createdAt: string;
    user: {
        name: string;
        employeeId: string;
        department: { name: string } | null;
        bankName: string | null;
        bankAccountNumber: string | null;
    };
}

export default function EmployeeDocumentsPage() {
    const { data: session, status } = useSession();
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            fetchPayslips();
        }
    }, [session]);

    const fetchPayslips = async () => {
        try {
            const res = await fetch("/api/payslip");
            if (res.ok) {
                const data = await res.json();
                setPayslips(data.payslips || []);
            }
        } catch (error) {
            console.error("Failed to fetch payslips", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = (slip: Payslip) => {
        const payslipObj = {
            user: {
                name: slip.user.name,
                employeeId: slip.user.employeeId,
                department: slip.user.department,
                bankName: slip.user.bankName,
                bankAccountNumber: slip.user.bankAccountNumber,
            },
            period: {
                startDate: slip.period.startDate,
                endDate: slip.period.endDate,
                name: slip.period.name,
            },
            createdAt: slip.createdAt,
            basePay: slip.basePay,
            overtimePay: slip.overtimePay,
            latePenalty: slip.latePenalty,
            advanceDeduct: slip.advanceDeduct,
            otherDeduct: slip.otherDeduct,
            socialSecurity: slip.socialSecurity,
            netPay: slip.netPay,
            bonus: 0,
        };
        generatePayslipPDF(payslipObj, { name: "TimeTrack Company" });
    };

    const formatCurrency = (val: number) =>
        Number(val).toLocaleString("th-TH", { minimumFractionDigits: 2 });

    if (status === "loading") return <div className="p-8 text-center">Loading...</div>;
    if (!session) redirect("/login");

    return (
        <div className="space-y-6 container mx-auto py-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">เอกสารของฉัน</h1>
                <p className="text-muted-foreground">ดูและดาวน์โหลดสลิปเงินเดือนและเอกสารภาษี</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        สลิปเงินเดือน (Payslips)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : payslips.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">ยังไม่มีเอกสารสลิปเงินเดือน</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>งวดเดือน</TableHead>
                                    <TableHead>วันที่จ่าย</TableHead>
                                    <TableHead className="text-right">รายได้รวม</TableHead>
                                    <TableHead className="text-right">รายการหัก</TableHead>
                                    <TableHead className="text-right font-bold">สุทธิ</TableHead>
                                    <TableHead className="text-center">ดาวน์โหลด</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslips.map((slip) => {
                                    const earnings = Number(slip.basePay) + Number(slip.overtimePay);
                                    const deductions = Number(slip.latePenalty) + Number(slip.advanceDeduct) + Number(slip.otherDeduct) + Number(slip.socialSecurity);
                                    return (
                                        <TableRow key={slip.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    {slip.period.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatThaiDate(new Date(slip.period.startDate), "d MMM")} - {formatThaiDate(new Date(slip.period.endDate), "d MMM yyyy")}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatThaiDate(new Date(slip.createdAt), "d MMM yyyy")}</TableCell>
                                            <TableCell className="text-right text-blue-600">฿{formatCurrency(earnings)}</TableCell>
                                            <TableCell className="text-right text-red-500">-฿{formatCurrency(deductions)}</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">฿{formatCurrency(Number(slip.netPay))}</TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownloadPDF(slip)}
                                                >
                                                    <Download className="w-4 h-4 text-blue-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-600" />
                        หนังสือรับรองภาษี (50 ทวิ)
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground">
                    เอกสารจะพร้อมใช้งานเมื่อสิ้นสุดปีภาษี
                </CardContent>
            </Card>
        </div>
    );
}
