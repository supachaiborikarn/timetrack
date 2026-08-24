import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCustomerFeedbackPublicEnabled, assertPublicSecrets } from "@/lib/customer-feedback/feature-flags";
import { loadVisitFromHeaders } from "@/lib/customer-feedback/submit";
import { publicError } from "@/lib/customer-feedback/public-errors";
import { isJsonRequest, isSameOriginRequest, readJsonBody } from "../../_request";
import { checkPublicVisitRateLimit } from "../../_visit-rate-limit";

/**
 * POST /api/public/customer-feedback/visits/progress
 * บันทึก startedAt, lastStep และ targetConfirmation แบบ idempotent
 * ตอบ NO/UNSURE -> TARGET_REJECTED (terminal) และคืนผลเดิมเมื่อเรียกซ้ำ
 */

function noStore(response: NextResponse): NextResponse {
    response.headers.set("Cache-Control", "no-store");
    return response;
}

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackPublicEnabled()) {
            return publicError("PUBLIC_DISABLED", 404);
        }
        assertPublicSecrets();
        if (!isSameOriginRequest(request)) {
            return noStore(NextResponse.json({ error: "Invalid origin" }, { status: 403 }));
        }
        if (!isJsonRequest(request)) {
            return noStore(NextResponse.json({ error: "Unsupported content type" }, { status: 415 }));
        }

        const loaded = await loadVisitFromHeaders(request.headers);
        if ("error" in loaded) {
            return publicError("SESSION_EXPIRED", 401);
        }
        const { visit } = loaded;

        const visitLimit = await checkPublicVisitRateLimit("progress", visit.id);
        if (!visitLimit.allowed) {
            return publicError("REQUEST_RATE_LIMITED", 429, {
                "Retry-After": String(visitLimit.retryAfterSec),
            });
        }

        const parsedBody = await readJsonBody(request);
        if (!parsedBody.ok) {
            return parsedBody.reason === "PAYLOAD_TOO_LARGE"
                ? publicError("PAYLOAD_TOO_LARGE", 413)
                : noStore(NextResponse.json({ error: "Invalid body" }, { status: 400 }));
        }
        if (typeof parsedBody.value !== "object" || parsedBody.value === null) {
            return noStore(NextResponse.json({ error: "Invalid body" }, { status: 400 }));
        }
        const { startedAt, lastStep, targetConfirmation, language } = parsedBody.value as {
            startedAt?: boolean;
            lastStep?: string;
            targetConfirmation?: "YES" | "NO" | "UNSURE";
            language?: string;
        };
        if (targetConfirmation !== undefined && !["YES", "NO", "UNSURE"].includes(targetConfirmation)) {
            return noStore(NextResponse.json({ error: "Invalid targetConfirmation" }, { status: 400 }));
        }

        // idempotent: คืนสถานะปัจจุบันถ้า visit ไม่ OPEN แล้ว (terminal)
        if (visit.disposition !== "OPEN") {
            return noStore(NextResponse.json({ disposition: visit.disposition }));
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
            const updated = await prisma.customerFeedbackVisit.updateMany({
                where: { id: visit.id, disposition: "OPEN" },
                data,
            });
            if (updated.count === 0) {
                const current = await prisma.customerFeedbackVisit.findUnique({
                    where: { id: visit.id },
                    select: { disposition: true },
                });
                if (!current) return publicError("SESSION_EXPIRED", 401);
                return noStore(NextResponse.json({ disposition: current.disposition }));
            }
        }
        return noStore(NextResponse.json({ disposition: data.disposition ?? visit.disposition }));
    } catch (error) {
        console.error("Error updating visit progress:", error);
        return publicError("SERVER_ERROR", 500);
    }
}
