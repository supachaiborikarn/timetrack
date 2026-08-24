import { describe, expect, it, vi } from "vitest";

const { permissionMock } = vi.hoisted(() => ({ permissionMock: vi.fn() }));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/permissions", () => ({ hasPermission: permissionMock }));
import {
    buildFeedbackCommentRetentionWhere,
    buildFeedbackResponseRetentionWhere,
    buildFeedbackReviewRequestRetentionWhere,
    monthsBefore,
    visitPurgeCutoff,
} from "@/lib/customer-feedback/retention";
import {
    parseFeedbackDateRange,
    parseFeedbackPagination,
    parseReviewPeriodDate,
    canViewFeedbackIncident,
    resolveFeedbackStationId,
    reviewPeriodDayBounds,
} from "@/lib/customer-feedback/access";
import { bangkokCalendarDayRange } from "@/lib/customer-feedback/calendar-day";

describe("customer feedback admin query rules", () => {
    it("lets ADMIN view incidents automatically but applies the permission to HR", async () => {
        permissionMock.mockResolvedValue(false);
        await expect(canViewFeedbackIncident({ userId: "admin", role: "ADMIN", stationId: null })).resolves.toBe(true);
        await expect(canViewFeedbackIncident({ userId: "hr", role: "HR", stationId: null })).resolves.toBe(false);
        permissionMock.mockResolvedValue(true);
        await expect(canViewFeedbackIncident({ userId: "hr", role: "HR", stationId: null })).resolves.toBe(true);
    });

    it("keeps the server station scope ahead of a requested station", () => {
        expect(resolveFeedbackStationId("station-own", "station-other")).toBe("station-own");
        expect(resolveFeedbackStationId(null, "station-other")).toBe("station-other");
    });

    it("rejects invalid pagination instead of passing NaN to Prisma", () => {
        expect(parseFeedbackPagination("abc", null, { pageSize: 20, maxPageSize: 50 }).ok).toBe(false);
        expect(parseFeedbackPagination("1", "0", { pageSize: 20, maxPageSize: 50 }).ok).toBe(false);
        expect(parseFeedbackPagination("1", "51", { pageSize: 20, maxPageSize: 50 }).ok).toBe(false);
        expect(parseFeedbackPagination("2", "50", { pageSize: 20, maxPageSize: 50 })).toEqual({
            ok: true,
            value: { page: 2, pageSize: 50 },
        });
    });

    it("uses full Bangkok calendar days with an exclusive end", () => {
        const result = parseFeedbackDateRange("2026-08-24", "2026-08-24");
        expect(result).toEqual({
            ok: true,
            value: {
                from: new Date("2026-08-23T17:00:00.000Z"),
                toExclusive: new Date("2026-08-24T17:00:00.000Z"),
            },
        });
        expect(parseFeedbackDateRange("2026-02-30", null).ok).toBe(false);
        expect(parseFeedbackDateRange("2026-08-25", "2026-08-24").ok).toBe(false);
    });
});

describe("customer feedback retention predicates", () => {
    const now = new Date("2026-08-24T01:15:00.000Z");

    it("preserves free text while a case is open and clears both text stores otherwise", () => {
        const where = buildFeedbackCommentRetentionWhere(now);
        expect(where.NOT).toEqual({ case: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
        expect(where.OR).toEqual([
            { comment: { not: null } },
            { answers: { some: { textValue: { not: null } } } },
        ]);
    });

    it("requires both 24 months from response and 12 months from case close", () => {
        const where = buildFeedbackResponseRetentionWhere(now);
        expect(where.submittedAt).toEqual({ lt: new Date("2024-08-24T01:15:00.000Z") });
        expect(where.OR).toContainEqual({ case: { is: null } });
        expect(where.OR).toContainEqual({
            case: {
                is: {
                    status: { in: ["RESOLVED", "DISMISSED"] },
                    resolvedAt: { lt: new Date("2025-08-24T01:15:00.000Z") },
                },
            },
        });
    });

    it("preserves responses that belong to a review period which has not closed", () => {
        const protectedRange = {
            gte: new Date("2024-01-01T17:00:00.000Z"),
            lt: new Date("2024-02-01T17:00:00.000Z"),
        };
        const where = buildFeedbackResponseRetentionWhere(now, [protectedRange]);
        expect(where.NOT).toEqual([
            { submittedAt: { gte: protectedRange.gte, lt: protectedRange.lt } },
        ]);
    });

    it("does not purge OPEN or IN_REVIEW review requests", () => {
        expect(buildFeedbackReviewRequestRetentionWhere(now)).toEqual({
            status: { in: ["RESOLVED", "DISMISSED"] },
            resolvedAt: { lt: new Date("2024-08-24T01:15:00.000Z") },
        });
    });

    it("uses Bangkok midnight so a cron run cannot purge a partial visit day", () => {
        const cronAt0115Bangkok = new Date("2026-08-23T18:15:00.000Z");
        expect(visitPurgeCutoff(cronAt0115Bangkok)).toEqual(new Date("2026-08-23T17:00:00.000Z"));
    });

    it("clamps calendar-month retention at the final day of shorter months", () => {
        expect(monthsBefore(new Date("2026-03-31T01:15:00.000Z"), 1)).toEqual(
            new Date("2026-02-28T01:15:00.000Z")
        );
        expect(monthsBefore(new Date("2024-02-29T01:15:00.000Z"), 12)).toEqual(
            new Date("2023-02-28T01:15:00.000Z")
        );
        expect(monthsBefore(new Date("2026-08-31T01:15:00.000Z"), 24)).toEqual(
            new Date("2024-08-31T01:15:00.000Z")
        );
    });
});

describe("review period Bangkok dates", () => {
    it("normalizes legacy ISO input and includes the full final day", () => {
        const parsed = parseReviewPeriodDate("2026-08-24T00:00:00.000Z", "endDate");
        expect(parsed).toEqual({
            ok: true,
            value: { dateKey: "2026-08-24", dayStart: new Date("2026-08-23T17:00:00.000Z") },
        });
        if (!parsed.ok) throw new Error("expected valid date");
        expect(reviewPeriodDayBounds(parsed.value.dayStart)).toEqual({
            dateKey: "2026-08-24",
            dayStart: new Date("2026-08-23T17:00:00.000Z"),
            nextDayStart: new Date("2026-08-24T17:00:00.000Z"),
        });
    });
});

describe("feedback shift calendar day", () => {
    it("matches both Bangkok midnight and legacy UTC midnight on the same Bangkok day", () => {
        const range = bangkokCalendarDayRange(new Date("2026-08-24T12:00:00.000Z"));
        expect(range).toEqual({
            gte: new Date("2026-08-23T17:00:00.000Z"),
            lt: new Date("2026-08-24T17:00:00.000Z"),
        });
        expect(new Date("2026-08-24T00:00:00.000Z") >= range.gte).toBe(true);
        expect(new Date("2026-08-24T00:00:00.000Z") < range.lt).toBe(true);
    });
});
