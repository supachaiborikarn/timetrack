"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "./image-crop-dialog";
import {
    MAX_SOURCE_BYTES,
    DOCUMENT_MAX_SIDE,
    WEBP_QUALITY,
    blobToDataUrl,
    canvasToBlob,
    drawResizedToCanvas,
    loadImage,
    uploadAsset,
} from "./file-processing";

/**
 * The two ways the app puts an image into StoredAsset:
 *  - AssetPhotoField — an employee avatar, cropped square and saved immediately.
 *  - AssetAttachmentField — evidence or a document, resized and held until the
 *    surrounding form is submitted.
 */

const AVATAR_OUTPUT = { width: 600, height: 600 };
const AVATAR_FRAME = { width: 260, height: 260 };

type Stage = "idle" | "cropping" | "processing" | "uploading" | "error";

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AssetPhotoFieldProps {
    /** Whose photo this is. Omit to upload for the signed-in user. */
    ownerUserId?: string;
    /** Currently stored photo, or null to show the empty state. */
    photoUrl: string | null;
    /** Fired after the new photo is saved, with a local preview to show right away. */
    onUploaded: (previewDataUrl: string) => void;
    onRemoved?: () => void;
    /** Rendered inside the circle when there is no photo — usually the initials. */
    fallback?: React.ReactNode;
    size?: number;
    disabled?: boolean;
}

export function AssetPhotoField({
    ownerUserId,
    photoUrl,
    onUploaded,
    onRemoved,
    fallback,
    size = 80,
    disabled,
}: AssetPhotoFieldProps) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [stage, setStage] = useState<Stage>("idle");
    const [error, setError] = useState<string | null>(null);
    const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);
    // Shown instead of photoUrl right after an upload, so the new photo appears
    // without waiting for the avatar route to be re-fetched.
    const [preview, setPreview] = useState<string | null>(null);

    const isBusy = stage === "processing" || stage === "uploading";
    const shown = preview ?? photoUrl;

    async function handleFileSelected(file: File) {
        setError(null);
        if (!file.type.startsWith("image/")) return fail("ไฟล์ต้องเป็นรูปภาพเท่านั้น");
        if (file.size > MAX_SOURCE_BYTES) return fail("ไฟล์ใหญ่เกินไป (สูงสุด 8MB)");

        setStage("processing");
        try {
            setCropImage(await loadImage(file));
            setStage("cropping");
        } catch {
            fail("เปิดไฟล์รูปภาพไม่สำเร็จ");
        }
    }

    async function handleCropConfirm(blob: Blob) {
        setCropImage(null);
        setStage("uploading");
        try {
            await uploadAsset("EMPLOYEE_PHOTO", blob, "employee-photo.webp", { ownerUserId });
            const dataUrl = await blobToDataUrl(blob);
            setPreview(dataUrl);
            onUploaded(dataUrl);
            setStage("idle");
        } catch (err) {
            fail(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
        }
    }

    function fail(message: string) {
        setError(message);
        setStage("error");
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    disabled={disabled || isBusy}
                    onClick={() => galleryInputRef.current?.click()}
                    className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ width: size, height: size }}
                    aria-label="เปลี่ยนรูปพนักงาน"
                >
                    <span
                        className="flex items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10"
                        style={{ width: size, height: size }}
                    >
                        {shown ? (
                            // eslint-disable-next-line @next/next/no-img-element -- authenticated route / local data URL, not a static asset
                            <img src={shown} alt="" className="h-full w-full object-cover" />
                        ) : (
                            fallback
                        )}
                    </span>
                    <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary">
                        {isBusy ? (
                            <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
                        ) : (
                            <Camera className="h-3 w-3 text-primary-foreground" />
                        )}
                    </span>
                </button>

                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={disabled || isBusy} onClick={() => cameraInputRef.current?.click()}>
                            <Camera className="size-4" /> ถ่ายรูป
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={disabled || isBusy} onClick={() => galleryInputRef.current?.click()}>
                            <ImageIcon className="size-4" /> เลือกไฟล์
                        </Button>
                    </div>
                    {shown && onRemoved && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="justify-start text-destructive"
                            disabled={disabled || isBusy}
                            onClick={() => { setPreview(null); onRemoved(); }}
                        >
                            <Trash2 className="size-4" /> ลบรูป
                        </Button>
                    )}
                </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFileSelected(f); }}
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFileSelected(f); }}
            />

            <ImageCropDialog
                image={cropImage}
                frame={AVATAR_FRAME}
                output={AVATAR_OUTPUT}
                onConfirm={handleCropConfirm}
                onCancel={() => { setCropImage(null); setStage("idle"); }}
                busy={isBusy}
            />
        </div>
    );
}

// ─── Attachment ───────────────────────────────────────────────────────────────

export type PendingAsset = { id: string; previewDataUrl: string; fileName: string };

interface AssetAttachmentFieldProps {
    kind: string;
    label?: string;
    /** Whose asset this is. Omit for the signed-in user; ignored for announcement images. */
    ownerUserId?: string;
    /** ISO date the document stops being valid — only meaningful for kinds that expire. */
    documentExpiresAt?: string;
    note?: string;
    value: PendingAsset | null;
    onChange: (value: PendingAsset | null) => void;
    buttonLabel?: string;
    helpText?: string;
    disabled?: boolean;
    className?: string;
}

export function AssetAttachmentField({
    kind,
    label,
    ownerUserId,
    documentExpiresAt,
    note,
    value,
    onChange,
    buttonLabel = "แนบรูป",
    helpText,
    disabled,
    className,
}: AssetAttachmentFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [stage, setStage] = useState<Stage>("idle");
    const [error, setError] = useState<string | null>(null);
    const isBusy = stage === "processing" || stage === "uploading";

    async function handleFileSelected(file: File) {
        setError(null);
        if (!file.type.startsWith("image/")) { setError("ไฟล์ต้องเป็นรูปภาพเท่านั้น"); setStage("error"); return; }
        if (file.size > MAX_SOURCE_BYTES) { setError("ไฟล์ใหญ่เกินไป (สูงสุด 8MB)"); setStage("error"); return; }

        setStage("processing");
        try {
            const img = await loadImage(file);
            const blob = await canvasToBlob(drawResizedToCanvas(img, DOCUMENT_MAX_SIDE), WEBP_QUALITY);

            setStage("uploading");
            const uploaded = await uploadAsset(kind, blob, `${kind.toLowerCase()}.webp`, { ownerUserId, documentExpiresAt, note });
            onChange({ id: uploaded.id, previewDataUrl: await blobToDataUrl(blob), fileName: file.name });
            setStage("idle");
        } catch (err) {
            setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
            setStage("error");
        }
    }

    async function handleRemove() {
        if (!value) return;
        const removed = value;
        onChange(null);
        setStage("idle");
        setError(null);
        // Drop the bytes now rather than leaving them for the nightly orphan sweep.
        await fetch(`/api/assets/${removed.id}`, { method: "DELETE" }).catch(() => {});
    }

    return (
        <div className={cn("space-y-2", className)}>
            {label && <div className="text-sm font-medium">{label}</div>}

            {value ? (
                <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                    <img src={value.previewDataUrl} alt={value.fileName} className="h-16 w-16 rounded-md border bg-muted object-cover" />
                    <span className="max-w-[180px] truncate text-xs text-muted-foreground">{value.fileName}</span>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={disabled || isBusy} onClick={handleRemove}>
                        <X className="size-4" />
                    </Button>
                </div>
            ) : (
                <div className="space-y-1">
                    <Button type="button" variant="outline" size="sm" disabled={disabled || isBusy} onClick={() => inputRef.current?.click()}>
                        {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                        {buttonLabel}
                    </Button>
                    {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
                    {stage === "processing" && <p className="text-xs text-muted-foreground">กำลังเตรียมรูป...</p>}
                    {stage === "uploading" && <p className="text-xs text-muted-foreground">กำลังอัปโหลด...</p>}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFileSelected(f); }}
            />
        </div>
    );
}
