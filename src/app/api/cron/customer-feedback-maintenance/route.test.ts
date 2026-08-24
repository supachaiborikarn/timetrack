import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    transactionMock,
    reviewPeriodFindManyMock,
    visitFindManyMock,
    visitDeleteManyMock,
    responseFindManyMock,
    responseDeleteManyMock,
    dailyUpsertMock,
    reasonUpsertMock,
    events,
} = vi.hoisted(() => ({
    transactionMock: vi.fn(),
    reviewPeriodFindManyMock: vi.fn(),
    visitFindManyMock: vi.fn(),
    visitDeleteManyMock: vi.fn(),
    responseFindManyMock: vi.fn(),
    responseDeleteManyMock: vi.fn(),
    dailyUpsertMock: vi.fn(),
    reasonUpsertMock: vi.fn(),
    events: [] as string[],
}));

vi.mock("@/lib/prisma", () => ({
    prisma: { $transaction: transactionMock },
}));
vi.mock("@/lib/customer-feedback/access", () => ({
    reviewPeriodDayBounds: (date: Date) => ({ dayStart: date, nextDayStart: new Date(date.getTime() + 86_400_000) }),
}));

import { purgeRetainedFeedbackResponses, purgeRetainedFeedbackVisits } from "./route";

describe("customer feedback response retention", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        events.length = 0;
        reviewPeriodFindManyMock.mockResolvedValue([]);
        visitFindManyMock.mockResolvedValue([]);
        responseFindManyMock
            .mockResolvedValueOnce([{ id: "response-old", reportDate: new Date("2024-01-01T00:00:00.000Z") }])
            .mockResolvedValueOnce([{
                reportDate: new Date("2024-01-01T00:00:00.000Z"),
                stationId: "station-1",
                targetType: "EMPLOYEE",
                language: "th",
                surveyVersion: "standard-v1",
                validity: "VALID",
                overallRating: 5,
                reasonKeys: [],
                qrCode: { placementKey: "EMPLOYEE_BADGE" },
                visit: { isTestAtOpen: false },
            }]);
        dailyUpsertMock.mockImplementation(async () => { events.push("reconcile"); return {}; });
        reasonUpsertMock.mockResolvedValue({});
        responseDeleteManyMock.mockImplementation(async () => { events.push("delete"); return { count: 1 }; });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            reviewPeriod: { findMany: reviewPeriodFindManyMock },
            customerFeedbackVisit: { findMany: visitFindManyMock, deleteMany: visitDeleteManyMock },
            customerFeedbackResponse: { findMany: responseFindManyMock, deleteMany: responseDeleteManyMock },
            customerFeedbackDailyAggregate: { upsert: dailyUpsertMock },
            customerFeedbackDailyReasonAggregate: { upsert: reasonUpsertMock },
        }));
    });

    it("reconciles the report day and deletes the selected rows in one serializable transaction", async () => {
        const result = await purgeRetainedFeedbackResponses(new Date("2026-08-24T00:00:00.000Z"));

        expect(result).toEqual({ reconciledDays: 1, purgedResponses: 1 });
        expect(events).toEqual(["reconcile", "delete"]);
        expect(transactionMock).toHaveBeenCalledTimes(1);
        expect(transactionMock.mock.calls[0][1]).toEqual(expect.objectContaining({ isolationLevel: "Serializable" }));
        expect(responseDeleteManyMock).toHaveBeenCalledWith({ where: { id: { in: ["response-old"] } } });
    });

    it("upserts daily and reason aggregates in a stable key order", async () => {
        const reportDate = new Date("2024-01-01T00:00:00.000Z");
        responseFindManyMock
            .mockReset()
            .mockResolvedValueOnce([{ id: "response-old", reportDate }])
            .mockResolvedValueOnce([
                {
                    reportDate,
                    stationId: "station-z",
                    targetType: "EMPLOYEE",
                    language: "th",
                    surveyVersion: "standard-v1",
                    validity: "VALID",
                    overallRating: 5,
                    reasonKeys: ["reason-z"],
                    qrCode: { placementKey: "EMPLOYEE_BADGE" },
                    visit: { isTestAtOpen: false },
                },
                {
                    reportDate,
                    stationId: "station-a",
                    targetType: "EMPLOYEE",
                    language: "th",
                    surveyVersion: "standard-v1",
                    validity: "VALID",
                    overallRating: 4,
                    reasonKeys: ["reason-z", "reason-a"],
                    qrCode: { placementKey: "EMPLOYEE_BADGE" },
                    visit: { isTestAtOpen: false },
                },
            ]);
        const dailyKeys: string[] = [];
        const reasonKeys: string[] = [];
        dailyUpsertMock.mockImplementation(async (args: { create: { stationKey: string } }) => {
            dailyKeys.push(args.create.stationKey);
            return {};
        });
        reasonUpsertMock.mockImplementation(async (args: { create: { stationKey: string; reasonKey: string } }) => {
            reasonKeys.push(`${args.create.stationKey}|${args.create.reasonKey}`);
            return {};
        });

        await purgeRetainedFeedbackResponses(new Date("2026-08-24T00:00:00.000Z"));

        expect(dailyKeys).toEqual(["station-a", "station-z"]);
        expect(reasonKeys).toEqual([
            "station-a|reason-a",
            "station-a|reason-z",
            "station-z|reason-z",
        ]);
    });

    it("reconciles report dates in a stable chronological order", async () => {
        const earlier = new Date("2024-01-01T00:00:00.000Z");
        const later = new Date("2024-01-02T00:00:00.000Z");
        const aggregateResponse = (reportDate: Date) => ({
            reportDate,
            stationId: "station-1",
            targetType: "EMPLOYEE",
            language: "th",
            surveyVersion: "standard-v1",
            validity: "VALID",
            overallRating: 5,
            reasonKeys: [],
            qrCode: { placementKey: "EMPLOYEE_BADGE" },
            visit: { isTestAtOpen: false },
        });
        responseFindManyMock
            .mockReset()
            .mockResolvedValueOnce([
                { id: "response-later", reportDate: later },
                { id: "response-earlier", reportDate: earlier },
            ])
            .mockResolvedValueOnce([aggregateResponse(earlier)])
            .mockResolvedValueOnce([aggregateResponse(later)]);
        responseDeleteManyMock.mockResolvedValue({ count: 2 });
        const reconciledDates: string[] = [];
        dailyUpsertMock.mockImplementation(async (args: { create: { reportDate: Date } }) => {
            reconciledDates.push(args.create.reportDate.toISOString());
            return {};
        });

        await purgeRetainedFeedbackResponses(new Date("2026-08-24T00:00:00.000Z"));

        expect(reconciledDates).toEqual([earlier.toISOString(), later.toISOString()]);
    });

    it("reconciles and deletes the exact visit IDs in one serializable transaction", async () => {
        events.length = 0;
        visitFindManyMock
            .mockReset()
            .mockResolvedValueOnce([{ id: "visit-old", openedAt: new Date("2024-01-01T01:00:00.000Z") }])
            .mockResolvedValueOnce([{
                openedAt: new Date("2024-01-01T01:00:00.000Z"),
                stationIdSelected: "station-1",
                stationIdAtOpen: "station-1",
                targetType: "EMPLOYEE",
                language: "th",
                surveyVersion: "standard-v1",
                isTestAtOpen: false,
                disposition: "SUBMITTED",
                formExpiresAt: new Date("2024-01-01T02:00:00.000Z"),
                startedAt: new Date("2024-01-01T01:01:00.000Z"),
                targetConfirmation: "YES",
                qrCode: { stationId: null, placementKey: "EMPLOYEE_BADGE" },
            }]);
        responseFindManyMock.mockReset().mockResolvedValue([]);
        visitDeleteManyMock.mockImplementation(async () => { events.push("delete-visit"); return { count: 1 }; });

        const result = await purgeRetainedFeedbackVisits(new Date("2026-08-24T00:00:00.000Z"));

        expect(result).toEqual({ reconciledDays: 1, purgedVisits: 1 });
        expect(events).toEqual(["reconcile", "delete-visit"]);
        expect(transactionMock).toHaveBeenCalledTimes(1);
        expect(transactionMock.mock.calls[0][1]).toEqual(expect.objectContaining({ isolationLevel: "Serializable" }));
        expect(visitDeleteManyMock).toHaveBeenCalledWith({ where: { id: { in: ["visit-old"] } } });
    });
});
