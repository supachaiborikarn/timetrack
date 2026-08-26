export const STATION_TIME_PAY_EFFECTIVE_DATE = "2026-08-26";

export type StationTimePayRule = {
    thresholdHours: number;
    overtimeRate: number;
    earlyLeavePenalty: number;
};

export type StationTimePayResult = {
    thresholdHours: number | null;
    overtimeHours: number;
    overtimePay: number;
    earlyLeavePenalty: number;
};

const STATION_TIME_PAY_RULES: Record<string, StationTimePayRule> = {
    WKO: { thresholdHours: 10.5, overtimeRate: 35, earlyLeavePenalty: 50 },
    PAP: { thresholdHours: 10.5, overtimeRate: 35, earlyLeavePenalty: 50 },
    PAP_GAS: { thresholdHours: 10.5, overtimeRate: 35, earlyLeavePenalty: 50 },
    SPC: { thresholdHours: 11, overtimeRate: 35, earlyLeavePenalty: 50 },
    SPC_GAS: { thresholdHours: 11, overtimeRate: 35, earlyLeavePenalty: 50 },
};

function roundToSatang(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getStationTimePayRule(stationCode: string | null | undefined): StationTimePayRule | null {
    if (!stationCode) return null;
    return STATION_TIME_PAY_RULES[stationCode] || null;
}

export function calculateStationTimePay(input: {
    dateKey: string;
    stationCode: string | null | undefined;
    actualHours: number | null | undefined;
    hasCompletedShift: boolean;
}): StationTimePayResult {
    const rule = getStationTimePayRule(input.stationCode);
    if (
        input.dateKey < STATION_TIME_PAY_EFFECTIVE_DATE ||
        !rule ||
        !input.hasCompletedShift ||
        input.actualHours == null ||
        !Number.isFinite(input.actualHours)
    ) {
        return { thresholdHours: null, overtimeHours: 0, overtimePay: 0, earlyLeavePenalty: 0 };
    }

    const actualHours = Math.max(0, input.actualHours);
    if (actualHours > rule.thresholdHours) {
        const overtimeHours = roundToSatang(actualHours - rule.thresholdHours);
        return {
            thresholdHours: rule.thresholdHours,
            overtimeHours,
            overtimePay: roundToSatang(overtimeHours * rule.overtimeRate),
            earlyLeavePenalty: 0,
        };
    }

    if (actualHours < rule.thresholdHours) {
        return {
            thresholdHours: rule.thresholdHours,
            overtimeHours: 0,
            overtimePay: 0,
            earlyLeavePenalty: rule.earlyLeavePenalty,
        };
    }

    return { thresholdHours: rule.thresholdHours, overtimeHours: 0, overtimePay: 0, earlyLeavePenalty: 0 };
}
