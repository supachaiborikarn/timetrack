import { EMPLOYEE_DAILY_EVALUATION_TARGET } from "@/lib/customer-feedback/evaluation-target";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export const CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY = "chinese_new_year_bonus.review_period_id.v1";

export const CHINESE_NEW_YEAR_BONUS_WEIGHTS = {
    attendance: 25,
    customerQuality: 30,
    cooperation: 15,
    supervisorSop: 20,
    disciplineSafety: 10,
} as const;

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
}): number | null {
    const workedDays = [...new Set(input.workedDayKeys.filter(Boolean))];
    if (workedDays.length === 0) return null;

    const target = Math.max(1, Math.round(input.dailyTarget ?? EMPLOYEE_DAILY_EVALUATION_TARGET));
    const counts = new Map<string, number>();
    for (const submittedAt of input.evaluationSubmittedAts) {
        const key = bangkokDateKey(submittedAt);
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const completionRate = workedDays.reduce((sum, dayKey) => {
        return sum + Math.min(1, (counts.get(dayKey) ?? 0) / target);
    }, 0) / workedDays.length;

    return round1(completionRate * CHINESE_NEW_YEAR_BONUS_WEIGHTS.cooperation);
}

export function calculateDisciplineSafetyPoints(input: {
    presencePoints: number;
    punctualityPoints: number;
    completionPoints: number;
    breakDisciplinePoints: number;
}): number | null {
    const attendanceRate = input.presencePoints / 25;
    if (!(attendanceRate > 0)) return null;

    // ถอดผลคูณ attendanceRate ออกจาก 3 องค์ประกอบ เพื่อไม่หัก "ขาดงาน" ซ้ำกับหมวดเวลา 25 คะแนน
    const disciplineQuality = (
        input.punctualityPoints + input.completionPoints + input.breakDisciplinePoints
    ) / (35 * attendanceRate);

    return round1(Math.max(0, Math.min(1, disciplineQuality)) * CHINESE_NEW_YEAR_BONUS_WEIGHTS.disciplineSafety);
}

export function resolveChineseNewYearBonusTier(score: number): { minScore: number; bonusPercent: number } {
    const normalized = Math.max(0, Math.min(100, score));
    return CHINESE_NEW_YEAR_BONUS_TIERS.find((tier) => normalized >= tier.minScore)
        ?? CHINESE_NEW_YEAR_BONUS_TIERS[CHINESE_NEW_YEAR_BONUS_TIERS.length - 1];
}

export function calculateChineseNewYearBonusPreview(input: {
    attendancePoints?: number | null;
    customerQualityPoints?: number | null;
    cooperationPoints?: number | null;
    supervisorSopPoints?: number | null;
    disciplineSafetyPoints?: number | null;
    periodClosed?: boolean;
    safetyReviewRequired?: boolean;
}): ChineseNewYearBonusPreview {
    const components: ChineseNewYearBonusComponent[] = [
        {
            key: "attendance",
            label: "เวลา / การมาทำงาน",
            maxPoints: CHINESE_NEW_YEAR_BONUS_WEIGHTS.attendance,
            points: clampPoints(input.attendancePoints, CHINESE_NEW_YEAR_BONUS_WEIGHTS.attendance),
            status: input.attendancePoints == null ? "WAITING" : "READY",
        },
        {
            key: "customerQuality",
            label: "คุณภาพเสียงลูกค้า",
            maxPoints: CHINESE_NEW_YEAR_BONUS_WEIGHTS.customerQuality,
            points: clampPoints(input.customerQualityPoints, CHINESE_NEW_YEAR_BONUS_WEIGHTS.customerQuality),
            status: input.customerQualityPoints == null ? "WAITING" : "READY",
        },
        {
            key: "cooperation",
            label: "ความร่วมมือแบบประเมิน",
            maxPoints: CHINESE_NEW_YEAR_BONUS_WEIGHTS.cooperation,
            points: clampPoints(input.cooperationPoints, CHINESE_NEW_YEAR_BONUS_WEIGHTS.cooperation),
            status: input.cooperationPoints == null ? "WAITING" : "READY",
        },
        {
            key: "supervisorSop",
            label: "หัวหน้างาน / SOP",
            maxPoints: CHINESE_NEW_YEAR_BONUS_WEIGHTS.supervisorSop,
            points: clampPoints(input.supervisorSopPoints, CHINESE_NEW_YEAR_BONUS_WEIGHTS.supervisorSop),
            status: input.supervisorSopPoints == null ? "WAITING" : "READY",
        },
        {
            key: "disciplineSafety",
            label: "วินัย / ความปลอดภัย",
            maxPoints: CHINESE_NEW_YEAR_BONUS_WEIGHTS.disciplineSafety,
            points: clampPoints(input.disciplineSafetyPoints, CHINESE_NEW_YEAR_BONUS_WEIGHTS.disciplineSafety),
            status: input.disciplineSafetyPoints == null ? "WAITING" : "READY",
        },
    ];

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
