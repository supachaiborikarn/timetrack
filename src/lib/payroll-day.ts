export const FULL_DAY_MIN_HOURS = 10;
export const HALF_DAY_MIN_HOURS = 5;

type PayrollDayInput = {
    hasCheckIn: boolean;
    actualHours: number | null | undefined;
    dailyRate: number;
    overrideDailyWage?: number | string | null;
};

type PayrollDayResult = {
    dayFactor: number;
    dailyWage: number;
};

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

function roundWorkDays(value: number): number {
    return Math.round(value * 100) / 100;
}

export function calculatePayrollDay(input: PayrollDayInput): PayrollDayResult {
    const dailyRate = Number(input.dailyRate) || 0;

    if (input.overrideDailyWage != null) {
        const dailyWage = Math.max(0, Number(input.overrideDailyWage) || 0);
        const dayFactor = dailyRate > 0
            ? Math.min(dailyWage / dailyRate, 1)
            : (dailyWage > 0 ? 1 : 0);

        return {
            dayFactor: roundWorkDays(dayFactor),
            dailyWage: roundMoney(dailyWage),
        };
    }

    if (!input.hasCheckIn || input.actualHours == null) {
        return { dayFactor: 0, dailyWage: 0 };
    }

    if (input.actualHours >= FULL_DAY_MIN_HOURS) {
        return { dayFactor: 1, dailyWage: roundMoney(dailyRate) };
    }

    if (input.actualHours >= HALF_DAY_MIN_HOURS) {
        return { dayFactor: 0.5, dailyWage: roundMoney(dailyRate * 0.5) };
    }

    return { dayFactor: 0, dailyWage: 0 };
}

export function formatWorkDays(value: number | string | null | undefined): string {
    const numericValue = Number(value) || 0;
    if (Number.isInteger(numericValue)) return numericValue.toString();
    return numericValue.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function countWorkDayTypes(records: { dayFactor: number }[]): {
    fullDayCount: number;
    halfDayCount: number;
} {
    return records.reduce(
        (counts, record) => {
            if (record.dayFactor >= 1) counts.fullDayCount += 1;
            else if (record.dayFactor === 0.5) counts.halfDayCount += 1;
            return counts;
        },
        { fullDayCount: 0, halfDayCount: 0 }
    );
}
