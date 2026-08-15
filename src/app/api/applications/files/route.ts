import { NextRequest, NextResponse } from "next/server";
import { ApplicationFileKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRate, getClientIp } from "@/lib/rate-limit";
import { sniffMimeType } from "@/lib/file-signature";
import { getImageDimensions } from "@/lib/image-dimensions";
import { getStorage, resourceTypeForMime } from "@/lib/storage";
import { createHash } from "crypto";

export const runtime = "nodejs";

const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;
const UPLOAD_LIMIT_PER_HOUR = 20;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

const IMAGE_ONLY_KINDS = new Set<ApplicationFileKind>(["PROFILE_PHOTO", "CITIZEN_ID"]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB — client already re-encodes to WebP before upload
const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5MB — house registration / education cert / resume

function isValidKind(value: unknown): value is ApplicationFileKind {
    return typeof value === "string" && value in ApplicationFileKind;
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request.headers);
    const rate = checkRate(`applications:file-upload:${ip}`, UPLOAD_LIMIT_PER_HOUR, UPLOAD_WINDOW_MS);
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
    const file = form.get("file");

    if (!isValidKind(kindRaw)) {
        return NextResponse.json({ error: "ประเภทไฟล์ไม่ถูกต้อง" }, { status: 400 });
    }
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "กรุณาแนบไฟล์" }, { status: 400 });
    }

    const kind = kindRaw;
    const isImageOnly = IMAGE_ONLY_KINDS.has(kind);
    const maxBytes = isImageOnly ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;

    if (file.size <= 0 || file.size > maxBytes) {
        return NextResponse.json(
            { error: `ขนาดไฟล์ต้องไม่เกิน ${Math.round(maxBytes / 1024 / 1024)}MB` },
            { status: 400 }
        );
    }

    const body = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffMimeType(body);

    if (!mimeType) {
        return NextResponse.json({ error: "ไม่รองรับไฟล์ประเภทนี้" }, { status: 400 });
    }
    if (isImageOnly && mimeType === "application/pdf") {
        return NextResponse.json({ error: "ต้องเป็นไฟล์รูปภาพเท่านั้น" }, { status: 400 });
    }

    const dimensions = mimeType === "application/pdf" ? null : getImageDimensions(body, mimeType);
    if (mimeType !== "application/pdf" && !dimensions) {
        // Magic bytes matched but the file doesn't decode as a real image — reject rather than store garbage.
        return NextResponse.json({ error: "ไฟล์รูปภาพเสียหายหรือไม่ถูกต้อง" }, { status: 400 });
    }

    const checksum = createHash("sha256").update(body).digest("hex");
    const resourceType = resourceTypeForMime(mimeType);

    const fileRow = await prisma.jobApplicationFile.create({
        data: {
            applicationId: null,
            kind,
            mimeType,
            sizeBytes: body.length,
            width: dimensions?.width,
            height: dimensions?.height,
            checksum,
            storageDriver: "pending",
            expiresAt: new Date(Date.now() + ORPHAN_TTL_MS),
        },
    });

    try {
        const storage = getStorage();
        const stored = await storage.put({
            key: fileRow.id,
            body,
            mimeType,
            resourceType,
            folder: "hr/applications/orphan",
        });

        await prisma.jobApplicationFile.update({
            where: { id: fileRow.id },
            data: {
                storageDriver: stored.driver,
                storageKey: stored.key,
                storageMeta: { resourceType: stored.resourceType },
            },
        });

        const isThumbnailable = mimeType !== "application/pdf";
        const previewUrl = await storage.signedUrl(stored, {
            ttlSec: 300,
            transform: isThumbnailable ? { crop: "limit", width: 400, height: 400 } : undefined,
        });

        return NextResponse.json({ fileId: fileRow.id, previewUrl });
    } catch (error) {
        console.error("Error storing application file:", error);
        await prisma.jobApplicationFile.delete({ where: { id: fileRow.id } }).catch(() => {});
        return NextResponse.json({ error: "อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
    }
}
