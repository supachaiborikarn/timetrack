import { beforeEach, describe, expect, it, vi } from "vitest";

const { countMock, userDeleteMock, setEmployeeInactiveMock } = vi.hoisted(() => ({
    countMock: vi.fn(),
    userDeleteMock: vi.fn(),
    setEmployeeInactiveMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: new Proxy({}, {
        get: (_target, property) => property === "user"
            ? { delete: userDeleteMock }
            : { count: countMock },
    }),
}));
vi.mock("@/lib/customer-feedback/employee-status", () => ({
    setEmployeeInactive: setEmployeeInactiveMock,
}));
vi.mock("@/lib/assets", () => ({ deleteAsset: vi.fn() }));

import { removeEmployeeAccount } from "./employee-removal";

describe("employee removal with existing activity", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        countMock.mockResolvedValue(1);
        setEmployeeInactiveMock.mockResolvedValue({ closedQrCount: 1 });
    });

    it("uses the shared inactive helper instead of leaving active feedback QR codes", async () => {
        const result = await removeEmployeeAccount("employee-1");

        expect(result.deleted).toBe(false);
        expect(setEmployeeInactiveMock).toHaveBeenCalledWith("employee-1", {
            isActive: false,
            employeeStatus: "RESIGNED",
        });
        expect(result.activity).toEqual(expect.arrayContaining([
            { label: "QR ประเมินพนักงาน", count: 1 },
            { label: "การเปิดแบบประเมินจากลูกค้า", count: 1 },
        ]));
        expect(userDeleteMock).not.toHaveBeenCalled();
    });
});
