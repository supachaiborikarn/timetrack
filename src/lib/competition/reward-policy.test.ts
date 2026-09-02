import { describe, expect, it } from "vitest";
import {
    REWARD_CUSTOMER_QUALITY_MIN_POINTS,
    resolveRewardEligibility,
    rewardPointsForLeagueScore,
} from "./reward-policy";

describe("rewardPointsForLeagueScore", () => {
    it.each([
        [100, 30],
        [90, 30],
        [89.99, 20],
        [80, 20],
        [79.99, 10],
        [70, 10],
        [69.99, 0],
    ])("maps League score %s to %s RP", (score, expected) => {
        expect(rewardPointsForLeagueScore(score)).toBe(expected);
    });
});

describe("resolveRewardEligibility", () => {
    it("requires Customer Quality 20/25", () => {
        expect(REWARD_CUSTOMER_QUALITY_MIN_POINTS).toBe(20);
        expect(resolveRewardEligibility({
            requiredDays: 5,
            meetsMinimumCustomerSample: true,
            customerPoints: 19.99,
            fairPlayNeedsReview: false,
        })).toEqual({ eligible: false, reason: "CUSTOMER_QUALITY_BELOW_MINIMUM" });
        expect(resolveRewardEligibility({
            requiredDays: 5,
            meetsMinimumCustomerSample: true,
            customerPoints: 20,
            fairPlayNeedsReview: false,
        })).toEqual({ eligible: true, reason: "ELIGIBLE" });
    });

    it("explains insufficient sample before judging Customer Quality", () => {
        expect(resolveRewardEligibility({
            requiredDays: 5,
            meetsMinimumCustomerSample: false,
            customerPoints: 0,
            fairPlayNeedsReview: false,
        })).toEqual({ eligible: false, reason: "INSUFFICIENT_CUSTOMER_SAMPLE" });
    });

    it("blocks reward access while Fair Play is under review", () => {
        expect(resolveRewardEligibility({
            requiredDays: 5,
            meetsMinimumCustomerSample: true,
            customerPoints: 24,
            fairPlayNeedsReview: true,
        })).toEqual({ eligible: false, reason: "FAIR_PLAY_REVIEW" });
    });

    it("handles weeks with no eligible work days", () => {
        expect(resolveRewardEligibility({
            requiredDays: 0,
            meetsMinimumCustomerSample: true,
            customerPoints: 25,
            fairPlayNeedsReview: false,
        })).toEqual({ eligible: false, reason: "NO_REQUIRED_WORK_DAYS" });
    });
});
