export const REWARD_CUSTOMER_QUALITY_MIN_POINTS = 20;

export const REWARD_POINT_TIERS = [
    { minimumScore: 90, points: 30 },
    { minimumScore: 80, points: 20 },
    { minimumScore: 70, points: 10 },
] as const;

export type RewardEligibilityReason =
    | "ELIGIBLE"
    | "NO_REQUIRED_WORK_DAYS"
    | "INSUFFICIENT_CUSTOMER_SAMPLE"
    | "CUSTOMER_QUALITY_BELOW_MINIMUM"
    | "FAIR_PLAY_REVIEW";

export function rewardPointsForLeagueScore(totalScore: number): number {
    const tier = REWARD_POINT_TIERS.find((entry) => totalScore >= entry.minimumScore);
    return tier?.points ?? 0;
}

export function resolveRewardEligibility(params: {
    requiredDays: number;
    meetsMinimumCustomerSample: boolean;
    customerPoints: number;
    fairPlayNeedsReview: boolean;
}): { eligible: boolean; reason: RewardEligibilityReason } {
    if (params.requiredDays <= 0) {
        return { eligible: false, reason: "NO_REQUIRED_WORK_DAYS" };
    }
    if (!params.meetsMinimumCustomerSample) {
        return { eligible: false, reason: "INSUFFICIENT_CUSTOMER_SAMPLE" };
    }
    if (params.customerPoints < REWARD_CUSTOMER_QUALITY_MIN_POINTS) {
        return { eligible: false, reason: "CUSTOMER_QUALITY_BELOW_MINIMUM" };
    }
    if (params.fairPlayNeedsReview) {
        return { eligible: false, reason: "FAIR_PLAY_REVIEW" };
    }
    return { eligible: true, reason: "ELIGIBLE" };
}
