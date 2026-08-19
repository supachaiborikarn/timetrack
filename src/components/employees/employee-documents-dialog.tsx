"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetAttachmentField, AssetPhotoField, type PendingAsset } from "@/components/media/asset-fields";
import { ASSET_KIND_META, VAULT_DOCUMENT_KINDS } from "@/lib/asset-kinds";
import { formatThaiDate } from "@/lib/date-utils";

/**
 * The employee document vault: photo, ID copies, contracts, and the work-permit /
 * visa papers whose expiry the nightly reminder watches.
 *
 * Sensitive documents the signed-in user isn't cleared for never reach the client
 * — the API filters them out and only reports how many were withheld.
 */

interface EmployeeDocument {
    id: string;
    kind: string;
    kindLabel: string;
    fileName: string | null;
    note: string | null;
    sizeBytes: number;
    documentExpiresAt: string | null;
    createdAt: string;
    uploadedByName: string | null;
    url: string;
    thumbUrl: string;
}

interface EmployeeDocumentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: { id: string; name: string; employeeId: string; photoUrl?: string | null } | null;
    /** Lets the employee list refresh once a photo is added or removed. */
    onPhotoChanged?: () => void;
}

const EXPIRY_WARNING_DAYS = 60;

function daysUntil(iso: string): number {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function EmployeeDocumentsDialog({ open, onOpenChange, employee, onPhotoChanged }: EmployeeDocumentsDialogProps) {
    const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
    const [hiddenCount, setHiddenCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadKind, setUploadKind] = useState<string>("CITIZEN_ID");
    const [expiresAt, setExpiresAt] = useState("");
    const [note, setNote] = useState("");

    const employeeId = employee?.id;

    const fetchDocuments = useCallback(async () => {
        if (!employeeId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/employees/${employeeId}/documents`);
            const data = await res.json();
            if (res.ok) {
                setDocuments(data.documents || []);
                setHiddenCount(data.hiddenCount || 0);
            } else {
                toast.error(data.error || "โหลดเอกสารไม่สำเร็จ");
            }
        } finally {
            setIsLoading(false);
        }
    }, [employeeId]);

    useEffect(() => {
        if (open) fetchDocuments();
    }, [open, fetchDocuments]);

    // The upload has already saved the document by the time onChange fires, so the
    // field is only used as a trigger: clear the form and re-read the list.
    function handleUploaded(asset: PendingAsset | null) {
        if (!asset) return;
        setExpiresAt("");
        setNote("");
        toast.success("อัปโหลดเอกสารแล้ว");
        fetchDocuments();
    }

    async function handleDelete(doc: EmployeeDocument) {
        const res = await fetch(`/api/assets/${doc.id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success(`ลบ${doc.kindLabel}แล้ว`);
            fetchDocuments();
        } else {
            const data = await res.json().catch(() => ({}));
            toast.error(data.error || "ลบเอกสารไม่สำเร็จ");
        }
    }

    async function handlePhotoRemoved() {
        if (!employeeId) return;
        const res = await fetch(`/api/employees/${employeeId}/photo`, { method: "DELETE" });
        if (res.ok) {
            toast.success("ลบรูปพนักงานแล้ว");
            onPhotoChanged?.();
        } else {
            toast.error("ลบรูปไม่สำเร็จ");
        }
    }

    const kindSupportsExpiry = ASSET_KIND_META[uploadKind as keyof typeof ASSET_KIND_META]?.expires ?? false;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>เอกสารพนักงาน</DialogTitle>
                    <DialogDescription>
                        {employee ? `${employee.employeeId} · ${employee.name}` : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div>
                        <Label className="mb-2 block">รูปพนักงาน</Label>
                        <AssetPhotoField
                            ownerUserId={employeeId}
                            photoUrl={employee?.photoUrl ?? null}
                            onUploaded={() => { toast.success("อัปเดตรูปพนักงานแล้ว"); onPhotoChanged?.(); }}
                            onRemoved={handlePhotoRemoved}
                            fallback={<User className="h-8 w-8 text-primary opacity-60" />}
                        />
                    </div>

                    <div className="space-y-3 rounded-lg border p-4">
                        <Label>เพิ่มเอกสาร</Label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">ประเภทเอกสาร</Label>
                                <Select value={uploadKind} onValueChange={setUploadKind}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {VAULT_DOCUMENT_KINDS.map((kind) => (
                                            <SelectItem key={kind} value={kind}>{ASSET_KIND_META[kind].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {kindSupportsExpiry && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">วันหมดอายุเอกสาร</Label>
                                    <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">หมายเหตุ</Label>
                            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น เลขที่เอกสาร, หน่วยงานที่ออก" />
                        </div>
                        <AssetAttachmentField
                            kind={uploadKind}
                            ownerUserId={employeeId}
                            documentExpiresAt={kindSupportsExpiry ? expiresAt : undefined}
                            note={note}
                            value={null}
                            onChange={handleUploaded}
                            buttonLabel="เลือกรูปเอกสาร"
                            helpText="ถ่ายหรือเลือกรูปเอกสารให้ชัดเจนทั้งใบ (รูปภาพเท่านั้น)"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>เอกสารที่มี ({documents.length})</Label>
                            {hiddenCount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    ซ่อนอยู่ {hiddenCount} รายการ (ต้องมีสิทธิ์ดูเอกสารอ่อนไหว)
                                </span>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                        ) : documents.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีเอกสาร</p>
                        ) : (
                            <div className="space-y-2">
                                {documents.map((doc) => {
                                    const days = doc.documentExpiresAt ? daysUntil(doc.documentExpiresAt) : null;
                                    return (
                                        <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                                            {/* eslint-disable-next-line @next/next/no-img-element -- authenticated route, not a static asset */}
                                            <img src={doc.thumbUrl} alt={doc.kindLabel} className="h-12 w-12 shrink-0 rounded border bg-muted object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-medium">{doc.kindLabel}</span>
                                                    {days !== null && days < 0 && (
                                                        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-500">
                                                            <AlertTriangle className="mr-1 h-3 w-3" /> หมดอายุแล้ว
                                                        </Badge>
                                                    )}
                                                    {days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS && (
                                                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600">
                                                            <AlertTriangle className="mr-1 h-3 w-3" /> เหลือ {days} วัน
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {doc.documentExpiresAt ? `หมดอายุ ${formatThaiDate(doc.documentExpiresAt)} · ` : ""}
                                                    เพิ่มเมื่อ {formatThaiDate(doc.createdAt)}
                                                    {doc.uploadedByName ? ` โดย ${doc.uploadedByName}` : ""}
                                                </p>
                                                {doc.note && <p className="truncate text-xs text-muted-foreground">{doc.note}</p>}
                                            </div>
                                            <Button variant="ghost" size="icon" asChild title="เปิดดู">
                                                <a href={doc.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" title="ลบ" onClick={() => handleDelete(doc)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
