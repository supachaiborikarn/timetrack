import { AssetKind, type Role } from "@prisma/client";

/**
 * Everything the app knows about a StoredAsset kind: what to call it, whether it
 * is a document that lives in the employee vault, whether looking at it needs the
 * extra "sensitive" permission, and whether it has a real-world expiry date.
 *
 * Access rules are derived from this table rather than written out per route, so
 * adding a kind can't silently create a hole — a new kind is sensitive-by-default
 * only if it is declared so here, and every route consults the same helpers.
 */

type AssetKindMeta = {
    label: string;
    /** Part of the employee document vault (as opposed to a photo or an attachment). */
    vault: boolean;
    /** Reading it needs `employee_document.view_sensitive`, and the read is audit-logged. */
    sensitive: boolean;
    /** Offers a "valid until" date and takes part in the expiry reminders. */
    expires: boolean;
    /** Cloudinary folder — keeps the media library browsable per feature. */
    folder: string;
};

export const ASSET_KIND_META: Record<AssetKind, AssetKindMeta> = {
    EMPLOYEE_PHOTO: { label: "รูปพนักงาน", vault: false, sensitive: false, expires: false, folder: "hr/employees" },

    CITIZEN_ID: { label: "สำเนาบัตรประชาชน", vault: true, sensitive: true, expires: true, folder: "hr/documents" },
    HOUSE_REGISTRATION: { label: "สำเนาทะเบียนบ้าน", vault: true, sensitive: true, expires: false, folder: "hr/documents" },
    PASSPORT: { label: "หนังสือเดินทาง", vault: true, sensitive: true, expires: true, folder: "hr/documents" },
    WORK_PERMIT: { label: "ใบอนุญาตทำงาน", vault: true, sensitive: true, expires: true, folder: "hr/documents" },
    VISA: { label: "วีซ่า", vault: true, sensitive: true, expires: true, folder: "hr/documents" },
    EMPLOYMENT_CONTRACT: { label: "สัญญาจ้าง", vault: true, sensitive: false, expires: true, folder: "hr/documents" },
    EDUCATION_CERT: { label: "วุฒิการศึกษา", vault: true, sensitive: false, expires: false, folder: "hr/documents" },
    TRAINING_CERT: { label: "ใบรับรองการอบรม", vault: true, sensitive: false, expires: true, folder: "hr/documents" },
    BANK_BOOK: { label: "สมุดบัญชีธนาคาร", vault: true, sensitive: true, expires: false, folder: "hr/documents" },
    MEDICAL_CERT: { label: "ใบรับรองแพทย์", vault: true, sensitive: true, expires: false, folder: "hr/documents" },
    RESUME: { label: "ประวัติย่อ (Resume)", vault: true, sensitive: false, expires: false, folder: "hr/documents" },
    OTHER_DOCUMENT: { label: "เอกสารอื่น ๆ", vault: true, sensitive: false, expires: true, folder: "hr/documents" },

    REQUEST_ATTACHMENT: { label: "หลักฐานแนบคำขอ", vault: false, sensitive: false, expires: false, folder: "hr/requests" },
    ANNOUNCEMENT_IMAGE: { label: "รูปประกอบประกาศ", vault: false, sensitive: false, expires: false, folder: "hr/announcements" },
};

export const VAULT_DOCUMENT_KINDS = (Object.keys(ASSET_KIND_META) as AssetKind[]).filter((k) => ASSET_KIND_META[k].vault);

export function isAssetKind(value: unknown): value is AssetKind {
    return typeof value === "string" && value in AssetKind;
}

/** Assets nobody has attached to anything yet are swept up by the cleanup cron after this long. */
export const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export function maxBytesForKind(kind: AssetKind): number {
    return kind === "EMPLOYEE_PHOTO" ? MAX_PHOTO_BYTES : MAX_DOCUMENT_BYTES;
}

// ─── Access control ───────────────────────────────────────────────────────────

/** Everything the access rules need to know about the person asking. */
export type Viewer = {
    userId: string;
    role: Role;
    stationId: string | null;
    /** Result of hasPermission() for the codes below — resolved by the caller. */
    can: (code: AssetPermission) => boolean;
};

export type AssetPermission =
    | "employee.edit"
    | "employee_document.view"
    | "employee_document.manage"
    | "employee_document.view_sensitive"
    | "request.view"
    | "request.approve";

export type AssetSubject = {
    kind: AssetKind;
    ownerUserId: string | null;
    uploadedById: string | null;
    /** Station of the asset's owner — used to keep MANAGERs inside their own branch. */
    ownerStationId: string | null;
};

export type AccessDecision = { allowed: boolean; auditSensitiveRead: boolean };

const DENIED: AccessDecision = { allowed: false, auditSensitiveRead: false };

/**
 * Can `viewer` look at this asset? Pure, so the rules can be tested without a DB.
 *
 * The employee's own data is always visible to them — a worker can see their own
 * passport scan or the receipt they attached to a request. Everyone else needs a
 * permission, and MANAGERs additionally only ever see their own station.
 */
export function canViewAsset(subject: AssetSubject, viewer: Viewer): AccessDecision {
    const meta = ASSET_KIND_META[subject.kind];
    const isOwner = subject.ownerUserId !== null && subject.ownerUserId === viewer.userId;

    // Avatars and announcement images are shown all over the app to every signed-in
    // user — gating them per-viewer would just break every list that renders them.
    if (subject.kind === "EMPLOYEE_PHOTO" || subject.kind === "ANNOUNCEMENT_IMAGE") {
        return { allowed: true, auditSensitiveRead: false };
    }

    if (isOwner) return { allowed: true, auditSensitiveRead: false };

    if (subject.kind === "REQUEST_ATTACHMENT") {
        if (!viewer.can("request.view")) return DENIED;
        if (!isWithinManagerScope(subject, viewer)) return DENIED;
        return { allowed: true, auditSensitiveRead: false };
    }

    // Vault documents.
    if (!viewer.can("employee_document.view")) return DENIED;
    if (!isWithinManagerScope(subject, viewer)) return DENIED;
    if (meta.sensitive && !viewer.can("employee_document.view_sensitive")) return DENIED;

    return { allowed: true, auditSensitiveRead: meta.sensitive };
}

/** Can `viewer` upload an asset of this kind for this owner? */
export function canUploadAsset(subject: AssetSubject, viewer: Viewer): boolean {
    const meta = ASSET_KIND_META[subject.kind];
    const isOwner = subject.ownerUserId === viewer.userId;

    if (subject.kind === "ANNOUNCEMENT_IMAGE") return true; // anyone who can post an announcement
    if (subject.kind === "REQUEST_ATTACHMENT") return isOwner; // evidence is attached by the requester
    if (subject.kind === "EMPLOYEE_PHOTO") return isOwner || viewer.can("employee.edit");
    if (meta.vault) return viewer.can("employee_document.manage") && isWithinManagerScope(subject, viewer);

    return false;
}

/** Can `viewer` delete this asset? */
export function canDeleteAsset(subject: AssetSubject, viewer: Viewer): boolean {
    const meta = ASSET_KIND_META[subject.kind];
    const isOwner = subject.ownerUserId === viewer.userId;
    const isUploader = subject.uploadedById === viewer.userId;

    if (subject.kind === "ANNOUNCEMENT_IMAGE") return isUploader || viewer.can("employee.edit");
    if (subject.kind === "REQUEST_ATTACHMENT") return isOwner || viewer.can("request.approve");
    if (subject.kind === "EMPLOYEE_PHOTO") return isOwner || viewer.can("employee.edit");
    if (meta.vault) return viewer.can("employee_document.manage") && isWithinManagerScope(subject, viewer);

    return false;
}

/**
 * A MANAGER only ever reaches employees at their own station. ADMIN/HR are not
 * station-bound, and an asset with no owner (announcement image) is not either.
 */
function isWithinManagerScope(subject: AssetSubject, viewer: Viewer): boolean {
    if (viewer.role !== "MANAGER") return true;
    if (!viewer.stationId || subject.ownerStationId === null) return true;
    return subject.ownerStationId === viewer.stationId;
}

/** The stable, per-employee avatar URL. Stays valid when the photo is replaced. */
export function employeePhotoUrl(userId: string): string {
    return `/api/employees/${userId}/photo`;
}

/** URL that serves an asset's bytes. `variant: "thumb"` returns a 150px version. */
export function assetUrl(assetId: string, variant?: "thumb"): string {
    return variant ? `/api/assets/${assetId}?t=${variant}` : `/api/assets/${assetId}`;
}
