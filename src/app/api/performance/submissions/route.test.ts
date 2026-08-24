import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, userFindUniqueMock, periodFindUniqueMock, submissionFindUniqueMock, submissionCreateMock, transactionMock, queryRawMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    periodFindUniqueMock: vi.fn(),
    submissionFindUniqueMock: vi.fn(),
    submissionCreateMock: vi.fn(),
    transactionMock: vi.fn(),
    queryRawMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: userFindUniqueMock },
        reviewPeriod: { findUnique: periodFindUniqueMock },
        reviewSubmission: { findUnique: submissionFindUniqueMock, create: submissionCreateMock },
        $transaction: transactionMock,
    },
}));

import { GET, POST } from "./route";

describe("performance submission account status", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "employee-1" } });
        userFindUniqueMock.mockResolvedValue({ isActive: false, employeeStatus: "SUSPENDED" });
        queryRawMock.mockResolvedValue([]);
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: queryRawMock,
            user: { findUnique: userFindUniqueMock },
            reviewPeriod: { findUnique: periodFindUniqueMock },
            reviewSubmission: { create: submissionCreateMock },
        }));
    });

    it("blocks a stale signed-in session from reading submissions after deactivation", async () => {
        const response = await GET(new NextRequest("http://localhost/api/performance/submissions?periodId=period-1"));

        expect(response.status).toBe(403);
        expect(submissionFindUniqueMock).not.toHaveBeenCalled();
    });

    it("blocks a stale signed-in session from creating a submission after deactivation", async () => {
        const response = await POST(new NextRequest("http://localhost/api/performance/submissions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ periodId: "period-1", selfReview: "ผลงานประจำรอบ" }),
        }));

        expect(response.status).toBe(403);
        expect(periodFindUniqueMock).not.toHaveBeenCalled();
        expect(submissionCreateMock).not.toHaveBeenCalled();
    });

    it("locks the employee and period before creating an active-period submission", async () => {
        userFindUniqueMock.mockResolvedValue({ isActive: true, employeeStatus: "ACTIVE" });
        periodFindUniqueMock.mockResolvedValue({
            id: "period-1",
            isActive: true,
            closedAt: null,
            startDate: new Date("2026-01-01T00:00:00.000Z"),
            endDate: new Date("2026-12-31T00:00:00.000Z"),
        });
        submissionCreateMock.mockResolvedValue({ id: "submission-1" });

        const response = await POST(new NextRequest("http://localhost/api/performance/submissions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ periodId: "period-1", selfReview: "ผลงานประจำรอบ" }),
        }));

        expect(response.status).toBe(200);
        expect(queryRawMock).toHaveBeenCalledTimes(2);
        expect(submissionCreateMock).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ employeeId: "employee-1", periodId: "period-1" }),
        }));
        expect(transactionMock).toHaveBeenCalledTimes(1);
    });
});
