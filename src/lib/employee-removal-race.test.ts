import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    transactionMock,
    queryRawMock,
    qrCountMock,
    visitCountMock,
    responseCountMock,
    reviewCountMock,
    userDeleteMock,
} = vi.hoisted(() => ({
    transactionMock: vi.fn(),
    queryRawMock: vi.fn(),
    qrCountMock: vi.fn(),
    visitCountMock: vi.fn(),
    responseCountMock: vi.fn(),
    reviewCountMock: vi.fn(),
    userDeleteMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transactionMock } }));
vi.mock("@/lib/assets", () => ({ deleteAsset: vi.fn() }));
vi.mock("@/lib/customer-feedback/employee-status", () => ({ setEmployeeInactive: vi.fn() }));

import { tryDeleteEmployeeAccount } from "./employee-removal";

describe("employee hard-delete feedback race", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryRawMock.mockResolvedValue([]);
        qrCountMock.mockResolvedValue(0);
        visitCountMock.mockResolvedValue(0);
        responseCountMock.mockResolvedValue(0);
        reviewCountMock.mockResolvedValue(0);
        userDeleteMock.mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: queryRawMock,
            customerFeedbackQr: { count: qrCountMock },
            customerFeedbackVisit: { count: visitCountMock },
            customerFeedbackResponse: { count: responseCountMock },
            customerFeedbackReviewRequest: { count: reviewCountMock },
            user: { delete: userDeleteMock },
        }));
    });

    it("rechecks after locking User and refuses a QR created after the first activity scan", async () => {
        qrCountMock.mockResolvedValue(1);

        const result = await tryDeleteEmployeeAccount("employee-1");

        expect(queryRawMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            deleted: false,
            feedbackActivity: [{ label: "QR ประเมินพนักงาน", count: 1 }],
        });
        expect(userDeleteMock).not.toHaveBeenCalled();
        expect(transactionMock).toHaveBeenCalledTimes(1);
    });

    it("deletes inside the same transaction only when the locked recheck stays empty", async () => {
        const result = await tryDeleteEmployeeAccount("employee-1");

        expect(result).toEqual({ deleted: true, feedbackActivity: [] });
        expect(userDeleteMock).toHaveBeenCalledWith({ where: { id: "employee-1" } });
        expect(transactionMock).toHaveBeenCalledTimes(1);
    });
});
