import { describe, expect, it } from "vitest";
import { formatSnapshotPercentage } from "./page";

describe("formatSnapshotPercentage", () => {
    it("formats the stored 0–100 rate without multiplying it again", () => {
        expect(formatSnapshotPercentage(75)).toBe("75%");
        expect(formatSnapshotPercentage(75.4)).toBe("75%");
        expect(formatSnapshotPercentage(null)).toBe("-");
    });
});
