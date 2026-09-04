"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardTitle, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface PayrollApiEmployee {
    id: string;
    name: string;
    employeeId: string;
    totalPay: number;
    regularPay: number;
    overtimePay: number;
    latePenalty?: number | null;
    socialSecurity: number;
    totalEarnings: number;
}

interface PayrollApiResponse {
    employees: PayrollApiEmployee[];
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
                const data = await res.json() as PayrollApiResponse;

                const employees = data.employees.map((emp) => {
                    return {
                        id: emp.id,
                        name: emp.name,
                        employeeId: emp.employeeId,
                        totalIncome: emp.totalEarnings,
                        socialSecurity: emp.socialSecurity,
                        tax: 0,
                        netIncome: emp.totalPay,
                    };
                });

                const summary = {
                    totalIncome: employees.reduce((sum, e) => sum + e.totalIncome, 0),
                    totalSocialSecurity: employees.reduce((sum, e) => sum + e.socialSecurity, 0),
                    totalTax: employees.reduce((sum, e) => sum + e.tax, 0)
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
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.06)] text-zinc-950 dark:text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">TAX & SOCIAL SECURITY</p>
                            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">รายงานรายได้และประกันสังคม</h1>
                            <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5">ยอดภาษีและเงินสมทบกองทุนประกันสังคมตามรอบบัญชี</p>
                        </div>
                    </div>
                    {reportData && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                const params = new URLSearchParams({ startDate, endDate });
                                window.open(`/api/admin/reports/tax/export?${params}`, "_blank");
                            }}
                            className="tt-retro-control bg-zinc-900/5 hover:bg-zinc-900/10 text-zinc-900 border-zinc-700/20 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20 rounded-xl font-bold h-10 transition-all text-xs self-start sm:self-auto"
                        >
                            <Download className="w-4 h-4 mr-1.5" /> Export Excel
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">เริ่มต้น</label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 h-9 rounded-xl font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-700/30" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">สิ้นสุด</label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 h-9 rounded-xl font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-700/30" />
                    </div>
                    <Button onClick={generateReport} disabled={isLoading} className="tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/30 h-9 px-4 text-xs shadow-sm">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                        คำนวณ
                    </Button>
                </div>
            </div>

            {reportData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-xs font-bold text-zinc-500 mb-1">รายได้รวมพนักงาน</p>
                            <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">฿{reportData.summary.totalIncome.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-xs font-bold text-zinc-500 mb-1">นำส่งประกันสังคม (5%)</p>
                            <p className="text-2xl font-black font-mono text-amber-700 dark:text-amber-400">฿{reportData.summary.totalSocialSecurity.toLocaleString()}</p>
                        </div>
                        <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 text-center shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                            <p className="text-xs font-bold text-zinc-500 mb-1">ภาษีที่บันทึกในระบบ</p>
                            <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">฿{reportData.summary.totalTax.toLocaleString()}</p>
                        </div>
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
