import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const {
    accessMock,
    permissionMock,
    stationScopeMock,
    incidentAccessMock,
    responseFindManyMock,
    responseFindUniqueMock,
    responseCountMock,
    visitFindManyMock,
    caseFindManyMock,
    caseCountMock,
    caseFindUniqueMock,
    dailyAggregateMock,
    dailyAggregateGroupByMock,
    dailyReasonGroupByMock,
    stationFindManyMock,
    userFindManyMock,
    transactionMock,
    auditCreateMock,
    createCaseWithNotificationsMock,
    recordUrgentIncidentAlertMock,
} = vi.hoisted(() => ({
    accessMock: vi.fn(),
    permissionMock: vi.fn(),
    stationScopeMock: vi.fn(),
    incidentAccessMock: vi.fn(),
    responseFindManyMock: vi.fn(),
    responseFindUniqueMock: vi.fn(),
    responseCountMock: vi.fn(),
    visitFindManyMock: vi.fn(),
    caseFindManyMock: vi.fn(),
    caseCountMock: vi.fn(),
    caseFindUniqueMock: vi.fn(),
    dailyAggregateMock: vi.fn(),
    dailyAggregateGroupByMock: vi.fn(),
    dailyReasonGroupByMock: vi.fn(),
    stationFindManyMock: vi.fn(),
    userFindManyMock: vi.fn(),
    transactionMock: vi.fn(),
    auditCreateMock: vi.fn(),
    createCaseWithNotificationsMock: vi.fn(),
    recordUrgentIncidentAlertMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/submit", () => ({
    createCaseWithNotifications: createCaseWithNotificationsMock,
    recordUrgentIncidentAlert: recordUrgentIncidentAlertMock,
    SubmitDomainError: class SubmitDomainError extends Error {
        constructor(readonly code: string, readonly status: number) {
            super(code);
        }
    },
}));
vi.mock("@/lib/customer-feedback/access", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/customer-feedback/access")>();
    return {
        ...actual,
        getFeedbackAccessContext: accessMock,
        requireFeedbackPermission: permissionMock,
        getStationScope: stationScopeMock,
        canViewFeedbackIncident: incidentAccessMock,
    };
});
vi.mock("@/lib/crypto-field", () => ({ decryptField: vi.fn((value: string) => value) }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackResponse: {
            findMany: responseFindManyMock,
            findUnique: responseFindUniqueMock,
            count: responseCountMock,
        },
        customerFeedbackVisit: { findMany: visitFindManyMock },
        customerFeedbackCase: {
            findMany: caseFindManyMock,
            count: caseCountMock,
            findUnique: caseFindUniqueMock,
        },
        customerFeedbackDailyAggregate: { aggregate: dailyAggregateMock, groupBy: dailyAggregateGroupByMock },
        customerFeedbackDailyReasonAggregate: { groupBy: dailyReasonGroupByMock },
        station: { findMany: stationFindManyMock },
        user: { findMany: userFindManyMock },
        auditLog: { create: auditCreateMock },
        $transaction: transactionMock,
    },
}));

import { GET as getSummary } from "./summary/route";
import { GET as getExport } from "./export/route";
import { GET as getCases, POST as postCase } from "./cases/route";
import { GET as getResponseDetail } from "./responses/[id]/route";
import { GET as getResponseContact } from "./responses/[id]/contact/route";
import { GET as getEmployeeScores } from "./employee-scores/route";

const managerContext = {
    ok: true as const,
    ctx: { userId: "manager-1", role: "MANAGER" as const, stationId: "station-own" },
};

describe("customer feedback admin station and incident access", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        accessMock.mockResolvedValue(managerContext);
        permissionMock.mockResolvedValue({ ok: true });
        stationScopeMock.mockResolvedValue({ ok: true, stationId: "station-own" });
        incidentAccessMock.mockResolvedValue(false);
        responseFindManyMock.mockResolvedValue([]);
        responseFindUniqueMock.mockResolvedValue(null);
        responseCountMock.mockResolvedValue(0);
        visitFindManyMock.mockResolvedValue([]);
        caseFindManyMock.mockResolvedValue([]);
        caseCountMock.mockResolvedValue(0);
        caseFindUniqueMock.mockResolvedValue(null);
        auditCreateMock.mockResolvedValue({});
        createCaseWithNotificationsMock.mockResolvedValue("case-1");
        recordUrgentIncidentAlertMock.mockResolvedValue(undefined);
        transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
            callback({ auditLog: { create: auditCreateMock } })
        );
        dailyAggregateMock.mockResolvedValue({
            _sum: {
                openedCount: 12,
                startedCount: 10,
                confirmedCount: 9,
                targetRejectedCount: 1,
                submittedCount: 8,
                abandonedCount: 1,
                botBlockedCount: 1,
                expiredCount: 0,
            },
        });
        dailyAggregateGroupByMock.mockResolvedValue([]);
        dailyReasonGroupByMock.mockResolvedValue([]);
        stationFindManyMock.mockResolvedValue([]);
        userFindManyMock.mockResolvedValue([]);
    });

    it("scopes summary to the manager station, excludes employee QR from station score, and hides incident case count", async () => {
        responseFindManyMock.mockResolvedValue([
            {
                id: "employee-response",
                stationId: "station-own",
                employeeId: "employee-1",
                targetType: "EMPLOYEE",
                overallRating: 1,
                reasonKeys: [],
                submittedAt: new Date("2026-08-24T01:00:00.000Z"),
                stationLabelSnapshot: "สถานีเรา",
                employeeLabelSnapshot: "นัท",
            },
            {
                id: "station-response",
                stationId: "station-own",
                employeeId: null,
                targetType: "STATION",
                overallRating: 5,
                reasonKeys: [],
                submittedAt: new Date("2026-08-24T02:00:00.000Z"),
                stationLabelSnapshot: "สถานีเรา",
                employeeLabelSnapshot: null,
            },
        ]);

        const response = await getSummary(new NextRequest("http://localhost/api/admin/customer-feedback/summary?stationId=station-other&targetType=STATION"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(responseFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ stationId: "station-own" }),
        }));
        expect(responseFindManyMock.mock.calls[0][0]).not.toHaveProperty("take");
        expect(dailyAggregateMock).toHaveBeenCalledWith({
            where: {
                reportDate: expect.objectContaining({ gte: expect.any(Date), lt: expect.any(Date) }),
                isTest: false,
                surveyVersion: { in: ["employee-v1", "employee-v2", "employee-v3", "employee-v4", "station-v1"] },
                stationKey: "station-own",
                targetType: "STATION",
            },
            _sum: {
                openedCount: true,
                startedCount: true,
                confirmedCount: true,
                targetRejectedCount: true,
                submittedCount: true,
                abandonedCount: true,
                botBlockedCount: true,
                expiredCount: true,
            },
        });
        expect(body.funnel).toEqual({
            opened: 12,
            started: 10,
            confirmed: 9,
            rejected: 1,
            submitted: 8,
            abandoned: 1,
            blocked: 1,
            expired: 0,
        });
        expect(body.stations).toEqual([expect.objectContaining({ id: "station-own", average: 5, count: 1 })]);
        expect(caseCountMock).toHaveBeenCalledWith({
            where: expect.objectContaining({
                stationId: "station-own",
                response: { kind: "STANDARD", targetType: "STATION", validity: { not: "TEST" } },
            }),
        });
    });

    it("scopes export to the manager station and removes incident rows without view_incident", async () => {
        const response = await getExport(new NextRequest(
            "http://localhost/api/admin/customer-feedback/export?stationId=station-other&kind=STANDARD&validity=HIDDEN"
        ));

        expect(response.status).toBe(200);
        expect(responseFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ stationId: "station-own", kind: "STANDARD", validity: "HIDDEN" }),
        }));
    });

    it("adds current Bangkok-month evaluation progress to employee scores under the same station scope", async () => {
        userFindManyMock.mockResolvedValue([
            {
                id: "employee-zero",
                name: "พนักงานศูนย์",
                nickName: "ศูนย์",
                stationId: "station-own",
                station: { name: "สถานีเรา" },
                department: { isFrontYard: true },
            },
        ]);
        responseFindManyMock
            .mockResolvedValueOnce([
                {
                    id: "score-1",
                    employeeId: "employee-1",
                    employeeLabelSnapshot: "นัท",
                    stationId: "station-own",
                    stationLabelSnapshot: "สถานีเรา",
                    submittedAt: new Date("2026-08-24T01:00:00.000Z"),
                    answers: [],
                },
            ])
            .mockResolvedValueOnce([
                { employeeId: "employee-1" },
                { employeeId: "employee-1" },
            ]);

        const response = await getEmployeeScores(new NextRequest(
            "http://localhost/api/admin/customer-feedback/employee-scores?from=2026-08-01&to=2026-08-30&stationId=station-other"
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(responseFindManyMock).toHaveBeenCalledTimes(2);
        expect(responseFindManyMock.mock.calls[0][0]).toEqual(expect.objectContaining({
            where: expect.objectContaining({
                stationId: "station-own",
                surveyVersion: { in: ["employee-v3", "employee-v4"] },
                validity: "VALID",
            }),
        }));
        expect(responseFindManyMock.mock.calls[1][0]).toEqual(expect.objectContaining({
            where: expect.objectContaining({
                stationId: "station-own",
                surveyVersion: { in: ["employee-v3", "employee-v4"] },
                validity: "VALID",
                submittedAt: { gte: expect.any(Date), lt: expect.any(Date) },
            }),
        }));
        expect(body.monthlyEvaluationTarget).toBe(60);
        expect(body.monthlyFrom).toEqual(expect.any(String));
        expect(body.monthlyToExclusive).toEqual(expect.any(String));
        expect(body.employees).toEqual(expect.arrayContaining([
            expect.objectContaining({
                employeeId: "employee-1",
                responseCount: 1,
                monthlyEvaluationCount: 2,
            }),
            expect.objectContaining({
                employeeId: "employee-zero",
                responseCount: 0,
                monthlyEvaluationCount: 0,
                score64: null,
            }),
        ]));
    });

    it("scopes the case queue and removes incident cases without view_incident", async () => {
        const response = await getCases(new NextRequest("http://localhost/api/admin/customer-feedback/cases?stationId=station-other"));

        expect(response.status).toBe(200);
        expect(caseFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                stationId: "station-own",
                response: { kind: "STANDARD", validity: { not: "TEST" } },
            }),
        }));
    });

    it("blocks detail from another station", async () => {
        responseFindUniqueMock.mockResolvedValue({
            id: "response-1",
            stationId: "station-other",
            kind: "STANDARD",
            answers: [],
            case: null,
        });

        const response = await getResponseDetail(
            new NextRequest("http://localhost/api/admin/customer-feedback/responses/response-1?stationId=station-other"),
            { params: Promise.resolve({ id: "response-1" }) }
        );

        expect(response.status).toBe(403);
    });

    it("blocks incident detail and contact without view_incident", async () => {
        responseFindUniqueMock.mockResolvedValue({
            id: "incident-1",
            stationId: "station-own",
            kind: "INCIDENT",
            answers: [],
            case: null,
            contact: { valueEncrypted: "encrypted", nameEncrypted: null },
        });

        const detail = await getResponseDetail(
            new NextRequest("http://localhost/api/admin/customer-feedback/responses/incident-1"),
            { params: Promise.resolve({ id: "incident-1" }) }
        );
        const contact = await getResponseContact(
            new NextRequest("http://localhost/api/admin/customer-feedback/responses/incident-1/contact?stationId=station-other"),
            { params: Promise.resolve({ id: "incident-1" }) }
        );

        expect(detail.status).toBe(403);
        expect(contact.status).toBe(403);
    });

    it("blocks contact from another station", async () => {
        responseFindUniqueMock.mockResolvedValue({
            id: "response-1",
            stationId: "station-other",
            kind: "STANDARD",
            contact: { valueEncrypted: "encrypted", nameEncrypted: null },
        });

        const response = await getResponseContact(
            new NextRequest("http://localhost/api/admin/customer-feedback/responses/response-1/contact?stationId=station-other"),
            { params: Promise.resolve({ id: "response-1" }) }
        );

        expect(response.status).toBe(403);
    });

    it("creates a manual urgent case, notification, alert, and audit in one transaction", async () => {
        responseFindUniqueMock.mockResolvedValue({
            id: "response-1",
            stationId: "station-own",
            kind: "STANDARD",
            incidentKey: null,
            overallRating: 5,
            reasonKeys: [],
            wantsFollowUp: false,
        });

        const response = await postCase(new NextRequest("http://localhost/api/admin/customer-feedback/cases", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ responseId: "response-1", severity: "URGENT" }),
        }));

        expect(response.status).toBe(200);
        expect(transactionMock).toHaveBeenCalledOnce();
        expect(createCaseWithNotificationsMock).toHaveBeenCalledWith(expect.anything(), {
            responseId: "response-1",
            stationId: "station-own",
            severity: "URGENT",
            category: "manual",
        });
        expect(recordUrgentIncidentAlertMock).toHaveBeenCalledWith(expect.anything(), {
            caseId: "case-1",
            stationId: "station-own",
            now: expect.any(Date),
        });
        expect(auditCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "CUSTOMER_FEEDBACK_CASE_CREATED",
                entityId: "case-1",
                userId: "manager-1",
            }),
        });
    });

    it("adds today's live standard visits without reading today's aggregate twice", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-24T04:00:00.000Z"));
        try {
            dailyAggregateMock.mockClear();
            visitFindManyMock.mockResolvedValue([
                {
                    stationIdSelected: "station-own",
                    stationIdAtOpen: "station-own",
                    targetType: "STATION",
                    surveyVersion: "station-v1",
                    isTestAtOpen: false,
                    disposition: "SUBMITTED",
                    formExpiresAt: new Date("2026-08-24T05:00:00.000Z"),
                    startedAt: new Date("2026-08-24T02:00:00.000Z"),
                    targetConfirmation: "YES",
                    qrCode: { stationId: "station-own" },
                },
                {
                    stationIdSelected: "station-own",
                    stationIdAtOpen: "station-own",
                    targetType: "STATION",
                    surveyVersion: "station-v1",
                    isTestAtOpen: false,
                    disposition: "OPEN",
                    formExpiresAt: new Date("2026-08-24T03:00:00.000Z"),
                    startedAt: null,
                    targetConfirmation: null,
                    qrCode: { stationId: "station-own" },
                },
            ]);

            const response = await getSummary(new NextRequest(
                "http://localhost/api/admin/customer-feedback/summary?from=2026-08-24&to=2026-08-24&targetType=STATION"
            ));
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(dailyAggregateMock).not.toHaveBeenCalled();
            expect(visitFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    isTestAtOpen: false,
                    surveyVersion: { in: ["employee-v1", "employee-v2", "employee-v3", "employee-v4", "station-v1"] },
                    targetType: "STATION",
                }),
            }));
            expect(body.funnel).toEqual({
                opened: 2,
                started: 1,
                confirmed: 1,
                rejected: 0,
                submitted: 1,
                abandoned: 0,
                blocked: 0,
                expired: 1,
            });
        } finally {
            vi.useRealTimers();
        }
    });

    it("applies the selected target type to the incident count", async () => {
        incidentAccessMock.mockResolvedValue(true);

        const response = await getSummary(new NextRequest(
            "http://localhost/api/admin/customer-feedback/summary?from=2026-08-01&to=2026-08-02&targetType=EMPLOYEE"
        ));

        expect(response.status).toBe(200);
        expect(responseCountMock).toHaveBeenLastCalledWith({
            where: {
                kind: "INCIDENT",
                submittedAt: {
                    gte: new Date("2026-07-31T17:00:00.000Z"),
                    lt: new Date("2026-08-02T17:00:00.000Z"),
                },
                stationId: "station-own",
                targetType: "EMPLOYEE",
            },
        });
    });

    it("rebuilds historical rating distribution and reasons from daily aggregates without double-counting raw rows", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-24T04:00:00.000Z"));
        try {
            responseFindManyMock.mockClear();
            responseCountMock.mockClear();
            dailyAggregateGroupByMock.mockResolvedValue([
                {
                    reportDate: new Date("2024-01-01T00:00:00.000Z"),
                    stationKey: "station-own",
                    targetType: "STATION",
                    _sum: {
                        validCount: 11,
                        suspectedCount: 2,
                        ratingSum: 36,
                        ratingCount: 10,
                        rating1Count: 1,
                        rating2Count: 1,
                        rating3Count: 2,
                        rating4Count: 3,
                        rating5Count: 3,
                    },
                },
            ]);
            dailyReasonGroupByMock.mockResolvedValue([
                { reasonKey: "station_cleanliness", _sum: { validCount: 4 } },
            ]);
            stationFindManyMock.mockResolvedValue([{ id: "station-own", name: "สถานีเรา" }]);

            const response = await getSummary(new NextRequest(
                "http://localhost/api/admin/customer-feedback/summary?from=2024-01-01&to=2024-01-01&targetType=STATION"
            ));
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.summary).toMatchObject({
                count: 10,
                average: 3.6,
                positiveRate: 60,
                negativeRate: 20,
                validCount: 11,
                suspectedCount: 2,
            });
            expect(body.summary.distribution).toEqual({ "1": 1, "2": 1, "3": 2, "4": 3, "5": 3 });
            expect(body.reasons).toContainEqual({ key: "station_cleanliness", count: 4, owner: "STATION" });
            expect(body.stations).toContainEqual(expect.objectContaining({ id: "station-own", name: "สถานีเรา", count: 10, average: 3.6 }));
            expect(responseFindManyMock).not.toHaveBeenCalled();
            expect(responseCountMock).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });
});
