import type { ApplicationFileKind, AssetKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { createAsset } from "@/lib/assets";
import { employeePhotoUrl } from "@/lib/asset-kinds";
import { createHash } from "crypto";

/** Where each application attachment lands in the employee's document vault. */
const KIND_MAP: Record<ApplicationFileKind, AssetKind> = {
    PROFILE_PHOTO: "EMPLOYEE_PHOTO",
    CITIZEN_ID: "CITIZEN_ID",
    HOUSE_REGISTRATION: "HOUSE_REGISTRATION",
    EDUCATION_CERT: "EDUCATION_CERT",
    RESUME: "RESUME",
    OTHER: "OTHER_DOCUMENT",
};

/**
 * Moves a hired applicant's attachments into their employee record: photo to the
 * avatar, everything else into the document vault.
 *
 * The bytes are **copied**, not aliased. An earlier version pointed the employee
 * at the application's own Cloudinary object to save a copy, which quietly coupled
 * the two: replacing the employee's photo would have destroyed the object the
 * application record still referenced, and the application's retention rules would
 * have reached into the employee's file. Hiring is rare enough that a real copy is
 * the cheaper trade.
 *
 * Never throws — a hire must not fail because a file copy did.
 */
export async function copyApplicationFilesToEmployee(
    applicationId: string,
    userId: string,
    uploadedById: string
): Promise<{ copied: number; failed: number }> {
    const files = await prisma.jobApplicationFile.findMany({ where: { applicationId } });
    const storage = getStorage();

    let copied = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const body = await storage.get({
                driver: file.storageDriver === "db" ? "db" : "cloudinary",
                key: file.storageKey ?? file.id,
                resourceType: "image",
                mimeType: file.mimeType,
                size: file.sizeBytes,
            });

            await createAsset({
                kind: KIND_MAP[file.kind],
                body,
                mimeType: file.mimeType,
                checksum: file.checksum ?? createHash("sha256").update(body).digest("hex"),
                width: file.width,
                height: file.height,
                fileName: null,
                note: "ย้ายมาจากใบสมัครงานตอนจ้างงาน",
                ownerUserId: userId,
                uploadedById,
            });
            copied++;
        } catch (error) {
            console.error("copyApplicationFilesToEmployee: failed to copy file", file.id, error);
            failed++;
        }
    }

    const hasPhoto = await prisma.storedAsset.count({ where: { ownerUserId: userId, kind: "EMPLOYEE_PHOTO" } });
    if (hasPhoto > 0) {
        await prisma.user.update({ where: { id: userId }, data: { photoUrl: employeePhotoUrl(userId) } });
    }

    return { copied, failed };
}
