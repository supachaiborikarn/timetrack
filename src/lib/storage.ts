import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";

/**
 * Storage adapter for job-application attachments (photos, ID copies, resumes).
 *
 * Two-phase usage: the caller first creates the JobApplicationFile row (to get
 * an id) with a placeholder driver, then calls `storage.put({ key: file.id, ... })`.
 * Both drivers persist into that same row — cloudinary writes storageKey/storageMeta,
 * the db driver writes the bytes into `data` directly. This keeps storage.ts as the
 * only place that knows how to read/write file bytes, while the JobApplicationFile
 * row (kind, applicationId, sizeBytes, etc.) stays owned by the API route that
 * creates it.
 */

export type ResourceType = "image" | "raw";

export type StoredFile = {
    driver: "cloudinary" | "db";
    key: string; // Cloudinary public_id, or JobApplicationFile.id for the db driver
    resourceType: ResourceType;
    mimeType: string;
    size: number;
};

/** Inline transformation params (crop/width/height/gravity/...) — NOT a raw transformation string, which the Cloudinary SDK misreads as a named-transformation lookup. */
export type ImageTransform = Record<string, string | number>;

export interface StorageDriver {
    put(input: { key: string; body: Buffer; mimeType: string; resourceType: ResourceType; folder: string }): Promise<StoredFile>;
    /** Time-limited URL the browser can load directly. Returns null if the caller must stream via `get` instead. */
    signedUrl(file: StoredFile, opts?: { ttlSec?: number; transform?: ImageTransform }): Promise<string | null>;
    get(file: StoredFile): Promise<Buffer>;
    delete(file: StoredFile): Promise<void>;
}

const DEFAULT_TTL_SEC = 5 * 60;

function isCloudinaryConfigured(): boolean {
    return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

class CloudinaryDriver implements StorageDriver {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
    }

    async put(input: { key: string; body: Buffer; mimeType: string; resourceType: ResourceType; folder: string }): Promise<StoredFile> {
        const publicId = `${input.folder}/${input.key}`;

        const uploadResult = await new Promise<{ public_id: string; bytes: number }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    public_id: publicId,
                    resource_type: input.resourceType,
                    type: "authenticated", // never public — served only via signed URLs from our own route
                    access_mode: "authenticated",
                    overwrite: false,
                },
                (error, result) => {
                    if (error || !result) return reject(error ?? new Error("Cloudinary upload returned no result"));
                    resolve(result as { public_id: string; bytes: number });
                }
            );
            uploadStream.end(input.body);
        });

        const file: StoredFile = {
            driver: "cloudinary",
            key: uploadResult.public_id,
            resourceType: input.resourceType,
            mimeType: input.mimeType,
            size: uploadResult.bytes,
        };

        return file;
    }

    async signedUrl(file: StoredFile, opts?: { ttlSec?: number; transform?: ImageTransform }): Promise<string | null> {
        // Token-based authentication (time-limited __cld_token__ URLs) is an Advanced-plan feature —
        // this account doesn't have it enabled (Console > Settings > Security has no such toggle on
        // this plan), and requesting it returns 401 rather than degrading gracefully. So access control
        // here is: `sign_url` cryptographically ties the URL to this exact public_id/transformation/version
        // (not forgeable, doesn't expire), and the real boundary is that only our authenticated admin
        // route ever generates and hands out this URL in the first place. If the account is later upgraded
        // and CLOUDINARY_AUTH_TOKEN_KEY is set, this can switch back to a real expiring token.
        const authTokenKey = process.env.CLOUDINARY_AUTH_TOKEN_KEY;
        const ttlSec = opts?.ttlSec ?? DEFAULT_TTL_SEC;

        return cloudinary.url(file.key, {
            resource_type: file.resourceType,
            type: "authenticated",
            secure: true,
            sign_url: true,
            transformation: opts?.transform,
            ...(authTokenKey
                ? { auth_token: { key: authTokenKey, start_time: Math.floor(Date.now() / 1000), duration: ttlSec } }
                : {}),
        });
    }

    async get(file: StoredFile): Promise<Buffer> {
        const url = await this.signedUrl(file, { ttlSec: 60 });
        if (!url) throw new Error("Could not sign Cloudinary URL");
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Cloudinary fetch failed: ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }

    async delete(file: StoredFile): Promise<void> {
        await cloudinary.uploader.destroy(file.key, { resource_type: file.resourceType, type: "authenticated" });
    }
}

class DbDriver implements StorageDriver {
    async put(input: { key: string; body: Buffer; mimeType: string; resourceType: ResourceType }): Promise<StoredFile> {
        await prisma.jobApplicationFile.update({
            where: { id: input.key },
            data: { data: input.body, storageDriver: "db", storageKey: input.key },
        });

        return {
            driver: "db",
            key: input.key,
            resourceType: input.resourceType,
            mimeType: input.mimeType,
            size: input.body.length,
        };
    }

    /** DB-stored files are never handed out as direct URLs — callers must stream via `get`. */
    async signedUrl(): Promise<string | null> {
        return null;
    }

    async get(file: StoredFile): Promise<Buffer> {
        const row = await prisma.jobApplicationFile.findUniqueOrThrow({ where: { id: file.key } });
        if (!row.data) throw new Error(`No data stored for file ${file.key}`);
        return Buffer.from(row.data);
    }

    async delete(file: StoredFile): Promise<void> {
        await prisma.jobApplicationFile.update({ where: { id: file.key }, data: { data: null } }).catch(() => {
            // Row may already be gone (e.g. cascaded on application delete) — nothing left to clean up.
        });
    }
}

let cachedDriver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
    if (cachedDriver) return cachedDriver;
    cachedDriver = isCloudinaryConfigured() ? new CloudinaryDriver() : new DbDriver();
    return cachedDriver;
}

export function resourceTypeForMime(mimeType: string): ResourceType {
    return mimeType === "application/pdf" || mimeType.startsWith("image/") ? "image" : "raw";
}
