import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findFirst: vi.fn() },
    },
}));

import {
    GAS_CASHIER_DEPARTMENT_CODES,
    canGasCashierAccessStation,
    gasCashierEmployeeWhere,
    isFuelCashier,
    isGasCashier,
} from "@/lib/cashier-employee-scope";

describe("gas cashier employee scope", () => {
    it.each([
        ["EMPE2D20", "PAP"],
        ["EMP90026", "PAP"],
        ["EMPC6A4F", "SPC"],
        ["EMPF7DE0", "SPC"],
    ])("marks configured gas cashier %s as restricted", (employeeId, stationId) => {
        const user = { role: "CASHIER", employeeId, stationId };
        expect(isGasCashier(user)).toBe(true);
        expect(isFuelCashier(user)).toBe(false);
        expect(gasCashierEmployeeWhere(user)).toEqual({
            stationId,
            role: "EMPLOYEE",
            department: { code: { in: [...GAS_CASHIER_DEPARTMENT_CODES] } },
        });
    });

    it("does not restrict a normal cashier by the gas-only rule", () => {
        const user = { role: "CASHIER", employeeId: "OTHER", stationId: "PAP" };
        expect(isGasCashier(user)).toBe(false);
        expect(isFuelCashier(user)).toBe(true);
        expect(gasCashierEmployeeWhere(user)).toBeNull();
    });

    it("never treats a non-cashier as a fuel cashier", () => {
        expect(isFuelCashier({ role: "EMPLOYEE", employeeId: "OTHER", stationId: "PAP" })).toBe(false);
    });

    it("keeps a gas cashier on their own station", () => {
        const user = { role: "CASHIER", employeeId: "EMPE2D20", stationId: "pap-id" };
        expect(canGasCashierAccessStation(user, "pap-id")).toBe(true);
        expect(canGasCashierAccessStation(user, "spc-id")).toBe(false);
    });
});
