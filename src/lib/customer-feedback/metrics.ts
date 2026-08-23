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
    let sum = 0;
    let positive = 0;
    let negative = 0;
    for (const r of ratings) {
        if (r < 1 || r > 5 || !Number.isInteger(r)) continue;
        distribution[r as 1 | 2 | 3 | 4 | 5]++;
        sum += r;
        if (r >= 4) positive++;
        if (r <= 2) negative++;
    }
    const count = Object.values(distribution).reduce((a, b) => a + b, 0);
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
