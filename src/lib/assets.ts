import { AssetKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStorage, resourceTypeForMime, type StoredFile } from "@/lib/storage";
import { hasPermission } from "@/lib/permissions";
import { ASSET_KIND_META, ORPHAN_TTL_MS, type AssetPermission, type Viewer } from "@/lib/asset-kinds";

/** Server-side half of the asset system: storage plumbing and viewer resolution.
 *  The rules themselves (labels, sensitivity, who may look) live in asset-kinds.ts,
 *  which stays free of server imports so the UI can share them. */

// ─── Storage plumbing ─────────────────────────────────────────────────────────

type AssetStorageRow = {
    id: string;
    mimeType: string;
    sizeBytes: number;
    storageDriver: string;
    storageKey: string | null;
};

/** Maps a StoredAsset row onto the shape src/lib/storage.ts works with. */
export function toStoredFile(asset: AssetStorageRow): StoredFile {
    return {
        driver: asset.storageDriver === "db" ? "db" : "cloudinary",
        key: asset.storageKey ?? asset.id,
        resourceType: resourceTypeForMime(asset.mimeType),
        mimeType: asset.mimeType,
        size: asset.sizeBytes,
    };
}

export type CreateAssetInput = {
    kind: AssetKind;
    body: Buffer;
    mimeType: string;
    checksum: string;
    width: number | null;
    height: number | null;
    fileName?: string | null;
    note?: string | null;
    ownerUserId: string | null;
    uploadedById: string;
    documentExpiresAt?: Date | null;
};

/**
 * Kinds that only become reachable once something else is saved and points at
 * them — until then they are orphans and the cleanup cron may sweep them up.
 * Photos and vault documents are reachable the moment they exist, through their
 * owner, so they never get a purge deadline.
 */
const DETACHED_ON_UPLOAD: AssetKind[] = ["REQUEST_ATTACHMENT", "ANNOUNCEMENT_IMAGE"];

/**
 * Writes the bytes and the row. Two-phase, exactly like the job-application
 * uploader: the row exists first so its id can be the storage key, and the row
 * is removed again if the upload itself fails — otherwise a failed upload would
 * leave a row pointing at nothing.
 */
export async function createAsset(input: CreateAssetInput) {
    const asset = await prisma.storedAsset.create({
        data: {
            kind: input.kind,
            ownerUserId: input.ownerUserId,
            uploadedById: input.uploadedById,
            mimeType: input.mimeType,
            sizeBytes: input.body.length,
            width: input.width,
            height: input.height,
            checksum: input.checksum,
            fileName: input.fileName ?? null,
            note: input.note ?? null,
            documentExpiresAt: input.documentExpiresAt ?? null,
            purgeAfter: DETACHED_ON_UPLOAD.includes(input.kind) ? new Date(Date.now() + ORPHAN_TTL_MS) : null,
            storageDriver: "pending",
        },
    });

    try {
        const stored = await getStorage("storedAsset").put({
            key: asset.id,
            body: input.body,
            mimeType: input.mimeType,
            resourceType: resourceTypeForMime(input.mimeType),
            folder: ASSET_KIND_META[input.kind].folder,
        });

        return await prisma.storedAsset.update({
            where: { id: asset.id },
            data: { storageDriver: stored.driver, storageKey: stored.key, sizeBytes: stored.size },
        });
    } catch (error) {
        await prisma.storedAsset.delete({ where: { id: asset.id } }).catch(() => {});
        throw error;
    }
}

/** Deletes both the bytes and the row. Storage failures don't block the row delete. */
export async function deleteAsset(asset: AssetStorageRow): Promise<void> {
    try {
        await getStorage("storedAsset").delete(toStoredFile(asset));
    } catch (error) {
        console.error("deleteAsset: failed to remove bytes from storage", asset.id, error);
    }
    await prisma.storedAsset.delete({ where: { id: asset.id } }).catch(() => {});
}

/**
 * Marks an asset as attached — it survives the orphan sweep from now on. Called
 * once whatever the asset belongs to (a request, an announcement, an employee
 * record) has actually been saved.
 */
export async function markAssetAttached(assetId: string): Promise<void> {
    await prisma.storedAsset.update({ where: { id: assetId }, data: { purgeAfter: null } });
}

/**
 * Validates that `assetId` really is an upload this user just made and hasn't
 * attached to anything yet, then claims it. Returns the id to store on the
 * request row, or null if the caller passed nothing.
 *
 * Guards against one user attaching another user's evidence to their own request,
 * and against the same upload being pointed at by two different requests.
 */
export async function claimUploadedAsset(
    assetId: string | null | undefined,
    userId: string,
    kind: AssetKind
): Promise<string | null> {
    if (!assetId) return null;

    const asset = await prisma.storedAsset.findFirst({
        // Matched on the uploader, not the owner: announcement images have no owner,
        // and for request evidence the uploader and the owner are the same person.
        where: { id: assetId, kind, uploadedById: userId },
        select: {
            id: true,
            _count: { select: { timeCorrections: true, advances: true, announcements: true } },
        },
    });
    if (!asset) throw new Error("ไฟล์แนบไม่ถูกต้อง");

    const alreadyUsed = asset._count.timeCorrections + asset._count.advances + asset._count.announcements;
    if (alreadyUsed > 0) throw new Error("ไฟล์แนบนี้ถูกใช้ไปแล้ว");

    await markAssetAttached(asset.id);
    return asset.id;
}


// ─── Viewer resolution ────────────────────────────────────────────────────────

/** Permission codes the access rules can ask about — all resolved up front so the
 *  rules stay synchronous and testable. */
const ASSET_PERMISSIONS: AssetPermission[] = [
    "employee.edit",
    "employee_document.view",
    "employee_document.manage",
    "employee_document.view_sensitive",
    "request.view",
    "request.approve",
];

export async function resolveViewer(session: {
    id: string;
    role: string;
    stationId?: string | null;
}): Promise<Viewer> {
    const role = session.role as Viewer["role"];
    const granted = new Set<AssetPermission>();
    await Promise.all(
        ASSET_PERMISSIONS.map(async (code) => {
            if (await hasPermission(role, code)) granted.add(code);
        })
    );

    return {
        userId: session.id,
        role,
        stationId: session.stationId ?? null,
        can: (code) => granted.has(code),
    };
}
