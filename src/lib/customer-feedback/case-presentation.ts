import {
    INCIDENT_TYPES,
    RATING_OPTIONS,
    SERVICE_AREAS,
    employeeBehaviorQuestionsForVersion,
    getSurvey,
    isStandardSurveyVersion,
} from "./questions";

export interface FeedbackCaseAnswerInput {
    questionKey: string;
    state: string;
    numberValue?: number | null;
    textValue?: string | null;
    choiceValues?: string[];
}

export interface FeedbackCaseResponseInput {
    kind: string;
    surveyVersion?: string | null;
    overallRating?: number | null;
    reasonKeys?: string[];
    serviceAreas?: string[];
    incidentKey?: string | null;
    dangerStatus?: string | null;
    wantsFollowUp?: boolean;
    employeeLabelSnapshot?: string | null;
    stationLabelSnapshot?: string | null;
    answers?: FeedbackCaseAnswerInput[];
}

export interface FeedbackBehaviorFinding {
    questionKey: string;
    label: string;
    weight: number | null;
    answer: "YES" | "NO" | "UNSURE" | null;
}

export function feedbackRatingLabel(rating: number | null | undefined): string | null {
    if (rating == null) return null;
    return RATING_OPTIONS.find((option) => option.value === rating)?.label.th ?? null;
}

export function feedbackReasonLabels(surveyVersion: string | null | undefined, keys: string[] | null | undefined): string[] {
    const survey = surveyVersion ? getSurvey(surveyVersion) : undefined;
    const options = survey?.reasonOptions ?? [];
    return (keys ?? []).map((key) => options.find((option) => option.key === key)?.label.th ?? key);
}

export function feedbackServiceAreaLabels(keys: string[] | null | undefined): string[] {
    return (keys ?? []).map((key) => SERVICE_AREAS.find((area) => area.key === key)?.label.th ?? key);
}

export function feedbackIncidentLabel(key: string | null | undefined): string | null {
    if (!key) return null;
    return INCIDENT_TYPES.find((item) => item.key === key)?.label.th ?? key;
}

export function feedbackBehaviorFindings(
    surveyVersion: string | null | undefined,
    answers: FeedbackCaseAnswerInput[] | null | undefined,
): FeedbackBehaviorFinding[] {
    if (!surveyVersion || !isStandardSurveyVersion(surveyVersion)) return [];
    const questions = employeeBehaviorQuestionsForVersion(surveyVersion);
    if (questions.length === 0) return [];
    const answerMap = new Map((answers ?? []).map((answer) => [answer.questionKey, answer]));
    return questions.map((question) => {
        const value = answerMap.get(question.key)?.choiceValues?.[0];
        return {
            questionKey: question.key,
            label: question.label.th,
            weight: question.weight ?? null,
            answer: value === "YES" || value === "NO" || value === "UNSURE" ? value : null,
        };
    });
}

export function feedbackAnswerLabel(answer: FeedbackBehaviorFinding["answer"]): string {
    if (answer === "YES") return "ผ่าน";
    if (answer === "NO") return "ไม่ผ่าน";
    if (answer === "UNSURE") return "ลูกค้าไม่แน่ใจ";
    return "ไม่มีข้อมูล";
}

export function feedbackCaseTrigger(
    response: FeedbackCaseResponseInput,
    category?: string | null,
): { headline: string; detail: string } {
    if (response.kind === "INCIDENT") {
        const incident = feedbackIncidentLabel(response.incidentKey) ?? "เหตุที่ลูกค้าแจ้ง";
        return {
            headline: `ลูกค้าแจ้ง: ${incident}`,
            detail: response.dangerStatus === "YES"
                ? "ลูกค้าระบุว่ายังมีอันตราย ระบบจึงยกระดับเป็น URGENT"
                : "เป็นการแจ้งเหตุที่ต้องตรวจสอบและบันทึกวิธีจัดการ",
        };
    }

    const rating = response.overallRating;
    const ratingLabel = feedbackRatingLabel(rating);
    if (category === "manual") {
        return {
            headline: rating ? `คะแนนลูกค้า ${rating}/5${ratingLabel ? ` — ${ratingLabel}` : ""}` : "เคสที่ผู้ดูแลสร้างจากคำตอบลูกค้า",
            detail: "เคสนี้ถูกสร้างโดยผู้ดูแล ให้ตรวจคำตอบด้านล่างเพื่อดูประเด็นที่ต้องติดตาม",
        };
    }
    if (rating != null && rating <= 2) {
        return {
            headline: `ลูกค้าให้ ${rating}/5${ratingLabel ? ` — ${ratingLabel}` : ""}`,
            detail: "คะแนน 1–2 เปิดเคส HIGH อัตโนมัติ และต้องรับทราบภายใน 24 ชั่วโมง",
        };
    }
    const reasons = response.reasonKeys ?? [];
    if (rating === 3 && reasons.some((key) => key === "employee_safety" || key === "station_safety")) {
        return {
            headline: `ลูกค้าให้ 3/5 และระบุเรื่องความปลอดภัย`,
            detail: "ระบบเปิดเคส HIGH เพราะมีประเด็นความปลอดภัย แม้คะแนนรวมจะเป็นระดับปานกลาง",
        };
    }
    if (response.wantsFollowUp) {
        return {
            headline: rating ? `ลูกค้าให้ ${rating}/5 และขอให้ติดต่อกลับ` : "ลูกค้าขอให้ติดต่อกลับ",
            detail: "ระบบเปิดเคส NORMAL เพื่อให้มีผู้รับผิดชอบติดตามและบันทึกผลการดำเนินการ",
        };
    }
    return {
        headline: rating ? `คะแนนลูกค้า ${rating}/5${ratingLabel ? ` — ${ratingLabel}` : ""}` : "คำตอบลูกค้าที่ต้องติดตาม",
        detail: "ตรวจสาเหตุและคำตอบด้านล่างก่อนรับงานหรือปิดเคส",
    };
}

export function feedbackCaseActionSteps(response: FeedbackCaseResponseInput): string[] {
    if (response.kind === "INCIDENT") {
        return [
            "ตรวจประเภทเหตุ สถานี เวลา และรายละเอียดที่ลูกค้าแจ้ง",
            "มอบหมายผู้รับผิดชอบและตรวจข้อเท็จจริง/แก้ความเสี่ยงที่หน้างาน",
            "เมื่อจัดการแล้ว กดปิดเคสและบันทึกวิธีแก้ไขให้ชัดเจน",
        ];
    }
    if (response.overallRating != null && response.overallRating <= 2) {
        return [
            "ดูสาเหตุที่ลูกค้าเลือก และข้อบริการที่ตอบว่า “ไม่ผ่าน” ด้านล่าง",
            "สอบถามพนักงานหรือหัวหน้ากะเพื่อหาสาเหตุ และโค้ช/แก้ขั้นตอนที่เกี่ยวข้อง",
            "เมื่อดำเนินการแล้ว กดปิดเคสและบันทึกว่าแก้อะไรไปบ้าง",
        ];
    }
    if (response.wantsFollowUp) {
        return [
            "รับงานและตรวจคำตอบของลูกค้าให้ครบก่อนติดต่อกลับ",
            "ประสานผู้รับผิดชอบของสถานีและดำเนินการตามประเด็นที่ลูกค้าระบุ",
            "บันทึกผลการติดตามในช่องปิดเคสเมื่อดำเนินการเรียบร้อย",
        ];
    }
    return [
        "ตรวจคำตอบและสาเหตุที่ลูกค้าระบุ",
        "มอบหมายผู้รับผิดชอบหากต้องติดตามต่อ",
        "บันทึกวิธีจัดการก่อนปิดเคส",
    ];
}

export function feedbackCaseNotificationMessage(
    response: FeedbackCaseResponseInput | null | undefined,
    severity: "NORMAL" | "HIGH" | "URGENT",
    category?: string | null,
): string {
    if (!response) {
        if (severity === "URGENT") return "มีเหตุเร่งด่วนจากลูกค้าที่ต้องรับทราบภายใน 2 ชั่วโมง";
        if (severity === "HIGH") return "มีคำตอบลูกค้าเชิงลบที่ต้องรับทราบภายใน 24 ชั่วโมง";
        return "ลูกค้าขอให้ติดต่อกลับ";
    }
    if (response.kind === "INCIDENT") {
        // Keep incident push/in-app notification generic. Some recipients may be
        // allowed to receive the escalation signal but not the sensitive incident detail.
        return severity === "URGENT"
            ? "มีเหตุเร่งด่วนจากลูกค้าที่ต้องรับทราบภายใน 2 ชั่วโมง"
            : "มีเหตุจากลูกค้าที่ต้องตรวจสอบ";
    }

    const target = response.employeeLabelSnapshot ? `${response.employeeLabelSnapshot}: ` : "";
    const trigger = feedbackCaseTrigger(response, category);
    const reasons = feedbackReasonLabels(response.surveyVersion, response.reasonKeys);
    const reasonSuffix = reasons.length > 0 ? ` · สาเหตุ: ${reasons.join(", ")}` : "";
    if (severity === "HIGH") return `${target}${trigger.headline}${reasonSuffix}`;
    if (response.wantsFollowUp) return `${target}ลูกค้าขอให้ติดต่อกลับ${response.overallRating ? ` · คะแนน ${response.overallRating}/5` : ""}`;
    return `${target}${trigger.headline}`;
}
