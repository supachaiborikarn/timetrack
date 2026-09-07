export const cashierOverrideKey = (stationId: string, week: string) => `cashier-quality:${stationId}:${week}`;
export type QualityOverride = { station: number | null; restroom: number | null; updatedBy?: string };

export function resolveCashierQuality(customerScore: number | null, responseCount: number, manual: number | null, initialWeek: boolean) {
    // The owner granted full quality points for this historical week only.
    if (initialWeek) return { score: manual ?? 100, source: manual === null ? "INITIAL_GRANT" : "ADMIN" };
    if (responseCount > 0) return { score: customerScore, source: "CUSTOMER" };
    return { score: manual, source: manual === null ? "MISSING" : "ADMIN" };
}

