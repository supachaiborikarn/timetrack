const FIFTEEN_MINUTES = 15 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export const isFreeTierMode = process.env.NEXT_PUBLIC_FREE_TIER_MODE !== "false";

export const freeTierIntervals = {
    adminPendingPoll: isFreeTierMode ? FIFTEEN_MINUTES : 5 * 60 * 1000,
    notificationPoll: isFreeTierMode ? FIFTEEN_MINUTES : 2 * 60 * 1000,
    announcementMandatoryCheckTtl: isFreeTierMode ? THIRTY_MINUTES : 5 * 60 * 1000,
    pushSubscriptionSyncTtl: isFreeTierMode ? ONE_DAY : 60 * 60 * 1000,
} as const;
