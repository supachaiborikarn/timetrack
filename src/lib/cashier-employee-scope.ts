import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const GAS_CASHIER_EMPLOYEE_IDS = [
    "EMPE2D20", // กุ้ง — PAP
    "EMP90026", // เล็ก — PAP
    "EMPC6A4F", // ปุ้ก/ปุก — SPC
    "EMPF7DE0", // เหน่ง — SPC
] as const;

export const GAS_CASHIER_DEPARTMENT_CODES = ["GAS", "CAR_WASH"] as const;

const gasCashierEmployeeIds = new Set<string>(GAS_CASHIER_EMPLOYEE_IDS);

type ScopeUser = {
    role?: Role | string | null;
    employeeId?: string | null;
    stationId?: string | null;
};

export function isGasCashier(user: ScopeUser | null | undefined): boolean {
    return user?.role === "CASHIER"
        && Boolean(user.employeeId)
        && gasCashierEmployeeIds.has(user.employeeId!);
}

export function isFuelCashier(user: ScopeUser | null | undefined): boolean {
    return user?.role === "CASHIER" && !isGasCashier(user);
}

export function gasCashierEmployeeWhere(user: ScopeUser | null | undefined): Prisma.UserWhereInput | null {
    if (!isGasCashier(user)) return null;
    if (!user?.stationId) return { id: { in: [] } };

    return {
        stationId: user.stationId,
        role: "EMPLOYEE",
        department: {
            code: { in: [...GAS_CASHIER_DEPARTMENT_CODES] },
        },
    };
}

export function combineUserWhere(
    ...clauses: Array<Prisma.UserWhereInput | null | undefined>
): Prisma.UserWhereInput {
    const activeClauses = clauses.filter((clause): clause is Prisma.UserWhereInput => Boolean(clause));
    if (activeClauses.length === 0) return {};
    if (activeClauses.length === 1) return activeClauses[0];
    return { AND: activeClauses };
}

export function canGasCashierAccessStation(
    user: ScopeUser | null | undefined,
    stationId: string | null | undefined,
): boolean {
    if (!isGasCashier(user)) return true;
    return Boolean(user?.stationId && stationId && user.stationId === stationId);
}

export async function canGasCashierAccessEmployee(
    user: ScopeUser | null | undefined,
    userId: string,
): Promise<boolean> {
    const scope = gasCashierEmployeeWhere(user);
    if (!scope) return true;

    const match = await prisma.user.findFirst({
        where: { id: userId, ...scope },
        select: { id: true },
    });
    return Boolean(match);
}

export const GAS_CASHIER_SCOPE_LABEL = "พนักงานแก๊ส + ล้างรถ";
