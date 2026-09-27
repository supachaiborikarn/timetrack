import { describe, it, expect } from "vitest";
import { kebdaoBranchAllowed, kebdaoReviewAllowed, parseKebdaoCode } from "./kebdao-rules";
import { canViewAsset, canDeleteAsset, canUploadAsset, type Viewer } from "./asset-kinds";
describe("Kebdao rules", () => {
    it("preserves code strings and rejects numeric inputs that lose zeros", () => {
        expect(parseKebdaoCode(" 039401 ")).toBe("039401");
        for (const invalid of [39401, "3.94e4", "", "0394-01", "1".repeat(33)]) expect(() => parseKebdaoCode(invalid)).toThrow();
    });
    it("denies branchless clerks and unrelated branches", () => {
        expect(kebdaoBranchAllowed("CASHIER", null, "a")).toBe(false);
        expect(kebdaoBranchAllowed("CASHIER", "b", "a")).toBe(false);
        expect(kebdaoBranchAllowed("CASHIER", "a", "a")).toBe(true);
        expect(kebdaoBranchAllowed("HR", null, "a")).toBe(true);
    });
    it("only reviews pending registrations owned by someone else", () => {
        const actor = { id: "admin", role: "ADMIN", stationId: null };
        expect(kebdaoReviewAllowed(actor, { userId: "admin", stationId: "a", status: "PENDING" })).toBe(false);
        expect(kebdaoReviewAllowed(actor, { userId: "other", stationId: "a", status: "ACTIVE" })).toBe(false);
    });
    it("keeps evidence immutable and requires registration-specific authorization for reviewers", () => {
        const subject = { kind: "KEBDAO_CARD" as const, ownerUserId: "owner", uploadedById: "owner", ownerStationId: "a" };
        const owner: Viewer = { userId: "owner", role: "EMPLOYEE", stationId: "a", can: () => false };
        const reviewer: Viewer = { userId: "reviewer", role: "CASHIER", stationId: "a", can: () => true };
        expect(canUploadAsset(subject, owner)).toBe(true);
        expect(canUploadAsset(subject, reviewer)).toBe(false);
        expect(canViewAsset(subject, reviewer).allowed).toBe(false);
        expect(canDeleteAsset(subject, owner)).toBe(false);
        expect(canDeleteAsset(subject, reviewer)).toBe(false);
    });
});
