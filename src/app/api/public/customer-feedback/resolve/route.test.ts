import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    qrFindUnique: vi.fn(),
    qrFindFirst: vi.fn(),
    qrUpdate: vi.fn(),
    visitCreate: vi.fn(),
    visitUpsert: vi.fn(),
    visitFindFirst: vi.fn(),
    visitUpdate: vi.fn(),
    visitUpdateMany: vi.fn(),
    userFindUnique: vi.fn(),
    userFindMany: vi.fn(),
    stationFindUnique: vi.fn(),
    resolveAggregateUpsert: vi.fn(),
    notificationCreateMany: vi.fn(),
    checkRateLimit: vi.fn(),
    checkGlobalLimit: vi.fn(),
    isRateLimitExceeded: vi.fn(),
    createVisitToken: vi.fn(),
    isStationFeedbackEnabled: vi.fn(),
    resolveEmployeeCurrentStation: vi.fn(),
    transaction: vi.fn(),
    queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackQr: {
            findUnique: mocks.qrFindUnique,
            findFirst: mocks.qrFindFirst,
            update: mocks.qrUpdate,
        },
        customerFeedbackVisit: {
            create: mocks.visitCreate,
            upsert: mocks.visitUpsert,
            findFirst: mocks.visitFindFirst,
            update: mocks.visitUpdate,
            updateMany: mocks.visitUpdateMany,
        },
        user: {
            findUnique: mocks.userFindUnique,
            findMany: mocks.userFindMany,
        },
        station: {
            findUnique: mocks.stationFindUnique,
        },
        customerFeedbackResolveDailyAggregate: {
            upsert: mocks.resolveAggregateUpsert,
        },
        notification: {
            createMany: mocks.notificationCreateMany,
        },
        $transaction: mocks.transaction,
    },
}));
vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackPublicEnabled: () => true,
    assertPublicSecrets: () => undefined,
}));
vi.mock("@/lib/customer-feedback/token", () => ({
    sha256Hex: () => "qr-token-hash",
    hashManualCode: () => "manual-code-hash",
}));
vi.mock("@/lib/customer-feedback/form-token", () => ({
    createVisitToken: mocks.createVisitToken,
}));
vi.mock("@/lib/customer-feedback/anti-abuse", () => ({
    networkHashDaily: () => "network-hash",
    clientHashWeekly: () => "client-hash",
    resolveNonceHash: () => "nonce-hash",
    networkRateKey: () => "network-rate-key",
    deviceClassOf: () => "mobile",
    currentHashKeyVersion: () => "v1",
    checkRateLimit: mocks.checkRateLimit,
    checkGlobalLimit: mocks.checkGlobalLimit,
    isRateLimitExceeded: mocks.isRateLimitExceeded,
    GLOBAL_LIMITS: { visitCreatePerMinute: 10_000, invalidResolvePerMinute: 3_000 },
    PER_QR_RESOLVE_PER_HOUR: 120,
    PER_NETWORK_RESOLVE_PER_HOUR: 300,
    PER_NETWORK_MANUAL_CODE_PER_MINUTE: 20,
}));
vi.mock("@/lib/customer-feedback/station-context", () => ({
    isStationFeedbackEnabled: mocks.isStationFeedbackEnabled,
    resolveEmployeeCurrentStation: mocks.resolveEmployeeCurrentStation,
}));
vi.mock("@/lib/customer-feedback/questions", () => ({
    shuffledOptionOrder: (keys: string[]) => keys,
    getSurvey: () => ({
        reasonOptions: [{ key: "employee_courtesy" }],
        maxReasons: 3,
        commentMaxLength: 300,
    }),
}));
vi.mock("@/lib/customer-feedback/retention", () => ({
    FORM_EXPIRY_MS: 30 * 60 * 1000,
    visitPurgeAfter: () => new Date("2099-04-01T00:00:00.000Z"),
}));
vi.mock("@/lib/customer-feedback/alerts", () => ({
    tryRecordAlert: vi.fn().mockResolvedValue(false),
}));

import { POST } from "./route";

const employeeQr = {
    id: "qr-employee-1",
    isActive: true,
    isTest: false,
    version: 1,
    targetType: "EMPLOYEE",
    employeeId: "employee-1",
    stationId: null,
    publicLabel: "พนักงานทดสอบ",
    publicPosition: "พนักงานบริการ",
    serviceAreaKey: null,
};

function resolveRequest(): NextRequest {
    return new NextRequest("https://feedback.example.test/api/public/customer-feedback/resolve", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            host: "feedback.example.test",
            origin: "https://feedback.example.test",
            "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify({ token: "public-qr-token" }),
    });
}

describe("public feedback resolve final eligibility re-read", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 60 });
        mocks.checkGlobalLimit.mockResolvedValue({ allowed: true, retryAfterSec: 60 });
        mocks.isRateLimitExceeded.mockResolvedValue(false);
        mocks.createVisitToken.mockReturnValue({
            token: "signed-visit-token",
            tokenHash: "visit-token-hash",
            issuedAt: Date.now(),
        });
        mocks.resolveEmployeeCurrentStation.mockResolvedValue({ stationId: null, source: "UNKNOWN" });
        mocks.visitCreate.mockImplementation(async (args: { data: Record<string, unknown> }) => args.data);
        mocks.visitUpsert.mockImplementation(async (args: { create: Record<string, unknown> }) => args.create);
        mocks.visitUpdateMany.mockResolvedValue({ count: 1 });
        mocks.qrUpdate.mockResolvedValue({});
        mocks.resolveAggregateUpsert.mockResolvedValue({});
        mocks.queryRaw.mockResolvedValue([]);
        mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
            $queryRaw: mocks.queryRaw,
            customerFeedbackQr: {
                findUnique: mocks.qrFindUnique,
                findFirst: mocks.qrFindFirst,
                update: mocks.qrUpdate,
            },
            customerFeedbackVisit: {
                create: mocks.visitCreate,
                upsert: mocks.visitUpsert,
                update: mocks.visitUpdate,
            },
            user: { findUnique: mocks.userFindUnique },
            station: { findUnique: mocks.stationFindUnique },
        }));
    });

    it("does not issue a Visit when QR rotates before the locked issuance step", async () => {
        mocks.qrFindUnique
            .mockResolvedValueOnce(employeeQr)
            .mockResolvedValueOnce({ version: 2, isActive: false });
        mocks.userFindUnique.mockResolvedValueOnce({
            isActive: true,
            departmentId: "department-1",
            shiftAssignments: [],
        });

        const response = await POST(resolveRequest());

        expect(response.status).toBe(404);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        await expect(response.json()).resolves.toMatchObject({ code: "INVALID_QR" });
        expect(mocks.visitCreate).not.toHaveBeenCalled();
        expect(mocks.qrUpdate).not.toHaveBeenCalled();
        expect(mocks.queryRaw).toHaveBeenCalledTimes(2);
        expect(mocks.resolveAggregateUpsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ result: "INACTIVE" }),
        }));
    });

    it("returns SUCCESS and leaves the Visit open when QR and employee stay eligible", async () => {
        mocks.qrFindUnique
            .mockResolvedValueOnce(employeeQr)
            .mockResolvedValueOnce({ version: 1, isActive: true, isTest: false });
        mocks.userFindUnique
            .mockResolvedValueOnce({
                isActive: true,
                departmentId: "department-1",
                shiftAssignments: [],
            })
            .mockResolvedValueOnce({
                isActive: true,
                departmentId: "department-1",
                shiftAssignments: [],
            });

        const response = await POST(resolveRequest());

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        await expect(response.json()).resolves.toMatchObject({
            visitToken: "signed-visit-token",
            surveyVersion: "employee-v3",
            targetType: "EMPLOYEE",
            isTest: false,
        });
        expect(mocks.visitUpdateMany).not.toHaveBeenCalled();
        expect(mocks.visitCreate).toHaveBeenCalledTimes(1);
        expect(mocks.qrUpdate).toHaveBeenCalledWith({
            where: { id: "qr-employee-1" },
            data: { lastResolvedAt: expect.any(Date) },
        });
        expect(mocks.resolveAggregateUpsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ result: "SUCCESS" }),
        }));
    });
});
