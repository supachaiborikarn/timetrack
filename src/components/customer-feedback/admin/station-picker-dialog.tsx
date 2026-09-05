"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface StationCandidate {
    id: string;
    name: string;
    isActive: boolean;
    publicEmergencyPhone: string | null;
    existingQr: { id: string; isActive: boolean; publicLabel: string } | null;
}

type StationQrKind = "station" | "restroom";

interface StationPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (stationId: string) => Promise<boolean | void> | boolean | void;
    kind?: StationQrKind;
}

function blockedReason(station: StationCandidate, kind: StationQrKind): string | null {
    if (!station.isActive) return "สถานีปิดใช้งานอยู่";
    if (!station.publicEmergencyPhone) return "ยังไม่มีหมายเลขฉุกเฉินสาธารณะ";
    if (station.existingQr) {
        return kind === "restroom"
            ? "มี QR ห้องน้ำแล้ว กรุณาจัดการจากรายการด้านล่าง"
            : "มี QR สถานีแล้ว กรุณาจัดการจากรายการด้านล่าง";
    }
    return null;
}

export function StationPickerDialog({ open, onOpenChange, onSelect, kind = "station" }: StationPickerDialogProps) {
    const [search, setSearch] = useState("");
    const [stations, setStations] = useState<StationCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [truncated, setTruncated] = useState(false);

    const load = useCallback(async (term: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ targetType: "STATION", stationQrKind: kind });
            if (term.trim()) params.set("search", term.trim());
            const response = await fetch(`/api/admin/customer-feedback/qr-codes/candidates?${params.toString()}`, { cache: "no-store" });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(data.error ?? "โหลดรายชื่อสถานีไม่สำเร็จ");
                setStations([]);
                setTruncated(false);
                return;
            }
            setStations(data.stations ?? []);
            setTruncated(Boolean(data.truncated));
        } catch {
            setError("เชื่อมต่อไม่ได้");
            setStations([]);
            setTruncated(false);
        } finally {
            setIsLoading(false);
        }
    }, [kind]);

    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(() => void load(search), search ? 250 : 0);
        return () => window.clearTimeout(timer);
    }, [load, open, search]);

    const choose = async (station: StationCandidate) => {
        if (blockedReason(station, kind)) return;
        setSubmittingId(station.id);
        try {
            const result = await onSelect(station.id);
            if (result === false) return;
            onOpenChange(false);
            setSearch("");
        } finally {
            setSubmittingId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{kind === "restroom" ? "เลือกสถานีที่จะสร้าง QR ห้องน้ำ" : "เลือกสถานีที่จะสร้าง QR สถานี"}</DialogTitle>
                    <DialogDescription>
                        {kind === "restroom"
                            ? "QR ห้องน้ำแยกจาก QR สถานีหลัก เลือกได้แม้สถานีนี้มี QR หลักอยู่แล้ว"
                            : "QR สถานีหลักแยกจาก QR ห้องน้ำ เลือกได้แม้สถานีนี้มี QR ห้องน้ำอยู่แล้ว"}
                    </DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                    <Input autoFocus className="pl-8" placeholder="ค้นหาชื่อสถานี" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <div className="max-h-[50vh] space-y-1 overflow-y-auto">
                    {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none" /></div>}
                    {!isLoading && error && <p className="py-6 text-center text-sm text-destructive">{error}</p>}
                    {!isLoading && !error && stations.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">ไม่พบสถานีที่เลือกได้</p>}
                    {!isLoading && !error && stations.map((station) => {
                        const reason = blockedReason(station, kind);
                        const disabled = Boolean(reason) || submittingId !== null;
                        return (
                            <button
                                key={station.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => void choose(station)}
                                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors enabled:hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{station.name}</span>
                                        {station.existingQr && (
                                            <Badge variant={station.existingQr.isActive ? "default" : "secondary"}>
                                                {kind === "restroom"
                                                    ? (station.existingQr.isActive ? "มี QR ห้องน้ำใช้งานอยู่" : "มี QR ห้องน้ำรอเปิดใช้")
                                                    : (station.existingQr.isActive ? "มี QR สถานีใช้งานอยู่" : "มี QR สถานีรอเปิดใช้")}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">เบอร์ฉุกเฉิน: {station.publicEmergencyPhone ?? "ยังไม่ได้ตั้งค่า"}</p>
                                    {reason && <p className="mt-0.5 text-xs text-destructive">{reason}</p>}
                                </div>
                                {submittingId === station.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" /> : <span className="inline-flex min-h-8 items-center rounded-md border px-3 text-xs font-medium">สร้าง</span>}
                            </button>
                        );
                    })}
                    {!isLoading && !error && truncated && <p className="py-2 text-center text-xs text-muted-foreground">แสดง 50 สถานีแรก กรุณาพิมพ์ค้นหาให้เจาะจงขึ้น</p>}
                </div>
            </DialogContent>
        </Dialog>
    );
}
