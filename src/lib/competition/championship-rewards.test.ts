import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    findUnique: vi.fn(),
    upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        systemConfig: {
            findUnique: mocks.findUnique,
            upsert: mocks.upsert,
        },
    },
}));

vi.mock("@/lib/competition/league", () => ({
    rewardOptionsForAwardType: (type: string) => type === "GRAND_CHAMPION"
        ? [{ code: "GRAND_DEFAULT", label: "Grand Default", description: "default", valueBaht: 1500 }]
        : [{ code: "MONTH_DEFAULT", label: "Month Default", description: "default", valueBaht: 700 }],
}));

import {
    championshipRewardConfigKey,
    getChampionshipRewardOptions,
    normalizeChampionshipRewardOptions,
    saveChampionshipRewardOptions,
} from "./championship-rewards";

describe("championship reward configuration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("uses the month-specific admin reward options when configured", async () => {
        mocks.findUnique.mockResolvedValue({
            value: JSON.stringify([
                { code: "OLD", label: "เงินสด 900 บาท", description: "รางวัลเดือนนี้", valueBaht: 900, imageUrl: "https://example.com/reward.jpg" },
                { code: "OLD2", label: "Family Meal", description: "พาครอบครัวไปทานอาหาร", valueBaht: 900 },
            ]),
        });

        const options = await getChampionshipRewardOptions("MONTHLY_STATION_CHAMPION", "2026-09");
        expect(options).toEqual([
            { code: "ADMIN_OPTION_1", label: "เงินสด 900 บาท", description: "รางวัลเดือนนี้", valueBaht: 900, imageUrl: "https://example.com/reward.jpg" },
            { code: "ADMIN_OPTION_2", label: "Family Meal", description: "พาครอบครัวไปทานอาหาร", valueBaht: 900, imageUrl: null },
        ]);
        expect(mocks.findUnique).toHaveBeenCalledWith({
            where: { key: championshipRewardConfigKey("MONTHLY_STATION_CHAMPION", "2026-09") },
            select: { value: true },
        });
    });

    it("falls back to the existing policy when no admin override exists", async () => {
        mocks.findUnique.mockResolvedValue(null);
        await expect(getChampionshipRewardOptions("GRAND_CHAMPION", "2026-09")).resolves.toEqual([
            { code: "GRAND_DEFAULT", label: "Grand Default", description: "default", valueBaht: 1500, imageUrl: null },
        ]);
    });

    it("rejects invalid reward image values", () => {
        expect(normalizeChampionshipRewardOptions([
            { label: "Voucher", description: "", valueBaht: 500, imageUrl: "javascript:alert(1)" },
        ])).toBeNull();
    });

    it("validates and stores one to three reward choices", async () => {
        const normalized = normalizeChampionshipRewardOptions([
            { label: "Voucher 1,000 บาท", description: "เลือกใช้ตามประกาศ", valueBaht: 1000, imageUrl: "data:image/png;base64,AAAA" },
        ]);
        expect(normalized).toEqual([
            { code: "ADMIN_OPTION_1", label: "Voucher 1,000 บาท", description: "เลือกใช้ตามประกาศ", valueBaht: 1000, imageUrl: "data:image/png;base64,AAAA" },
        ]);
        mocks.upsert.mockResolvedValue({ key: "saved", value: "[]", updatedAt: new Date() });
        await saveChampionshipRewardOptions({
            type: "GRAND_CHAMPION",
            periodKey: "2026-09",
            options: normalized!,
        });
        expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { key: championshipRewardConfigKey("GRAND_CHAMPION", "2026-09") },
        }));
    });
});
