import { prisma } from "@/lib/prisma";
import { rewardOptionsForAwardType } from "@/lib/competition/league";

export type ConfigurableChampionshipAwardType = "MONTHLY_STATION_CHAMPION" | "GRAND_CHAMPION";
export type ChampionshipAwardType = "WEEKLY_CHAMPION" | ConfigurableChampionshipAwardType;

export type ChampionshipRewardOption = {
    code: string;
    label: string;
    description: string;
    valueBaht: number;
};

const CONFIG_PREFIX = "competition.championship-reward-options.v1";
const MAX_REWARD_OPTIONS = 3;

export function championshipRewardConfigKey(type: ConfigurableChampionshipAwardType, periodKey: string) {
    return `${CONFIG_PREFIX}.${periodKey}.${type}`;
}

function defaultsFor(type: ChampionshipAwardType): ChampionshipRewardOption[] {
    return rewardOptionsForAwardType(type).map((option) => ({ ...option }));
}

function isSafePeriodKey(periodKey: string) {
    return /^\d{4}-\d{2}$/.test(periodKey);
}

function parseStoredOptions(raw: string): ChampionshipRewardOption[] | null {
    try {
        const parsed = JSON.parse(raw) as unknown;
        return normalizeChampionshipRewardOptions(parsed);
    } catch {
        return null;
    }
}

export function normalizeChampionshipRewardOptions(input: unknown): ChampionshipRewardOption[] | null {
    if (!Array.isArray(input) || input.length < 1 || input.length > MAX_REWARD_OPTIONS) return null;

    const options: ChampionshipRewardOption[] = [];
    for (let index = 0; index < input.length; index += 1) {
        const candidate = input[index];
        if (!candidate || typeof candidate !== "object") return null;
        const row = candidate as Record<string, unknown>;
        const label = typeof row.label === "string" ? row.label.trim() : "";
        const description = typeof row.description === "string" ? row.description.trim() : "";
        const value = typeof row.valueBaht === "number" ? row.valueBaht : Number(row.valueBaht);
        if (!label || label.length > 120 || description.length > 300 || !Number.isFinite(value) || value < 0 || value > 100000) {
            return null;
        }
        options.push({
            code: `ADMIN_OPTION_${index + 1}`,
            label,
            description,
            valueBaht: Math.round(value),
        });
    }
    return options;
}

export async function getChampionshipRewardOptions(type: ChampionshipAwardType, periodKey: string): Promise<ChampionshipRewardOption[]> {
    if (type === "WEEKLY_CHAMPION" || !isSafePeriodKey(periodKey)) return defaultsFor(type);

    const record = await prisma.systemConfig?.findUnique({
        where: { key: championshipRewardConfigKey(type, periodKey) },
        select: { value: true },
    });
    if (!record) return defaultsFor(type);
    return parseStoredOptions(record.value) ?? defaultsFor(type);
}

export async function saveChampionshipRewardOptions(params: {
    type: ConfigurableChampionshipAwardType;
    periodKey: string;
    options: ChampionshipRewardOption[];
}) {
    if (!isSafePeriodKey(params.periodKey)) throw new Error("Invalid championship period key");
    const normalized = normalizeChampionshipRewardOptions(params.options);
    if (!normalized) throw new Error("Invalid championship reward options");

    return prisma.systemConfig.upsert({
        where: { key: championshipRewardConfigKey(params.type, params.periodKey) },
        update: { value: JSON.stringify(normalized) },
        create: {
            key: championshipRewardConfigKey(params.type, params.periodKey),
            value: JSON.stringify(normalized),
        },
        select: { key: true, value: true, updatedAt: true },
    });
}
