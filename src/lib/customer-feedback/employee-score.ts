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
    submittedAt?: Date | string | null;
    shiftLabelSnapshot?: string | null;
    comment?: string | null;
    overallRating?: number | null;
    durationSeconds?: number | null;
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

export interface HourlyStat {
    hour: number;
    label: string;
    responseCount: number;
    score64: number | null;
}

export interface TimeSlotStat {
    slotKey: "morning_rush" | "daytime" | "evening_rush" | "night";
    label: string;
    timeRange: string;
    responseCount: number;
    score64: number | null;
    isPeak: boolean;
}

export interface ShiftStat {
    shiftLabel: string;
    responseCount: number;
    score64: number | null;
}

export interface DayOfWeekStat {
    type: "weekday" | "weekend";
    label: string;
    responseCount: number;
    score64: number | null;
}

export interface ProgressionBucket {
    periodKey: string;
    label: string;
    startDate: string;
    endDate: string;
    responseCount: number;
    score64: number | null;
    customerPoints: number | null;
}

export interface RushHourRubricComparison {
    questionKey: EmployeeScoreQuestionKey;
    label: { th: string; en: string };
    weight: number;
    normalRate: number | null;
    rushHourRate: number | null;
    gap: number | null;
    isDropAlert: boolean;
}

export interface RecentFeedbackItem {
    id: string;
    submittedAt: string;
    timeLabel: string;
    shiftLabel: string | null;
    durationSeconds: number;
    score64: number | null;
    comment: string | null;
    missedCriteria: string[];
}

export interface EmployeeTemporalStats {
    peakHour: string | null;
    peakSlot: string | null;
    hourly: HourlyStat[];
    timeSlots: TimeSlotStat[];
    shifts: ShiftStat[];
    dayOfWeek: DayOfWeekStat[];
    progression: {
        buckets: ProgressionBucket[];
        trend: "improving" | "declining" | "stable" | "insufficient_data";
        delta: number | null;
        summaryText: string;
    };
    rushHourRubric: RushHourRubricComparison[];
    recentFeedbacks: RecentFeedbackItem[];
}

function parseDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function toBangkokDate(date: Date): Date {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}

function formatThaiDateTime(date: Date): string {
    const bangkok = toBangkokDate(date);
    const day = bangkok.getUTCDate();
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const month = monthNames[bangkok.getUTCMonth()];
    const year = (bangkok.getUTCFullYear() + 543).toString().slice(-2);
    const hours = bangkok.getUTCHours().toString().padStart(2, "0");
    const minutes = bangkok.getUTCMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes} น.`;
}

function isRushHour(bangkokDate: Date): boolean {
    const hour = bangkokDate.getUTCHours();
    const minutes = bangkokDate.getUTCMinutes();
    if (hour >= 6 && hour < 9) return true;
    if (hour >= 16 && (hour < 19 || (hour === 19 && minutes < 30))) return true;
    return false;
}

/**
 * วิเคราะห์ข้อมูลสถิติเชิงลึกตามมิติเวลา (ชั่วโมง, กะ, พัฒนาการ, จุดตกหล่นชั่วโมงเร่งด่วน)
 */
export function calculateEmployeeTemporalStats(
    responses: EmployeeScoreResponseInput[]
): EmployeeTemporalStats {
    // 1. จัดเตรียมโครงสร้าง 24 ชั่วโมง
    const hourlyMap = new Map<number, EmployeeScoreResponseInput[]>();
    for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, []);
    }

    // 2. จัดกลุ่มตาม Time Slot
    const slotBuckets: Record<TimeSlotStat["slotKey"], EmployeeScoreResponseInput[]> = {
        morning_rush: [],
        daytime: [],
        evening_rush: [],
        night: [],
    };

    // 3. จัดกลุ่มตาม Shift
    const shiftMap = new Map<string, EmployeeScoreResponseInput[]>();

    // 4. จัดกลุ่มตาม Weekday / Weekend
    const weekdayResponses: EmployeeScoreResponseInput[] = [];
    const weekendResponses: EmployeeScoreResponseInput[] = [];

    // 5. แยก Rush vs Normal สำหรับเปรียบเทียบ rubric
    const rushResponses: EmployeeScoreResponseInput[] = [];
    const normalResponses: EmployeeScoreResponseInput[] = [];

    // 6. เก็บรายการที่มีวันที่ถูกต้องสำหรับไทม์ไลน์
    const datedResponses: { date: Date; response: EmployeeScoreResponseInput }[] = [];

    for (const response of responses) {
        const d = parseDate(response.submittedAt);
        if (!d) continue;
        datedResponses.push({ date: d, response });

        const bangkok = toBangkokDate(d);
        const hour = bangkok.getUTCHours();
        const minutes = bangkok.getUTCMinutes();
        const day = bangkok.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

        hourlyMap.get(hour)?.push(response);

        if (hour >= 6 && hour < 9) {
            slotBuckets.morning_rush.push(response);
        } else if (hour >= 9 && hour < 16) {
            slotBuckets.daytime.push(response);
        } else if (hour >= 16 && (hour < 19 || (hour === 19 && minutes < 30))) {
            slotBuckets.evening_rush.push(response);
        } else {
            slotBuckets.night.push(response);
        }

        const shiftKey = response.shiftLabelSnapshot?.trim() || "ไม่ระบุกะ";
        const shiftList = shiftMap.get(shiftKey) ?? [];
        shiftList.push(response);
        shiftMap.set(shiftKey, shiftList);

        if (day === 0 || day === 6) {
            weekendResponses.push(response);
        } else {
            weekdayResponses.push(response);
        }

        if (isRushHour(bangkok)) {
            rushResponses.push(response);
        } else {
            normalResponses.push(response);
        }
    }

    // สรุปข้อมูลรายชั่วโมง 0..23
    let maxHourCount = 0;
    let peakHourIndex = -1;
    const hourly: HourlyStat[] = [];
    for (let h = 0; h < 24; h++) {
        const list = hourlyMap.get(h) ?? [];
        const count = list.length;
        if (count > maxHourCount) {
            maxHourCount = count;
            peakHourIndex = h;
        }
        const score = count > 0 ? summarizeEmployeeRubric(list, 1).score64 : null;
        hourly.push({
            hour: h,
            label: `${h.toString().padStart(2, "0")}:00`,
            responseCount: count,
            score64: score !== null ? Math.round(score * 10) / 10 : null,
        });
    }

    const peakHour = peakHourIndex >= 0 && maxHourCount > 0
        ? `${peakHourIndex.toString().padStart(2, "0")}:00 - ${(peakHourIndex + 1).toString().padStart(2, "0")}:00 (${maxHourCount} แบบ)`
        : null;

    // สรุป Time Slots
    const slotDefinitions: { key: TimeSlotStat["slotKey"]; label: string; timeRange: string }[] = [
        { key: "morning_rush", label: "เช้าเร่งด่วน (06:00 - 09:00)", timeRange: "06:00 - 09:00" },
        { key: "daytime", label: "กลางวันทั่วไป (09:00 - 16:00)", timeRange: "09:00 - 16:00" },
        { key: "evening_rush", label: "เย็นเร่งด่วน (16:00 - 19:30)", timeRange: "16:00 - 19:30" },
        { key: "night", label: "ค่ำ / นอกเวลาเร่งด่วน", timeRange: "19:30 - 06:00" },
    ];

    let maxSlotCount = 0;
    let peakSlotKey: TimeSlotStat["slotKey"] | null = null;
    for (const def of slotDefinitions) {
        const count = slotBuckets[def.key].length;
        if (count > maxSlotCount) {
            maxSlotCount = count;
            peakSlotKey = def.key;
        }
    }

    const timeSlots: TimeSlotStat[] = slotDefinitions.map((def) => {
        const list = slotBuckets[def.key];
        const count = list.length;
        const score = count > 0 ? summarizeEmployeeRubric(list, 1).score64 : null;
        return {
            slotKey: def.key,
            label: def.label,
            timeRange: def.timeRange,
            responseCount: count,
            score64: score !== null ? Math.round(score * 10) / 10 : null,
            isPeak: maxSlotCount > 0 && def.key === peakSlotKey,
        };
    });

    const peakSlotDef = slotDefinitions.find((def) => def.key === peakSlotKey);
    const peakSlot = peakSlotDef && maxSlotCount > 0 ? `${peakSlotDef.label} (${maxSlotCount} แบบ)` : null;

    // สรุป Shift
    const shifts: ShiftStat[] = Array.from(shiftMap.entries())
        .map(([shiftLabel, list]) => {
            const count = list.length;
            const score = count > 0 ? summarizeEmployeeRubric(list, 1).score64 : null;
            return {
                shiftLabel,
                responseCount: count,
                score64: score !== null ? Math.round(score * 10) / 10 : null,
            };
        })
        .sort((a, b) => b.responseCount - a.responseCount);

    // สรุป Day of Week
    const weekdayScore = weekdayResponses.length > 0 ? summarizeEmployeeRubric(weekdayResponses, 1).score64 : null;
    const weekendScore = weekendResponses.length > 0 ? summarizeEmployeeRubric(weekendResponses, 1).score64 : null;
    const dayOfWeek: DayOfWeekStat[] = [
        {
            type: "weekday",
            label: "วันธรรมดา (จ.-ศ.)",
            responseCount: weekdayResponses.length,
            score64: weekdayScore !== null ? Math.round(weekdayScore * 10) / 10 : null,
        },
        {
            type: "weekend",
            label: "วันหยุด (ส.-อา.)",
            responseCount: weekendResponses.length,
            score64: weekendScore !== null ? Math.round(weekendScore * 10) / 10 : null,
        },
    ];

    // สรุปพัฒนาการ (Progression Buckets)
    datedResponses.sort((a, b) => a.date.getTime() - b.date.getTime());
    const progressionBuckets: ProgressionBucket[] = [];
    if (datedResponses.length > 0) {
        const firstTime = datedResponses[0].date.getTime();
        const lastTime = datedResponses[datedResponses.length - 1].date.getTime();
        const spanDays = Math.max(1, Math.ceil((lastTime - firstTime) / (24 * 3600 * 1000)));

        if (spanDays <= 7) {
            // รวมกลุ่มรายวัน
            const dayMap = new Map<string, EmployeeScoreResponseInput[]>();
            for (const item of datedResponses) {
                const dayKey = toBangkokDate(item.date).toISOString().slice(0, 10);
                const list = dayMap.get(dayKey) ?? [];
                list.push(item.response);
                dayMap.set(dayKey, list);
            }
            for (const [dayKey, list] of dayMap.entries()) {
                const score = summarizeEmployeeRubric(list, 1).score64;
                const bangkok = new Date(`${dayKey}T00:00:00.000Z`);
                const label = `${bangkok.getUTCDate()}/${bangkok.getUTCMonth() + 1}`;
                progressionBuckets.push({
                    periodKey: dayKey,
                    label,
                    startDate: dayKey,
                    endDate: dayKey,
                    responseCount: list.length,
                    score64: score !== null ? Math.round(score * 10) / 10 : null,
                    customerPoints: score !== null ? Math.round(((score * 40) / EMPLOYEE_SCORE_TOTAL) * 10) / 10 : null,
                });
            }
        } else {
            // รวมกลุ่มรายสัปดาห์ (7 วันต่อถัง สูงสุด 5 ถัง)
            const bucketIntervalMs = 7 * 24 * 3600 * 1000;
            const weekMap = new Map<number, { startDate: Date; endDate: Date; list: EmployeeScoreResponseInput[] }>();
            for (const item of datedResponses) {
                const diffMs = item.date.getTime() - firstTime;
                const weekIdx = Math.min(4, Math.floor(diffMs / bucketIntervalMs));
                const current = weekMap.get(weekIdx) ?? {
                    startDate: new Date(firstTime + weekIdx * bucketIntervalMs),
                    endDate: new Date(firstTime + (weekIdx + 1) * bucketIntervalMs - 1),
                    list: [],
                };
                current.list.push(item.response);
                weekMap.set(weekIdx, current);
            }
            for (const [weekIdx, item] of weekMap.entries()) {
                const score = summarizeEmployeeRubric(item.list, 1).score64;
                progressionBuckets.push({
                    periodKey: `week-${weekIdx + 1}`,
                    label: `สัปดาห์ที่ ${weekIdx + 1}`,
                    startDate: toBangkokDate(item.startDate).toISOString().slice(0, 10),
                    endDate: toBangkokDate(item.endDate).toISOString().slice(0, 10),
                    responseCount: item.list.length,
                    score64: score !== null ? Math.round(score * 10) / 10 : null,
                    customerPoints: score !== null ? Math.round(((score * 40) / EMPLOYEE_SCORE_TOTAL) * 10) / 10 : null,
                });
            }
        }
    }

    const scoredBuckets = progressionBuckets.filter((b) => b.score64 !== null);
    let trend: "improving" | "declining" | "stable" | "insufficient_data" = "insufficient_data";
    let delta: number | null = null;
    let summaryText = "ยังมีข้อมูลไม่เพียงพอในการวัดแนวโน้มพัฒนาการ";

    if (scoredBuckets.length >= 2 && datedResponses.length >= 5) {
        const last = scoredBuckets[scoredBuckets.length - 1];
        const prev = scoredBuckets[scoredBuckets.length - 2];
        delta = Math.round((last.score64! - prev.score64!) * 10) / 10;
        if (delta >= 1.5) {
            trend = "improving";
            summaryText = `คะแนนเฉลี่ยปรับตัวดีขึ้น +${delta.toFixed(1)} คะแนน เทียบกับช่วงก่อนหน้า (มีพัฒนาการ ↗)`;
        } else if (delta <= -1.5) {
            trend = "declining";
            summaryText = `คะแนนเฉลี่ยลดลง ${delta.toFixed(1)} คะแนน เทียบกับช่วงก่อนหน้า (ควรติดตามและโค้ชชิ่ง ↘)`;
        } else {
            trend = "stable";
            summaryText = `คะแนนการบริการสม่ำเสมอคงที่ (ผลต่าง ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} คะแนน)`;
        }
    } else if (datedResponses.length >= 1) {
        summaryText = `มีแบบประเมินสะสม ${datedResponses.length} แบบ (รอสะสมข้อมูลเพื่อวัดแนวโน้ม)`;
    }

    // สรุป Rush Hour vs Normal Rubric Comparison
    const rushHourRubric: RushHourRubricComparison[] = EMPLOYEE_SCORE_QUESTIONS.map((question) => {
        let normalYes = 0;
        let normalEvaluable = 0;
        for (const res of normalResponses) {
            const ans = res.answers.find((a) => a.questionKey === question.key)?.answer;
            if (ans === "YES") {
                normalYes++;
                normalEvaluable++;
            } else if (ans === "NO") {
                normalEvaluable++;
            }
        }

        let rushYes = 0;
        let rushEvaluable = 0;
        for (const res of rushResponses) {
            const ans = res.answers.find((a) => a.questionKey === question.key)?.answer;
            if (ans === "YES") {
                rushYes++;
                rushEvaluable++;
            } else if (ans === "NO") {
                rushEvaluable++;
            }
        }

        const normalRate = normalEvaluable > 0 ? Math.round((normalYes / normalEvaluable) * 100) : null;
        const rushHourRate = rushEvaluable > 0 ? Math.round((rushYes / rushEvaluable) * 100) : null;
        const gap = normalRate !== null && rushHourRate !== null ? rushHourRate - normalRate : null;
        const isDropAlert = gap !== null && gap <= -10 && rushEvaluable >= 2;

        return {
            questionKey: question.key as EmployeeScoreQuestionKey,
            label: question.label,
            weight: question.weight ?? 0,
            normalRate,
            rushHourRate,
            gap,
            isDropAlert,
        };
    });

    // สรุป Recent Feedbacks (ล่าสุด 20 รายการ)
    const recentFeedbacks: RecentFeedbackItem[] = datedResponses
        .slice()
        .reverse()
        .slice(0, 20)
        .map(({ date, response }) => {
            const singleScore = summarizeEmployeeRubric([response], 1).score64;
            const missedCriteria: string[] = [];
            for (const ans of response.answers) {
                if (ans.answer === "NO") {
                    const q = EMPLOYEE_SCORE_QUESTIONS.find((item) => item.key === ans.questionKey);
                    if (q) missedCriteria.push(q.label.th);
                }
            }
            return {
                id: response.responseId,
                submittedAt: date.toISOString(),
                timeLabel: formatThaiDateTime(date),
                shiftLabel: response.shiftLabelSnapshot ?? null,
                durationSeconds: response.durationSeconds ?? 0,
                score64: singleScore !== null ? Math.round(singleScore * 10) / 10 : null,
                comment: response.comment?.trim() || null,
                missedCriteria,
            };
        });

    return {
        peakHour,
        peakSlot,
        hourly,
        timeSlots,
        shifts,
        dayOfWeek,
        progression: {
            buckets: progressionBuckets,
            trend,
            delta,
            summaryText,
        },
        rushHourRubric,
        recentFeedbacks,
    };
}

