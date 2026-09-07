import { MIN_STATION_COMPARE_SAMPLE, summarizeRatings } from "./metrics";

export const STATION_SCORE_MINIMUM_SAMPLE = MIN_STATION_COMPARE_SAMPLE;
export const STATION_SCORE_TOTAL = 100;

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * คะแนนภาพรวมปั๊มใช้ station-v1 overall rating เท่านั้น เพราะ survey รุ่นนี้ไม่มี checklist.
 * แปลง 1–5 เป็น 0–100 (1 = 0, 5 = 100) และรอ sample ขั้นต่ำของการเปรียบเทียบสถานี.
 */
export function summarizeStationScore(ratings: number[]) {
    const summary = summarizeRatings(ratings);
    const meetsMinimumSample = summary.count >= STATION_SCORE_MINIMUM_SAMPLE;
    const score = meetsMinimumSample && summary.average !== null
        ? round2(((summary.average - 1) / 4) * STATION_SCORE_TOTAL)
        : null;

    return {
        score,
        responseCount: summary.count,
        minimumSample: STATION_SCORE_MINIMUM_SAMPLE,
        meetsMinimumSample,
        averageRating: summary.average === null ? null : round2(summary.average),
        positiveRate: summary.positiveRate === null ? null : round2(summary.positiveRate),
        totalPoints: STATION_SCORE_TOTAL,
    };
}
