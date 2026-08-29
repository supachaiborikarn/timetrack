import { MIN_EMPLOYEE_SAMPLE } from "./metrics";
import {
    EMPLOYEE_SCORE_QUESTIONS,
    EMPLOYEE_SCORE_TOTAL,
    type BehaviorAnswer,
    type EmployeeScoreQuestionKey,
} from "./questions";

export interface EmployeeScoreAnswer {
    questionKey: string;
    answer: BehaviorAnswer;
}

export interface EmployeeScoreResponseInput {
    responseId: string;
    answers: EmployeeScoreAnswer[];
}

export interface EmployeeCriterionScore {
    key: EmployeeScoreQuestionKey;
    label: { th: string; en: string };
    weight: number;
    yes: number;
    no: number;
    unsure: number;
    evaluable: number;
    earnedPerResponse: number | null;
}

export interface EmployeeRubricScore {
    responseCount: number;
    minimumSample: number;
    meetsMinimumSample: boolean;
    score64: number | null;
    earnedWeight: number;
    evaluableWeight: number;
    excludedWeight: number;
    criteria: EmployeeCriterionScore[];
}

/**
 * รวม rubric 64 คะแนนจากคำตอบ employee-v3 หลายแบบประเมิน
 * - YES = ได้คะแนนเต็มของเกณฑ์
 * - NO = 0
 * - UNSURE = ไม่นำเกณฑ์นั้นเข้าฐานคำนวณ
 * - คะแนนรายคนถูกซ่อนจนมี VALID responses ถึง minimum sample
 */
export function summarizeEmployeeRubric(
    responses: EmployeeScoreResponseInput[],
    minimumSample = MIN_EMPLOYEE_SAMPLE
): EmployeeRubricScore {
    const byKey = new Map<string, { yes: number; no: number; unsure: number }>();
    for (const question of EMPLOYEE_SCORE_QUESTIONS) {
        byKey.set(question.key, { yes: 0, no: 0, unsure: 0 });
    }

    for (const response of responses) {
        const seen = new Set<string>();
        for (const answer of response.answers) {
            if (seen.has(answer.questionKey)) continue;
            const bucket = byKey.get(answer.questionKey);
            if (!bucket) continue;
            seen.add(answer.questionKey);
            if (answer.answer === "YES") bucket.yes++;
            else if (answer.answer === "NO") bucket.no++;
            else bucket.unsure++;
        }
    }

    let earnedWeight = 0;
    let evaluableWeight = 0;
    let excludedWeight = 0;
    const criteria: EmployeeCriterionScore[] = EMPLOYEE_SCORE_QUESTIONS.map((question) => {
        const weight = question.weight ?? 0;
        const counts = byKey.get(question.key)!;
        const evaluable = counts.yes + counts.no;
        const criterionScore = evaluable > 0 ? (counts.yes / evaluable) * weight : null;
        if (criterionScore !== null) {
            earnedWeight += criterionScore;
            evaluableWeight += weight;
        } else if (counts.unsure > 0) {
            excludedWeight += weight;
        }
        return {
            key: question.key as EmployeeScoreQuestionKey,
            label: question.label,
            weight,
            yes: counts.yes,
            no: counts.no,
            unsure: counts.unsure,
            evaluable,
            earnedPerResponse: criterionScore,
        };
    });

    const meetsMinimumSample = responses.length >= minimumSample;
    const normalized = evaluableWeight > 0 ? (earnedWeight / evaluableWeight) * EMPLOYEE_SCORE_TOTAL : null;
    return {
        responseCount: responses.length,
        minimumSample,
        meetsMinimumSample,
        score64: meetsMinimumSample && normalized !== null ? normalized : null,
        earnedWeight,
        evaluableWeight,
        excludedWeight,
        criteria,
    };
}
