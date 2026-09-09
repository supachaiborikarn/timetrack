import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    reviewFindUniqueMock,
    reviewFindManyMock,
    reviewUpdateManyMock,
    responseUpdateManyMock,
    auditCreateMock,
    notificationFindFirstMock,
    notificationCreateMock,
    transactionMock,
    refreshWeeklyMock,
} = vi.hoisted(() => ({
    reviewFindUniqueMock: vi.fn(),
    reviewFindManyMock: vi.fn(),
    reviewUpdateManyMock: vi.fn(),
    responseUpdateManyMock: vi.fn(),
    auditCreateMock: vi.fn(),
    notificationFindFirstMock: vi.fn(),
    notificationCreateMock: vi.fn(),
    transactionMock: vi.fn(),
    refreshWeeklyMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: vi.fn(async () => ({
        ok: true,
        ctx: { userId: "hr-1", role: "HR", stationId: null },
    })),
    requireFeedbackPermission: vi.fn(async () => ({ ok: true })),
    getStationScope: vi.fn(async () => ({ ok: true, stationId: null })),
}));
vi.mock("@/lib/competition/league", () => ({
    refreshWeeklyCompetitionAfterFeedbackFairPlay: refreshWeeklyMock,
}));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackFairPlayReview: {
            findUnique: reviewFindUniqueMock,
            findMany: reviewFindManyMock,
        },
        notification: {
            findFirst: notificationFindFirstMock,
            create: notificationCreateMock,
        },
        $transaction: transactionMock,
    },
}));

import { PATCH } from "./route";

const occurredAt = new Date("2026-09-08T10:00:00.000Z");

function requestBody(action: "confirm" | "dismiss", note = "ตรวจจากกล้องและหัวหน้างานยืนยัน") {
    return new NextRequest("http://localhost/api/admin/customer-feedback/fair-play-reviews/fp-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note }),
    });
}

describe("admin customer feedback Fair Play review", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        reviewFindUniqueMock.mockResolvedValue({
            id: "fp-1",
            responseId: "response-1",
            employeeId: "employee-1",
            employeeLabelSnapshot: "เอ",
            stationId: "station-1",
            source: "MANUAL",
            reasonCode: "EMPLOYEE_ANSWERED_FOR_CUSTOMER",
            reasonNote: null,
            signals: [],
            status: "REVIEW",
            response: {
                id: "response-1",
                refCode: "FB-ABCDEFGH",
                employeeId: "employee-1",
                employeeLabelSnapshot: "เอ",
                stationId: "station-1",
                submittedAt: occurredAt,
                validity: "VALID",
            },
        });
        reviewUpdateManyMock.mockResolvedValue({ count: 1 });
        responseUpdateManyMock.mockResolvedValue({ count: 1 });
        auditCreateMock.mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
            customerFeedbackFairPlayReview: { updateMany: reviewUpdateManyMock },
            customerFeedbackResponse: { updateMany: responseUpdateManyMock },
            auditLog: { create: auditCreateMock },
        }));
        refreshWeeklyMock.mockResolvedValue({ refreshed: true, status: "FINALIZED", reviewCount: 0, periodId: "week-1" });
        reviewFindManyMock.mockResolvedValue([
            { response: { submittedAt: new Date("2026-09-01T10:00:00.000Z") } },
            { response: { submittedAt: occurredAt } },
        ]);
        notificationFindFirstMock.mockResolvedValue(null);
        notificationCreateMock.mockResolvedValue({ id: "notification-1" });
    });

    it("confirms once, hides the response, audits, refreshes League and reports the second-violation penalty", async () => {
        const response = await PATCH(requestBody("confirm"), { params: Promise.resolve({ id: "fp-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(reviewUpdateManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "fp-1", status: "REVIEW" },
            data: expect.objectContaining({ status: "CONFIRMED", reviewedById: "hr-1" }),
        }));
        expect(responseUpdateManyMock).toHaveBeenCalledWith({
            where: { id: "response-1", validity: { not: "TEST" } },
            data: { validity: "HIDDEN" },
        });
        expect(auditCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "CUSTOMER_FEEDBACK_FAIR_PLAY_CONFIRMED",
                entityId: "fp-1",
                userId: "hr-1",
            }),
        });
        expect(refreshWeeklyMock).toHaveBeenCalledWith({ stationId: "station-1", occurredAt });
        expect(notificationCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({ userId: "employee-1", eventKey: "feedback-fair-play:fp-1" }),
        });
        expect(body.penalty).toMatchObject({ count30Days: 2, level: 2 });
    });

    it("dismisses without changing the response validity", async () => {
        const response = await PATCH(requestBody("dismiss", "ตรวจแล้วเป็นลูกค้ากดเอง"), { params: Promise.resolve({ id: "fp-1" }) });

        expect(response.status).toBe(200);
        expect(reviewUpdateManyMock).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: "DISMISSED" }),
        }));
        expect(responseUpdateManyMock).not.toHaveBeenCalled();
        expect(notificationCreateMock).not.toHaveBeenCalled();
        expect(refreshWeeklyMock).toHaveBeenCalledWith({ stationId: "station-1", occurredAt });
    });

    it("returns 409 if another reviewer already claimed the item", async () => {
        reviewUpdateManyMock.mockResolvedValue({ count: 0 });

        const response = await PATCH(requestBody("confirm"), { params: Promise.resolve({ id: "fp-1" }) });

        expect(response.status).toBe(409);
        expect(responseUpdateManyMock).not.toHaveBeenCalled();
        expect(auditCreateMock).not.toHaveBeenCalled();
        expect(refreshWeeklyMock).not.toHaveBeenCalled();
    });
});
