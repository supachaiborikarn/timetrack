import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));

import {
    canStartIncidentFromParentDisposition,
    createVisitToken,
    isStandardIncidentParent,
    verifyVisitToken,
} from "@/lib/customer-feedback/form-token";
import { assertPublicSecrets } from "@/lib/customer-feedback/feature-flags";
import {
    isKnownSelfEvaluation,
    serverDerivedDurationSeconds,
} from "@/lib/customer-feedback/anti-abuse";
import {
    canonicalPayloadHash,
    knownSelfEvaluationFailure,
    standardIdempotencyPayload,
} from "@/lib/customer-feedback/submit";
import {
    isSameOriginRequest,
    readJsonBody,
} from "@/app/api/public/customer-feedback/_request";
import type { StandardPayload } from "@/lib/customer-feedback/validation";

const REQUIRED_ENV = {
    AUTH_SECRET: "test-auth-secret-with-sufficient-entropy",
    CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY: "test-manual-secret",
    CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY: "test-abuse-secret",
    FIELD_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    APP_BASE_URL: "https://feedback.example.test",
};

describe("public feedback backend security", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
        Object.assign(process.env, REQUIRED_ENV);
    });

    afterEach(() => {
        vi.useRealTimers();
        for (const key of Object.keys(REQUIRED_ENV)) delete process.env[key];
    });

    it("token ที่เซ็นถูกต้องใช้กับ progress/search ได้ทันที", () => {
        const { token } = createVisitToken({
            visitId: "visit-1",
            visitKind: "STANDARD",
            targetType: "EMPLOYEE",
            surveyVersion: "employee-v1",
            qrCodeId: "qr-1",
            qrVersion: 1,
        });

        expect(verifyVisitToken(token).valid).toBe(true);
        expect(verifyVisitToken(token, { enforceMinimumFill: true }).reason).toBe("too-fast");
        vi.advanceTimersByTime(3_000);
        expect(verifyVisitToken(token, { enforceMinimumFill: true }).valid).toBe(true);
    });

    it("token ของ Visit เดิมออกซ้ำได้ค่าเดิมเมื่อใช้ openedAt เดิม", () => {
        const payload = {
            visitId: "visit-1",
            visitKind: "STANDARD" as const,
            targetType: "EMPLOYEE" as const,
            surveyVersion: "employee-v1",
            qrCodeId: "qr-1",
            qrVersion: 1,
        };
        const issuedAt = Date.now();
        expect(createVisitToken(payload, issuedAt).token).toBe(createVisitToken(payload, issuedAt).token);
    });

    it("public secret preflight ต้อง fail closed เมื่อไม่มี AUTH_SECRET", () => {
        delete process.env.AUTH_SECRET;
        expect(() => assertPublicSecrets()).toThrow(/AUTH_SECRET/);
    });

    it("incident child รับเฉพาะ STANDARD token/Visit และ state ที่ยังเริ่ม incident ได้", () => {
        const tokenPayload = {
            visitId: "visit-1",
            visitKind: "STANDARD" as const,
            targetType: "EMPLOYEE" as const,
            surveyVersion: "employee-v1",
            qrCodeId: "qr-1",
            qrVersion: 1,
            issuedAt: Date.now(),
        };
        expect(isStandardIncidentParent(tokenPayload, {
            id: "visit-1",
            visitKind: "STANDARD",
            targetType: "EMPLOYEE",
            surveyVersion: "employee-v1",
        })).toBe(true);
        expect(isStandardIncidentParent({ ...tokenPayload, visitKind: "INCIDENT" }, {
            id: "visit-1",
            visitKind: "INCIDENT",
            targetType: "EMPLOYEE",
            surveyVersion: "incident-v1",
        })).toBe(false);
        expect(canStartIncidentFromParentDisposition("OPEN")).toBe(true);
        expect(canStartIncidentFromParentDisposition("TARGET_REJECTED")).toBe(true);
        expect(canStartIncidentFromParentDisposition("SUBMITTED")).toBe(true);
        expect(canStartIncidentFromParentDisposition("BOT_BLOCKED")).toBe(false);
    });

    it("duration ใช้ timestamp ฝั่ง server และไม่ clamp เป็น 3 วินาที", () => {
        const openedAt = new Date(Date.now() - 20_000);
        const startedAt = new Date(Date.now() - 2_000);
        expect(serverDerivedDurationSeconds(openedAt, startedAt, new Date())).toBe(2);
        expect(serverDerivedDurationSeconds(openedAt, null, new Date())).toBe(20);
    });

    it("session พนักงานที่ประเมิน QR ตนเองถูก block แบบ best effort", () => {
        expect(isKnownSelfEvaluation("employee-user-1", "employee-user-1")).toBe(true);
        expect(knownSelfEvaluationFailure("employee-user-1", "employee-user-1")).toEqual({
            failure: "SELF_EVALUATION",
            status: 403,
        });
        expect(knownSelfEvaluationFailure(null, "employee-user-1")).toBeNull();
    });

    it("canonical idempotency hash ครอบคลุม station, service area และ contact", () => {
        const payload: StandardPayload = {
            targetConfirmation: "YES",
            selectedStationId: "station-1",
            overallRating: 4,
            reasonKeys: ["employee_courtesy"],
            serviceAreas: ["cashier"],
            comment: "ok",
            wantsFollowUp: true,
            contact: { consent: true, channel: "PHONE", value: "0812345678" },
            language: "th",
        };
        const hash = canonicalPayloadHash(standardIdempotencyPayload("visit-1", "qr-1", payload));
        const changedStation = canonicalPayloadHash(standardIdempotencyPayload("visit-1", "qr-1", { ...payload, selectedStationId: "station-2" }));
        const changedArea = canonicalPayloadHash(standardIdempotencyPayload("visit-1", "qr-1", { ...payload, serviceAreas: ["restroom"] }));
        const changedContact = canonicalPayloadHash(standardIdempotencyPayload("visit-1", "qr-1", {
            ...payload,
            contact: { ...payload.contact!, value: "0899999999" },
        }));
        expect(new Set([hash, changedStation, changedArea, changedContact]).size).toBe(4);
    });

    it("canonical hash ไม่เปลี่ยนเมื่อ key object หรือชุดตัวเลือกสลับลำดับ", () => {
        const a = canonicalPayloadHash({ b: 2, a: 1, values: ["a", "b"] });
        const b = canonicalPayloadHash({ values: ["a", "b"], a: 1, b: 2 });
        expect(a).toBe(b);

        const payload: StandardPayload = {
            targetConfirmation: "YES",
            overallRating: 4,
            reasonKeys: ["employee_clarity", "employee_courtesy"],
            serviceAreas: ["restroom", "cashier"],
            wantsFollowUp: false,
            language: "th",
        };
        const reordered = { ...payload, reasonKeys: [...payload.reasonKeys].reverse(), serviceAreas: [...payload.serviceAreas].reverse() };
        expect(canonicalPayloadHash(standardIdempotencyPayload("v", "q", payload)))
            .toBe(canonicalPayloadHash(standardIdempotencyPayload("v", "q", reordered)));
    });

    it("origin อื่นถูกปฏิเสธและ body ไม่มี Content-Length ยังถูกจำกัดจาก stream", async () => {
        const crossOrigin = new Request("https://feedback.example.test/api", {
            headers: { origin: "https://evil.example", host: "feedback.example.test" },
        });
        expect(isSameOriginRequest(crossOrigin)).toBe(false);

        const oversized = new Request("https://feedback.example.test/api", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: "x".repeat(17 * 1024) }),
        });
        expect(await readJsonBody(oversized)).toEqual({ ok: false, reason: "PAYLOAD_TOO_LARGE" });
    });
});
