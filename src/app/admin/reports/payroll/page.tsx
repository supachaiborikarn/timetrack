"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Download,
    Loader2,
    Users,
    DollarSign,
    PieChart,
    Building2,
    Briefcase
} from "lucide-react";
import { format, getBangkokNow, startOfMonth, endOfMonth } from "@/lib/date-utils";

interface PayrollSummaryData {
    employees: Array<{
        id: string;
        name: string;
        employeeId: string;
        station: string;
        department: string;
        workDays: number;
        totalPay: number;
        regularPay: number;
        overtimePay: number;
        latePenalty: number;
    }>;
    summary: {
        totalEmployees: number;
        totalRegularPay: number;
        totalOvertimePay: number;
        totalLatePenalty: number;
        grandTotal: number;
    };
}

export default function PayrollReportPage() {
    const { data: session, status } = useSession();
    const [reportData, setReportData] = useState<PayrollSummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [stations, setStations] = useState<{ id: string; name: string }[]>([]);

    // Filters
    const now = getBangkokNow();
    const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
    const [stationId, setStationId] = useState("all");

    useEffect(() => {
        fetchStations();
    }, []);

    const fetchStations = async () => {
        try {
            const res = await fetch("/api/admin/stations");
            if (res.ok) {
                const data = await res.json();
                setStations(data.stations || []);
            }
        } catch (error) {
            console.error("Failed to fetch stations:", error);
        }
    };

    const generateReport = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                ...(stationId !== "all" && { stationId }),
            });
            // Reusing the calculation API but focusing on results
            const res = await fetch(`/api/admin/payroll?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data);
            }
        } catch (error) {
            console.error("Failed to fetch payroll report:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = (type: 'excel' | 'pdf') => {
        if (type === 'excel') {
            const params = new URLSearchParams({
                startDate,
                endDate,
                ...(stationId !== "all" && { stationId }),
            });
            window.open(`/api/admin/payroll/export?${params}`, "_blank");
        } else {
            alert("PDF Export for full report coming soon");
        }
    };

    if (status === "loading") return <div className="p-8 text-center">Loading...</div>;
    if (!session || !["ADMIN", "HR"].includes(session.user.role)) redirect("/");

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">รายงานสรุปเงินเดือน</h1>
                    <p className="text-muted-foreground">ภาพรวมรายจ่ายเงินเดือนแยกตามแผนกและประเภทการจ่าย</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('excel')} disabled={!reportData}>
                        <Download className="w-4 h-4 mr-2" /> Excel
                    </Button>
                    <Button
                        onClick={async () => {
                            if (!confirm("ยืนยันการปิดงวดบัญชี? ข้อมูลจะถูกบันทึกสำหรับพนักงาน")) return;
                            try {
                                const res = await fetch("/api/admin/payroll/finalize", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ startDate, endDate, stationId: stationId === "all" ? undefined : stationId })
                                });
                                if (res.ok) alert("บันทึกข้อมูลเรียบร้อย");
                                else alert("เกิดข้อผิดพลาด");
                            } catch (e) {
                                alert("Failed to connect");
                            }
                        }}
                        disabled={!reportData}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Building2 className="w-4 h-4 mr-2" /> ปิดงวดบัญชี
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">ช่วงเวลา</label>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => {
                                    setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
                                    setEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
                                }}>เดือนนี้</Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                    setStartDate(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
                                    setEndDate(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
                                }}>เดือนก่อน</Button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">เริ่มต้น</label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">สิ้นสุด</label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">สถานี</label>
                            <Select value={stationId} onValueChange={setStationId}>
                                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทั้งหมด</SelectItem>
                                    {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={generateReport} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PieChart className="w-4 h-4 mr-2" />}
                            ดูรายงาน
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Content */}
            {reportData ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-sm text-muted-foreground mb-1">ยอดจ่ายสุทธิ</p>
                                <p className="text-2xl font-bold text-green-600">฿{reportData.summary.grandTotal.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-sm text-muted-foreground mb-1">ค่าแรงปกติ</p>
                                <p className="text-xl font-bold text-blue-600">฿{reportData.summary.totalRegularPay.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-sm text-muted-foreground mb-1">ค่าล่วงเวลา (OT)</p>
                                <p className="text-xl font-bold text-purple-600">฿{reportData.summary.totalOvertimePay.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4 text-center">
                                <p className="text-sm text-muted-foreground mb-1">พนักงาน</p>
                                <p className="text-xl font-bold text-foreground">{reportData.summary.totalEmployees}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Table */}
                    <Card>
                        <CardHeader><CardTitle>รายละเอียดรายบุคคล</CardTitle></CardHeader>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>พนักงาน</TableHead>
                                        <TableHead>แผนก</TableHead>
                                        <TableHead className="text-right">ค่าแรงปกติ</TableHead>
                                        <TableHead className="text-right">OT</TableHead>
                                        <TableHead className="text-right">หักสาย</TableHead>
                                        <TableHead className="text-right font-bold">สุทธิ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.employees.map((emp) => (
                                        <TableRow key={emp.id}>
                                            <TableCell>
                                                <div className="font-medium">{emp.name}</div>
                                                <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                                            </TableCell>
                                            <TableCell>{emp.department}</TableCell>
                                            <TableCell className="text-right text-blue-600">{emp.regularPay.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-purple-600">{emp.overtimePay.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-red-500">-{emp.latePenalty.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">{emp.totalPay.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </>
            ) : (
                <div className="text-center py-12 text-muted-foreground">เลือกช่วงเวลาเพื่อดูรายงาน</div>
            )}
        </div>
    );
}
