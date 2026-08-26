import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";
import {
    calculatePayrollPeriod,
    DEFAULT_SSO_MAX,
    DEFAULT_SSO_RATE,
    PAYROLL_ELIGIBLE_ROLES,
    roundMoney,
    type PayrollPeriodCalculation,
} from "@/lib/payroll-calculation";

type PayrollDb = Prisma.TransactionClient;

export type PayrollLoadFilters = {
    startDate: string;
    endDate: string;
    stationId?: string | null;
    departmentId?: string | null;
    userId?: string | null;
};

const employeeSelect = {
    id: true,
    name: true,
    nickName: true,
    employeeId: true,
    role: true,
    dailyRate: true,
    probationDailyRate: true,
    probationEndDate: true,
    hourlyRate: true,
    baseSalary: true,
    otRateMultiplier: true,
    otherExpenses: true,
    isSocialSecurityRegistered: true,
    stationId: true,
    departmentId: true,
    bankName: true,
    bankAccountNumber: true,
    station: { select: { name: true, code: true } },
    department: { select: { name: true } },
} satisfies Prisma.UserSelect;

export type PayrollEmployeeSource = Prisma.UserGetPayload<{ select: typeof employeeSelect }>;

export type PayrollEmployeeResult = {
    employee: PayrollEmployeeSource;
    calculation: PayrollPeriodCalculation;
    attendance: Prisma.AttendanceGetPayload<Record<string, never>>[];
    overrides: Prisma.DailyPayrollOverrideGetPayload<Record<string, never>>[];
    specialIncomes: Prisma.SpecialIncomeGetPayload<Record<string, never>>[];
    advances: Prisma.AdvanceGetPayload<Record<string, never>>[];
};

export type PayrollLoadResult = {
    employees: PayrollEmployeeResult[];
    ssoRate: number;
    ssoMax: number;
    start: Date;
    end: Date;
};

function safeConfigNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function loadPayrollCalculations(
    filters: PayrollLoadFilters,
    database: PayrollDb = prisma as unknown as PayrollDb,
): Promise<PayrollLoadResult> {
    const start = parseDateStringToBangkokMidnight(filters.startDate);
    const endMidnight = parseDateStringToBangkokMidnight(filters.endDate);
    const end = new Date(endMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);
    const employeeWhere: Prisma.UserWhereInput = {
        isActive: true,
        role: { in: [...PAYROLL_ELIGIBLE_ROLES] },
    };
    if (filters.stationId && filters.stationId !== "all") employeeWhere.stationId = filters.stationId;
    if (filters.departmentId && filters.departmentId !== "all") employeeWhere.departmentId = filters.departmentId;
    if (filters.userId) employeeWhere.id = filters.userId;

    const [employees, configs] = await Promise.all([
        database.user.findMany({
            where: employeeWhere,
            select: employeeSelect,
            orderBy: [{ name: "asc" }, { id: "asc" }],
        }),
        database.systemConfig.findMany({
            where: { key: { in: ["social_security_rate", "social_security_max"] } },
            select: { key: true, value: true },
        }),
    ]);

    const configMap = new Map(configs.map((config) => [config.key, config.value]));
    const ssoRate = safeConfigNumber(configMap.get("social_security_rate"), DEFAULT_SSO_RATE);
    const configuredSsoMax = safeConfigNumber(configMap.get("social_security_max"), DEFAULT_SSO_MAX);
    const ssoMax = Math.max(configuredSsoMax, DEFAULT_SSO_MAX);
    const employeeIds = employees.map((employee) => employee.id);

    if (employeeIds.length === 0) return { employees: [], ssoRate, ssoMax, start, end };

    const advanceMonth = Number(filters.endDate.split("-")[1]);
    const advanceYear = Number(filters.endDate.split("-")[0]);
    const [attendance, overrides, advances, specialIncomes] = await Promise.all([
        database.attendance.findMany({
            where: {
                userId: { in: employeeIds },
                status: "APPROVED",
                date: { gte: start, lte: end },
            },
            orderBy: [{ date: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        }),
        database.dailyPayrollOverride.findMany({
            where: { userId: { in: employeeIds }, date: { gte: start, lte: end } },
            orderBy: [{ date: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        }),
        database.advance.findMany({
            where: {
                userId: { in: employeeIds },
                status: { in: ["APPROVED", "PAID"] },
                month: advanceMonth,
                year: advanceYear,
            },
            orderBy: [{ date: "asc" }, { id: "asc" }],
        }),
        database.specialIncome.findMany({
            where: { userId: { in: employeeIds }, date: { gte: start, lte: end } },
            orderBy: [{ date: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
        }),
    ]);

    const byUser = <T extends { userId: string }>(records: T[]): Map<string, T[]> => {
        const result = new Map<string, T[]>();
        for (const record of records) {
            const userRecords = result.get(record.userId) || [];
            userRecords.push(record);
            result.set(record.userId, userRecords);
        }
        return result;
    };
    const attendanceByUser = byUser(attendance);
    const overridesByUser = byUser(overrides);
    const advancesByUser = byUser(advances);
    const specialIncomesByUser = byUser(specialIncomes);

    return {
        employees: employees.map((employee) => {
            const employeeAttendance = attendanceByUser.get(employee.id) || [];
            const employeeOverrides = overridesByUser.get(employee.id) || [];
            const employeeAdvances = advancesByUser.get(employee.id) || [];
            const employeeSpecialIncomes = specialIncomesByUser.get(employee.id) || [];
            const calculation = calculatePayrollPeriod({
                startDate: filters.startDate,
                endDate: filters.endDate,
                dailyRate: employee.dailyRate,
                stationCode: employee.station?.code || null,
                probationDailyRate: employee.probationDailyRate,
                probationEndDate: employee.probationEndDate,
                isSocialSecurityRegistered: employee.isSocialSecurityRegistered,
                legacyOtherDeduction: employee.otherExpenses,
                attendance: employeeAttendance,
                overrides: employeeOverrides,
                advances: employeeAdvances.map((advance) => advance.amount),
                specialIncomes: employeeSpecialIncomes,
                ssoRate,
                ssoMax,
            });
            return {
                employee,
                calculation,
                attendance: employeeAttendance,
                overrides: employeeOverrides,
                specialIncomes: employeeSpecialIncomes,
                advances: employeeAdvances,
            };
        }),
        ssoRate,
        ssoMax,
        start,
        end,
    };
}

export function summarizePayroll(results: PayrollEmployeeResult[]) {
    const active = results.filter((result) => result.calculation.hasPayrollActivity);
    const sum = (selector: (calculation: PayrollPeriodCalculation) => number) =>
        roundMoney(active.reduce((total, result) => total + selector(result.calculation), 0));

    return {
        totalEmployees: active.length,
        totalWorkDays: sum((calculation) => calculation.workDays),
        totalHours: sum((calculation) => calculation.totalHours),
        totalRegularPay: sum((calculation) => calculation.regularPay),
        totalOvertimePay: sum((calculation) => calculation.overtimePay),
        totalAdjustment: sum((calculation) => calculation.adjustment),
        totalSpecialIncome: sum((calculation) => calculation.specialIncome),
        totalLatePenalty: sum((calculation) => calculation.latePenalty),
        totalEarlyLeavePenalty: sum((calculation) => calculation.earlyLeavePenalty),
        totalAdvanceDeduction: sum((calculation) => calculation.advanceDeduction),
        totalOtherExpenses: sum((calculation) => calculation.otherExpenses),
        totalSocialSecurity: sum((calculation) => calculation.socialSecurity),
        totalDeductions: sum((calculation) => calculation.totalDeductions),
        grandTotal: sum((calculation) => calculation.totalPay),
    };
}
