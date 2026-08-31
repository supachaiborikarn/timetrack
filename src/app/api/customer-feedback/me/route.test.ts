import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, userFindUniqueMock, responseFindManyMock, periodFindUniqueMock, snapshotFindUniqueMock, permissionMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    responseFindManyMock: vi.fn(),
    periodFindUniqueMock: vi.fn(),
    snapshotFindUniqueMock: vi.fn(),
    permissionMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/permissions", () => ({ hasPermission: permissionMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: userFindUniqueMock },
        customerFeedbackResponse: { findMany: responseFindManyMock },
        reviewPeriod: { findUnique: periodFindUniqueMock },
        customerFeedbackReviewSnapshot: { findUnique: snapshotFindUniqueMock },
    },
}));

import { GET } from "./route";

describe("employee customer feedback summary", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "employee-1" } });
        userFindUniqueMock.mockResolvedValue({ role: "EMPLOYEE", isActive: true });
        permissionMock.mockResolvedValue(true);
        responseFindManyMock.mockResolvedValue([]);
        periodFindUniqueMock.mockResolvedValue(null);
        snapshotFindUniqueMock.mockResolvedValue(null);
    });

    it("does not truncate the employee history at 500 responses", async () => {
        const response = await GET(new NextRequest("https://example.test/api/customer-feedback/me"));

        expect(response.status).toBe(200);
        expect(responseFindManyMock).toHaveBeenCalledWith(expect.not.objectContaining({ take: expect.anything() }));
    });

    it("does not reveal response counts or the minimum threshold before a score is ready", async () => {
        responseFindManyMock.mockResolvedValue(Array.from({ length: 9 }, (_, index) => ({
            overallRating: (index % 5) + 1,
            reasonKeys: ["employee_courtesy"],
            submittedAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
        })));

        const response = await GET(new NextRequest("https://example.test/api/customer-feedback/me"));
        const body = await response.json();

        expect(body.meetsMinimum).toBe(false);
        expect(body.summary).toEqual({});
        expect(body.message).toBe("กำลังรวบรวมข้อมูลสำหรับคะแนนสรุป");
        expect(body).not.toHaveProperty("minimumSample");
        expect(body).not.toHaveProperty("suspectedExcludedCount");
    });

    it("returns a ready score without response, distribution or reason counts", async () => {
        responseFindManyMock.mockResolvedValue(Array.from({ length: 10 }, (_, index) => ({
            overallRating: 5,
            reasonKeys: [index < 6 ? "employee_courtesy" : "employee_safety"],
            submittedAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
        })));

        const response = await GET(new NextRequest("https://example.test/api/customer-feedback/me"));
        const body = await response.json();

        expect(body.meetsMinimum).toBe(true);
        expect(body.summary).toEqual({ average: 5, positiveRate: 100, negativeRate: 0 });
        expect(body.topReasons).toEqual([
            { key: "employee_courtesy" },
            { key: "employee_safety" },
        ]);
        expect(body.summary).not.toHaveProperty("count");
        expect(body.summary).not.toHaveProperty("distribution");
    });

    it("filters live feedback to the selected review period", async () => {
        periodFindUniqueMock.mockResolvedValue({
            id: "period-1",
            title: "รอบตรุษจีน",
            startDate: new Date("2026-08-23T17:00:00.000Z"),
            endDate: new Date("2026-08-30T17:00:00.000Z"),
            isActive: true,
            closedAt: null,
        });

        const response = await GET(new NextRequest("https://example.test/api/customer-feedback/me?reviewPeriodId=period-1"));

        expect(response.status).toBe(200);
        expect(responseFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                employeeId: "employee-1",
                submittedAt: {
                    gte: new Date("2026-08-23T17:00:00.000Z"),
                    lt: new Date("2026-08-31T17:00:00.000Z"),
                },
            }),
        }));
    });

    it("uses the employee's own immutable snapshot after the period closes", async () => {
        periodFindUniqueMock.mockResolvedValue({
            id: "period-closed",
            title: "รอบปิดแล้ว",
            startDate: new Date("2026-01-01T00:00:00.000Z"),
            endDate: new Date("2026-01-31T00:00:00.000Z"),
            isActive: false,
            closedAt: new Date("2026-02-01T00:00:00.000Z"),
        });
        snapshotFindUniqueMock.mockResolvedValue({
            validCount: 12,
            ratingAverage: 4.25,
            positiveRate: 75,
            negativeRate: 8.33,
            suspectedExcludedCount: 2,
            topReasonKeys: ["employee_courtesy"],
            generatedAt: new Date("2026-02-01T00:00:00.000Z"),
        });

        const response = await GET(new NextRequest("https://example.test/api/customer-feedback/me?reviewPeriodId=period-closed"));
        const body = await response.json();

        expect(body.source).toBe("SNAPSHOT");
        expect(body.summary).toEqual({ average: 4.25, positiveRate: 75, negativeRate: 8.33 });
        expect(body).not.toHaveProperty("minimumSample");
        expect(body).not.toHaveProperty("suspectedExcludedCount");
        expect(snapshotFindUniqueMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { reviewPeriodId_employeeId: { reviewPeriodId: "period-closed", employeeId: "employee-1" } },
        }));
        expect(responseFindManyMock).not.toHaveBeenCalled();
    });
});
