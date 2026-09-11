import { describe, expect, it } from "vitest";
import {
    detectAutomaticFairPlayReview,
    explainFairPlaySignals,
    fairPlayPenaltyLevelForViolation,
    hasMonthlyRewardBan,
    hasWeeklyCustomerMissionPenalty,
    isPerfectEmployeeFeedback,
} from "./fair-play";

const d = (iso: string) => new Date(iso);

describe("customer feedback fair-play policy", () => {
    it("requires multiple signals before creating an automatic review", () => {
        expect(detectAutomaticFairPlayReview({
            isPerfectEmployeeFeedback: true,
            durationSeconds: 12,
            recentPerfectResponseCount: 0,
            sameClientSameTargetCount: 0,
        })).toEqual([]);

        expect(detectAutomaticFairPlayReview({
            isPerfectEmployeeFeedback: true,
            durationSeconds: 12,
            recentPerfectResponseCount: 2,
            sameClientSameTargetCount: 0,
        })).toEqual(expect.arrayContaining(["perfect-employee-feedback", "fast-perfect-feedback", "clustered-perfect-feedback"]));
    });

    it("explains automatic signals in admin-friendly language with the observed duration", () => {
        const explanations = explainFairPlaySignals({
            signals: [
                "perfect-employee-feedback",
                "fast-perfect-feedback",
                "clustered-perfect-feedback",
                "repeat-client-same-employee",
            ],
            durationSeconds: 12.4,
        });

        expect(explanations.map((item) => item.code)).toEqual([
            "perfect-employee-feedback",
            "fast-perfect-feedback",
            "clustered-perfect-feedback",
            "repeat-client-same-employee",
        ]);
        expect(explanations[1].detail).toContain("12 วินาที");
        expect(explanations[1].detail).toContain("20 วินาที");
        expect(explanations[2].detail).toContain("2 แบบ");
        expect(explanations[2].detail).toContain("15 นาที");
        expect(explanations[3].detail).toContain("24 ชั่วโมง");
        expect(explanations[3].detail).toContain("ไม่ใช่การยืนยันตัวบุคคล");
    });

    it("does not treat a shared client signal alone as fraud", () => {
        expect(detectAutomaticFairPlayReview({
            isPerfectEmployeeFeedback: true,
            durationSeconds: 45,
            recentPerfectResponseCount: 0,
            sameClientSameTargetCount: 4,
        })).toEqual([]);
    });

    it("recognizes a perfect employee response only when every behavior answer is YES", () => {
        expect(isPerfectEmployeeFeedback({
            overallRating: 5,
            behaviorQuestionKeys: ["a", "b"],
            behaviorAnswers: { a: "YES", b: "YES" },
        })).toBe(true);
        expect(isPerfectEmployeeFeedback({
            overallRating: 5,
            behaviorQuestionKeys: ["a", "b"],
            behaviorAnswers: { a: "YES", b: "UNSURE" },
        })).toBe(false);
    });

    it("escalates first, second and third confirmed violations inside 30 days", () => {
        const events = [
            { occurredAt: d("2026-09-01T03:00:00Z") },
            { occurredAt: d("2026-09-08T03:00:00Z") },
            { occurredAt: d("2026-09-15T03:00:00Z") },
        ];
        expect(fairPlayPenaltyLevelForViolation(events, events[0].occurredAt).level).toBe(1);
        expect(fairPlayPenaltyLevelForViolation(events, events[1].occurredAt).level).toBe(2);
        expect(fairPlayPenaltyLevelForViolation(events, events[2].occurredAt).level).toBe(3);
    });

    it("zeros customer+mission in the week of a second violation and bans monthly rewards on the third", () => {
        const events = [
            { occurredAt: d("2026-09-01T03:00:00Z") },
            { occurredAt: d("2026-09-08T03:00:00Z") },
            { occurredAt: d("2026-09-15T03:00:00Z") },
        ];
        expect(hasWeeklyCustomerMissionPenalty(events, d("2026-09-07T17:00:00Z"), d("2026-09-14T17:00:00Z"))).toBe(true);
        expect(hasMonthlyRewardBan(events, d("2026-08-31T17:00:00Z"), d("2026-09-30T17:00:00Z"))).toBe(true);
    });
});
