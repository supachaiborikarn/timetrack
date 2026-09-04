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
import {
    buildCustomerFeedbackA4PosterHtml,
    buildCustomerFeedbackSmallLabelA4SheetHtml,
    buildCustomerFeedbackSmallLabelHtml,
    type CustomerFeedbackA4PosterInput,
} from "@/lib/customer-feedback/print-poster";
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

export function QrCodesTab() {
    const [rows, setRows] = useState<QrRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [targetType, setTargetType] = useState<"EMPLOYEE" | "STATION">("EMPLOYEE");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [stationPickerOpen, setStationPickerOpen] = useState(false);
    const [stationCreateMode, setStationCreateMode] = useState<"station" | "restroom">("station");
    const [createAsTest, setCreateAsTest] = useState(true);
    const [editing, setEditing] = useState<QrRow | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editPosition, setEditPosition] = useState("");
    const [selectedPrintIds, setSelectedPrintIds] = useState<string[]>([]);
    const [isBulkPrinting, setIsBulkPrinting] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/customer-feedback/qr-codes?targetType=${targetType}${search ? `&search=${encodeURIComponent(search)}` : ""}`);
        if (res.ok) {
            const data = await res.json();
            const nextRows = data.qrCodes as QrRow[];
            setRows(nextRows);
            setSelectedPrintIds((current) => current.filter((id) => nextRows.some((row) =>
                row.id === id
                && row.targetType === "EMPLOYEE"
                && Boolean(row.publicProfileApprovedAt)
                && Boolean(row.employee?.isActive)
            )));
        }
        setIsLoading(false);
    }, [targetType, search]);

    useEffect(() => {
        const timer = setTimeout(() => void load(), 0);
        return () => clearTimeout(timer);
    }, [load]);

    const printableEmployeeRows = rows.filter((row) =>
        row.targetType === "EMPLOYEE"
        && Boolean(row.publicProfileApprovedAt)
        && Boolean(row.employee?.isActive)
    );
    const selectedPrintableRows = printableEmployeeRows.filter((row) => selectedPrintIds.includes(row.id));
    const allPrintableSelected = printableEmployeeRows.length > 0
        && printableEmployeeRows.every((row) => selectedPrintIds.includes(row.id));

    function makePosterInput(
        row: QrRow,
        qrUrl: string,
        manualEntryUrl: string,
        manualCode: string,
        expectedVersion: number,
        publicLabel?: string,
        publicPosition?: string | null
    ): CustomerFeedbackA4PosterInput {
        const rawTargetLabel = publicLabel || row.publicLabel || row.station?.name || "QR เสียงลูกค้า";
        const resolvedPosition = publicPosition === undefined ? row.publicPosition : publicPosition;
        const rawSubtitle = row.targetType === "EMPLOYEE"
            ? [resolvedPosition, row.employee?.stationName].filter(Boolean).join(" · ")
            : [row.placementKey ?? row.placement].filter(Boolean).join(" · ");
        return {
            qrUrl,
            manualEntryUrl,
            manualCode,
            targetType: row.targetType === "EMPLOYEE" ? "EMPLOYEE" : "STATION",
            targetLabel: rawTargetLabel,
            positionLabel: row.targetType === "EMPLOYEE" ? resolvedPosition ?? undefined : undefined,
            stationLabel: row.targetType === "EMPLOYEE" ? row.employee?.stationName ?? undefined : row.station?.name ?? undefined,
            subtitle: rawSubtitle,
            isTest: row.isTest,
            version: expectedVersion,
            assetBaseUrl: window.location.origin,
        };
    }

    async function waitForPrintAssets(printWindow: Window): Promise<void> {
        const imagesReady = Array.from(printWindow.document.images).map((image) => {
            if (image.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
            });
        });
        await Promise.race([
            Promise.all([printWindow.document.fonts.ready, ...imagesReady]),
            new Promise<void>((resolve) => window.setTimeout(resolve, 1800)),
        ]);
    }

    async function markPrinted(id: string, expectedVersion: number): Promise<void> {
        const response = await fetch(`/api/admin/customer-feedback/qr-codes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "MARK_PRINTED", expectedVersion }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            toast.success(data.message ?? "สร้างป้ายสำหรับ QR เวอร์ชันนี้แล้ว");
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
            const printWindow = window.open("", "_blank");
            if (!printWindow) {
                toast.error("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต pop-up");
                return false;
            }
            const posterInput = makePosterInput(row, qrUrl, manualEntryUrl, manualCode, expectedVersion);
            printWindow.document.write(
                format === "a4-landscape"
                    ? buildCustomerFeedbackA4PosterHtml(posterInput)
                    : buildCustomerFeedbackSmallLabelHtml(posterInput)
            );
            printWindow.document.close();

            await waitForPrintAssets(printWindow);

            printWindow.focus();
            printWindow.print();
            return window.confirm("พิมพ์ป้ายหรือบันทึกเป็น PDF สำเร็จแล้วใช่หรือไม่?");
        } catch {
            toast.error("สร้างป้าย QR ไม่สำเร็จ");
            return false;
        }
    }

    const printSelectedEmployeeLabels = async () => {
        const selectedRows = rows.filter((row) =>
            selectedPrintIds.includes(row.id)
            && row.targetType === "EMPLOYEE"
            && Boolean(row.publicProfileApprovedAt)
            && Boolean(row.employee?.isActive)
        );
        if (selectedRows.length === 0) {
            toast.error("กรุณาเลือกพนักงานที่พร้อมพิมพ์อย่างน้อย 1 คน");
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต pop-up");
            return;
        }
        printWindow.document.write('<!doctype html><html lang="th"><meta charset="utf-8"><title>กำลังเตรียมป้าย</title><body style="font-family:sans-serif;padding:24px">กำลังเตรียมป้ายพนักงาน...</body></html>');
        printWindow.document.close();
        setIsBulkPrinting(true);

        type RevealedLabel = {
            row: QrRow;
            version: number;
            input: CustomerFeedbackA4PosterInput;
        };
        const revealed: RevealedLabel[] = [];
        const revealFailures: string[] = [];

        try {
            // Limit concurrent reveal transactions so a large selection does not spike the DB pool.
            for (let index = 0; index < selectedRows.length; index += 6) {
                const chunk = selectedRows.slice(index, index + 6);
                const chunkResults = await Promise.all(chunk.map(async (row) => {
                    const response = await fetch(`/api/admin/customer-feedback/qr-codes/${row.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "reveal", expectedVersion: row.version }),
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok || !data.qrUrl || !data.manualEntryUrl || !data.manualCode) {
                        return { ok: false as const, row, error: data.error ?? "เปิดรหัสสำหรับพิมพ์ไม่สำเร็จ" };
                    }
                    const version = typeof data.version === "number" ? data.version : row.version;
                    return {
                        ok: true as const,
                        value: {
                            row,
                            version,
                            input: makePosterInput(
                                row,
                                data.qrUrl,
                                data.manualEntryUrl,
                                data.manualCode,
                                version,
                                typeof data.publicLabel === "string" ? data.publicLabel : undefined,
                                data.publicPosition === null || typeof data.publicPosition === "string"
                                    ? data.publicPosition
                                    : undefined
                            ),
                        },
                    };
                }));
                for (const result of chunkResults) {
                    if (result.ok) revealed.push(result.value);
                    else revealFailures.push(`${result.row.publicLabel}: ${result.error}`);
                }
            }

            if (revealed.length === 0) {
                printWindow.close();
                toast.error(revealFailures[0] ?? "ไม่สามารถเตรียมป้ายที่เลือกได้");
                if (revealFailures.length > 1) toast.warning(`เตรียมป้ายไม่สำเร็จ ${revealFailures.length} รายการ`);
                await load();
                return;
            }
            if (revealFailures.length > 0) {
                toast.warning(`เตรียมได้ ${revealed.length}/${selectedRows.length} คน — ข้าม ${revealFailures.length} รายการที่มีปัญหา`, { duration: 8000 });
            }

            printWindow.document.open();
            printWindow.document.write(buildCustomerFeedbackSmallLabelA4SheetHtml(revealed.map((item) => item.input)));
            printWindow.document.close();
            await waitForPrintAssets(printWindow);
            printWindow.focus();
            printWindow.print();

            const pageCount = Math.ceil(revealed.length / 9);
            const confirmed = window.confirm(
                `พิมพ์หรือบันทึก PDF ป้าย ${revealed.length} คน (${pageCount} แผ่น A4) สำเร็จแล้วใช่หรือไม่?\n\nกด OK เมื่อพิมพ์สำเร็จจริง เพื่อบันทึกเวอร์ชันป้ายของทุกคนที่อยู่ในชุดนี้`
            );
            if (!confirmed) {
                toast.info("ยังไม่บันทึกว่าพิมพ์สำเร็จ สามารถเลือกชุดเดิมแล้วพิมพ์ใหม่ได้");
                await load();
                return;
            }

            const markedIds: string[] = [];
            const markFailures: string[] = [];
            for (let index = 0; index < revealed.length; index += 6) {
                const chunk = revealed.slice(index, index + 6);
                const chunkResults = await Promise.all(chunk.map(async ({ row, version }) => {
                    const response = await fetch(`/api/admin/customer-feedback/qr-codes/${row.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "MARK_PRINTED", expectedVersion: version }),
                    });
                    const data = await response.json().catch(() => ({}));
                    return response.ok
                        ? { ok: true as const, row }
                        : { ok: false as const, row, error: data.error ?? "บันทึกการพิมพ์ไม่สำเร็จ" };
                }));
                for (const result of chunkResults) {
                    if (result.ok) markedIds.push(result.row.id);
                    else markFailures.push(`${result.row.publicLabel}: ${result.error}`);
                }
            }

            setSelectedPrintIds((current) => current.filter((id) => !markedIds.includes(id)));
            if (markedIds.length > 0) {
                toast.success(`บันทึกการพิมพ์แล้ว ${markedIds.length} คน`);
            }
            if (markFailures.length > 0) {
                toast.error(`มี ${markFailures.length} รายการที่บันทึกการพิมพ์ไม่สำเร็จ กรุณาโหลดใหม่แล้วตรวจสอบ`, { duration: 9000 });
            }
            await load();
        } catch {
            if (!printWindow.closed) printWindow.close();
            toast.error("สร้าง A4 รวมป้ายพนักงานไม่สำเร็จ");
            await load();
        } finally {
            setIsBulkPrinting(false);
        }
    };

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
        const isRestroom = stationCreateMode === "restroom";
        const res = await fetch("/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                targetType: "STATION",
                stationId,
                isTest: createAsTest,
                ...(isRestroom ? { placement: "RESTROOM", placementKey: "RESTROOM_MAIN", serviceAreaKey: "restroom" } : {}),
            }),
        });
        const data = await res.json();
        if (res.ok) {
            toast.success(`สร้าง QR ${isRestroom ? "ประเมินห้องน้ำ" : "สถานี"}แล้ว${createAsTest ? "ในโหมดทดสอบ" : ""} — ต้องพิมพ์ป้ายก่อนเปิดใช้งาน`);
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
                    {targetType === "EMPLOYEE" && (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={selectedPrintableRows.length === 0 || isBulkPrinting}
                            onClick={() => void printSelectedEmployeeLabels()}
                            title="พิมพ์ป้าย 54 × 88 มม. แบบ 3 × 3 สูงสุด 9 คนต่อ A4 หนึ่งแผ่น"
                        >
                            {isBulkPrinting ? <Loader2 className="mr-1 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Printer className="mr-1 h-4 w-4" />}
                            A4 รวม 54×88 ({selectedPrintableRows.length})
                        </Button>
                    )}
                    <div className="ml-auto flex gap-1">
                        {targetType === "EMPLOYEE" ? (
                            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}><QrCode className="mr-1 h-4 w-4" />สร้าง QR พนักงาน</Button>
                        ) : (
                            <>
                                <Button size="sm" variant="outline" onClick={() => { setStationCreateMode("restroom"); setStationPickerOpen(true); }}><QrCode className="mr-1 h-4 w-4" />สร้าง QR ห้องน้ำ</Button>
                                <Button size="sm" variant="outline" onClick={() => { setStationCreateMode("station"); setStationPickerOpen(true); }}><QrCode className="mr-1 h-4 w-4" />สร้าง QR สถานี</Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto"><Table>
                        <TableHeader>
                            <TableRow>
                                {targetType === "EMPLOYEE" && (
                                    <TableHead className="w-10">
                                        <input
                                            type="checkbox"
                                            aria-label="เลือกพนักงานที่พร้อมพิมพ์ทั้งหมด"
                                            checked={allPrintableSelected}
                                            disabled={printableEmployeeRows.length === 0 || isBulkPrinting}
                                            onChange={(event) => setSelectedPrintIds(
                                                event.target.checked ? printableEmployeeRows.map((row) => row.id) : []
                                            )}
                                        />
                                    </TableHead>
                                )}
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
                                <TableRow><TableCell colSpan={targetType === "EMPLOYEE" ? 7 : 6} className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin motion-reduce:animate-none" /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={targetType === "EMPLOYEE" ? 7 : 6} className="text-center text-muted-foreground">ยังไม่มี QR — สร้างจากปุ่มด้านบน</TableCell></TableRow>
                            ) : (
                                rows.map((q) => (
                                    <TableRow key={q.id}>
                                        {targetType === "EMPLOYEE" && (
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    aria-label={`เลือกพิมพ์ป้าย ${q.publicLabel}`}
                                                    checked={selectedPrintIds.includes(q.id)}
                                                    disabled={
                                                        isBulkPrinting
                                                        || q.targetType !== "EMPLOYEE"
                                                        || !q.publicProfileApprovedAt
                                                        || !q.employee?.isActive
                                                    }
                                                    onChange={(event) => setSelectedPrintIds((current) =>
                                                        event.target.checked
                                                            ? [...new Set([...current, q.id])]
                                                            : current.filter((id) => id !== q.id)
                                                    )}
                                                />
                                            </TableCell>
                                        )}
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
                                                    <Button size="sm" variant="outline" onClick={() => void act(q.id, { action: "approve-public-profile", expectedVersion: q.version }, "ยืนยันว่าพนักงานรับทราบและยินยอมให้แสดงชื่อ/ตำแหน่งนี้ต่อสาธารณะ? หลังบันทึก QR จะเปิดใช้งานอัตโนมัติและสามารถพิมพ์/ทดสอบได้ทันที")}>
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
                                                        <Button size="sm" variant="ghost" title="ป้ายเล็กขนาดจริง 54 × 88 มม. สไตล์เดียวกับ A4" onClick={() => void act(q.id, { action: "reveal", expectedVersion: q.version })}>
                                                            ป้ายเล็ก
                                                        </Button>
                                                    </>
                                                )}
                                                {q.isActive ? (
                                                    <Button size="sm" variant="ghost" onClick={() => void act(q.id, { action: "deactivate", expectedVersion: q.version }, "ปิดใช้งาน QR นี้?")}>ปิดใช้งาน</Button>
                                                ) : q.targetType === "EMPLOYEE" && q.publicProfileApprovedAt && q.needsReprint ? (
                                                    <Button size="sm" variant="outline" disabled>กดพิมพ์เพื่อเปิดอัตโนมัติ</Button>
                                                ) : q.targetType !== "EMPLOYEE" || q.publicProfileApprovedAt ? (
                                                    <Button size="sm" onClick={() => void act(q.id, { action: "activate", expectedVersion: q.version })}>เปิดใช้งาน</Button>
                                                ) : null}
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
