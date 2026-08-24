import { NextRequest, NextResponse } from "next/server";
import { isCustomerFeedbackPublicEnabled } from "@/lib/customer-feedback/feature-flags";
import { validateStandardPayload } from "@/lib/customer-feedback/validation";
import { submitStandardResponse } from "@/lib/customer-feedback/submit";
import { publicError, STANDARD_FAILURE_CODES } from "@/lib/customer-feedback/public-errors";

/**
 * POST /api/public/customer-feedback/submissions
 * validate และบันทึกคำตอบแบบปกติ (STANDARD)
 */

const MAX_BODY_BYTES = 16 * 1024;

function noStore(response: NextResponse): NextResponse {
    response.headers.set("Cache-Control", "no-store");
    return response;
}

function checkOrigin(request: NextRequest): boolean {
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") return false;
    const origin = request.headers.get("origin");
    if (origin) {
        try {
            if (new URL(origin).host !== request.headers.get("host")) return false;
        } catch {
            return false;
        }
    }
    return true;
}

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackPublicEnabled()) {
            return publicError("PUBLIC_DISABLED", 404);
        }
        if (!checkOrigin(request)) {
            return noStore(NextResponse.json({ error: "Invalid origin" }, { status: 403 }));
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
        const validated = validateStandardPayload(body);
        if (!validated.ok) {
            return noStore(NextResponse.json({ errors: validated.errors }, { status: 400 }));
        }

        const result = await submitStandardResponse({
            headers: request.headers,
            idempotencyKey,
            payload: validated.value,
        });

        if ("failure" in result) {
            return publicError(STANDARD_FAILURE_CODES[result.failure as string] ?? "SUBMIT_FAILED", result.status ?? 400);
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
        console.error("Error submitting customer feedback:", error);
        return publicError("SUBMIT_ERROR", 500);
    }
}
