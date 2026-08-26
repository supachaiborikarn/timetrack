import { calculatePayrollDay } from "@/lib/payroll-day";
import { calculateStationTimePay } from "@/lib/station-pay-rules";

export const PAYROLL_ELIGIBLE_ROLES = ["EMPLOYEE", "CASHIER", "MANAGER", "HR"] as const;
export const DEFAULT_SSO_RATE = 0.05;
export const DEFAULT_SSO_MAX = 875;

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const APPROVED_INCOME_STATUSES = new Set(["APPROVED", "PAID"]);

type NumericLike = number | string | null | undefined | { toString(): string };

export type PayrollAttendanceInput = {
    id?: string;
    date: Date;
    status: string;
    checkInTime: Date | null;
    checkOutTime?: Date | null;
    actualHours: NumericLike;
    lateMinutes?: number | null;
    latePenaltyAmount?: NumericLike;
    overtimeHours?: NumericLike;
    breakDurationMinutes?: number | null;
    updatedAt?: Date;
};

export type PayrollOverrideInput = {
    id?: string;
    date: Date;
    overrideDailyWage?: NumericLike;
    overrideOT?: NumericLike;
    overrideLatePenalty?: NumericLike;
    adjustment?: NumericLike;
    otherDeduction?: NumericLike;
    note?: string | null;
    updatedAt?: Date;
};

export type PayrollSpecialIncomeInput = {
    id?: string;
    date: Date;
    amount: NumericLike;
    status: string;
    type?: string;
    description?: string | null;
    salesAmount?: NumericLike;
    percentage?: NumericLike;
};

export type PayrollDailyCalculation = {
    date: string;
    attendance: PayrollAttendanceInput | null;
    override: PayrollOverrideInput | null;
    specialIncomes: PayrollSpecialIncomeInput[];
    actualHours: number;
    overtimeHours: number;
    dayFactor: number;
    dailyWage: number;
    otAmount: number;
    latePenalty: number;
    earlyLeavePenalty: number;
    adjustment: number;
    specialIncome: number;
    otherDeduction: number;
    total: number;
};

export type PayrollPeriodCalculation = {
    dailyRecords: PayrollDailyCalculation[];
    workDays: number;
    fullDayCount: number;
    halfDayCount: number;
    totalHours: number;
    regularPay: number;
    overtimePay: number;
    latePenalty: number;
    earlyLeavePenalty: number;
    advanceDeduction: number;
    otherExpenses: number;
    socialSecurity: number;
    adjustment: number;
    specialIncome: number;
    totalEarnings: number;
    totalDeductions: number;
    totalPay: number;
    hasPayrollActivity: boolean;
};

type CalculatePayrollPeriodInput = {
    startDate: string;
    endDate: string;
    dailyRate: NumericLike;
    stationCode?: string | null;
    /**
     * Daily rate for days on or before `probationEndDate`. Both must be present for the
     * probation rate to apply; if either is missing, `dailyRate` is used for every day,
     * which is exactly how this function behaved before probation rates existed.
     */
    probationDailyRate?: NumericLike | null;
    /** Last day (inclusive) paid at `probationDailyRate`, as a Bangkok-date key or Date. */
    probationEndDate?: Date | string | null;
    isSocialSecurityRegistered: boolean;
    legacyOtherDeduction?: NumericLike;
    attendance: PayrollAttendanceInput[];
    overrides: PayrollOverrideInput[];
    advances?: NumericLike[];
    specialIncomes?: PayrollSpecialIncomeInput[];
    ssoRate?: number;
    ssoMax?: number;
};

export function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toBangkokDateKey(date: Date): string {
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().split("T")[0];
}

export function isOtSuppressedPeriod(startDate: string, endDate: string): boolean {
    return startDate === "2026-03-26" && endDate === "2026-04-25";
}

function toNumber(value: NumericLike): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
}

function compareSourceRecords(
    a: { date: Date; updatedAt?: Date; id?: string },
    b: { date: Date; updatedAt?: Date; id?: string },
): number {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    const updatedDiff = (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
    if (updatedDiff !== 0) return updatedDiff;
    return (a.id || "").localeCompare(b.id || "");
}

export function selectApprovedAttendanceByBangkokDate(
    attendance: PayrollAttendanceInput[],
): Map<string, PayrollAttendanceInput> {
    const result = new Map<string, PayrollAttendanceInput>();
    const approved = attendance
        .filter((record) => record.status === "APPROVED")
        .sort(compareSourceRecords);

    for (const record of approved) {
        const dateKey = toBangkokDateKey(record.date);
        if (!result.has(dateKey)) result.set(dateKey, record);
    }
    return result;
}

export function selectLatestOverrideByBangkokDate(
    overrides: PayrollOverrideInput[],
): Map<string, PayrollOverrideInput> {
    const result = new Map<string, PayrollOverrideInput>();
    const sorted = [...overrides].sort(compareSourceRecords);

    for (const override of sorted) {
        const dateKey = toBangkokDateKey(override.date);
        const existing = result.get(dateKey);
        if (!existing || (override.updatedAt?.getTime() ?? 0) > (existing.updatedAt?.getTime() ?? 0)) {
            result.set(dateKey, override);
        }
    }
    return result;
}

/**
 * Resolves the probation rate into `{ rate, lastDateKey }`, or null when no probation rate
 * applies. Requires BOTH a rate and an end date — a rate with no end date has no window to
 * apply to, and an end date with no rate means the employer didn't set a different probation
 * wage, so the normal daily rate stands for the whole period.
 */
function resolveProbationRate(input: CalculatePayrollPeriodInput): { rate: number; lastDateKey: string } | null {
    if (input.probationDailyRate == null || input.probationEndDate == null) return null;

    const lastDateKey = typeof input.probationEndDate === "string"
        ? input.probationEndDate.slice(0, 10)
        : toBangkokDateKey(input.probationEndDate);
    if (!lastDateKey) return null;

    return { rate: Math.max(0, toNumber(input.probationDailyRate)), lastDateKey };
}

export function calculatePayrollPeriod(input: CalculatePayrollPeriodInput): PayrollPeriodCalculation {
    const dailyRate = Math.max(0, toNumber(input.dailyRate));
    const probationRate = resolveProbationRate(input);
    const attendanceByDate = selectApprovedAttendanceByBangkokDate(input.attendance);
    const overridesByDate = selectLatestOverrideByBangkokDate(input.overrides);
    const specialIncomes = input.specialIncomes || [];
    const specialIncomesByDate = new Map<string, PayrollSpecialIncomeInput[]>();

    for (const income of specialIncomes) {
        const dateKey = toBangkokDateKey(income.date);
        const records = specialIncomesByDate.get(dateKey) || [];
        records.push(income);
        specialIncomesByDate.set(dateKey, records);
    }

    const dateKeys = new Set<string>([
        ...attendanceByDate.keys(),
        ...overridesByDate.keys(),
        ...specialIncomesByDate.keys(),
    ]);
    const suppressOt = isOtSuppressedPeriod(input.startDate, input.endDate);

    const dailyRecords = [...dateKeys]
        .filter((dateKey) => dateKey >= input.startDate && dateKey <= input.endDate)
        .sort()
        .map((dateKey): PayrollDailyCalculation => {
            const attendanceRecord = attendanceByDate.get(dateKey) || null;
            const override = overridesByDate.get(dateKey) || null;
            const daySpecialIncomes = specialIncomesByDate.get(dateKey) || [];
            const hasCheckIn = !!attendanceRecord?.checkInTime;
            const hasCompletedShift = hasCheckIn && !!attendanceRecord?.checkOutTime && attendanceRecord?.actualHours != null;
            const actualHours = hasCheckIn ? Math.max(0, toNumber(attendanceRecord?.actualHours)) : 0;
            const stationTimePay = calculateStationTimePay({
                dateKey,
                stationCode: input.stationCode,
                actualHours: hasCompletedShift ? actualHours : null,
                hasCompletedShift,
            });
            const overtimeHours = stationTimePay.thresholdHours != null
                ? stationTimePay.overtimeHours
                : (hasCheckIn ? Math.max(0, toNumber(attendanceRecord?.overtimeHours)) : 0);
            // Days up to and including the probation end date are paid at the probation rate.
            const rateForDay = probationRate && dateKey <= probationRate.lastDateKey
                ? probationRate.rate
                : dailyRate;
            const day = calculatePayrollDay({
                hasCheckIn: !!attendanceRecord?.checkInTime,
                actualHours: attendanceRecord?.checkInTime ? actualHours : null,
                dailyRate: rateForDay,
                overrideDailyWage: override?.overrideDailyWage?.toString() ?? null,
            });
            const latePenalty = Math.max(0, override?.overrideLatePenalty != null
                ? toNumber(override.overrideLatePenalty)
                : toNumber(attendanceRecord?.latePenaltyAmount));
            const otAmount = suppressOt
                ? 0
                : Math.max(0, override?.overrideOT != null
                    ? toNumber(override.overrideOT)
                    : stationTimePay.overtimePay);
            const earlyLeavePenalty = stationTimePay.earlyLeavePenalty;
            const adjustment = toNumber(override?.adjustment);
            const otherDeduction = override?.otherDeduction == null
                ? 0
                : Math.max(0, toNumber(override.otherDeduction));
            const specialIncome = daySpecialIncomes
                .filter((income) => APPROVED_INCOME_STATUSES.has(income.status))
                .reduce((sum, income) => sum + Math.max(0, toNumber(income.amount)), 0);

            return {
                date: dateKey,
                attendance: attendanceRecord,
                override,
                specialIncomes: daySpecialIncomes,
                actualHours: roundMoney(actualHours),
                overtimeHours: roundMoney(overtimeHours),
                dayFactor: day.dayFactor,
                dailyWage: day.dailyWage,
                otAmount: roundMoney(otAmount),
                latePenalty: roundMoney(latePenalty),
                earlyLeavePenalty: roundMoney(earlyLeavePenalty),
                adjustment: roundMoney(adjustment),
                specialIncome: roundMoney(specialIncome),
                otherDeduction: roundMoney(otherDeduction),
                total: roundMoney(day.dailyWage + otAmount + adjustment + specialIncome - latePenalty - earlyLeavePenalty - otherDeduction),
            };
        });

    const sum = (selector: (record: PayrollDailyCalculation) => number) =>
        roundMoney(dailyRecords.reduce((total, record) => total + selector(record), 0));
    const workDays = roundMoney(dailyRecords.reduce((total, record) => total + record.dayFactor, 0));
    const regularPay = sum((record) => record.dailyWage);
    const overtimePay = sum((record) => record.otAmount);
    const latePenalty = sum((record) => record.latePenalty);
    const earlyLeavePenalty = sum((record) => record.earlyLeavePenalty);
    const adjustment = sum((record) => record.adjustment);
    const specialIncome = sum((record) => record.specialIncome);
    const hasPeriodOtherDeduction = input.overrides.some((override) =>
        toBangkokDateKey(override.date) >= input.startDate &&
        toBangkokDateKey(override.date) <= input.endDate &&
        override.otherDeduction != null
    );
    const otherExpenses = hasPeriodOtherDeduction
        ? sum((record) => record.otherDeduction)
        : roundMoney(Math.max(0, toNumber(input.legacyOtherDeduction)));
    const advanceDeduction = roundMoney((input.advances || []).reduce<number>(
        (total, amount) => total + Math.max(0, toNumber(amount)),
        0,
    ));
    const ssoRate = Number.isFinite(input.ssoRate) ? Math.max(0, input.ssoRate ?? DEFAULT_SSO_RATE) : DEFAULT_SSO_RATE;
    const ssoMax = Number.isFinite(input.ssoMax) ? Math.max(0, input.ssoMax ?? DEFAULT_SSO_MAX) : DEFAULT_SSO_MAX;
    const socialSecurity = input.isSocialSecurityRegistered
        ? roundMoney(Math.min(regularPay * ssoRate, ssoMax))
        : 0;
    const totalEarnings = roundMoney(regularPay + overtimePay + adjustment + specialIncome);
    const totalDeductions = roundMoney(latePenalty + earlyLeavePenalty + advanceDeduction + otherExpenses + socialSecurity);
    const totalPay = roundMoney(totalEarnings - totalDeductions);

    return {
        dailyRecords,
        workDays,
        fullDayCount: dailyRecords.filter((record) => record.dayFactor >= 1).length,
        halfDayCount: dailyRecords.filter((record) => record.dayFactor === 0.5).length,
        totalHours: sum((record) => record.actualHours),
        regularPay,
        overtimePay,
        latePenalty,
        earlyLeavePenalty,
        advanceDeduction,
        otherExpenses,
        socialSecurity,
        adjustment,
        specialIncome,
        totalEarnings,
        totalDeductions,
        totalPay,
        hasPayrollActivity: workDays > 0 || totalEarnings !== 0 || totalDeductions !== 0,
    };
}
