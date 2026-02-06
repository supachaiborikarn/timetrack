"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Calculator } from "lucide-react";
import { format, getBangkokNow, startOfMonth, endOfMonth } from "@/lib/date-utils";

interface TaxReportData {
    employees: Array<{
        id: string;
        name: string;
        employeeId: string;
        totalIncome: number;
        socialSecurity: number;
        tax: number;
        netIncome: number;
    }>;
    summary: {
        totalIncome: number;
        totalSocialSecurity: number;
        totalTax: number;
    };
}

export default function TaxReportPage() {
    const { data: session, status } = useSession();
    const [reportData, setReportData] = useState<TaxReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));

    const generateReport = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ startDate, endDate });
            const res = await fetch(`/api/admin/payroll?${params}`);

            if (res.ok) {
                const data = await res.json();

                // Calculate Tax & SSO Client-side (Projection)
                const employees = data.employees.map((emp: any) => {
                    const totalIncome = emp.totalPay + (emp.latePenalty || 0); // Gross income before penalty deduction? Usually tax is on gross.
                    // Let's assume Tax is on (Regular + OT).
                    const grossIncome = emp.regularPay + emp.overtimePay;

                    // SSO: 5% of Base Salary (capped at 15,000 base)
                    // We need base salary specifically, here we use regularPay as proxy if dailyRate model
                    // Ideally we check baseSalary field but we use daily calculation.
                    // Estimate: 5% of gross up to 750 max.
                    let sso = grossIncome * 0.05;
                    if (sso > 750) sso = 750;
                    if (sso < 0) sso = 0;

                    // Tax: Simplified Progressive
                    // 0-150,000 Exempt
                    // This is monthly viewing, so we project annual? 
                    // Let's us simple 3% withholding for now or 0 if low income.
                    // For demo: 3% if > 25,000
                    let tax = 0;
                    if (grossIncome > 26000) { // Approx threshold
                        tax = (grossIncome - sso) * 0.03; // Simple 3% withholding logic
                    }

                    return {
                        id: emp.id,
                        name: emp.name,
                        employeeId: emp.employeeId,
                        totalIncome: grossIncome,
                        socialSecurity: Math.round(sso),
                        tax: Math.round(tax),
                        netIncome: grossIncome - sso - tax - (emp.latePenalty || 0)
                    };
                });

                const summary = {
                    totalIncome: employees.reduce((sum: number, e: any) => sum + e.totalIncome, 0),
                    totalSocialSecurity: employees.reduce((sum: number, e: any) => sum + e.socialSecurity, 0),
                    totalTax: employees.reduce((sum: number, e: any) => sum + e.tax, 0)
                };

                setReportData({ employees, summary });
            }
        } catch (error) {
            console.error("Failed to generate tax report:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "loading") return <div className="p-8 text-center">Loading...</div>;
    if (!session || !["ADMIN", "HR"].includes(session.user.role)) redirect("/");

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">รายงานภาษีและประกันสังคม (ประมาณการ)</h1>
                    <p className="text-muted-foreground">คำนวณยอดนำส่งประกันสังคมและภาษีหัก ณ ที่จ่าย</p>
                </div>
                {reportData && (
                    <Button variant="outline" onClick={() => {
                        const params = new URLSearchParams({ startDate, endDate });
                        window.open(`/api/admin/reports/tax/export?${params}`, "_blank");
                    }}>
                        <Download className="w-4 h-4 mr-2" /> Export Excel
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="py-4">
                    <div className="flex gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">เริ่มต้น</label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">สิ้นสุด</label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
                        </div>
                        <Button onClick={generateReport} disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                            คำนวณ
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-sm text-muted-foreground">รายได้รวมพนักงาน</p>
                                <p className="text-2xl font-bold text-blue-600">฿{reportData.summary.totalIncome.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-sm text-muted-foreground">นำส่งประกันสังคม (5%)</p>
                                <p className="text-2xl font-bold text-orange-600">฿{reportData.summary.totalSocialSecurity.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-sm text-muted-foreground">ภาษีหัก ณ ที่จ่าย</p>
                                <p className="text-2xl font-bold text-red-600">฿{reportData.summary.totalTax.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>รายละเอียด</CardTitle></CardHeader>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>พนักงาน</TableHead>
                                        <TableHead className="text-right">รายได้รวม</TableHead>
                                        <TableHead className="text-right">ประกันสังคม</TableHead>
                                        <TableHead className="text-right">ภาษี</TableHead>
                                        <TableHead className="text-right font-bold">สุทธิหลังหัก</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.employees.map(emp => (
                                        <TableRow key={emp.id}>
                                            <TableCell>
                                                <div className="font-medium">{emp.name}</div>
                                                <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{emp.totalIncome.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-orange-600">{emp.socialSecurity.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-red-600">{emp.tax.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">{emp.netIncome.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
