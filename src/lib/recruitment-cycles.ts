import { prisma } from "@/lib/prisma";

const CONFIG_KEY = "recruitment.application-cycles.v1";
const LEGACY_START = "1970-01-01T00:00:00.000Z";

export type RecruitmentCycle = {
    id: string;
    label: string;
    startedAt: string;
    closedAt: string | null;
};

export type RecruitmentCycleState = {
    cycles: RecruitmentCycle[];
    current: RecruitmentCycle;
};

function cycleId(date: Date) {
    return `cycle-${date.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

function defaultCycleLabel(date: Date) {
    return `รอบ ${new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date)}`;
}

function legacyState(): RecruitmentCycleState {
    const legacy: RecruitmentCycle = {
        id: "legacy",
        label: "ชุดเดิม",
        startedAt: LEGACY_START,
        closedAt: null,
    };
    return { cycles: [legacy], current: legacy };
}

function parseState(raw: string | null | undefined): RecruitmentCycleState {
    if (!raw) return legacyState();
    try {
        const parsed = JSON.parse(raw) as { cycles?: unknown };
        if (!Array.isArray(parsed.cycles) || parsed.cycles.length === 0) return legacyState();

        const cycles = parsed.cycles.flatMap((value): RecruitmentCycle[] => {
            if (!value || typeof value !== "object") return [];
            const row = value as Record<string, unknown>;
            if (
                typeof row.id !== "string"
                || typeof row.label !== "string"
                || typeof row.startedAt !== "string"
                || (row.closedAt !== null && typeof row.closedAt !== "string")
            ) return [];
            const startedAt = new Date(row.startedAt);
            const closedAt = row.closedAt ? new Date(row.closedAt) : null;
            if (Number.isNaN(startedAt.getTime()) || (closedAt && Number.isNaN(closedAt.getTime()))) return [];
            return [{
                id: row.id,
                label: row.label,
                startedAt: startedAt.toISOString(),
                closedAt: closedAt?.toISOString() ?? null,
            }];
        });

        if (cycles.length === 0) return legacyState();
        const current = [...cycles].reverse().find((cycle) => cycle.closedAt === null) ?? cycles[cycles.length - 1];
        return { cycles, current };
    } catch {
        return legacyState();
    }
}

export async function getRecruitmentCycleState(): Promise<RecruitmentCycleState> {
    const record = await prisma.systemConfig.findUnique({
        where: { key: CONFIG_KEY },
        select: { value: true },
    });
    return parseState(record?.value);
}

export async function startNewRecruitmentCycle(label?: string): Promise<RecruitmentCycleState> {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        const record = await tx.systemConfig.findUnique({
            where: { key: CONFIG_KEY },
            select: { value: true },
        });
        const state = parseState(record?.value);
        const closedCycles = state.cycles.map((cycle) =>
            cycle.closedAt === null ? { ...cycle, closedAt: now.toISOString() } : cycle
        );
        const next: RecruitmentCycle = {
            id: cycleId(now),
            label: label?.trim().slice(0, 80) || defaultCycleLabel(now),
            startedAt: now.toISOString(),
            closedAt: null,
        };
        const cycles = [...closedCycles, next];
        await tx.systemConfig.upsert({
            where: { key: CONFIG_KEY },
            update: { value: JSON.stringify({ cycles }) },
            create: { key: CONFIG_KEY, value: JSON.stringify({ cycles }) },
        });
        return { cycles, current: next };
    });
}

export function currentCycleCreatedAtFilter(state: RecruitmentCycleState) {
    return { gte: new Date(state.current.startedAt) };
}

export function archivedCycleCreatedAtFilter(state: RecruitmentCycleState) {
    return { lt: new Date(state.current.startedAt) };
}
