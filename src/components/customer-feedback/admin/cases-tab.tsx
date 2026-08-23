"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatBangkokDateTime } from "@/lib/date-utils";

interface CaseRow {
    id: string;
    severity: string;
    status: string;
    category: string;
    dueAt: string;
    acknowledgedAt: string | null;
    createdAt: string;
    assignedTo: { id: string; name: string } | null;
    response: {
        refCode: string;
        kind: string;
        overallRating: number | null;
        incidentKey: string | null;
        stationLabelSnapshot: string | null;
        employeeLabelSnapshot: string | null;
        comment: string | null;
    };
}

const SEVERITY_STYLE: Record<string, string> = {
    URGENT: "border-l-4 border-l-red-600 font-bold",
    HIGH: "border-l-4 border-l-amber-500",
    NORMAL: "",
};

export function CasesTab() {
    const [rows, setRows] = useState<CaseRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [now] = useState(() => Date.now());

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/customer-feedback/cases");
        if (res.ok) {
            const data = await res.json();
            setRows(data.cases);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => void load(), 0);
        return () => clearTimeout(timer);
    }, [load]);

    const act = async (id: string, body: Record<string, unknown>) => {
        const res = await fetch(`/api/admin/customer-feedback/cases/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success(data.message ?? "อัปเดตแล้ว");
            void load();
        } else {
            toast.error(data.error ?? "อัปเดตไม่สำเร็จ");
        }
    };

    const overdue = (dueAt: string) => new Date(dueAt).getTime() < now;

    return (
        <Card>
            <CardContent className="space-y-3 pt-6">
                <p className="text-sm text-muted-foreground">เคส OPEN และ IN_PROGRESS เรียงตามความรุนแรงและเวลา SLA — URGENT ต้องรับทราบภายใน 2 ชม., HIGH ภายใน 24 ชม., NORMAL ภายใน 72 ชม.</p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ระดับ</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead>สถานี / เป้าหมาย</TableHead>
                            <TableHead>รายละเอียด</TableHead>
                            <TableHead>SLA</TableHead>
                            <TableHead>การกระทำ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">ไม่มีเคสค้าง</TableCell></TableRow>
                        ) : (
                            rows.map((c) => (
                                <TableRow key={c.id} className={SEVERITY_STYLE[c.severity]}>
                                    <TableCell>
                                        <Badge variant={c.severity === "URGENT" ? "destructive" : c.severity === "HIGH" ? "secondary" : "outline"}>
                                            {c.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{c.status}</TableCell>
                                    <TableCell className="text-xs">
                                        <div>{c.response.stationLabelSnapshot ?? "(รอระบุสถานี)"}</div>
                                        <div className="text-muted-foreground">{c.response.employeeLabelSnapshot ?? c.response.refCode}</div>
                                    </TableCell>
                                    <TableCell className="max-w-56 truncate text-xs">{c.response.comment ?? c.response.incidentKey ?? "-"}</TableCell>
                                    <TableCell className="whitespace-nowrap text-xs">
                                        <span className={overdue(c.dueAt) ? "font-bold text-red-600" : ""}>
                                            ถึง {formatBangkokDateTime(c.dueAt)}
                                        </span>
                                        {c.acknowledgedAt && <div className="text-green-600">รับทราบแล้ว</div>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {!c.acknowledgedAt && (
                                                <Button size="sm" variant="outline" onClick={() => void act(c.id, { action: "acknowledge" })}>รับทราบ</Button>
                                            )}
                                            {c.status === "OPEN" && (
                                                <Button size="sm" variant="outline" onClick={() => void act(c.id, { action: "start" })}>เริ่มดำเนินการ</Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const note = window.prompt("วิธีจัดการเคสนี้:");
                                                    if (note?.trim()) void act(c.id, { action: "resolve", resolutionNote: note });
                                                }}
                                            >
                                                ปิดเคส
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600"
                                                onClick={() => {
                                                    const reason = window.prompt("เหตุผลที่ยกเลิก:");
                                                    if (reason?.trim()) void act(c.id, { action: "dismiss", dismissedReason: reason });
                                                }}
                                            >
                                                ยกเลิก
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
