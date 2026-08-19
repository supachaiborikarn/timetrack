"use client";

import { useCallback, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language-context";
import { canvasToBlob, WEBP_QUALITY } from "./file-processing";

/**
 * Pan/zoom crop of a loaded image into a fixed output size. Shared by the job
 * application photo field (3:4 portrait) and the employee avatar field (1:1), so
 * the crop maths lives in exactly one place.
 */

export type CropFrame = { width: number; height: number };

interface ImageCropDialogProps {
    image: HTMLImageElement | null;
    /** On-screen crop window in CSS pixels. Its aspect ratio must match `output`. */
    frame: CropFrame;
    /** Pixel size of the produced image. */
    output: CropFrame;
    onConfirm: (blob: Blob) => void | Promise<void>;
    onCancel: () => void;
    /** Blocks the confirm button while the parent is uploading. */
    busy?: boolean;
}

export function ImageCropDialog({ image, frame, output, onConfirm, onCancel, busy }: ImageCropDialogProps) {
    const { t } = useLanguage();
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
    const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

    /** Scale at which the image exactly covers the crop frame — the zoom=1 baseline. */
    const baseScale = image ? Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight) : 1;
    const effectiveScale = baseScale * zoom;

    // Centred until the user drags. Derived rather than set in an effect so the
    // dialog can't render one frame with a stale offset from the previous image.
    const currentOffset = offset ?? {
        x: image ? (frame.width - image.naturalWidth * baseScale) / 2 : 0,
        y: image ? (frame.height - image.naturalHeight * baseScale) / 2 : 0,
    };

    const clampOffset = useCallback(
        (next: { x: number; y: number }, scale: number) => {
            if (!image) return next;
            const minX = frame.width - image.naturalWidth * scale;
            const minY = frame.height - image.naturalHeight * scale;
            return {
                x: Math.min(0, Math.max(minX, next.x)),
                y: Math.min(0, Math.max(minY, next.y)),
            };
        },
        [image, frame.width, frame.height]
    );

    function reset() {
        setZoom(1);
        setOffset(null);
        onCancel();
    }

    function handlePointerDown(e: React.PointerEvent) {
        (e.target as Element).setPointerCapture(e.pointerId);
        dragState.current = { startX: e.clientX, startY: e.clientY, originX: currentOffset.x, originY: currentOffset.y };
    }

    function handlePointerMove(e: React.PointerEvent) {
        if (!dragState.current || !image) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        setOffset(clampOffset({ x: dragState.current.originX + dx, y: dragState.current.originY + dy }, effectiveScale));
    }

    function handlePointerUp(e: React.PointerEvent) {
        dragState.current = null;
        (e.target as Element).releasePointerCapture(e.pointerId);
    }

    function handleZoomChange(nextZoom: number) {
        setZoom(nextZoom);
        setOffset((prev) => (prev ? clampOffset(prev, baseScale * nextZoom) : prev));
    }

    async function confirm() {
        if (!image) return;
        // Map the on-screen frame back onto source pixels, then draw that region at
        // full output resolution — cropping in source space, not screen space.
        const sx = -currentOffset.x / effectiveScale;
        const sy = -currentOffset.y / effectiveScale;
        const sw = frame.width / effectiveScale;
        const sh = frame.height / effectiveScale;

        const canvas = document.createElement("canvas");
        canvas.width = output.width;
        canvas.height = output.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, output.width, output.height);

        const blob = await canvasToBlob(canvas, WEBP_QUALITY);
        setZoom(1);
        setOffset(null);
        await onConfirm(blob);
    }

    return (
        <Dialog open={Boolean(image)} onOpenChange={(open) => { if (!open) reset(); }}>
            <DialogContent className="w-fit">
                <DialogHeader>
                    <DialogTitle>{t("photoCapture.cropTitle")}</DialogTitle>
                </DialogHeader>

                {image && (
                    <div className="space-y-3">
                        <div
                            className="relative overflow-hidden rounded-md border bg-muted touch-none select-none"
                            style={{ width: frame.width, height: frame.height }}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- source is a locally loaded HTMLImageElement, cropped via canvas on confirm */}
                            <img
                                src={image.src}
                                alt=""
                                draggable={false}
                                style={{
                                    position: "absolute",
                                    left: currentOffset.x,
                                    top: currentOffset.y,
                                    width: image.naturalWidth * effectiveScale,
                                    height: image.naturalHeight * effectiveScale,
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
                    <Button type="button" onClick={confirm} disabled={busy || !image}>
                        {t("photoCapture.cropConfirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
