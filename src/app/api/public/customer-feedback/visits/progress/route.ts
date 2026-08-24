import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCustomerFeedbackPublicEnabled } from "@/lib/customer-feedback/feature-flags";
import { loadVisitFromHeaders } from "@/lib/customer-feedback/submit";
import { publicError } from "@/lib/customer-feedback/public-errors";

/**
 * POST /api/public/customer-feedback/visits/progress
 * บันทึก startedAt, lastStep และ targetConfirmation แบบ idempotent
 * ตอบ NO/UNSURE -> TARGET_REJECTED (terminal) และคืนผลเดิมเมื่อเรียกซ้ำ
 */

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackPublicEnabled()) {
            return publicError("PUBLIC_DISABLED", 404);
        }

        const body = await request.json().catch(() => null);
        if (typeof body !== "object" || body === null) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }
        const { startedAt, lastStep, targetConfirmation, language } = body as {
            startedAt?: boolean;
            lastStep?: string;
            targetConfirmation?: "YES" | "NO" | "UNSURE";
            language?: string;
        };
        if (targetConfirmation !== undefined && !["YES", "NO", "UNSURE"].includes(targetConfirmation)) {
            return NextResponse.json({ error: "Invalid targetConfirmation" }, { status: 400 });
        }

        const loaded = await loadVisitFromHeaders(request.headers);
        if ("error" in loaded) {
            return publicError("SESSION_EXPIRED", 401);
        }
        const { visit } = loaded;

        // idempotent: คืนสถานะปัจจุบันถ้า visit ไม่ OPEN แล้ว (terminal)
        if (visit.disposition !== "OPEN") {
            return NextResponse.json({ disposition: visit.disposition });
        }

        const now = new Date();
        const data: Record<string, unknown> = {};
        if (startedAt && !visit.startedAt) data.startedAt = now;
        if (typeof lastStep === "string" && lastStep.length <= 40) data.lastStep = lastStep;
        if (language === "th" || language === "en") data.language = language;

        if (targetConfirmation === "NO" || targetConfirmation === "UNSURE") {
            data.targetConfirmation = targetConfirmation;
            data.disposition = "TARGET_REJECTED";
        } else if (targetConfirmation === "YES") {
            data.targetConfirmation = "YES";
        }

        if (Object.keys(data).length > 0) {
            await prisma.customerFeedbackVisit.update({ where: { id: visit.id }, data });
        }
        return NextResponse.json({ disposition: data.disposition ?? visit.disposition });
    } catch (error) {
        console.error("Error updating visit progress:", error);
        return publicError("SERVER_ERROR", 500);
    }
}
