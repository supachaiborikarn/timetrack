import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { createNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const STALE_SUBMITTED_DAYS = 7;

function hasValidCronSecret(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function hasManualAccess(): Promise<boolean> {
    const session = await auth();
    return Boolean(session?.user?.id && ["ADMIN", "HR"].includes(session.user.role));
}

async function destroyFiles(files: { storageDriver: string; storageKey: string | null; mimeType: string; sizeBytes: number }[]) {
    const storage = getStorage();
    let count = 0;
    for (const file of files) {
        if (file.storageDriver === "cloudinary" && file.storageKey) {
            try {
                await storage.delete({ driver: "cloudinary", key: file.storageKey, resourceType: "image", mimeType: file.mimeType, size: file.sizeBytes });
                count++;
            } catch (error) {
                console.error("applications-cleanup: failed to delete storage file", file.storageKey, error);
            }
        }
    }
    return count;
}

async function run() {
    const now = new Date();

    // 1. Orphan upload files nobody ever attached to a submitted application.
    const orphanFiles = await prisma.jobApplicationFile.findMany({
        where: { applicationId: null, expiresAt: { lt: now } },
    });
    const orphanStorageDeleted = await destroyFiles(orphanFiles);
    const orphanDeleted = await prisma.jobApplicationFile.deleteMany({
        where: { id: { in: orphanFiles.map((f) => f.id) } },
    });

    // 2. Applications past their retention window (rejected/withdrawn 180 days ago).
    const expiredApplications = await prisma.jobApplication.findMany({
        where: { purgeAfter: { lt: now } },
        include: { files: true },
    });
    let expiredStorageDeleted = 0;
    for (const app of expiredApplications) {
        expiredStorageDeleted += await destroyFiles(app.files);
    }
    const expiredDeleted = await prisma.jobApplication.deleteMany({
        where: { id: { in: expiredApplications.map((a) => a.id) } },
    });

    // 3. Nudge HR about applications sitting untouched in SUBMITTED for too long.
    const staleCutoff = new Date(now.getTime() - STALE_SUBMITTED_DAYS * 24 * 60 * 60 * 1000);
    const staleCount = await prisma.jobApplication.count({
        where: { status: "SUBMITTED", createdAt: { lt: staleCutoff } },
    });
    let notified = 0;
    if (staleCount > 0) {
        const rolePerms = await prisma.rolePermission.findMany({
            where: { permission: { code: "application.review" } },
            select: { role: true },
        });
        const recipients = await prisma.user.findMany({
            where: { role: { in: rolePerms.map((rp) => rp.role) }, isActive: true },
            select: { id: true },
        });
        await createNotifications(
            recipients.map((r) => r.id),
            "APPLICATION_SUBMITTED",
            "มีใบสมัครงานค้างพิจารณา",
            `มีใบสมัครงาน ${staleCount} ใบที่ยังไม่ได้เริ่มคัดกรองมาเกิน ${STALE_SUBMITTED_DAYS} วัน`,
            "/admin/applications"
        );
        notified = recipients.length;
    }

    return {
        orphanFilesDeleted: orphanDeleted.count,
        orphanStorageDeleted,
        applicationsPurged: expiredDeleted.count,
        purgedStorageDeleted: expiredStorageDeleted,
        staleSubmittedCount: staleCount,
        notifiedUsers: notified,
    };
}

export async function GET(request: NextRequest) {
    if (!hasValidCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("applications-cleanup cron failed:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!hasValidCronSecret(request) && !(await hasManualAccess())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("applications-cleanup cron failed:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
