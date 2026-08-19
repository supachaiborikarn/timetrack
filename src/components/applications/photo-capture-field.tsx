"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import {
    MAX_SOURCE_BYTES,
    DOCUMENT_MAX_SIDE,
    WEBP_QUALITY,
    loadImage,
    canvasToBlob,
    blobToDataUrl,
    drawResizedToCanvas,
    uploadApplicationFile,
} from "@/components/media/file-processing";

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

    // Crop-stage state (PROFILE_PHOTO only) — the crop itself is ImageCropDialog's job.
    const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);

    const isBusy = stage === "processing" || stage === "uploading";
    const helpText = kind === "PROFILE_PHOTO" ? t("photoCapture.helpProfilePhoto") : t("photoCapture.helpCitizenId");

    const reset = useCallback(() => {
        setStage("idle");
        setError(null);
        setCropImage(null);
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
            setCropImage(img);
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

    async function handleCropConfirm(blob: Blob) {
        setStage("processing");
        setCropImage(null);
        try {
            await uploadBlob(blob);
        } catch {
            setError(t("photoCapture.errorUpload"));
            setStage("error");
        }
    }

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

            <ImageCropDialog
                image={cropImage}
                frame={CROP_FRAME}
                output={PHOTO_OUTPUT}
                onConfirm={handleCropConfirm}
                onCancel={reset}
                busy={isBusy}
            />
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
