import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const {
    accessMock,
    periodFindMock,
    periodUpdateManyMock,
    snapshotFindManyMock,
    snapshotCountMock,
    snapshotUpsertMock,
    responseFindManyMock,
    eligibleEmployeeFindManyMock,
    responseGroupByMock,
    transactionMock,
} = vi.hoisted(() => ({
    accessMock: vi.fn(),
    periodFindMock: vi.fn(),
    periodUpdateManyMock: vi.fn(),
    snapshotFindManyMock: vi.fn(),
    snapshotCountMock: vi.fn(),
    snapshotUpsertMock: vi.fn(),
    responseFindManyMock: vi.fn(),
    eligibleEmployeeFindManyMock: vi.fn(),
    responseGroupByMock: vi.fn(),
    transactionMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/access", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/customer-feedback/access")>();
    return { ...actual, getFeedbackAccessContext: accessMock };
});
vi.mock("@/lib/prisma", () => ({
    prisma: {
        reviewPeriod: { findUnique: periodFindMock },
        customerFeedbackReviewSnapshot: {
            findMany: snapshotFindManyMock,
            count: snapshotCountMock,
        },
        $transaction: transactionMock,
    },
}));

import { GET, POST } from "./route";

const period = {
    id: "period-1",
    title: "สิงหาคม 2569",
    startDate: new Date("2026-08-01T00:00:00.000Z"),
    endDate: new Date("2026-08-24T00:00:00.000Z"),
    isActive: true,
    closedAt: null,
};

describe("review period customer feedback snapshots", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-24T17:00:01.000Z"));
        accessMock.mockResolvedValue({ ok: true, ctx: { userId: "admin-1", role: "ADMIN", stationId: null } });
        periodFindMock.mockResolvedValue(period);
        snapshotCountMock.mockResolvedValue(0);
        snapshotFindManyMock.mockResolvedValue([]);
        responseFindManyMock.mockResolvedValue([]);
        eligibleEmployeeFindManyMock.mockResolvedValue([]);
        responseGroupByMock.mockResolvedValue([]);
        snapshotUpsertMock.mockResolvedValue({});
        periodUpdateManyMock.mockResolvedValue({ count: 1 });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            customerFeedbackResponse: { findMany: responseFindManyMock, groupBy: responseGroupByMock },
            user: { findMany: eligibleEmployeeFindManyMock },
            customerFeedbackReviewSnapshot: { upsert: snapshotUpsertMock },
            reviewPeriod: { updateMany: periodUpdateManyMock },
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns snapshots but hides scores below the minimum sample", async () => {
        snapshotFindManyMock.mockResolvedValue([
            {
                id: "snapshot-9",
                employeeId: "employee-9",
                employeeLabelSnapshot: "เก้า",
                dateFrom: period.startDate,
                dateTo: period.endDate,
                validCount: 9,
                ratingAverage: 4.9,
                positiveRate: 90,
                negativeRate: 1,
                suspectedExcludedCount: 2,
                topReasonKeys: ["friendly"],
            },
            {
                id: "snapshot-10",
                employeeId: "employee-10",
                employeeLabelSnapshot: "สิบ",
                dateFrom: period.startDate,
                dateTo: period.endDate,
                validCount: 10,
                ratingAverage: 4.5,
                positiveRate: 80,
                negativeRate: 5,
                suspectedExcludedCount: 1,
                topReasonKeys: ["friendly"],
            },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/admin/performance/periods/period-1/close"), {
            params: Promise.resolve({ id: "period-1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.minimumSample).toBe(10);
        expect(body.snapshots[0]).toEqual(expect.objectContaining({
            validCount: 9,
            meetsMinimum: false,
            ratingAverage: null,
            positiveRate: null,
            negativeRate: null,
            topReasonKeys: [],
        }));
        expect(body.snapshots[1]).toEqual(expect.objectContaining({
            validCount: 10,
            meetsMinimum: true,
            ratingAverage: 4.5,
        }));
    });

    it("closes with the complete final Bangkok day and no 365-day clamp", async () => {
        const response = await POST(new NextRequest("http://localhost/api/admin/performance/periods/period-1/close", { method: "POST" }), {
            params: Promise.resolve({ id: "period-1" }),
        });

        expect(response.status).toBe(200);
        expect(responseFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                submittedAt: {
                    gte: new Date("2026-07-31T17:00:00.000Z"),
                    lt: new Date("2026-08-24T17:00:00.000Z"),
                },
            }),
        }));
    });

    it("creates a zero-valid snapshot for an employee with only suspected responses", async () => {
        responseFindManyMock.mockResolvedValue([
            { employeeId: "employee-s", employeeLabelSnapshot: "สงสัย", validity: "SUSPECTED", overallRating: null, reasonKeys: [] },
            { employeeId: "employee-s", employeeLabelSnapshot: "สงสัย", validity: "SUSPECTED", overallRating: null, reasonKeys: [] },
        ]);

        const response = await POST(new NextRequest("http://localhost/api/admin/performance/periods/period-1/close", { method: "POST" }), {
            params: Promise.resolve({ id: "period-1" }),
        });

        expect(response.status).toBe(200);
        expect(eligibleEmployeeFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                feedbackQrs: {
                    some: expect.objectContaining({ targetType: "EMPLOYEE", isTest: false }),
                },
            }),
        }));
        expect(snapshotUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({
                employeeId: "employee-s",
                employeeLabelSnapshot: "สงสัย",
                validCount: 0,
                ratingAverage: 0,
                positiveRate: 0,
                negativeRate: 0,
                suspectedExcludedCount: 2,
                topReasonKeys: [],
            }),
        }));
    });

    it("creates a zero-count snapshot for an active employee who had a QR but no responses", async () => {
        eligibleEmployeeFindManyMock.mockResolvedValue([{ id: "employee-zero", name: "พนักงานศูนย์" }]);

        const response = await POST(new NextRequest("http://localhost/api/admin/performance/periods/period-1/close", { method: "POST" }), {
            params: Promise.resolve({ id: "period-1" }),
        });

        expect(response.status).toBe(200);
        expect(snapshotUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({
                employeeId: "employee-zero",
                employeeLabelSnapshot: "พนักงานศูนย์",
                validCount: 0,
                suspectedExcludedCount: 0,
            }),
        }));
    });

    it("rolls back before writing snapshots when another request closes the period first", async () => {
        eligibleEmployeeFindManyMock.mockResolvedValue([{ id: "employee-zero", name: "พนักงานศูนย์" }]);
        periodUpdateManyMock.mockResolvedValue({ count: 0 });

        const response = await POST(new NextRequest("http://localhost/api/admin/performance/periods/period-1/close", { method: "POST" }), {
            params: Promise.resolve({ id: "period-1" }),
        });

        expect(response.status).toBe(200);
        expect(snapshotUpsertMock).not.toHaveBeenCalled();
        expect(responseFindManyMock).not.toHaveBeenCalled();
        expect(await response.json()).toEqual(expect.objectContaining({ message: "รอบนี้ปิดไปแล้ว" }));
    });
});
