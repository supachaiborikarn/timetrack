"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

interface SummaryData {
    summary: {
        count: number;
        average: number | null;
        positiveRate: number | null;
        negativeRate: number | null;
        distribution: Record<string, number>;
        suspectedCount: number;
        validCount: number;
        openCases: number;
    };
    funnel?: {
        opened: number;
        started: number;
        confirmed: number;
        rejected: number;
        submitted: number;
        abandoned: number;
        blocked: number;
        expired: number;
    };
    trend: { date: string; count: number; average: number }[];
    reasons: { key: string; count: number; owner: string }[];
    stations: { id: string; name: string; count: number; average: number | null }[];
    employees: { id: string; name: string; count: number; average: number | null }[];
    minimumEmployeeSample: number;
    minimumStationSample?: number;
    disclaimer: string;
    coverage?: { usesHistoricalAggregates: boolean; employeeDetailAvailableFrom: string };
}

const OWNER_LABEL: Record<string, string> = {
    EMPLOYEE: "พนักงาน",
    SYSTEM: "ระบบ",
    STATION: "สถานี",
    UNKNOWN: "อื่น ๆ",
};

function funnelRate(value: number, base: number): string {
    return base > 0 ? `${Math.round((value / base) * 100)}%` : "-";
}

export function OverviewTab() {
    const [data, setData] = useState<SummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [targetType, setTargetType] = useState("");

    const load = useCallback(async () => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (targetType) params.set("targetType", targetType);
        const res = await fetch(`/api/admin/customer-feedback/summary?${params.toString()}`);
        if (res.ok) setData(await res.json());
        setIsLoading(false);
    }, [from, targetType, to]);

    useEffect(() => {
        const timer = setTimeout(() => void load(), 0);
        return () => clearTimeout(timer);
    }, [load]);

    if (isLoading && !data) {
        return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }
    if (!data) return <p className="text-muted-foreground">โหลดข้อมูลไม่สำเร็จ</p>;

    const s = data.summary;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
                <div>
                    <label htmlFor="overview-target" className="text-xs font-semibold">แหล่งคะแนน</label>
                    <select id="overview-target" value={targetType} onChange={(event) => setTargetType(event.target.value)} className="block min-h-10 rounded-md border bg-background px-3 text-sm">
                        <option value="">ทั้งหมด</option>
                        <option value="EMPLOYEE">QR พนักงาน</option>
                        <option value="STATION">QR สถานี</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="from-date" className="text-xs font-semibold">จากวันที่</label>
                    <Input id="from-date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                </div>
                <div>
                    <label htmlFor="to-date" className="text-xs font-semibold">ถึงวันที่</label>
                    <Input id="to-date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Card>
                    <CardHeader className="pb-1"><CardDescription>คำตอบที่ใช้ได้</CardDescription><CardTitle className="text-2xl">{s.validCount}</CardTitle></CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-1"><CardDescription>คะแนนเฉลี่ย (n={s.count})</CardDescription><CardTitle className="text-2xl">{s.average !== null ? s.average.toFixed(2) : "-"}</CardTitle></CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-1"><CardDescription>คะแนน 4–5</CardDescription><CardTitle className="text-2xl text-green-600">{s.positiveRate !== null ? `${s.positiveRate.toFixed(1)}%` : "-"}</CardTitle></CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-1"><CardDescription>คะแนน 1–2</CardDescription><CardTitle className="text-2xl text-red-600">{s.negativeRate !== null ? `${s.negativeRate.toFixed(1)}%` : "-"}</CardTitle></CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-1"><CardDescription>เคสค้าง</CardDescription><CardTitle className="text-2xl">{s.openCases}</CardTitle></CardHeader>
                </Card>
            </div>

            <p className="text-xs text-muted-foreground">{data.disclaimer} · ติดธง (suspected): {s.suspectedCount} รายการ</p>

            {data.funnel && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">เส้นทางการตอบแบบประเมิน</CardTitle>
                        <CardDescription>อัตราเริ่มตอบเทียบกับจำนวนเปิดแบบ และอัตราส่งสำเร็จเทียบกับจำนวนเริ่มตอบ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">1. เปิดแบบ</p><p className="text-2xl font-bold">{data.funnel.opened}</p><p className="text-xs text-muted-foreground">ฐาน 100%</p></div>
                            <div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">2. เริ่มตอบ</p><p className="text-2xl font-bold">{data.funnel.started}</p><p className="text-xs text-muted-foreground">{funnelRate(data.funnel.started, data.funnel.opened)} ของผู้ที่เปิดแบบ</p></div>
                            <div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">3. ส่งสำเร็จ</p><p className="text-2xl font-bold">{data.funnel.submitted}</p><p className="text-xs text-muted-foreground">{funnelRate(data.funnel.submitted, data.funnel.started)} ของผู้ที่เริ่มตอบ</p></div>
                        </div>
                        <p className="text-xs text-muted-foreground">ยืนยันเป้าหมาย {data.funnel.confirmed} · ปฏิเสธเป้าหมาย {data.funnel.rejected} · ออกจากแบบ {data.funnel.abandoned} · ถูกบล็อก {data.funnel.blocked} · หมดอายุ {data.funnel.expired}</p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">การกระจายคะแนน 1–5</CardTitle>
                    <CardDescription>แสดงจำนวนและสัดส่วนจากคำตอบที่ผ่านการตรวจในตัวกรองนี้</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {[5, 4, 3, 2, 1].map((score) => {
                        const count = Number(s.distribution[String(score)] ?? 0);
                        const percent = s.count > 0 ? (count / s.count) * 100 : 0;
                        return (
                            <div key={score} className="grid grid-cols-[2rem_1fr_5rem] items-center gap-2 text-sm">
                                <span className="font-semibold">{score}</span>
                                <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
                                    <div className="h-full rounded-full bg-yellow-500" style={{ width: `${percent}%` }} />
                                </div>
                                <span className="text-right tabular-nums">{count} ({percent.toFixed(0)}%)</span>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">แนวโน้มรายวัน</CardTitle>
                    <CardDescription>เส้นคะแนนเฉลี่ย แท่งตามจำนวนคำตอบในแกนขวา</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                    {data.trend.length === 0 ? (
                        <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลในช่วงนี้</p>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.trend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" domain={[1, 5]} />
                                <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                                <Tooltip />
                                <Line yAxisId="left" type="monotone" dataKey="average" name="คะแนนเฉลี่ย" stroke="#eab308" />
                                <Line yAxisId="right" type="monotone" dataKey="count" name="จำนวนคำตอบ" stroke="#94a3b8" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-base">สาเหตุที่ถูกเลือก</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                    {data.reasons.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>}
                    {data.reasons.slice(0, 12).map((r) => (
                        <div key={r.key} className="flex items-center justify-between text-sm">
                            <span>{r.key}</span>
                            <span className="flex items-center gap-2">
                                <Badge variant={r.owner === "EMPLOYEE" ? "default" : r.owner === "SYSTEM" ? "secondary" : "outline"}>
                                    {OWNER_LABEL[r.owner] ?? r.owner}
                                </Badge>
                                <span className="w-10 text-right font-semibold">{r.count}</span>
                            </span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">ตารางสถานี</CardTitle>
                        <CardDescription>คะแนนสถานีแสดงเมื่อมีอย่างน้อย {data.minimumStationSample ?? 20} คำตอบจาก QR สถานี</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>สถานี</TableHead>
                                    <TableHead>คำตอบ</TableHead>
                                    <TableHead>เฉลี่ย</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.stations.map((st) => {
                                    const meetsMinimum = st.count >= (data.minimumStationSample ?? 20);
                                    return (
                                        <TableRow key={st.id}>
                                            <TableCell>{st.name}</TableCell>
                                            <TableCell>{st.count}</TableCell>
                                            <TableCell>{meetsMinimum && st.average !== null ? st.average.toFixed(2) : <span className="text-xs text-muted-foreground">ข้อมูลยังไม่พอ</span>}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">ตารางพนักงาน</CardTitle>
                        <CardDescription>
                            แสดงเฉพาะผู้ที่มีอย่างน้อย {data.minimumEmployeeSample} คำตอบที่ผ่านการตรวจ
                            {data.coverage?.usesHistoricalAggregates ? " ข้อมูลรายชื่อเก็บตามอายุข้อมูล ส่วนยอดรวมย้อนหลังมาจากสรุปรายวัน" : ""}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.employees.length === 0 ? (
                            <p className="text-sm text-muted-foreground">ยังไม่มีพนักงานที่ถึงเกณฑ์จำนวนคำตอบขั้นต่ำ</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>พนักงาน</TableHead>
                                        <TableHead>คำตอบ</TableHead>
                                        <TableHead>เฉลี่ย</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.employees.map((e) => (
                                        <TableRow key={e.id}>
                                            <TableCell>{e.name}</TableCell>
                                            <TableCell>{e.count}</TableCell>
                                            <TableCell>{e.average !== null ? e.average.toFixed(2) : "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
