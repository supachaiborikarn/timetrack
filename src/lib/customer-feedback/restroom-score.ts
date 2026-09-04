import {
    RESTROOM_CLEANLINESS_QUESTION_KEYS,
    RESTROOM_CLEANLINESS_QUESTIONS,
    type BehaviorAnswer,
    type RestroomCleanlinessQuestionKey,
} from "./questions";

export const RESTROOM_SCORE_MINIMUM_SAMPLE = 10;
export const RESTROOM_OVERALL_POINTS = 40;
export const RESTROOM_CHECKLIST_POINTS = 60;
export const RESTROOM_SCORE_TOTAL = RESTROOM_OVERALL_POINTS + RESTROOM_CHECKLIST_POINTS;

export interface RestroomScoreResponseInput {
    responseId: string;
    overallRating: number;
    answers: Array<{
        questionKey: string;
        answer: BehaviorAnswer;
    }>;
}

export interface RestroomQuestionBreakdown {
    key: RestroomCleanlinessQuestionKey;
    label: { th: string; en: string };
    answeredCount: number;
    yesCount: number;
    noCount: number;
    unsureCount: number;
    yesRate: number | null;
}

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function restroomOverallPoints(rating: number): number {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 0;
    return (rating - 1) * 10;
}

export function restroomChecklistPoints(
    answers: RestroomScoreResponseInput["answers"],
): number | null {
    const byKey = new Map(answers.map((answer) => [answer.questionKey, answer.answer]));
    let availableWeight = 0;
    let earnedWeight = 0;

    for (const question of RESTROOM_CLEANLINESS_QUESTIONS) {
        const answer = byKey.get(question.key);
        if (answer !== "YES" && answer !== "NO") continue;
        const weight = question.weight ?? 0;
        availableWeight += weight;
        if (answer === "YES") earnedWeight += weight;
    }

    if (availableWeight === 0) return null;
    return round2((earnedWeight / availableWeight) * RESTROOM_CHECKLIST_POINTS);
}

export function summarizeRestroomScore(responses: RestroomScoreResponseInput[]) {
    const validResponses = responses.filter((response) =>
        Number.isInteger(response.overallRating) && response.overallRating >= 1 && response.overallRating <= 5
    );

    const overallValues = validResponses.map((response) => restroomOverallPoints(response.overallRating));
    const checklistValues = validResponses
        .map((response) => restroomChecklistPoints(response.answers))
        .filter((value): value is number => value !== null);

    const overallPoints = overallValues.length > 0
        ? round2(overallValues.reduce((sum, value) => sum + value, 0) / overallValues.length)
        : null;
    const checklistPoints = checklistValues.length > 0
        ? round2(checklistValues.reduce((sum, value) => sum + value, 0) / checklistValues.length)
        : null;
    const meetsMinimumSample = validResponses.length >= RESTROOM_SCORE_MINIMUM_SAMPLE;
    const score = meetsMinimumSample && overallPoints !== null && checklistPoints !== null
        ? round2(overallPoints + checklistPoints)
        : null;

    const questions: RestroomQuestionBreakdown[] = RESTROOM_CLEANLINESS_QUESTIONS.map((question) => {
        let yesCount = 0;
        let noCount = 0;
        let unsureCount = 0;
        for (const response of validResponses) {
            const answer = response.answers.find((item) => item.questionKey === question.key)?.answer;
            if (answer === "YES") yesCount++;
            else if (answer === "NO") noCount++;
            else if (answer === "UNSURE") unsureCount++;
        }
        const answeredCount = yesCount + noCount;
        return {
            key: question.key as RestroomCleanlinessQuestionKey,
            label: question.label,
            answeredCount,
            yesCount,
            noCount,
            unsureCount,
            yesRate: answeredCount > 0 ? round2((yesCount / answeredCount) * 100) : null,
        };
    });

    return {
        score,
        responseCount: validResponses.length,
        minimumSample: RESTROOM_SCORE_MINIMUM_SAMPLE,
        meetsMinimumSample,
        overallPoints,
        overallPointsMax: RESTROOM_OVERALL_POINTS,
        checklistPoints,
        checklistPointsMax: RESTROOM_CHECKLIST_POINTS,
        totalPoints: RESTROOM_SCORE_TOTAL,
        questions,
    };
}

export interface RestroomHousekeeperIdentity {
    stationCode?: string | null;
    name?: string | null;
    nickName?: string | null;
}

/**
 * คนในแผนกแม่บ้านไม่ได้หมายความว่าจะรับผิดชอบห้องน้ำสถานีเสมอไป
 * จอยที่ WKO เป็นแม่บ้านประจำบ้าน จึงต้องไม่รับ/แสดงคะแนน QR ห้องน้ำสถานี
 */
export function isRestroomScoreEligibleHousekeeper(identity: RestroomHousekeeperIdentity): boolean {
    const stationCode = identity.stationCode?.trim().toUpperCase() ?? "";
    const nickName = identity.nickName?.trim() ?? "";
    const name = identity.name?.trim() ?? "";
    if (stationCode === "WKO" && (nickName === "จอย" || name === "จอย")) return false;
    return true;
}

export function selectUniqueOnDutyHousekeeper<T extends { userId: string }>(rows: T[]): T | null {
    const byUser = new Map<string, T>();
    for (const row of rows) byUser.set(row.userId, row);
    return byUser.size === 1 ? [...byUser.values()][0] : null;
}

export function isRestroomQuestionKey(key: string): key is RestroomCleanlinessQuestionKey {
    return (RESTROOM_CLEANLINESS_QUESTION_KEYS as readonly string[]).includes(key);
}
