import { EMPLOYEE_DAILY_EVALUATION_TARGET } from "@/lib/customer-feedback/evaluation-target";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export const CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY = "chinese_new_year_bonus.review_period_id.v1";

export type ChineseNewYearBonusProfile = "FRONT_YARD" | "FUEL_CASHIER";

export const CHINESE_NEW_YEAR_BONUS_PROFILE_WEIGHTS = {
    FRONT_YARD: {
        attendance: 25,
        customerQuality: 30,
        cooperation: 15,
        supervisorSop: 20,
        disciplineSafety: 10,
    },
    FUEL_CASHIER: {
        attendance: 25,
        customerQuality: 20,
        cooperation: 15,
        supervisorSop: 30,
        disciplineSafety: 10,
    },
} as const;

/** Backward-compatible alias for the original front-yard policy. */
export const CHINESE_NEW_YEAR_BONUS_WEIGHTS = CHINESE_NEW_YEAR_BONUS_PROFILE_WEIGHTS.FRONT_YARD;
export const FUEL_CASHIER_CHINESE_NEW_YEAR_BONUS_WEIGHTS = CHINESE_NEW_YEAR_BONUS_PROFILE_WEIGHTS.FUEL_CASHIER;

export const CHINESE_NEW_YEAR_BONUS_TIERS = [
    { minScore: 90, bonusPercent: 100 },
    { minScore: 85, bonusPercent: 90 },
    { minScore: 80, bonusPercent: 80 },
    { minScore: 75, bonusPercent: 70 },
    { minScore: 70, bonusPercent: 50 },
    { minScore: 0, bonusPercent: 0 },
] as const;

export type ChineseNewYearBonusComponentKey = keyof typeof CHINESE_NEW_YEAR_BONUS_WEIGHTS;

export interface ChineseNewYearBonusComponent {
    key: ChineseNewYearBonusComponentKey;
    label: string;
    maxPoints: number;
    points: number | null;
    status: "READY" | "WAITING";
}

export interface ChineseNewYearBonusPreview {
    profile: ChineseNewYearBonusProfile;
    forecastScore: number | null;
    bonusPercent: number | null;
    knownPoints: number;
    knownWeight: number;
    missingComponents: ChineseNewYearBonusComponentKey[];
    nextTierScore: number | null;
    pointsToNextTier: number | null;
    isProvisional: boolean;
    safetyReviewRequired: boolean;
    components: ChineseNewYearBonusComponent[];
}

function round1(value: number): number {
    return Math.round((value + Number.EPSILON) * 10) / 10;
}

function clampPoints(value: number | null | undefined, max: number): number | null {
    if (value == null || !Number.isFinite(value)) return null;
    return round1(Math.max(0, Math.min(max, value)));
}

export function getChineseNewYearBonusWeights(profile: ChineseNewYearBonusProfile = "FRONT_YARD") {
    return CHINESE_NEW_YEAR_BONUS_PROFILE_WEIGHTS[profile];
}

function getComponentLabels(profile: ChineseNewYearBonusProfile): Record<ChineseNewYearBonusComponentKey, string> {
    if (profile === "FUEL_CASHIER") {
        return {
            attendance: "เวลา / การมาทำงาน",
            customerQuality: "คุณภาพบริการของทีม",
            cooperation: "ความร่วมมือแบบประเมินของทีม",
            supervisorSop: "งานเสมียน / SOP",
            disciplineSafety: "วินัย / ความปลอดภัย",
        };
    }
    return {
        attendance: "เวลา / การมาทำงาน",
        customerQuality: "คุณภาพเสียงลูกค้า",
        cooperation: "ความร่วมมือแบบประเมิน",
        supervisorSop: "หัวหน้างาน / SOP",
        disciplineSafety: "วินัย / ความปลอดภัย",
    };
}

export function bangkokDateKey(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * คะแนนความร่วมมือวัดความสม่ำเสมอตามวันทำงาน ไม่ใช้ยอดสะสมดิบเป็นแรงกดดันบนหน้าพนักงาน
 * แต่ละวันได้สูงสุด 1 เท่าของเป้ารายวันปัจจุบัน แล้วเฉลี่ยข้ามวันที่มาทำงานจริง
 */
export function calculateEvaluationCooperationPoints(input: {
    workedDayKeys: string[];
    evaluationSubmittedAts: Array<Date | string>;
    dailyTarget?: number;
    maxPoints?: number;
}): number | null {
    const workedDays = [...new Set(input.workedDayKeys.filter(Boolean))];
    if (workedDays.length === 0) return null;

    const target = Math.max(1, Math.round(input.dailyTarget ?? EMPLOYEE_DAILY_EVALUATION_TARGET));
    const maxPoints = Math.max(0, input.maxPoints ?? CHINESE_NEW_YEAR_BONUS_WEIGHTS.cooperation);
    const counts = new Map<string, number>();
    for (const submittedAt of input.evaluationSubmittedAts) {
        const key = bangkokDateKey(submittedAt);
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const completionRate = workedDays.reduce((sum, dayKey) => {
        return sum + Math.min(1, (counts.get(dayKey) ?? 0) / target);
    }, 0) / workedDays.length;

    return round1(completionRate * maxPoints);
}

export function calculateDisciplineSafetyPoints(input: {
    presencePoints: number;
    punctualityPoints: number;
    completionPoints: number;
    breakDisciplinePoints: number;
    maxPoints?: number;
}): number | null {
    const attendanceRate = input.presencePoints / 25;
    if (!(attendanceRate > 0)) return null;

    // ถอดผลคูณ attendanceRate ออกจาก 3 องค์ประกอบ เพื่อไม่หัก "ขาดงาน" ซ้ำกับหมวดเวลา 25 คะแนน
    const disciplineQuality = (
        input.punctualityPoints + input.completionPoints + input.breakDisciplinePoints
    ) / (35 * attendanceRate);
    const maxPoints = Math.max(0, input.maxPoints ?? CHINESE_NEW_YEAR_BONUS_WEIGHTS.disciplineSafety);

    return round1(Math.max(0, Math.min(1, disciplineQuality)) * maxPoints);
}

/**
 * คะแนนคุณภาพทีมของเสมียนให้น้ำหนักพนักงานแต่ละคนเท่ากัน ไม่ให้คนที่ได้แบบประเมินเยอะกว่าครองคะแนนทีม
 * และรอจนสมาชิกทีมที่กำลังใช้งานทุกคนมี sample ขั้นต่ำก่อน เพื่อไม่สร้างแรงจูงใจให้เลือกเก็บเฉพาะคนคะแนนดี
 */
export function calculateCompleteTeamCustomerQualityPoints(input: {
    memberScores64: Array<number | null>;
    rubricTotal: number;
    maxPoints: number;
}): number | null {
    if (input.memberScores64.length === 0) return null;
    const readyScores = input.memberScores64.filter((score): score is number => score != null && Number.isFinite(score));
    if (readyScores.length !== input.memberScores64.length) return null;
    if (!(input.rubricTotal > 0) || !(input.maxPoints >= 0)) return null;

    const average = readyScores.reduce((sum, score) => sum + score, 0) / readyScores.length;
    return round1((Math.max(0, Math.min(input.rubricTotal, average)) / input.rubricTotal) * input.maxPoints);
}

export function averageAvailableTeamPoints(values: Array<number | null>): number | null {
    const ready = values.filter((value): value is number => value != null && Number.isFinite(value));
    if (ready.length === 0) return null;
    return round1(ready.reduce((sum, value) => sum + value, 0) / ready.length);
}

export function resolveChineseNewYearBonusTier(score: number): { minScore: number; bonusPercent: number } {
    const normalized = Math.max(0, Math.min(100, score));
    return CHINESE_NEW_YEAR_BONUS_TIERS.find((tier) => normalized >= tier.minScore)
        ?? CHINESE_NEW_YEAR_BONUS_TIERS[CHINESE_NEW_YEAR_BONUS_TIERS.length - 1];
}

export function calculateChineseNewYearBonusPreview(input: {
    profile?: ChineseNewYearBonusProfile;
    attendancePoints?: number | null;
    customerQualityPoints?: number | null;
    cooperationPoints?: number | null;
    supervisorSopPoints?: number | null;
    disciplineSafetyPoints?: number | null;
    periodClosed?: boolean;
    safetyReviewRequired?: boolean;
}): ChineseNewYearBonusPreview {
    const profile = input.profile ?? "FRONT_YARD";
    const weights = getChineseNewYearBonusWeights(profile);
    const labels = getComponentLabels(profile);
    const rawComponents: Array<{ key: ChineseNewYearBonusComponentKey; value: number | null | undefined }> = [
        { key: "attendance", value: input.attendancePoints },
        { key: "customerQuality", value: input.customerQualityPoints },
        { key: "cooperation", value: input.cooperationPoints },
        { key: "supervisorSop", value: input.supervisorSopPoints },
        { key: "disciplineSafety", value: input.disciplineSafetyPoints },
    ];
    const components: ChineseNewYearBonusComponent[] = rawComponents.map(({ key, value }) => {
        const maxPoints = weights[key];
        const points = clampPoints(value, maxPoints);
        return {
            key,
            label: labels[key],
            maxPoints,
            points,
            status: points === null ? "WAITING" : "READY",
        };
    });

    const ready = components.filter((component) => component.points !== null);
    const knownWeight = ready.reduce((sum, component) => sum + component.maxPoints, 0);
    const knownPoints = round1(ready.reduce((sum, component) => sum + (component.points ?? 0), 0));
    const forecastScore = knownWeight > 0 ? round1((knownPoints / knownWeight) * 100) : null;
    const tier = forecastScore === null ? null : resolveChineseNewYearBonusTier(forecastScore);
    const nextTier = forecastScore === null
        ? null
        : [...CHINESE_NEW_YEAR_BONUS_TIERS]
            .filter((candidate) => candidate.minScore > forecastScore)
            .sort((left, right) => left.minScore - right.minScore)[0] ?? null;
    const missingComponents = components
        .filter((component) => component.points === null)
        .map((component) => component.key);
    const safetyReviewRequired = Boolean(input.safetyReviewRequired);

    return {
        profile,
        forecastScore,
        bonusPercent: tier?.bonusPercent ?? null,
        knownPoints,
        knownWeight,
        missingComponents,
        nextTierScore: nextTier?.minScore ?? null,
        pointsToNextTier: nextTier && forecastScore !== null ? round1(nextTier.minScore - forecastScore) : null,
        isProvisional: !input.periodClosed || missingComponents.length > 0 || safetyReviewRequired,
        safetyReviewRequired,
        components,
    };
}
