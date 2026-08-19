import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { sniffMimeType } from "@/lib/file-signature";
import { getImageDimensions } from "@/lib/image-dimensions";
import { createAsset, deleteAsset, resolveViewer } from "@/lib/assets";
import {
    ASSET_KIND_META,
    assetUrl,
    canUploadAsset,
    employeePhotoUrl,
    isAssetKind,
    maxBytesForKind,
} from "@/lib/asset-kinds";
import { checkRate } from "@/lib/rate-limit";
import { logActivity } from "@/lib/logger";

export const runtime = "nodejs";

const UPLOAD_LIMIT_PER_HOUR = 30;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

/**
 * The one upload endpoint for every non-application image. What the caller is
 * allowed to do is decided entirely by `kind` + who owns the asset, in
 * src/lib/asset-kinds.ts — this route only validates the bytes.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const rate = checkRate(`assets:upload:${session.user.id}`, UPLOAD_LIMIT_PER_HOUR, UPLOAD_WINDOW_MS);
        if (!rate.allowed) {
            return NextResponse.json(
                { error: "อัปโหลดไฟล์บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
                { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
            );
        }

        let form: FormData;
        try {
            form = await request.formData();
        } catch {
            return NextResponse.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
        }

        const kindRaw = form.get("kind");
        if (!isAssetKind(kindRaw)) return NextResponse.json({ error: "ประเภทไฟล์ไม่ถูกต้อง" }, { status: 400 });
        const kind = kindRaw;
        const meta = ASSET_KIND_META[kind];

        const file = form.get("file");
        if (!(file instanceof File)) return NextResponse.json({ error: "กรุณาแนบไฟล์" }, { status: 400 });

        // Announcement images belong to no employee; everything else defaults to the
        // uploader, and only an explicit ownerUserId targets someone else.
        const ownerParam = form.get("ownerUserId");
        const ownerUserId =
            kind === "ANNOUNCEMENT_IMAGE"
                ? null
                : typeof ownerParam === "string" && ownerParam.trim() !== ""
                    ? ownerParam.trim()
                    : session.user.id;

        const owner = ownerUserId
            ? await prisma.user.findUnique({ where: { id: ownerUserId }, select: { id: true, name: true, stationId: true } })
            : null;
        if (ownerUserId && !owner) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

        const viewer = await resolveViewer({ id: session.user.id, role: session.user.role, stationId: session.user.stationId });
        const subject = { kind, ownerUserId, uploadedById: session.user.id, ownerStationId: owner?.stationId ?? null };
        if (!canUploadAsset(subject, viewer)) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์อัปโหลดไฟล์นี้" }, { status: 403 });
        }

        const maxBytes = maxBytesForKind(kind);
        if (file.size <= 0 || file.size > maxBytes) {
            return NextResponse.json(
                { error: `ขนาดไฟล์ต้องไม่เกิน ${Math.round(maxBytes / 1024 / 1024)}MB` },
                { status: 400 }
            );
        }

        const body = Buffer.from(await file.arrayBuffer());
        const mimeType = sniffMimeType(body);
        // PDF would upload fine but the Cloudinary account has PDF delivery disabled,
        // so it could never be viewed again — reject it at the door instead.
        if (!mimeType || mimeType === "application/pdf") {
            return NextResponse.json({ error: "ต้องเป็นไฟล์รูปภาพเท่านั้น" }, { status: 400 });
        }

        const dimensions = getImageDimensions(body, mimeType);
        if (!dimensions) return NextResponse.json({ error: "ไฟล์รูปภาพเสียหายหรือไม่ถูกต้อง" }, { status: 400 });

        const expiryRaw = form.get("documentExpiresAt");
        let documentExpiresAt: Date | null = null;
        if (meta.expires && typeof expiryRaw === "string" && expiryRaw.trim() !== "") {
            const parsed = new Date(expiryRaw);
            if (Number.isNaN(parsed.getTime())) {
                return NextResponse.json({ error: "วันหมดอายุเอกสารไม่ถูกต้อง" }, { status: 400 });
            }
            documentExpiresAt = parsed;
        }

        const noteRaw = form.get("note");
        const note = typeof noteRaw === "string" && noteRaw.trim() !== "" ? noteRaw.trim().slice(0, 500) : null;

        // Replacing an avatar: the old one is dropped so an employee never accumulates
        // photos, and so `ownerUserId + kind` resolves to exactly one row.
        const previousPhotos =
            kind === "EMPLOYEE_PHOTO" && ownerUserId
                ? await prisma.storedAsset.findMany({ where: { ownerUserId, kind: "EMPLOYEE_PHOTO" } })
                : [];

        const asset = await createAsset({
            kind,
            body,
            mimeType,
            checksum: createHash("sha256").update(body).digest("hex"),
            width: dimensions.width,
            height: dimensions.height,
            fileName: file.name || null,
            note,
            ownerUserId,
            uploadedById: session.user.id,
            documentExpiresAt,
        });

        if (kind === "EMPLOYEE_PHOTO" && ownerUserId) {
            for (const old of previousPhotos) await deleteAsset(old);
            // photoUrl points at the per-employee route, not this asset, so replacing
            // the photo later doesn't have to rewrite every cached copy of the URL.
            await prisma.user.update({ where: { id: ownerUserId }, data: { photoUrl: employeePhotoUrl(ownerUserId) } });
        }

        if (meta.vault && owner) {
            await logActivity(
                session.user.id,
                "UPLOAD_DOCUMENT",
                "User",
                `อัปโหลด${meta.label} ของ ${owner.name}`,
                owner.id
            );
        }

        return NextResponse.json({
            id: asset.id,
            kind: asset.kind,
            url: assetUrl(asset.id),
            thumbUrl: assetUrl(asset.id, "thumb"),
            fileName: asset.fileName,
            sizeBytes: asset.sizeBytes,
            documentExpiresAt: asset.documentExpiresAt,
        }, { status: 201 });
    } catch (error) {
        console.error("Error uploading asset:", error);
        return NextResponse.json({ error: "อัปโหลดไฟล์ไม่สำเร็จ" }, { status: 500 });
    }
}
