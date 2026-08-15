"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import {
    MAX_SOURCE_BYTES,
    DOCUMENT_MAX_SIDE,
    WEBP_QUALITY,
    loadImage,
    canvasToBlob,
    blobToDataUrl,
    drawResizedToCanvas,
    uploadApplicationFile,
} from "./file-processing";

/**
 * Captures/selects a photo, prepares it client-side, and uploads it to
 * POST /api/applications/files. Two modes:
 *  - "PROFILE_PHOTO": portrait photo, cropped to 3:4 with pan/zoom, no watermark.
 *  - "CITIZEN_ID": document photo, natural aspect (no forced crop), watermarked.
 * Other document kinds (resume, education cert, ...) don't need camera capture
 * or cropping — they belong in a plain file-input field, not this component.
 */

export type CapturedPhoto = { fileId: string; previewDataUrl: string };

type Kind = "PROFILE_PHOTO" | "CITIZEN_ID";

interface PhotoCaptureFieldProps {
    kind: Kind;
    label: string;
    value: CapturedPhoto | null;
    onChange: (value: CapturedPhoto | null) => void;
    /** Overrides the default watermark text for CITIZEN_ID captures. */
    watermarkText?: string;
    disabled?: boolean;
}

const PHOTO_OUTPUT = { width: 900, height: 1200 }; // 3:4
const CROP_FRAME = { width: 240, height: 320 }; // CSS px, 3:4

type Stage = "idle" | "cropping" | "processing" | "uploading" | "error";

export function PhotoCaptureField({ kind, label, value, onChange, watermarkText, disabled }: PhotoCaptureFieldProps) {
    const { t } = useLanguage();
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const [stage, setStage] = useState<Stage>("idle");
    const [error, setError] = useState<string | null>(null);

    // Crop-stage state (PROFILE_PHOTO only)
    const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

    const isBusy = stage === "processing" || stage === "uploading";
    const helpText = kind === "PROFILE_PHOTO" ? t("photoCapture.helpProfilePhoto") : t("photoCapture.helpCitizenId");

    const reset = useCallback(() => {
        setStage("idle");
        setError(null);
        setCropImage(null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    }, []);

    async function uploadBlob(blob: Blob) {
        setStage("uploading");
        try {
            const { fileId } = await uploadApplicationFile(kind, blob, `${kind.toLowerCase()}.webp`);
            const previewDataUrl = await blobToDataUrl(blob);
            onChange({ fileId, previewDataUrl });
            setStage("idle");
        } catch (err) {
            setError(err instanceof Error ? err.message : t("photoCapture.errorUpload"));
            setStage("error");
        }
    }

    async function handleFileSelected(file: File) {
        setError(null);

        if (!file.type.startsWith("image/")) {
            setError(t("photoCapture.errorType"));
            setStage("error");
            return;
        }
        if (file.size > MAX_SOURCE_BYTES) {
            setError(t("photoCapture.errorSize"));
            setStage("error");
            return;
        }

        setStage("processing");
        let img: HTMLImageElement;
        try {
            img = await loadImage(file);
        } catch {
            setError(t("photoCapture.errorLoad"));
            setStage("error");
            return;
        }

        if (kind === "PROFILE_PHOTO") {
            const baseScale = Math.max(CROP_FRAME.width / img.naturalWidth, CROP_FRAME.height / img.naturalHeight);
            setCropImage(img);
            setZoom(1);
            setOffset({
                x: (CROP_FRAME.width - img.naturalWidth * baseScale) / 2,
                y: (CROP_FRAME.height - img.naturalHeight * baseScale) / 2,
            });
            setStage("cropping");
            return;
        }

        // CITIZEN_ID: no crop — resize to fit, watermark, upload immediately.
        try {
            const blob = await renderDocumentPhoto(img, watermarkText ?? defaultWatermarkText());
            await uploadBlob(blob);
        } catch {
            setError(t("photoCapture.errorUpload"));
            setStage("error");
        }
    }

    async function confirmCrop() {
        if (!cropImage) return;
        setStage("processing");
        try {
            const baseScale = Math.max(CROP_FRAME.width / cropImage.naturalWidth, CROP_FRAME.height / cropImage.naturalHeight);
            const effectiveScale = baseScale * zoom;
            const sx = -offset.x / effectiveScale;
            const sy = -offset.y / effectiveScale;
            const sw = CROP_FRAME.width / effectiveScale;
            const sh = CROP_FRAME.height / effectiveScale;

            const canvas = document.createElement("canvas");
            canvas.width = PHOTO_OUTPUT.width;
            canvas.height = PHOTO_OUTPUT.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("no 2d context");
            ctx.drawImage(cropImage, sx, sy, sw, sh, 0, 0, PHOTO_OUTPUT.width, PHOTO_OUTPUT.height);

            const blob = await canvasToBlob(canvas, WEBP_QUALITY);
            setCropImage(null);
            await uploadBlob(blob);
        } catch {
            setError(t("photoCapture.errorUpload"));
            setStage("error");
        }
    }

    function clampOffset(nextOffset: { x: number; y: number }, effectiveScale: number, img: HTMLImageElement) {
        const displayedW = img.naturalWidth * effectiveScale;
        const displayedH = img.naturalHeight * effectiveScale;
        const minX = CROP_FRAME.width - displayedW;
        const minY = CROP_FRAME.height - displayedH;
        return {
            x: Math.min(0, Math.max(minX, nextOffset.x)),
            y: Math.min(0, Math.max(minY, nextOffset.y)),
        };
    }

    function handlePointerDown(e: React.PointerEvent) {
        (e.target as Element).setPointerCapture(e.pointerId);
        dragState.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
    }

    function handlePointerMove(e: React.PointerEvent) {
        if (!dragState.current || !cropImage) return;
        const baseScale = Math.max(CROP_FRAME.width / cropImage.naturalWidth, CROP_FRAME.height / cropImage.naturalHeight);
        const effectiveScale = baseScale * zoom;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        setOffset(clampOffset({ x: dragState.current.originX + dx, y: dragState.current.originY + dy }, effectiveScale, cropImage));
    }

    function handlePointerUp(e: React.PointerEvent) {
        dragState.current = null;
        (e.target as Element).releasePointerCapture(e.pointerId);
    }

    function handleZoomChange(nextZoom: number) {
        if (!cropImage) return;
        const baseScale = Math.max(CROP_FRAME.width / cropImage.naturalWidth, CROP_FRAME.height / cropImage.naturalHeight);
        setZoom(nextZoom);
        setOffset((prev) => clampOffset(prev, baseScale * nextZoom, cropImage));
    }

    const cropPreviewScale = cropImage
        ? Math.max(CROP_FRAME.width / cropImage.naturalWidth, CROP_FRAME.height / cropImage.naturalHeight) * zoom
        : 1;

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium">{label}</div>

            {value ? (
                <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob/data URL preview, not a remote/static asset */}
                    <img
                        src={value.previewDataUrl}
                        alt={label}
                        className={cn(
                            "rounded-md border object-cover bg-muted",
                            kind === "PROFILE_PHOTO" ? "w-20 h-[107px]" : "w-32 h-20"
                        )}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={disabled || isBusy} onClick={() => { onChange(null); reset(); }}>
                        <RotateCcw className="size-4" />
                        {t("photoCapture.retake")}
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" disabled={disabled || isBusy} onClick={() => cameraInputRef.current?.click()}>
                            {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                            {t("photoCapture.takePhoto")}
                        </Button>
                        <Button type="button" variant="outline" disabled={disabled || isBusy} onClick={() => galleryInputRef.current?.click()}>
                            <ImageIcon className="size-4" />
                            {t("photoCapture.chooseFile")}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{helpText}</p>
                    {stage === "processing" && <p className="text-xs text-muted-foreground">{t("photoCapture.processing")}</p>}
                    {stage === "uploading" && <p className="text-xs text-muted-foreground">{t("photoCapture.uploading")}</p>}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            )}

            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture={kind === "PROFILE_PHOTO" ? "user" : "environment"}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleFileSelected(file);
                }}
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleFileSelected(file);
                }}
            />

            <Dialog open={stage === "cropping"} onOpenChange={(open) => { if (!open) reset(); }}>
                <DialogContent className="w-fit">
                    <DialogHeader>
                        <DialogTitle>{t("photoCapture.cropTitle")}</DialogTitle>
                    </DialogHeader>

                    {cropImage && (
                        <div className="space-y-3">
                            <div
                                className="relative overflow-hidden rounded-md border bg-muted touch-none select-none"
                                style={{ width: CROP_FRAME.width, height: CROP_FRAME.height }}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element -- source is a locally loaded HTMLImageElement, cropped via canvas on confirm */}
                                <img
                                    src={cropImage.src}
                                    alt=""
                                    draggable={false}
                                    style={{
                                        position: "absolute",
                                        left: offset.x,
                                        top: offset.y,
                                        width: cropImage.naturalWidth * cropPreviewScale,
                                        height: cropImage.naturalHeight * cropPreviewScale,
                                        maxWidth: "none",
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-10">{t("photoCapture.zoom")}</span>
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.05}
                                    value={zoom}
                                    onChange={(e) => handleZoomChange(Number(e.target.value))}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={reset}>
                            <X className="size-4" />
                            {t("photoCapture.cropCancel")}
                        </Button>
                        <Button type="button" onClick={confirmCrop} disabled={stage !== "cropping"}>
                            {t("photoCapture.cropConfirm")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function defaultWatermarkText(): string {
    const date = new Date().toLocaleDateString("th-TH-u-ca-buddhist", { year: "numeric", month: "2-digit", day: "2-digit" });
    return `ใช้สมัครงานเท่านั้น ${date}`;
}

async function renderDocumentPhoto(img: HTMLImageElement, watermark: string): Promise<Blob> {
    const canvas = drawResizedToCanvas(img, DOCUMENT_MAX_SIDE);
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");

    // Tiled diagonal watermark — a single line is trivially cropped out.
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#ff2222";
    ctx.font = `${Math.max(14, Math.round(width / 22))}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 8);
    const textWidth = ctx.measureText(watermark).width;
    const stepX = textWidth + 40;
    const stepY = Math.max(40, Math.round(height / 6));
    for (let y = -height; y < height; y += stepY) {
        for (let x = -width; x < width; x += stepX) {
            ctx.fillText(watermark, x, y);
        }
    }
    ctx.restore();

    return canvasToBlob(canvas, WEBP_QUALITY);
}
