import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    accessMock,
    configFindUniqueMock,
    configUpsertMock,
    periodFindManyMock,
    periodFindUniqueMock,
    userFindManyMock,
    submissionFindManyMock,
    submissionFindUniqueMock,
    submissionUpdateMock,
    auditCreateMock,
    transactionMock,
} = vi.hoisted(() => ({
    accessMock: vi.fn(),
    configFindUniqueMock: vi.fn(),
    configUpsertMock: vi.fn(),
    periodFindManyMock: vi.fn(),
    periodFindUniqueMock: vi.fn(),
    userFindManyMock: vi.fn(),
    submissionFindManyMock: vi.fn(),
    submissionFindUniqueMock: vi.fn(),
    submissionUpdateMock: vi.fn(),
    auditCreateMock: vi.fn(),
    transactionMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: accessMock,
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        systemConfig: { findUnique: configFindUniqueMock, upsert: configUpsertMock },
        reviewPeriod: { findMany: periodFindManyMock, findUnique: periodFindUniqueMock },
        user: { findMany: userFindManyMock },
        reviewSubmission: {
            findMany: submissionFindManyMock,
            findUnique: submissionFindUniqueMock,
            update: submissionUpdateMock,
        },
        auditLog: { create: auditCreateMock },
        $transaction: transactionMock,
    },
}));

import { GET, PATCH, PUT } from "./route";

describe("admin Chinese New Year bonus configuration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        accessMock.mockResolvedValue({ ok: true, ctx: { userId: "admin-1", role: "ADMIN", stationId: null } });
        configFindUniqueMock.mockResolvedValue(null);
        periodFindManyMock.mockResolvedValue([]);
        userFindManyMock.mockResolvedValue([]);
        submissionFindManyMock.mockResolvedValue([]);
        transactionMock.mockImplementation(async (operations: unknown[]) => Promise.all(operations));
        configUpsertMock.mockResolvedValue({ key: "cny", value: "period-1" });
        auditCreateMock.mockResolvedValue({ id: "audit-1" });
    });

    it("rejects a current non-admin/non-HR account before reading configuration", async () => {
        accessMock.mockResolvedValue({ ok: true, ctx: { userId: "manager-1", role: "MANAGER", stationId: "station-1" } });

        const response = await GET();

        expect(response.status).toBe(403);
        expect(configFindUniqueMock).not.toHaveBeenCalled();
        expect(periodFindManyMock).not.toHaveBeenCalled();
    });

    it("stores the selected existing ReviewPeriod and writes an audit row", async () => {
        periodFindUniqueMock.mockResolvedValue({ id: "period-1", title: "รอบตรุษจีน" });

        const response = await PUT(new NextRequest("http://localhost/api/admin/performance/chinese-new-year-bonus", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reviewPeriodId: "period-1" }),
        }));

        expect(response.status).toBe(200);
        expect(configUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { key: "chinese_new_year_bonus.review_period_id.v1" },
            update: { value: "period-1" },
        }));
        expect(auditCreateMock).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                action: "CNY_BONUS_PERIOD_SELECTED",
                entityId: "period-1",
                userId: "admin-1",
            }),
        }));
    });

    it("does not create a supervisor score when the employee has not submitted self assessment", async () => {
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });
        submissionFindUniqueMock.mockResolvedValue(null);

        const response = await PATCH(new NextRequest("http://localhost/api/admin/performance/chinese-new-year-bonus", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ periodId: "period-1", employeeId: "employee-1", rating: 5 }),
        }));

        expect(response.status).toBe(409);
        expect(submissionUpdateMock).not.toHaveBeenCalled();
    });

    it("updates an existing supervisor review and audits the change", async () => {
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });
        submissionFindUniqueMock.mockResolvedValue({ id: "submission-1" });
        submissionUpdateMock.mockResolvedValue({
            id: "submission-1",
            employeeId: "employee-1",
            rating: 4,
            managerReview: "ทำตาม SOP สม่ำเสมอ",
            status: "COMPLETED",
            completedAt: new Date("2026-09-04T00:00:00.000Z"),
        });

        const response = await PATCH(new NextRequest("http://localhost/api/admin/performance/chinese-new-year-bonus", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                periodId: "period-1",
                employeeId: "employee-1",
                rating: 4,
                managerReview: "ทำตาม SOP สม่ำเสมอ",
            }),
        }));

        expect(response.status).toBe(200);
        expect(submissionUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "submission-1" },
            data: expect.objectContaining({ rating: 4, managerReview: "ทำตาม SOP สม่ำเสมอ", status: "COMPLETED" }),
        }));
        expect(auditCreateMock).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                action: "CNY_BONUS_SUPERVISOR_REVIEW_UPDATED",
                entityId: "submission-1",
                userId: "admin-1",
            }),
        }));
    });
});
