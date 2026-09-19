import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    findUnique: vi.fn(),
    upsert: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        systemConfig: {
            findUnique: mocks.findUnique,
        },
        $transaction: mocks.transaction,
    },
}));

import {
    archivedCycleCreatedAtFilter,
    currentCycleCreatedAtFilter,
    getRecruitmentCycleState,
    startNewRecruitmentCycle,
} from "./recruitment-cycles";

describe("recruitment cycles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
            callback({
                systemConfig: {
                    findUnique: mocks.findUnique,
                    upsert: mocks.upsert,
                },
            })
        );
        mocks.upsert.mockResolvedValue({});
    });

    it("treats all existing applications as the legacy current cycle before the first reset", async () => {
        mocks.findUnique.mockResolvedValue(null);
        const state = await getRecruitmentCycleState();

        expect(state.current.id).toBe("legacy");
        expect(state.current.label).toBe("ชุดเดิม");
        expect(currentCycleCreatedAtFilter(state).gte.toISOString()).toBe("1970-01-01T00:00:00.000Z");
    });

    it("starts a new cycle while preserving the legacy batch as closed history", async () => {
        mocks.findUnique.mockResolvedValue(null);
        const state = await startNewRecruitmentCycle("รอบใหม่");

        expect(state.current.label).toBe("รอบใหม่");
        expect(state.current.closedAt).toBeNull();
        expect(state.cycles).toHaveLength(2);
        expect(state.cycles[0]).toMatchObject({ id: "legacy", label: "ชุดเดิม" });
        expect(state.cycles[0].closedAt).toBeTruthy();
        expect(archivedCycleCreatedAtFilter(state).lt.toISOString()).toBe(state.current.startedAt);
        expect(mocks.upsert).toHaveBeenCalledOnce();
    });

    it("closes the previous current cycle when another cycle is opened", async () => {
        mocks.findUnique.mockResolvedValue({
            value: JSON.stringify({
                cycles: [{
                    id: "cycle-old",
                    label: "รอบก่อน",
                    startedAt: "2026-09-01T00:00:00.000Z",
                    closedAt: null,
                }],
            }),
        });

        const state = await startNewRecruitmentCycle("รอบถัดไป");

        expect(state.cycles[0].closedAt).toBeTruthy();
        expect(state.current.label).toBe("รอบถัดไป");
        expect(new Date(state.current.startedAt).getTime()).toBeGreaterThanOrEqual(new Date("2026-09-01T00:00:00.000Z").getTime());
    });
});
