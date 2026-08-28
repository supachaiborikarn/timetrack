"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Printer, RefreshCcw, QrCode } from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";
import { buildCustomerFeedbackA4PosterHtml } from "@/lib/customer-feedback/print-poster";
import { EmployeePickerDialog } from "./employee-picker-dialog";
import { StationPickerDialog } from "./station-picker-dialog";

type PrintFormat = "badge" | "a4-landscape";

interface QrRow {
    id: string;
    targetType: string;
    employee: { id: string; name: string; employeeCode: string; isActive: boolean; stationName: string | null } | null;
    station: { id: string; name: string; isActive: boolean; publicEmergencyPhone: string | null } | null;
    publicLabel: string;
    publicPosition: string | null;
    publicProfileApprovedAt: string | null;
    placement: string;
    placementKey: string | null;
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

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    })[character]!);
}

export function QrCodesTab() {
    const [rows, setRows] = useState<QrRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [targetType, setTargetType] = useState<"EMPLOYEE" | "STATION">("EMPLOYEE");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [stationPickerOpen, setStationPickerOpen] = useState(false);
    const [createAsTest, setCreateAsTest] = useState(true);
    const [editing, setEditing] = useState<QrRow | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editPosition, setEditPosition] = useState("");

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

    async function markPrinted(id: string, expectedVersion: number): Promise<void> {
        const response = await fetch(`/api/admin/customer-feedback/qr-codes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "MARK_PRINTED", expectedVersion }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            toast.success("สร้างป้ายสำหรับ QR เวอร์ชันนี้แล้ว");
        } else if (response.status === 409) {
            toast.error("QR ถูกหมุนรหัสระหว่างสร้างป้าย รายการถูกโหลดใหม่แล้ว");
        } else {
            toast.error(data.error ?? "บันทึกเวอร์ชันป้ายไม่สำเร็จ");
        }
        await load();
    }

    async function openPrintWindow(
        qrUrl: string,
        manualEntryUrl: string,
        manualCode: string,
        row: QrRow,
        expectedVersion: number,
        format: PrintFormat = "badge"
    ): Promise<boolean> {
        try {
            const { generateQRCodeSVG } = await import("@/lib/qr-code");
            const svg = generateQRCodeSVG(qrUrl, 240);
            const printWindow = window.open("", "_blank");
            if (!printWindow) {
                toast.error("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต pop-up");
                return false;
            }
            const rawTargetLabel = row.publicLabel || row.station?.name || "QR เสียงลูกค้า";
            const rawSubtitle = row.targetType === "EMPLOYEE"
                ? [row.publicPosition, row.employee?.stationName].filter(Boolean).join(" · ")
                : [row.station?.name, row.placementKey ?? row.placement].filter(Boolean).join(" · ");
            const targetLabel = escapeHtml(rawTargetLabel);
            const subtitle = escapeHtml(rawSubtitle);
            if (format === "a4-landscape") {
                printWindow.document.write(buildCustomerFeedbackA4PosterHtml({
                    qrUrl,
                    manualEntryUrl,
                    manualCode,
                    targetType: row.targetType === "EMPLOYEE" ? "EMPLOYEE" : "STATION",
                    targetLabel: rawTargetLabel,
                    publicPosition: row.targetType === "EMPLOYEE" ? row.publicPosition ?? undefined : undefined,
                    stationLabel: row.targetType === "EMPLOYEE" ? row.employee?.stationName ?? undefined : row.station?.name ?? undefined,
                    placementLabel: row.targetType === "STATION" ? row.placementKey ?? row.placement : undefined,
                    subtitle: rawSubtitle,
                    isTest: row.isTest,
                    version: expectedVersion,
                }));
            } else {
                printWindow.document.write(`<!doctype html><html lang="th"><head><title>ป้าย QR ${targetLabel}</title><style>
                body{font-family:sans-serif;display:flex;justify-content:center;padding:24px;color:#111}
                .badge{border:2px solid #111;padding:16px 24px;text-align:center;max-width:340px}
                .target{font-weight:700;font-size:22px;margin-top:8px}.subtitle{font-size:14px;color:#333;margin-top:4px}
                .code{background:#fff;padding:12px;margin:8px auto;width:240px}
                .manual{font-family:monospace;font-size:20px;letter-spacing:4px;margin-top:8px}
                @media print{body{padding:0}.badge{break-inside:avoid}}
            </style></head><body><div class="badge">
                <div style="font-weight:700;font-size:18px">สแกนเพื่อประเมินการบริการ</div>
                ${row.isTest ? '<div style="margin:8px 0;padding:6px;background:#fee2e2;color:#991b1b;font-weight:700">แบบทดสอบ — ไม่นำคะแนนไปใช้</div>' : ""}
                <div class="target">${targetLabel}</div><div class="subtitle">${subtitle}</div>
                <div style="font-size:13px;color:#444;margin-top:6px">ใช้เวลาประมาณ 1 นาที ไม่ต้องระบุชื่อ</div>
                <div class="code">${svg}</div>
                <div>สแกนไม่ได้? ไปที่ ${escapeHtml(manualEntryUrl)}</div>
                <div>แล้วกรอกรหัส: <span class="manual">${escapeHtml(manualCode)}</span></div>
                <div style="font-size:10px;color:#666;margin-top:8px">QR version ${expectedVersion}</div>
            </div></body></html>`);
            }
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            return window.confirm("พิมพ์ป้ายหรือบันทึกเป็น PDF สำเร็จแล้วใช่หรือไม่?");
        } catch {
            toast.error("สร้างป้าย QR ไม่สำเร็จ");
            return false;
        }
    }

    const act = async (id: string, body: Record<string, unknown>, confirmMsg?: string, printFormat: PrintFormat = "badge") => {
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
                const row = rows.find((item) => item.id === id);
                if (row) {
                    const printableQrId = typeof data.qrCode?.id === "string" ? data.qrCode.id : id;
                    const expectedVersion = typeof data.version === "number" ? data.version : row.version;
                    const printRow = {
                        ...row,
                        ...(body.action === "promote-test" ? { isTest: false } : {}),
                        ...(typeof data.publicLabel === "string" ? { publicLabel: data.publicLabel } : {}),
                        ...(data.publicPosition === null || typeof data.publicPosition === "string"
                            ? { publicPosition: data.publicPosition }
                            : {}),
                    };
                    const created = await openPrintWindow(data.qrUrl, data.manualEntryUrl, data.manualCode, printRow, expectedVersion, printFormat);
                    if (created) await markPrinted(printableQrId, expectedVersion);
                    else toast.info("ยังไม่บันทึกว่าพิมพ์สำเร็จ สามารถเปิดพิมพ์ใหม่ได้");
                }
            } else {
                toast.success(data.message ?? "สำเร็จ");
            }
            void load();
        } else {
            toast.error(data.error ?? "ทำรายการไม่สำเร็จ");
            if (res.status === 409) void load();
        }
    };

    const createForEmployee = async (employeeCode: string) => {
        const res = await fetch("/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType: "EMPLOYEE", employeeCode, isTest: createAsTest }),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success(
                `สร้าง QR ชื่อ "${data.qrCode?.publicLabel ?? ""}" แล้ว${createAsTest ? "ในโหมดทดสอบ" : ""} — ยังไม่เปิดใช้งานจนกว่าจะบันทึกการรับทราบข้อมูลสาธารณะ`
            );
            // ชื่อเล่นซ้ำกับเพื่อนร่วมสถานี ลูกค้าอาจให้คะแนนผิดคน
            if (data.warning) toast.warning(data.warning, { duration: 10000 });
            void load();
        } else {
            toast.error(data.error ?? "สร้างไม่สำเร็จ");
        }
    };

    const createForStation = async (stationId: string) => {
        const res = await fetch("/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetType: "STATION", stationId, isTest: createAsTest }),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success(`สร้าง QR สถานีแล้ว${createAsTest ? "ในโหมดทดสอบ" : ""} — ต้องพิมพ์ป้ายก่อนเปิดใช้งาน`);
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
                    <Button size="sm" onClick={() => void load()}><Loader2 className={isLoading ? "mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" : "hidden"} />ค้นหา</Button>
                    <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm">
                        <input type="checkbox" checked={createAsTest} onChange={(event) => setCreateAsTest(event.target.checked)} />
                        สร้างเป็น QR ทดสอบ
                    </label>
                    <div className="ml-auto flex gap-1">
                        {targetType === "EMPLOYEE" ? (
                            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}><QrCode className="mr-1 h-4 w-4" />สร้าง QR พนักงาน</Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => setStationPickerOpen(true)}><QrCode className="mr-1 h-4 w-4" />สร้าง QR สถานี</Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto"><Table>
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
                                <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin motion-reduce:animate-none" /></TableCell></TableRow>
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
                                                    <Button size="sm" variant="outline" onClick={() => void act(q.id, { action: "approve-public-profile", expectedVersion: q.version }, "ยืนยันว่าพนักงานรับทราบและยินยอมให้แสดงชื่อ/ตำแหน่งนี้ต่อสาธารณะ?")}>
                                                        บันทึกรับทราบ
                                                    </Button>
                                                )}
                                                {(q.targetType !== "EMPLOYEE" || q.publicProfileApprovedAt) && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            title="A4 แนวนอน สำหรับใส่กรอบหรือป้ายวางหน้ารถ"
                                                            onClick={() => void act(q.id, { action: "reveal", expectedVersion: q.version }, undefined, "a4-landscape")}
                                                        >
                                                            <Printer className="mr-1 h-4 w-4" />A4 แนวนอน
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => void act(q.id, { action: "reveal", expectedVersion: q.version })}>
                                                            ป้ายเล็ก
                                                        </Button>
                                                    </>
                                                )}
                                                {q.isActive ? (
                                                    <Button size="sm" variant="ghost" onClick={() => void act(q.id, { action: "deactivate", expectedVersion: q.version }, "ปิดใช้งาน QR นี้?")}>ปิดใช้งาน</Button>
                                                ) : (
                                                    <Button size="sm" onClick={() => void act(q.id, { action: "activate", expectedVersion: q.version })}>เปิดใช้งาน</Button>
                                                )}
                                                {q.isTest && !q.isActive && (
                                                    <Button size="sm" variant="outline" onClick={() => void act(q.id, { action: "promote-test", expectedVersion: q.version }, "สร้าง QR ใช้งานจริงแยกจาก QR ทดสอบใบนี้? ต้องพิมพ์ป้ายใหม่ก่อนเปิดใช้")}>เปลี่ยนเป็นใช้งานจริง</Button>
                                                )}
                                                {!q.isActive && (
                                                    <Button size="sm" variant="ghost" onClick={() => {
                                                        setEditing(q);
                                                        setEditLabel(q.publicLabel);
                                                        setEditPosition(q.publicPosition ?? "");
                                                    }}>แก้ข้อมูลบนป้าย</Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => void act(q.id, { action: "rotate", expectedVersion: q.version }, "หมุนรหัสแล้วป้ายเก่าจะใช้ไม่ได้ทันที ต้องพิมพ์ป้ายใหม่ — ยืนยัน?")}
                                                >
                                                    <RefreshCcw className="mr-1 h-4 w-4" />หมุนรหัส
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table></div>
                </CardContent>
            </Card>

            <EmployeePickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={createForEmployee}
            />
            <StationPickerDialog
                open={stationPickerOpen}
                onOpenChange={setStationPickerOpen}
                onSelect={createForStation}
            />
            <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>แก้ข้อมูลบนป้าย QR</DialogTitle>
                        <DialogDescription>ระบบจะหมุนรหัสและปิด QR ใบเดิม จากนั้นต้องพิมพ์ป้ายใหม่ก่อนเปิดใช้งาน</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label htmlFor="qr-public-label" className="text-sm font-semibold">ชื่อสาธารณะ</label>
                            <Input id="qr-public-label" value={editLabel} onChange={(event) => setEditLabel(event.target.value)} maxLength={100} />
                        </div>
                        {editing?.targetType === "EMPLOYEE" && (
                            <div className="space-y-1">
                                <label htmlFor="qr-public-position" className="text-sm font-semibold">ตำแหน่งสาธารณะ</label>
                                <Input id="qr-public-position" value={editPosition} onChange={(event) => setEditPosition(event.target.value)} maxLength={100} />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)}>ยกเลิก</Button>
                        <Button
                            disabled={!editing || !editLabel.trim() || (editing?.targetType === "EMPLOYEE" && !editPosition.trim())}
                            onClick={() => {
                                if (!editing) return;
                                const row = editing;
                                setEditing(null);
                                void act(row.id, {
                                    action: "update-label",
                                    expectedVersion: row.version,
                                    publicLabel: editLabel.trim(),
                                    ...(row.targetType === "EMPLOYEE" ? { publicPosition: editPosition.trim() } : {}),
                                });
                            }}
                        >บันทึกและพิมพ์ป้ายใหม่</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
