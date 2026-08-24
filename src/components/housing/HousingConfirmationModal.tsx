"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Building2, CheckCircle2, House, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { isHousingConfirmationRole } from "@/lib/housing";

type Dormitory = {
    id: string;
    name: string;
    station: { id: string; name: string; code: string } | null;
};

type HousingConfirmationResponse = {
    confirmationRequired: boolean;
    currentHousing: {
        housingStatus: "UNKNOWN" | "COMPANY_DORM" | "OWN_HOUSING";
        dormitoryId: string | null;
    };
    dormitories: Dormitory[];
};

type HousingConfirmationModalProps = {
    suspended?: boolean;
};

export function HousingConfirmationModal({ suspended = false }: HousingConfirmationModalProps) {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const userRole = session?.user?.role;
    const [confirmationRequired, setConfirmationRequired] = useState(false);
    const [dormitories, setDormitories] = useState<Dormitory[]>([]);
    const [housingSelection, setHousingSelection] = useState("");
    const [previousHousingLabel, setPreviousHousingLabel] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

    const loadConfirmation = useCallback(async (expectedUserId: string, signal: AbortSignal) => {
        try {
            const response = await fetch("/api/profile/housing", { cache: "no-store", signal });
            if (!response.ok) return;

            const data = await response.json() as HousingConfirmationResponse;
            setLoadedUserId(expectedUserId);
            setDormitories(data.dormitories || []);
            setConfirmationRequired(data.confirmationRequired === true);
            setHousingSelection("");

            if (data.currentHousing.housingStatus === "OWN_HOUSING") {
                setPreviousHousingLabel("พักบ้านหรือห้องเช่าของตัวเอง");
                return;
            }

            const currentDormitoryId = data.currentHousing.dormitoryId;
            const currentDormitory = data.dormitories.find((item) => item.id === currentDormitoryId);
            if (data.currentHousing.housingStatus === "COMPANY_DORM") {
                setPreviousHousingLabel(currentDormitory
                    ? `${currentDormitory.station?.name ? `${currentDormitory.station.name} — ` : ""}${currentDormitory.name}`
                    : "บ้านพักบริษัท");
                return;
            }

            setPreviousHousingLabel(null);
        } catch (error) {
            if ((error as { name?: string })?.name === "AbortError") return;
            console.error("Failed to load housing confirmation:", error);
        }
    }, []);

    useEffect(() => {
        setLoadedUserId(null);
        setConfirmationRequired(false);
        setDormitories([]);
        setHousingSelection("");
        setPreviousHousingLabel(null);

        if (status !== "authenticated" || !userId || !isHousingConfirmationRole(userRole)) return;
        const controller = new AbortController();
        void loadConfirmation(userId, controller.signal);
        return () => controller.abort();
    }, [loadConfirmation, status, userId, userRole]);

    const handleSave = async () => {
        if (!housingSelection) {
            toast.error("กรุณาเลือกที่พักปัจจุบัน");
            return;
        }

        const isDormitory = housingSelection.startsWith("dorm:");
        setIsSaving(true);
        try {
            const response = await fetch("/api/profile/housing", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    housingStatus: isDormitory ? "COMPANY_DORM" : "OWN_HOUSING",
                    dormitoryId: isDormitory ? housingSelection.slice(5) : null,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                toast.error(data.error || "บันทึกข้อมูลที่พักไม่สำเร็จ");
                return;
            }

            setConfirmationRequired(false);
            toast.success("ยืนยันข้อมูลที่พักแล้ว");
            window.dispatchEvent(new CustomEvent("timetrack:housing-updated"));
        } catch {
            toast.error("บันทึกข้อมูลที่พักไม่สำเร็จ");
        } finally {
            setIsSaving(false);
        }
    };

    if (
        status !== "authenticated"
        || !isHousingConfirmationRole(userRole)
        || loadedUserId !== userId
        || suspended
        || !confirmationRequired
    ) return null;

    return (
        <Dialog
            open
            onOpenChange={() => {
                // This confirmation is required for the current survey round.
            }}
        >
            <DialogContent
                className="z-[90] flex max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-amber-200 p-5 shadow-2xl sm:max-w-md sm:p-6"
                showCloseButton={false}
                onInteractOutside={(event) => event.preventDefault()}
                onEscapeKeyDown={(event) => event.preventDefault()}
            >
                <div className="absolute inset-x-0 top-0 h-2 bg-amber-400" />

                <DialogHeader className="pt-3 text-center sm:text-center">
                    <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                        <House className="h-7 w-7 text-amber-700" />
                    </div>
                    <DialogTitle className="text-xl">กรุณายืนยันที่พักปัจจุบัน</DialogTitle>
                    <DialogDescription>
                        เลือกบ้านพักปั๊มที่อยู่ตอนนี้ หรือเลือกที่พักของตัวเอง เพื่ออัปเดตข้อมูลอีกครั้ง
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 space-y-3 rounded-2xl border bg-muted/30 p-4">
                    {previousHousingLabel && (
                        <p className="rounded-xl bg-background px-3 py-2 text-xs text-muted-foreground">
                            ข้อมูลเดิม: <span className="font-bold text-foreground">{previousHousingLabel}</span>
                        </p>
                    )}

                    <fieldset disabled={isSaving} className="min-h-0 space-y-2">
                        <legend className="mb-2 text-sm font-bold">ตอนนี้คุณพักอยู่ที่ไหน?</legend>
                        <div className="max-h-[45dvh] space-y-2 overflow-y-auto overscroll-contain pr-1">
                            {dormitories.map((dormitory) => {
                                const value = `dorm:${dormitory.id}`;
                                const selected = housingSelection === value;
                                return (
                                    <label
                                        key={dormitory.id}
                                        className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 transition-colors ${selected ? "border-amber-500 ring-2 ring-amber-500/20" : "hover:border-amber-300"}`}
                                    >
                                        <input
                                            type="radio"
                                            name="housing-confirmation"
                                            value={value}
                                            checked={selected}
                                            onChange={() => setHousingSelection(value)}
                                            className="h-4 w-4 accent-amber-600"
                                        />
                                        <Building2 className="h-5 w-5 shrink-0 text-amber-700" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold">
                                                {dormitory.station?.name || dormitory.name}
                                            </span>
                                            {dormitory.station?.name && (
                                                <span className="block text-xs text-muted-foreground">{dormitory.name}</span>
                                            )}
                                        </span>
                                    </label>
                                );
                            })}

                            <label
                                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 transition-colors ${housingSelection === "OWN_HOUSING" ? "border-amber-500 ring-2 ring-amber-500/20" : "hover:border-amber-300"}`}
                            >
                                <input
                                    type="radio"
                                    name="housing-confirmation"
                                    value="OWN_HOUSING"
                                    checked={housingSelection === "OWN_HOUSING"}
                                    onChange={() => setHousingSelection("OWN_HOUSING")}
                                    className="h-4 w-4 accent-amber-600"
                                />
                                <House className="h-5 w-5 shrink-0 text-emerald-600" />
                                <span>
                                    <span className="block text-sm font-bold">ไม่ได้อยู่บ้านพักบริษัท</span>
                                    <span className="block text-xs text-muted-foreground">พักบ้านหรือห้องเช่าของตัวเอง</span>
                                </span>
                            </label>
                        </div>
                    </fieldset>

                    {dormitories.length === 0 && (
                        <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            หากพักบ้านพักบริษัทและยังไม่มีชื่อให้เลือก กรุณาติดต่อฝ่ายบุคคลก่อนบันทึก
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        ข้อมูลนี้ใช้จัดบ้านพักและตรวจสิทธิ์ค่าที่พัก กรุณาเลือกตามที่พักจริงในปัจจุบัน
                    </p>
                </div>

                <DialogFooter className="shrink-0">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !housingSelection}
                        className="h-11 w-full gap-2 rounded-xl font-bold"
                    >
                        {isSaving
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <CheckCircle2 className="h-4 w-4" />}
                        ยืนยันข้อมูลที่พัก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
