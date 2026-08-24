import { NextRequest, NextResponse } from "next/server";
import { isCustomerFeedbackPublicEnabled } from "@/lib/customer-feedback/feature-flags";
import { validateIncidentPayload } from "@/lib/customer-feedback/validation";
import { submitIncidentResponse } from "@/lib/customer-feedback/submit";
import { publicError, INCIDENT_FAILURE_CODES } from "@/lib/customer-feedback/public-errors";

/**
 * POST /api/public/customer-feedback/incidents
 * บันทึกเหตุเร่งด่วน (INCIDENT) — ไม่บังคับ stationId
 */

const MAX_BODY_BYTES = 16 * 1024;

function noStore(response: NextResponse): NextResponse {
    response.headers.set("Cache-Control", "no-store");
    return response;
}

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackPublicEnabled()) {
            return publicError("PUBLIC_DISABLED", 404);
        }
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            return noStore(NextResponse.json({ error: "Unsupported content type" }, { status: 415 }));
        }
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > MAX_BODY_BYTES) {
            return publicError("PAYLOAD_TOO_LARGE", 413);
        }

        const idempotencyKey = request.headers.get("idempotency-key");
        if (!idempotencyKey || idempotencyKey.length < 8) {
            return noStore(NextResponse.json({ error: "Missing Idempotency-Key" }, { status: 400 }));
        }

        const body = await request.json().catch(() => null);
        const validated = validateIncidentPayload(body);
        if (!validated.ok) {
            return noStore(NextResponse.json({ errors: validated.errors }, { status: 400 }));
        }

        const result = await submitIncidentResponse({
            headers: request.headers,
            idempotencyKey,
            payload: validated.value,
        });

        if ("failure" in result) {
            return publicError(INCIDENT_FAILURE_CODES[result.failure as string] ?? "SUBMIT_FAILED", result.status ?? 400);
        }
        if ("conflict" in result) {
            return publicError("DUPLICATE_MISMATCH", 409);
        }

        return noStore(NextResponse.json({
            refCode: result.refCode,
            caseRef: result.caseId,
            severity: result.severity ?? null,
            duplicate: result.duplicate ?? false,
        }));
    } catch (error) {
        console.error("Error submitting incident:", error);
        return publicError("SUBMIT_ERROR", 500);
    }
}
