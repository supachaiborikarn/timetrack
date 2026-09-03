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
    buildNormalizedStandardAnswers,
    canonicalPayloadHash,
    createCaseWithNotifications,
    recordUrgentIncidentAlert,
    standardIdempotencyPayload,
    submitStandardResponse,
    shouldCreateOperationalFeedbackCase,
    type LoadedVisitContext,
} from "@/lib/customer-feedback/submit";
import { EMPLOYEE_BEHAVIOR_QUESTION_KEYS, EMPLOYEE_SCORE_QUESTION_KEYS } from "@/lib/customer-feedback/questions";
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

const behaviorAnswers = {
    appearance_neat: "YES",
    vehicle_guidance: "NO",
    greeted_customer: "UNSURE",
    order_repeated: "YES",
    special_service_offered: "NO",
    thanked_customer: "YES",
    front_sign_placed: "UNSURE",
} as const;

const employeeV2Payload: StandardPayload = { ...payload, behaviorAnswers };

const scoreAnswers = {
    uniform_and_name_badge: "YES",
    guide_vehicle_immediately: "YES",
    receive_driver_side: "NO",
    caltex_greeting: "YES",
    front_service_sign: "YES",
    repeat_fuel_amount_before: "YES",
    offer_rewards_promotion: "UNSURE",
    repeat_fuel_amount_after: "YES",
    thank_and_guide_exit: "YES",
} as const;

const employeeV3Payload: StandardPayload = { ...payload, behaviorAnswers: scoreAnswers };

function submittedVisit(surveyVersion: "employee-v1" | "employee-v2" | "employee-v3" = "employee-v1"): LoadedVisitContext {
    return {
        visit: {
            id: "visit-1",
            visitKind: "STANDARD",
            targetType: "EMPLOYEE",
            surveyVersion,
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
            surveyVersion,
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

    it("employee-v2 ใช้ surveyVersion ของ Visit และคืนผลเดิมได้", async () => {
        const storedHash = canonicalPayloadHash(standardIdempotencyPayload("visit-1", "qr-1", employeeV2Payload));
        prismaMock.customerFeedbackResponse.findUnique.mockResolvedValue({
            refCode: "FB-V2",
            idempotencyPayloadHash: storedHash,
            case: null,
        });

        await expect(submitStandardResponse({
            headers: new Headers(),
            idempotencyKey: "same-key-v2",
            payload: employeeV2Payload,
            loaded: submittedVisit("employee-v2"),
        })).resolves.toEqual({
            refCode: "FB-V2",
            caseId: null,
            severity: null,
            duplicate: true,
        });
    });
});

describe("employee-v2 normalized behavior answers", () => {
    it("สร้าง CustomerFeedbackAnswer แยก questionKey ครบทั้ง 7 ข้อ", () => {
        const answers = buildNormalizedStandardAnswers("employee-v2", employeeV2Payload);
        const behaviorRows = answers.filter((answer) =>
            (EMPLOYEE_BEHAVIOR_QUESTION_KEYS as readonly string[]).includes(answer.questionKey)
        );

        expect(behaviorRows).toHaveLength(7);
        for (const row of behaviorRows) {
            expect(row).toMatchObject({
                surveyVersion: "employee-v2",
                state: "ANSWERED",
                choiceValues: [behaviorAnswers[row.questionKey as keyof typeof behaviorAnswers]],
            });
        }
    });

    it("employee-v1 ไม่เพิ่มคำตอบพฤติกรรมและ hash payload เดิมไม่เปลี่ยนรูป", () => {
        const answers = buildNormalizedStandardAnswers("employee-v1", payload);
        expect(answers.some((answer) =>
            (EMPLOYEE_BEHAVIOR_QUESTION_KEYS as readonly string[]).includes(answer.questionKey)
        )).toBe(false);

        const canonical = standardIdempotencyPayload("visit-1", "qr-1", payload);
        expect(canonical.payload).not.toHaveProperty("behaviorAnswers");
    });

    it("employee-v2 ไม่มีคำตอบครบต้องหยุดก่อนเขียน answers", () => {
        expect(() => buildNormalizedStandardAnswers("employee-v2", payload)).toThrow(
            "employee-v2 requires all behavior answers"
        );
    });

    it("employee-v3 สร้าง normalized answers ครบ 9 เกณฑ์ rubric", () => {
        const answers = buildNormalizedStandardAnswers("employee-v3", employeeV3Payload);
        const rubricRows = answers.filter((answer) =>
            (EMPLOYEE_SCORE_QUESTION_KEYS as readonly string[]).includes(answer.questionKey)
        );

        expect(rubricRows).toHaveLength(9);
        for (const row of rubricRows) {
            expect(row).toMatchObject({
                surveyVersion: "employee-v3",
                state: "ANSWERED",
                choiceValues: [scoreAnswers[row.questionKey as keyof typeof scoreAnswers]],
            });
        }
    });

    it("employee-v3 ไม่มีคำตอบครบต้องหยุดก่อนเขียน answers", () => {
        expect(() => buildNormalizedStandardAnswers("employee-v3", payload)).toThrow(
            "employee-v3 requires all behavior answers"
        );
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


describe("actionable case notifications", () => {
    it("includes employee, bad rating and selected reason and deep-links the exact HIGH case", async () => {
        const notificationCreateMany = vi.fn().mockResolvedValue({ count: 2 });
        const responseFindUnique = vi.fn().mockResolvedValue({
            kind: "STANDARD",
            surveyVersion: "employee-v4",
            overallRating: 1,
            reasonKeys: ["employee_courtesy"],
            incidentKey: null,
            dangerStatus: null,
            wantsFollowUp: false,
            employeeLabelSnapshot: "มะนาว",
            stationLabelSnapshot: "วัชรเกียรติออยล์",
        });
        const userFindMany = vi.fn()
            .mockResolvedValueOnce([{ id: "manager-1" }])
            .mockResolvedValueOnce([{ id: "admin-1" }]);
        const tx = {
            customerFeedbackCase: { create: vi.fn().mockResolvedValue({ id: "case-high" }) },
            customerFeedbackResponse: { findUnique: responseFindUnique },
            user: { findMany: userFindMany },
            notification: { createMany: notificationCreateMany },
        };

        await expect(createCaseWithNotifications(tx as never, {
            responseId: "response-1",
            stationId: "station-1",
            severity: "HIGH",
            category: "negative-feedback",
        })).resolves.toBe("case-high");

        expect(responseFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "response-1" } }));
        expect(notificationCreateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.arrayContaining([
                expect.objectContaining({
                    message: "มะนาว: ลูกค้าให้ 1/5 — ไม่พอใจมาก · สาเหตุ: การพูดจาและความสุภาพ",
                    link: "/admin/customer-feedback?tab=cases&caseId=case-high",
                }),
            ]),
        }));
    });
});
