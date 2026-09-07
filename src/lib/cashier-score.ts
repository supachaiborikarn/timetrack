export const FUEL_CASHIER_SCORE_WEIGHTS = {
    teamPerformance: 60,
    stationQuality: 20,
    restroomQuality: 20,
} as const;

export const FUEL_CASHIER_SCORE_TOTAL = 100;

function round1(value: number): number {
    return Math.round((value + Number.EPSILON) * 10) / 10;
}

function normalize100(value: number | null | undefined): number | null {
    if (value == null || !Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
}

export function calculateCompleteTeamPerformanceScore(memberScores: Array<number | null>): number | null {
    if (memberScores.length === 0) return null;
    const ready = memberScores.filter((value): value is number => value != null && Number.isFinite(value));
    if (ready.length !== memberScores.length) return null;
    return round1(ready.reduce((sum, value) => sum + Math.max(0, Math.min(100, value)), 0) / ready.length);
}

export function calculateFuelCashierScore(input: {
    teamPerformanceScore?: number | null;
    stationScore?: number | null;
    restroomScore?: number | null;
}) {
    const teamPerformanceScore = normalize100(input.teamPerformanceScore);
    const stationScore = normalize100(input.stationScore);
    const restroomScore = normalize100(input.restroomScore);

    const components = {
        teamPerformance: teamPerformanceScore === null ? null : round1(teamPerformanceScore * 0.60),
        stationQuality: stationScore === null ? null : round1(stationScore * 0.20),
        restroomQuality: restroomScore === null ? null : round1(restroomScore * 0.20),
    };
    const readyEntries = Object.entries(components).filter((entry): entry is [keyof typeof components, number] => entry[1] !== null);
    const knownWeight = readyEntries.reduce((sum, [key]) => sum + FUEL_CASHIER_SCORE_WEIGHTS[key], 0);
    const knownPoints = round1(readyEntries.reduce((sum, [, points]) => sum + points, 0));
    const score = knownWeight === FUEL_CASHIER_SCORE_TOTAL ? knownPoints : null;
    const forecastScore = knownWeight > 0 ? round1((knownPoints / knownWeight) * 100) : null;

    return {
        score,
        forecastScore,
        knownPoints,
        knownWeight,
        isProvisional: score === null,
        sourceScores: { teamPerformanceScore, stationScore, restroomScore },
        points: components,
    };
}
