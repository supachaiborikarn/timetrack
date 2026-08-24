/**
 * KPI definitions ของระบบเสียงลูกค้า — pure functions (§18)
 *
 * valid response = STANDARD + overallRating มีค่า + validity VALID
 * positive = 4–5, negative = 1–2
 * minimum sample รายคน = 10
 */

export const MIN_EMPLOYEE_SAMPLE = 10;
export const MIN_STATION_COMPARE_SAMPLE = 20;

export interface RatingSummary {
    count: number;
    average: number | null;
    positiveRate: number | null;
    negativeRate: number | null;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function summarizeRatings(ratings: number[]): RatingSummary {
    const distribution: RatingSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
        if (r < 1 || r > 5 || !Number.isInteger(r)) continue;
        distribution[r as 1 | 2 | 3 | 4 | 5]++;
    }
    return summarizeRatingDistribution(distribution);
}

export function summarizeRatingDistribution(
    input: Partial<Record<1 | 2 | 3 | 4 | 5, number>>
): RatingSummary {
    const distribution: RatingSummary["distribution"] = {
        1: Math.max(0, Math.trunc(input[1] ?? 0)),
        2: Math.max(0, Math.trunc(input[2] ?? 0)),
        3: Math.max(0, Math.trunc(input[3] ?? 0)),
        4: Math.max(0, Math.trunc(input[4] ?? 0)),
        5: Math.max(0, Math.trunc(input[5] ?? 0)),
    };
    const count = Object.values(distribution).reduce((a, b) => a + b, 0);
    const sum = distribution[1] + distribution[2] * 2 + distribution[3] * 3 + distribution[4] * 4 + distribution[5] * 5;
    const positive = distribution[4] + distribution[5];
    const negative = distribution[1] + distribution[2];
    return {
        count,
        average: count > 0 ? sum / count : null,
        positiveRate: count > 0 ? (positive / count) * 100 : null,
        negativeRate: count > 0 ? (negative / count) * 100 : null,
        distribution,
    };
}

export function meetsMinimumSample(validCount: number, minimum: number = MIN_EMPLOYEE_SAMPLE): boolean {
    return validCount >= minimum;
}
