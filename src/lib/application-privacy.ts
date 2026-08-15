import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

/**
 * Deletes the CITIZEN_ID copy for an application immediately — used when an
 * application is rejected or withdrawn, since at that point there is no
 * remaining reason to keep a copy of the ID card (the rest of the application
 * and the profile photo are kept until `purgeAfter`, per the PDPA design doc).
 */
export async function purgeCitizenIdCopies(applicationId: string): Promise<void> {
    const files = await prisma.jobApplicationFile.findMany({
        where: { applicationId, kind: "CITIZEN_ID" },
    });
    if (files.length === 0) return;

    const storage = getStorage();
    for (const file of files) {
        try {
            if (file.storageDriver === "cloudinary" && file.storageKey) {
                await storage.delete({
                    driver: "cloudinary",
                    key: file.storageKey,
                    resourceType: "image",
                    mimeType: file.mimeType,
                    size: file.sizeBytes,
                });
            }
        } catch (error) {
            console.error("Error deleting citizen ID file from storage:", file.id, error);
        }
    }

    await prisma.jobApplicationFile.deleteMany({ where: { id: { in: files.map((f) => f.id) } } });
}
