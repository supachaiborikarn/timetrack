import { NextRequest, NextResponse } from "next/server";
import { isCustomerFeedbackPublicEnabled, assertPublicSecrets } from "@/lib/customer-feedback/feature-flags";
import { validateIncidentPayload } from "@/lib/customer-feedback/validation";
import { loadVisitFromHeaders, submitIncidentResponse } from "@/lib/customer-feedback/submit";
import { publicError, INCIDENT_FAILURE_CODES } from "@/lib/customer-feedback/public-errors";
import { isJsonRequest, isSameOriginRequest, readJsonBody } from "../_request";
import { checkPublicVisitRateLimit } from "../_visit-rate-limit";

/**
 * POST /api/public/customer-feedback/incidents
 * บันทึกเหตุเร่งด่วน (INCIDENT) — ไม่บังคับ stationId
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

        const idempotencyKey = request.headers.get("idempotency-key");
        if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
            return noStore(NextResponse.json({ error: "Missing Idempotency-Key" }, { status: 400 }));
        }

        const loaded = await loadVisitFromHeaders(request.headers, { enforceMinimumFill: true });
        if ("error" in loaded) {
            const status = loaded.error === "VISIT_NOT_FOUND" ? 404 : loaded.error === "FORM_TOO_FAST" ? 429 : 401;
            return publicError(INCIDENT_FAILURE_CODES[loaded.error] ?? "SUBMIT_FAILED", status);
        }
        if (loaded.visit.visitKind !== "INCIDENT" || loaded.visit.surveyVersion !== "incident-v1") {
            return publicError("INCIDENT_SESSION_EXPIRED", 401);
        }
        const visitLimit = await checkPublicVisitRateLimit("incident-submission", loaded.visit.id);
        if (!visitLimit.allowed) {
            return publicError("REQUEST_RATE_LIMITED", 429, {
                "Retry-After": String(visitLimit.retryAfterSec),
            });
        }

        const body = await readJsonBody(request);
        if (!body.ok) {
            return body.reason === "PAYLOAD_TOO_LARGE"
                ? publicError("PAYLOAD_TOO_LARGE", 413)
                : noStore(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
        }
        const validated = validateIncidentPayload(body.value);
        if (!validated.ok) {
            return noStore(NextResponse.json({ errors: validated.errors }, { status: 400 }));
        }

        const result = await submitIncidentResponse({
            headers: request.headers,
            idempotencyKey,
            payload: validated.value,
            loaded,
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
            duplicate: "duplicate" in result ? result.duplicate : false,
        }));
    } catch (error) {
        console.error("Error submitting incident:", error);
        return publicError("SUBMIT_ERROR", 500);
    }
}
