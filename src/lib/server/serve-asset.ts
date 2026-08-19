import { NextResponse } from "next/server";
import { getStorage, type ImageTransform } from "@/lib/storage";
import { toStoredFile } from "@/lib/assets";
import { ASSET_KIND_META } from "@/lib/asset-kinds";
import type { AssetKind } from "@prisma/client";

const THUMB_TRANSFORM: ImageTransform = { crop: "limit", width: 150, height: 150 };

/** Avatars and announcement images are re-requested on every list render, so a short
 *  private cache is worth it. Documents are not cached at all. */
const CACHEABLE_KINDS: AssetKind[] = ["EMPLOYEE_PHOTO", "ANNOUNCEMENT_IMAGE"];

type ServableAsset = {
    id: string;
    kind: AssetKind;
    mimeType: string;
    sizeBytes: number;
    storageDriver: string;
    storageKey: string | null;
};

/**
 * Hands the bytes of an already-authorized asset to the browser: a redirect to a
 * signed storage URL where the driver supports it, a direct stream otherwise.
 * Callers must have run the access check first — this function does not.
 */
export async function serveAsset(asset: ServableAsset, opts?: { thumb?: boolean }): Promise<NextResponse> {
    const cacheControl = CACHEABLE_KINDS.includes(asset.kind)
        ? "private, max-age=300"
        : "private, no-store";

    const storedFile = toStoredFile(asset);
    const storage = getStorage("storedAsset");
    const signedUrl = await storage.signedUrl(storedFile, {
        ttlSec: 300,
        transform: opts?.thumb ? THUMB_TRANSFORM : undefined,
    });

    if (signedUrl) {
        return NextResponse.redirect(signedUrl, { status: 307, headers: { "Cache-Control": cacheControl } });
    }

    const body = await storage.get(storedFile);
    return new NextResponse(new Uint8Array(body), {
        status: 200,
        headers: {
            "Content-Type": asset.mimeType,
            "Cache-Control": cacheControl,
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
        },
    });
}

/** Human-readable name for an asset kind, for audit-log lines and UI labels. */
export function assetKindLabel(kind: AssetKind): string {
    return ASSET_KIND_META[kind].label;
}
