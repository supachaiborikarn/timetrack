export const DEFAULT_BREAK_MINUTES = 60;
export const BREAK_GRACE_MINUTES = 5;

const STATION_BREAK_MINUTES: Record<string, number> = {
    WKO: 90,
    PAP: 90,
    PAP_GAS: 90,
    SPC: 60,
    SPC_GAS: 60,
};

export function resolveAllowedBreakMinutes(
    stationCode?: string | null,
    shiftBreakMinutes?: number | null,
): number {
    if (stationCode && STATION_BREAK_MINUTES[stationCode]) return STATION_BREAK_MINUTES[stationCode];
    if (shiftBreakMinutes == null) return DEFAULT_BREAK_MINUTES;
    const parsed = Number(shiftBreakMinutes);
    if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_BREAK_MINUTES;
    return Math.round(parsed);
}

export function calculateBreakOverageMinutes(
    durationMinutes: number | null | undefined,
    allowedMinutes: number,
    graceMinutes = BREAK_GRACE_MINUTES,
): number {
    const duration = Math.max(0, Math.round(Number(durationMinutes) || 0));
    const allowance = Math.max(0, Math.round(Number(allowedMinutes) || 0));
    const grace = Math.max(0, Math.round(Number(graceMinutes) || 0));
    return Math.max(0, duration - allowance - grace);
}

export function calculateBreakPenaltyAmount(input: {
    durationMinutes: number | null | undefined;
    allowedMinutes: number;
    hourlyRate: number | string | { toString(): string } | null | undefined;
}): number {
    if (calculateBreakOverageMinutes(input.durationMinutes, input.allowedMinutes) <= 0) return 0;
    const hourlyRate = Number(input.hourlyRate ?? 0);
    return Number.isFinite(hourlyRate) ? Math.max(0, hourlyRate) : 0;
}
