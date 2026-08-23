"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Printer, RefreshCcw, QrCode } from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";

interface QrRow {
    id: string;
    targetType: string;
    employee: { id: string; name: string; employeeCode: string; isActive: boolean; stationName: string | null } | null;
    station: { id: string; name: string; isActive: boolean; publicEmergencyPhone: string | null } | null;
    publicLabel: string;
    publicPosition: string | null;
    publicProfileApprovedAt: string | null;
    isActive: boolean;
    isTest: boolean;
    needsReprint: boolean;
    version: number;
    tokenHint: string;
    manualCodeHint: string;
    lastResolvedAt: string | null;
    lastPrintedAt: string | null;
    rotatedAt: string | null;
    createdAt: string;
}

export function QrCodesTab() {
    const [rows, setRows] = useState<QrRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [targetType, setTargetType] = useState<"EMPLOYEE" | "STATION">("EMPLOYEE");

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/customer-feedback/qr-codes?targetType=${targetType}${search ? `&search=${encodeURIComponent(search)}` : ""}`);
        if (res.ok) {
            const data = await res.json();
            setRows(data.qrCodes);
        }
        setIsLoading(false);
    }, [targetType, search]);

    useEffect(() => {
        const timer = setTimeout(() => void load(), 0);
        return () => clearTimeout(timer);
    }, [load]);

    const act = async (id: string, body: Record<string, unknown>, confirmMsg?: string) => {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        const res = await fetch(`/api/admin/customer-feedback/qr-codes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
            if (data.qrUrl) {
                toast.success(data.message ?? "สำเร็จ — กำลังเปิดหน้าพิมพ์ป้าย");
                openPrintWindow(data.qrUrl, data.manualEntryUrl, data.manualCode);
            } else {
                toast.success(data.message ?? "สำเร็จ");
            }
            void load();
        } else {
            toast.error(data.error ?? "ทำรายการไม่สำเร็จ");
        }
    };

    // ป้ายพิมพ์: QR URL + รหัสกรอกเอง 8 ตัวใต้ QR (สร้าง QR ด้วย qrcode-generator ฝั่ง client)
    const openPrintWindow = (qrUrl: string, manualEntryUrl: string, manualCode: string) => {
        import("@/lib/qr-code").then(({ generateQRCodeSVG }) => {
            const svg = generateQRCodeSVG(qrUrl, 240);
            const w = window.open("", "_blank");
            if (!w) {
                toast.error("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ — กรุณาอนุญาต pop-up");
                return;
            }
            w.document.write(`<!doctype html><html><head><title>ป้าย QR เสียงลูกค้า</title><style>
                body{font-family:sans-serif;display:flex;justify-content:center;padding:24px;color:#111}
                .badge{border:2px solid #111;padding:16px 24px;text-align:center;max-width:340px}
                .code{background:#fff;padding:12px;margin:8px auto;width:240px}
                .manual{font-family:monospace;font-size:20px;letter-spacing:4px;margin-top:8px}
                .url{font-size:12px;color:#333;margin-top:6px}
            </style></head><body>
                <div class="badge">
                    <div style="font-weight:700;font-size:18px">สแกนเพื่อประเมินการบริการ</div>
                    <div style="font-size:13px;color:#444">ใช้เวลาประมาณ 1 นาที ไม่ต้องระบุชื่อ</div>
                    <div class="code">${svg}</div>
                    <div>สแกนไม่ได้? ไปที่ ${manualEntryUrl}</div>
                    <div>แล้วกรอกรหัส: <span class="manual">${manualCode}</span></div>
                </div>
            </body></html>`);
            w.document.close();
        });
    };

    const createForEmployee = async () => {
        const employeeCode = window.prompt("รหัสพนักงาน (employeeId) ที่ต้องการสร้าง QR:");
        if (!employeeCode) return;
        const res = await fetch("/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType: "EMPLOYEE", employeeCode }),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success(
                `สร้าง QR ชื่อ "${data.qrCode?.publicLabel ?? ""}" แล้ว — ยังไม่เปิดใช้งานจนกว่าจะบันทึกการรับทราบข้อมูลสาธารณะ`
            );
            // ชื่อเล่นซ้ำกับเพื่อนร่วมสถานี ลูกค้าอาจให้คะแนนผิดคน
            if (data.warning) toast.warning(data.warning, { duration: 10000 });
            void load();
        } else {
            toast.error(data.error ?? "สร้างไม่สำเร็จ");
        }
    };

    const createForStation = async () => {
        const stationName = window.prompt("ชื่อสถานี (หรือชื่อบางส่วน) ที่ต้องการสร้าง QR หลัก:");
        if (!stationName) return;
        const res = await fetch("/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType: "STATION", stationName }),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success("สร้าง QR สถานีแล้ว — ต้องพิมพ์ป้ายก่อนเปิดใช้งาน");
            void load();
        } else {
            toast.error(data.error ?? "สร้างไม่สำเร็จ");
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="flex flex-wrap items-end gap-2 pt-6">
                    <div className="flex gap-1">
                        <Button size="sm" variant={targetType === "EMPLOYEE" ? "default" : "outline"} onClick={() => setTargetType("EMPLOYEE")}>พนักงาน</Button>
                        <Button size="sm" variant={targetType === "STATION" ? "default" : "outline"} onClick={() => setTargetType("STATION")}>สถานี</Button>
                    </div>
                    <Input
                        placeholder="ค้นหาชื่อ/รหัสพนักงาน/สถานี"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64"
                    />
                    <Button size="sm" onClick={() => void load()}><Loader2 className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "hidden"} />ค้นหา</Button>
                    <div className="ml-auto flex gap-1">
                        {targetType === "EMPLOYEE" ? (
                            <Button size="sm" variant="outline" onClick={() => void createForEmployee()}><QrCode className="mr-1 h-4 w-4" />สร้าง QR พนักงาน</Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => void createForStation()}><QrCode className="mr-1 h-4 w-4" />สร้าง QR สถานี</Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>เป้าหมาย</TableHead>
                                <TableHead>ชื่อสาธารณะ</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead>รหัสท้าย</TableHead>
                                <TableHead>สแกนล่าสุด / พิมพ์ล่าสุด</TableHead>
                                <TableHead>การกระทำ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">ยังไม่มี QR — สร้างจากปุ่มด้านบน</TableCell></TableRow>
                            ) : (
                                rows.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell className="text-xs">
                                            {q.employee ? (
                                                <>
                                                    <div>{q.employee.name} ({q.employee.employeeCode})</div>
                                                    <div className="text-muted-foreground">{q.employee.stationName ?? "-"}</div>
                                                </>
                                            ) : (
                                                q.station?.name ?? "-"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div>{q.publicLabel}</div>
                                            <div className="text-muted-foreground">{q.publicPosition ?? ""}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant={q.isActive ? "default" : "outline"}>{q.isActive ? "ใช้งาน" : "ปิด"}</Badge>
                                                {q.isTest && <Badge variant="secondary">ทดสอบ</Badge>}
                                                {q.needsReprint && <Badge variant="destructive">ต้องพิมพ์ป้าย</Badge>}
                                                {q.targetType === "EMPLOYEE" && !q.publicProfileApprovedAt && <Badge variant="destructive">รอรับทราบข้อมูลสาธารณะ</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            …{q.tokenHint} / …{q.manualCodeHint}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div>สแกน: {q.lastResolvedAt ? formatThaiDate(q.lastResolvedAt) : "-"}</div>
                                            <div>พิมพ์: {q.lastPrintedAt ? formatThaiDate(q.lastPrintedAt) : "-"}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {q.targetType === "EMPLOYEE" && !q.publicProfileApprovedAt && (
                                                    <Button size="sm" variant="outline" onClick={() => void act(q.id, { action: "approve-public-profile" }, "ยืนยันว่าพนักงานรับทราบและยินยอมให้แสดงชื่อ/ตำแหน่งนี้ต่อสาธารณะ?")}>
                                                        บันทึกรับทราบ
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={() => void act(q.id, { action: "reveal" })}>
                                                    <Printer className="mr-1 h-4 w-4" />พิมพ์ป้าย
                                                </Button>
                                                {q.isActive ? (
                                                    <Button size="sm" variant="ghost" onClick={() => void act(q.id, { action: "deactivate" }, "ปิดใช้งาน QR นี้?")}>ปิดใช้งาน</Button>
                                                ) : (
                                                    <Button size="sm" onClick={() => void act(q.id, { action: "activate" })}>เปิดใช้งาน</Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => void act(q.id, { action: "rotate" }, "หมุนรหัสแล้วป้ายเก่าจะใช้ไม่ได้ทันที ต้องพิมพ์ป้ายใหม่ — ยืนยัน?")}
                                                >
                                                    <RefreshCcw className="mr-1 h-4 w-4" />หมุนรหัส
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => void act(q.id, { action: "MARK_PRINTED" })}>บันทึกว่าพิมพ์แล้ว</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
