"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";

/**
 * เลือกพนักงานสำหรับสร้าง QR เสียงลูกค้า
 *
 * เดิมใช้ window.prompt ให้พิมพ์รหัสพนักงานเอง ต้องจำรหัสให้ได้และพิมพ์ผิดไม่รู้ตัว
 * ตัวนี้ค้นจากชื่อ/ชื่อเล่น/รหัส แล้วบอกตั้งแต่ในรายการว่าคนไหนสร้างไม่ได้เพราะอะไร
 */

export interface Candidate {
    employeeCode: string;
    name: string;
    nickName: string | null;
    stationName: string | null;
    previewLabel: string | null;
    blockedReason: string | null;
    existingQr: { id: string; isActive: boolean; publicLabel: string } | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (employeeCode: string) => Promise<void> | void;
}

export function EmployeePickerDialog({ open, onOpenChange, onSelect }: Props) {
    const [search, setSearch] = useState("");
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [truncated, setTruncated] = useState(false);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (term: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/admin/customer-feedback/qr-codes/candidates?search=${encodeURIComponent(term)}`
            );
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "โหลดรายชื่อไม่สำเร็จ");
                setCandidates([]);
                return;
            }
            setCandidates(data.candidates ?? []);
            setTruncated(Boolean(data.truncated));
        } catch {
            setError("เชื่อมต่อไม่ได้");
            setCandidates([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        const id = setTimeout(() => void load(search), search ? 250 : 0);
        return () => clearTimeout(id);
    }, [open, search, load]);

    const choose = async (c: Candidate) => {
        if (c.blockedReason || c.existingQr) return;
        setSubmitting(c.employeeCode);
        try {
            await onSelect(c.employeeCode);
            onOpenChange(false);
            setSearch("");
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>เลือกพนักงานที่จะสร้าง QR</DialogTitle>
                    <DialogDescription>
                        ป้ายจะแสดงชื่อเล่นกับตำแหน่งเท่านั้น ไม่แสดงชื่อจริงต่อลูกค้า
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        autoFocus
                        className="pl-8"
                        placeholder="ค้นจากชื่อ ชื่อเล่น หรือรหัสพนักงาน"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="max-h-[50vh] space-y-1 overflow-y-auto">
                    {isLoading && (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {!isLoading && error && (
                        <p className="py-6 text-center text-sm text-destructive">{error}</p>
                    )}

                    {!isLoading && !error && candidates.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {search ? "ไม่พบพนักงานที่ตรงกับคำค้น" : "ไม่มีพนักงานให้เลือก"}
                        </p>
                    )}

                    {!isLoading &&
                        candidates.map((c) => {
                            const disabled = Boolean(c.blockedReason) || Boolean(c.existingQr) || submitting !== null;
                            return (
                                <button
                                    key={c.employeeCode}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => void choose(c)}
                                    className="flex w-full items-center justify-between gap-3 rounded-md border p-2 text-left transition-colors enabled:hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-medium">
                                                {c.previewLabel ?? c.nickName ?? "— ไม่มีชื่อเล่น —"}
                                            </span>
                                            {c.existingQr && (
                                                <Badge variant={c.existingQr.isActive ? "default" : "secondary"}>
                                                    {c.existingQr.isActive ? "มี QR ใช้งานอยู่" : "มี QR รอเปิดใช้"}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {c.name} · {c.employeeCode}
                                            {c.stationName ? ` · ${c.stationName}` : ""}
                                        </div>
                                        {c.blockedReason && (
                                            <div className="mt-0.5 text-xs text-destructive">{c.blockedReason}</div>
                                        )}
                                    </div>
                                    {submitting === c.employeeCode ? (
                                        <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
                                    ) : (
                                        <span className="inline-flex min-h-8 items-center rounded-md border px-3 text-xs font-medium">สร้าง</span>
                                    )}
                                </button>
                            );
                        })}

                    {truncated && (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                            แสดง 50 รายชื่อแรก — พิมพ์ค้นหาเพื่อจำกัดให้แคบลง
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
