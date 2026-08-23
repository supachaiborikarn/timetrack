import { NextRequest, NextResponse } from "next/server";
import { isCustomerFeedbackPublicEnabled } from "@/lib/customer-feedback/feature-flags";
import { validateStandardPayload } from "@/lib/customer-feedback/validation";
import { submitStandardResponse } from "@/lib/customer-feedback/submit";

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
            return noStore(NextResponse.json({ error: "ระบบยังไม่เปิดรับความคิดเห็น" }, { status: 404 }));
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
            return noStore(NextResponse.json({ error: "ข้อมูลใหญ่เกินไป" }, { status: 413 }));
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
            const messages: Record<string, string> = {
                TOKEN_INVALID: "เซสชันหมดอายุ กรุณาสแกน QR อีกครั้ง",
                VISIT_NOT_FOUND: "ไม่พบแบบประเมินนี้ โปรดสแกน QR ที่จุดบริการอีกครั้ง",
                VISIT_NOT_OPEN: "เราได้รับความคิดเห็นนี้แล้ว",
                FORM_EXPIRED: "แบบประเมินหมดอายุ กรุณาสแกน QR ใหม่อีกครั้ง",
                QR_ROTATED: "ป้ายนี้ถูกเปลี่ยนรหัสแล้ว กรุณาสแกนป้ายใหม่",
                QR_INACTIVE: "แบบประเมินนี้ปิดใช้งานแล้ว",
                TARGET_INACTIVE: "แบบประเมินนี้ปิดใช้งานแล้ว",
                STATION_NOT_ELIGIBLE: "สถานีที่เลือกไม่พร้อมรับแบบประเมิน",
                ALREADY_SUBMITTED: "เราได้รับความคิดเห็นนี้แล้ว",
            };
            return noStore(NextResponse.json({ error: messages[result.failure as string] ?? "ส่งไม่สำเร็จ" }, { status: result.status }));
        }
        if ("conflict" in result) {
            return noStore(NextResponse.json({ error: "คำขอซ้ำไม่ตรงกัน" }, { status: 409 }));
        }

        return noStore(NextResponse.json({
            refCode: result.refCode,
            caseRef: result.caseId,
            severity: result.severity ?? null,
            duplicate: result.duplicate ?? false,
        }));
    } catch (error) {
        console.error("Error submitting customer feedback:", error);
        return noStore(NextResponse.json({ error: "ยังส่งความคิดเห็นไม่ได้ คำตอบของคุณยังอยู่ในหน้านี้" }, { status: 500 }));
    }
}
