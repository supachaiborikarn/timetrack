import { beforeEach, describe, expect, it, vi } from "vitest";

const { transactionMock, queryRawMock, userUpdateMock, qrUpdateManyMock, events } = vi.hoisted(() => ({
    transactionMock: vi.fn(),
    queryRawMock: vi.fn(),
    userUpdateMock: vi.fn(),
    qrUpdateManyMock: vi.fn(),
    events: [] as string[],
}));

vi.mock("@/lib/prisma", () => ({
    prisma: { $transaction: transactionMock },
}));

import { setEmployeeInactive, updateEmployeeAndCloseQr } from "./employee-status";

describe("employee feedback QR shutdown", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        events.length = 0;
        queryRawMock.mockImplementation(async () => { events.push("user-lock"); return []; });
        userUpdateMock.mockImplementation(async () => { events.push("user-update"); return { id: "employee-1" }; });
        qrUpdateManyMock.mockImplementation(async () => { events.push("qr-update"); return { count: 2 }; });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: queryRawMock,
            user: { update: userUpdateMock },
            customerFeedbackQr: { updateMany: qrUpdateManyMock },
        }));
    });

    it("updates the user before closing active employee QR codes", async () => {
        const result = await setEmployeeInactive("employee-1", {
            isActive: false,
            employeeStatus: "RESIGNED",
        });

        expect(events).toEqual(["user-lock", "user-update", "qr-update"]);
        expect(userUpdateMock).toHaveBeenCalledWith({
            where: { id: "employee-1" },
            data: { isActive: false, employeeStatus: "RESIGNED" },
        });
        expect(qrUpdateManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { employeeId: "employee-1", targetType: "EMPLOYEE", isActive: true },
        }));
        expect(result.closedQrCount).toBe(2);
    });

    it("lets a route update all user fields inside the same ordered transaction", async () => {
        const result = await updateEmployeeAndCloseQr("employee-1", (tx) => tx.user.update({
            where: { id: "employee-1" },
            data: { isActive: false, name: "ชื่อใหม่" },
        }));

        expect(events).toEqual(["user-lock", "user-update", "qr-update"]);
        expect(result.employee).toEqual({ id: "employee-1" });
    });
});
