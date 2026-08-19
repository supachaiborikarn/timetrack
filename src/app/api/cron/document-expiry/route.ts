import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification, createNotifications } from "@/lib/notifications";
import { ASSET_KIND_META, VAULT_DOCUMENT_KINDS } from "@/lib/asset-kinds";
import { formatThaiDate, startOfDayBangkok } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

/**
 * Warns about employee documents that are about to stop being valid — work
 * permits and visas above all, which for this business are a legal exposure and
 * not just paperwork.
 *
 * Stateless by design: a reminder fires only on the exact days below, so running
 * daily produces one notice per threshold and no "sent already" table is needed.
 * The trade-off is that a run skipped entirely also skips that day's threshold —
 * acceptable because several thresholds cover every document.
 */
const REMINDER_DAYS = [60, 30, 14, 7, 1, 0];

function hasValidCronSecret(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function hasManualAccess(): Promise<boolean> {
    const session = await auth();
    return Boolean(session?.user?.id && ["ADMIN", "HR"].includes(session.user.role));
}

/** Whole days from today (Bangkok) until the document expires. Negative once past. */
function daysUntil(expiry: Date, today: Date): number {
    return Math.round((startOfDayBangkok(expiry).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

async function run() {
    const today = startOfDayBangkok(new Date());
    const horizon = new Date(today.getTime() + (Math.max(...REMINDER_DAYS) + 1) * 24 * 60 * 60 * 1000);

    const documents = await prisma.storedAsset.findMany({
        where: {
            kind: { in: VAULT_DOCUMENT_KINDS },
            documentExpiresAt: { not: null, lte: horizon },
            owner: { isActive: true },
        },
        select: {
            id: true,
            kind: true,
            documentExpiresAt: true,
            ownerUserId: true,
            owner: { select: { name: true, employeeId: true } },
        },
    });

    const due = documents.filter((doc) => REMINDER_DAYS.includes(daysUntil(doc.documentExpiresAt!, today)));
    if (due.length === 0) return { documentsChecked: documents.length, remindersSent: 0, hrNotified: 0 };

    // Whoever may act on it — the same roles that can replace the document.
    const rolePerms = await prisma.rolePermission.findMany({
        where: { permission: { code: "employee_document.manage" } },
        select: { role: true },
    });
    const hrRecipients = await prisma.user.findMany({
        where: { role: { in: rolePerms.map((rp) => rp.role) }, isActive: true },
        select: { id: true },
    });

    let remindersSent = 0;
    for (const doc of due) {
        const days = daysUntil(doc.documentExpiresAt!, today);
        const label = ASSET_KIND_META[doc.kind].label;
        const expiryText = formatThaiDate(doc.documentExpiresAt!);
        const title = days <= 0 ? `${label}หมดอายุแล้ว` : `${label}ใกล้หมดอายุ`;
        const employeeMessage =
            days <= 0
                ? `${label}ของคุณหมดอายุเมื่อ ${expiryText} กรุณาติดต่อฝ่ายบุคคลเพื่อยื่นเอกสารใหม่`
                : `${label}ของคุณจะหมดอายุวันที่ ${expiryText} (อีก ${days} วัน) กรุณาเตรียมต่ออายุ`;

        if (doc.ownerUserId) {
            await createNotification({
                userId: doc.ownerUserId,
                type: "DOCUMENT_EXPIRY",
                title,
                message: employeeMessage,
            });
            remindersSent++;
        }

        await createNotifications(
            hrRecipients.map((r) => r.id),
            "DOCUMENT_EXPIRY",
            title,
            days <= 0
                ? `${label}ของ ${doc.owner?.name ?? "-"} (${doc.owner?.employeeId ?? "-"}) หมดอายุเมื่อ ${expiryText}`
                : `${label}ของ ${doc.owner?.name ?? "-"} (${doc.owner?.employeeId ?? "-"}) จะหมดอายุวันที่ ${expiryText} (อีก ${days} วัน)`,
            "/admin/employees"
        );
    }

    return { documentsChecked: documents.length, remindersSent, hrNotified: hrRecipients.length * due.length };
}

export async function GET(request: NextRequest) {
    if (!hasValidCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        return NextResponse.json({ success: true, ...(await run()) });
    } catch (error) {
        console.error("document-expiry cron failed:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!hasValidCronSecret(request) && !(await hasManualAccess())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        return NextResponse.json({ success: true, ...(await run()) });
    } catch (error) {
        console.error("document-expiry cron failed:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
