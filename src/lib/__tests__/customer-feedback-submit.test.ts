import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    customerFeedbackResponse: {
        findUnique: vi.fn(),
    },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));

import {
    abuseResponseWhere,
    abuseSignalLockKeys,
    canonicalPayloadHash,
    createCaseWithNotifications,
    recordUrgentIncidentAlert,
    standardIdempotencyPayload,
    submitStandardResponse,
    shouldCreateOperationalFeedbackCase,
    type LoadedVisitContext,
} from "@/lib/customer-feedback/submit";
import type { StandardPayload } from "@/lib/customer-feedback/validation";

process.env.CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY = "test-abuse-secret";

const payload: StandardPayload = {
    targetConfirmation: "YES",
    selectedStationId: "station-1",
    overallRating: 2,
    reasonKeys: ["employee_courtesy"],
    serviceAreas: ["cashier"],
    comment: "ต้องการให้ปรับปรุง",
    wantsFollowUp: false,
    language: "th",
};

function submittedVisit(): LoadedVisitContext {
    return {
        visit: {
            id: "visit-1",
            visitKind: "STANDARD",
            targetType: "EMPLOYEE",
            surveyVersion: "employee-v1",
            qrCodeId: "qr-1",
            qrVersionAtOpen: 1,
            disposition: "SUBMITTED",
            formExpiresAt: new Date(Date.now() + 60_000),
            startedAt: new Date(Date.now() - 10_000),
            qrCode: null,
        },
        qr: {
            id: "qr-1",
            targetType: "EMPLOYEE",
            employeeId: "employee-user-1",
        },
        tokenPayload: {
            visitId: "visit-1",
            visitKind: "STANDARD",
            targetType: "EMPLOYEE",
            surveyVersion: "employee-v1",
            qrCodeId: "qr-1",
            qrVersion: 1,
            issuedAt: Date.now() - 10_000,
        },
        minimumFillVerified: true,
    } as unknown as LoadedVisitContext;
}

describe("customer feedback submission idempotency", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY = "test-abuse-secret";
    });

    it("retry หลัง Visit SUBMITTED คืน ref/case เดิมก่อนตรวจ state", async () => {
        const storedHash = canonicalPayloadHash(standardIdempotencyPayload("visit-1", "qr-1", payload));
        prismaMock.customerFeedbackResponse.findUnique.mockResolvedValue({
            refCode: "FB-ORIGINAL",
            idempotencyPayloadHash: storedHash,
            case: { id: "case-1", severity: "HIGH" },
        });

        await expect(submitStandardResponse({
            headers: new Headers(),
            idempotencyKey: "same-key-123",
            payload,
            loaded: submittedVisit(),
        })).resolves.toEqual({
            refCode: "FB-ORIGINAL",
            caseId: "case-1",
            severity: "HIGH",
            duplicate: true,
        });
    });

    it("key เดิมแต่ payload สำคัญต่างกันคืน 409", async () => {
        const storedHash = canonicalPayloadHash(standardIdempotencyPayload("visit-1", "qr-1", payload));
        prismaMock.customerFeedbackResponse.findUnique.mockResolvedValue({
            refCode: "FB-ORIGINAL",
            idempotencyPayloadHash: storedHash,
            case: { id: "case-1", severity: "HIGH" },
        });

        await expect(submitStandardResponse({
            headers: new Headers(),
            idempotencyKey: "same-key-123",
            payload: { ...payload, selectedStationId: "station-2" },
            loaded: submittedVisit(),
        })).resolves.toEqual({ conflict: true, status: 409 });
    });
});

describe("customer feedback abuse evidence", () => {
    it("ไม่นับ TEST และผูกจำนวนกับ kind, QR และช่วงเวลาเดียวกัน", () => {
        const now = new Date("2026-08-24T12:00:00.000Z");
        expect(abuseResponseWhere({
            kind: "INCIDENT",
            qrCodeId: null,
            signal: "networkHashDaily",
            signalHash: "network-1",
            sinceHours: 24,
            now,
        })).toEqual({
            kind: "INCIDENT",
            qrCodeId: null,
            validity: { not: "TEST" },
            submittedAt: { gte: new Date("2026-08-23T12:00:00.000Z") },
            visit: { networkHashDaily: "network-1" },
        });
    });

    it("เรียง advisory lock key คงที่ก่อนล็อกทุกครั้ง", () => {
        const keys = abuseSignalLockKeys({
            kind: "STANDARD",
            qrCodeId: "qr-1",
            networkHashDaily: "z-network",
            clientHashWeekly: "a-client",
        });
        expect(keys).toEqual([...keys].sort());
        expect(keys).toHaveLength(2);
    });
});

describe("case notification fail-closed", () => {
    it("never creates operational cases or notifications from a TEST response", () => {
        expect(shouldCreateOperationalFeedbackCase("TEST")).toBe(false);
        expect(shouldCreateOperationalFeedbackCase("HIDDEN")).toBe(false);
        expect(shouldCreateOperationalFeedbackCase("VALID")).toBe(true);
        expect(shouldCreateOperationalFeedbackCase("SUSPECTED")).toBe(true);
    });

    it("URGENT ไม่มีผู้รับต้อง throw เพื่อให้ transaction rollback", async () => {
        const tx = {
            customerFeedbackCase: { create: vi.fn().mockResolvedValue({ id: "case-urgent" }) },
            user: { findMany: vi.fn().mockResolvedValue([]) },
            notification: { createMany: vi.fn() },
        };

        await expect(createCaseWithNotifications(tx as never, {
            responseId: "response-1",
            stationId: "station-1",
            severity: "URGENT",
            category: "safety_accident",
        })).rejects.toMatchObject({ code: "ALERT_RECIPIENT_UNAVAILABLE", status: 503 });
        expect(tx.notification.createMany).not.toHaveBeenCalled();
    });

    it("HIGH ไม่มีผู้รับยังเก็บคำตอบได้ตาม best-effort policy", async () => {
        const tx = {
            customerFeedbackCase: { create: vi.fn().mockResolvedValue({ id: "case-high" }) },
            user: { findMany: vi.fn().mockResolvedValue([]) },
            notification: { createMany: vi.fn() },
        };

        await expect(createCaseWithNotifications(tx as never, {
            responseId: "response-1",
            stationId: "station-1",
            severity: "HIGH",
            category: "negative-feedback",
        })).resolves.toBe("case-high");
    });

    it("AlertLog ของ URGENT สร้างไม่ได้ต้อง throw ไม่กลืน error", async () => {
        const tx = {
            customerFeedbackAlertLog: {
                create: vi.fn().mockRejectedValue(new Error("alert-log unavailable")),
            },
        };
        await expect(recordUrgentIncidentAlert(tx as never, {
            caseId: "case-urgent",
            stationId: null,
            now: new Date("2026-08-24T12:00:00Z"),
        })).rejects.toThrow("alert-log unavailable");
    });
});
