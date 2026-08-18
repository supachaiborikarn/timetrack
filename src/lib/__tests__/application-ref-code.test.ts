import { describe, expect, it } from "vitest";
import { nextRefCode, refCodePrefix } from "../application-ref-code";

describe("refCodePrefix", () => {
    it("uses the Buddhist year", () => {
        expect(refCodePrefix(new Date("2026-08-18"))).toBe("APP-69-");
        expect(refCodePrefix(new Date("2027-01-01"))).toBe("APP-70-");
    });
});

describe("nextRefCode", () => {
    const P = "APP-69-";

    it("starts at 0001 when nothing has been issued", () => {
        expect(nextRefCode(P, null)).toBe("APP-69-0001");
    });

    it("continues from the highest issued code", () => {
        expect(nextRefCode(P, "APP-69-0025")).toBe("APP-69-0026");
    });

    // The bug that broke public submissions: deleting applications lowered the row count, so a
    // count-based sequence handed out a number that a surviving application still held.
    it("does not reuse a number after applications are deleted", () => {
        // 25 issued, four deleted — 21 rows remain but the sequence must not fall back to 0022.
        expect(nextRefCode(P, "APP-69-0025")).toBe("APP-69-0026");
    });

    it("keeps advancing so repeated calls never collide with an existing code", () => {
        const issued = new Set(["APP-69-0023", "APP-69-0024", "APP-69-0025"]);
        const code = nextRefCode(P, "APP-69-0025");
        expect(issued.has(code)).toBe(false);
    });

    it("grows past four digits instead of wrapping", () => {
        expect(nextRefCode(P, "APP-69-9999")).toBe("APP-69-10000");
    });

    it("ignores a code from a different year", () => {
        expect(nextRefCode(P, "APP-68-0400")).toBe("APP-69-0001");
    });

    it("falls back to 0001 on an unparsable code", () => {
        expect(nextRefCode(P, "APP-69-XXXX")).toBe("APP-69-0001");
    });
});
