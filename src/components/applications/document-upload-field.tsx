"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { MAX_SOURCE_BYTES, DOCUMENT_MAX_SIDE, WEBP_QUALITY, loadImage, canvasToBlob, blobToDataUrl, drawResizedToCanvas, uploadApplicationFile } from "@/components/media/file-processing";

/**
 * Optional document attachment (education certificate, resume) — a photo of the
 * document, not cropped or watermarked. Image only: the Cloudinary account has
 * PDF/ZIP delivery disabled, so a PDF would upload but HR could never view it —
 * accepting only images keeps every attachment actually viewable end to end.
 */

export type AttachedDocument = { fileId: string; previewDataUrl: string; fileName: string };

interface DocumentUploadFieldProps {
    kind: "EDUCATION_CERT" | "RESUME";
    label: string;
    value: AttachedDocument | null;
    onChange: (value: AttachedDocument | null) => void;
    disabled?: boolean;
}

type Stage = "idle" | "processing" | "uploading" | "error";

export function DocumentUploadField({ kind, label, value, onChange, disabled }: DocumentUploadFieldProps) {
    const { t } = useLanguage();
    const inputRef = useRef<HTMLInputElement>(null);
    const [stage, setStage] = useState<Stage>("idle");
    const [error, setError] = useState<string | null>(null);
    const isBusy = stage === "processing" || stage === "uploading";

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
        try {
            const img = await loadImage(file);
            const canvas = drawResizedToCanvas(img, DOCUMENT_MAX_SIDE);
            const blob = await canvasToBlob(canvas, WEBP_QUALITY);

            setStage("uploading");
            const { fileId } = await uploadApplicationFile(kind, blob, `${kind.toLowerCase()}.webp`);
            const previewDataUrl = await blobToDataUrl(blob);
            onChange({ fileId, previewDataUrl, fileName: file.name });
            setStage("idle");
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
                    <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm">
                        <FileText className="size-4 shrink-0" />
                        <span className="truncate max-w-[180px]">{value.fileName}</span>
                    </div>
                    <Button type="button" variant="outline" size="icon-sm" disabled={disabled || isBusy} onClick={() => { onChange(null); setStage("idle"); setError(null); }}>
                        <X className="size-4" />
                    </Button>
                </div>
            ) : (
                <div className="space-y-1">
                    <Button type="button" variant="outline" disabled={disabled || isBusy} onClick={() => inputRef.current?.click()}>
                        {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                        {t("photoCapture.chooseFile")}
                    </Button>
                    {stage === "processing" && <p className="text-xs text-muted-foreground">{t("photoCapture.processing")}</p>}
                    {stage === "uploading" && <p className="text-xs text-muted-foreground">{t("photoCapture.uploading")}</p>}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleFileSelected(file);
                }}
            />
        </div>
    );
}
