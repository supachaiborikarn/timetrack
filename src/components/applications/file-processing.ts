/** Shared client-side helpers for image capture/upload components under src/components/applications/. */

export const MAX_SOURCE_BYTES = 8 * 1024 * 1024; // 8MB — checked before any client-side processing
export const DOCUMENT_MAX_SIDE = 1600; // long enough to keep document text legible
export const WEBP_QUALITY = 0.85;

export function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("image load failed"));
        };
        img.src = url;
    });
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/webp", quality);
    });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(blob);
    });
}

/** Draws `img` onto a new canvas, downscaled (never upscaled) so its longest side is at most `maxSide`. */
export function drawResizedToCanvas(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
}

export async function uploadApplicationFile(kind: string, blob: Blob, filename: string): Promise<{ fileId: string; previewUrl: string | null }> {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", blob, filename);

    const res = await fetch("/api/applications/files", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "upload failed");
    return json;
}
