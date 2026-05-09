export interface FuelHourlyProductivity {
    hour_block: number;
    workers: number;
    txCount: number;
    txPerWorker: number;
}

export interface FuelTodayStation {
    stationId: number;
    name: string;
    totalWorkers: number;
    txCount: number;
    txPerWorker: number;
    shift: {
        workers: number;
        scheduled: number;
        forecourt: number;
        workingNow: number;
    } | null;
    hourlyProductivity: FuelHourlyProductivity[];
    lastSyncAt: string | null;
}

export interface FuelStationTrend {
    stationId: number;
    name: string;
    avgWorkers: number;
    avgTxCount: number;
    avgTxPerWorker: number;
}

export interface FuelLaborAnalytics {
    success: boolean;
    date: string;
    today: {
        stations: FuelTodayStation[];
        crossBranch?: {
            avgTxPerWorker?: number;
        };
    };
    trends: {
        days: number;
        byStation: FuelStationTrend[];
    };
    recommendations?: Array<{
        type: string;
        station: string;
        stationId: number;
        context: string;
        message: string;
        severity: string;
    }>;
}

export type FuelLaborAnalyticsResult =
    | { ok: true; data: FuelLaborAnalytics; url: string }
    | { ok: false; error: string; url: string | null };

interface TimetrackStationLike {
    code: string;
    name: string;
}

function normalizeStationText(value: string): string {
    return value
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[()._-]/g, "");
}

function isFuelLaborAnalytics(value: unknown): value is FuelLaborAnalytics {
    if (!value || typeof value !== "object") return false;

    const record = value as Partial<FuelLaborAnalytics>;
    return (
        record.success === true &&
        typeof record.date === "string" &&
        !!record.today &&
        Array.isArray(record.today.stations) &&
        !!record.trends &&
        Array.isArray(record.trends.byStation)
    );
}

export async function fetchFuelLaborAnalytics(days: number): Promise<FuelLaborAnalyticsResult> {
    const baseUrl = process.env.FUEL_STATION_BASE_URL || process.env.NEXT_PUBLIC_FUEL_STATION_BASE_URL;

    if (!baseUrl) {
        return {
            ok: false,
            error: "ยังไม่ได้ตั้งค่า FUEL_STATION_BASE_URL",
            url: null,
        };
    }

    const url = new URL("/api/labor-analytics", baseUrl);
    url.searchParams.set("days", String(days));

    const headers: HeadersInit = { Accept: "application/json" };
    const apiKey = process.env.FUEL_STATION_API_KEY;
    const cronSecret = process.env.CRON_SECRET;

    if (apiKey) {
        headers["x-fuel-station-api-key"] = apiKey;
    } else if (cronSecret) {
        headers.Authorization = `Bearer ${cronSecret}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
        const response = await fetch(url.toString(), {
            headers,
            cache: "no-store",
            signal: controller.signal,
        });

        if (!response.ok) {
            return {
                ok: false,
                error: `fuel-station ตอบกลับ ${response.status}`,
                url: url.toString(),
            };
        }

        const data: unknown = await response.json();

        if (!isFuelLaborAnalytics(data)) {
            return {
                ok: false,
                error: "รูปแบบข้อมูลจาก fuel-station ยังไม่ตรง",
                url: url.toString(),
            };
        }

        return { ok: true, data, url: url.toString() };
    } catch (error) {
        const message = error instanceof Error ? error.message : "เรียก fuel-station ไม่สำเร็จ";
        return { ok: false, error: message, url: url.toString() };
    } finally {
        clearTimeout(timeout);
    }
}

export function findFuelStationMatch(station: TimetrackStationLike, data: FuelLaborAnalytics) {
    const todayStations = data.today.stations;
    const trendStations = data.trends.byStation;
    const numericCode = Number(station.code);

    if (Number.isFinite(numericCode)) {
        const byId = todayStations.find((item) => item.stationId === numericCode)
            ?? trendStations.find((item) => item.stationId === numericCode);

        if (byId) return byId;
    }

    const stationName = normalizeStationText(station.name);
    const stationCode = normalizeStationText(station.code);
    const allStations = [...todayStations, ...trendStations];

    return allStations.find((item) => {
        const fuelName = normalizeStationText(item.name);
        return (
            fuelName === stationName ||
            fuelName === stationCode ||
            fuelName.includes(stationName) ||
            stationName.includes(fuelName)
        );
    }) ?? null;
}
