/**
 * Question registry ของแบบประเมินเสียงลูกค้า
 *
 * กติกาสำคัญ (docs/customer-feedback-qr-evaluation-plan.md §3.3):
 * - question key ที่เผยแพร่แล้วห้ามเปลี่ยนความหมาย
 * - ถ้าจะแก้คำถาม ให้เพิ่ม survey version ใหม่และเก็บ version เดิมไว้
 * - คะแนน 1–2 ต้องเลือกสาเหตุอย่างน้อยหนึ่งข้อหรือ "ไม่สะดวกระบุ"
 */

export type SurveyVersion = "employee-v1" | "employee-v2" | "employee-v3" | "employee-v4" | "station-v1" | "incident-v1";
export type StandardSurveyVersion = Exclude<SurveyVersion, "incident-v1">;
export type QuestionOwner = "EMPLOYEE" | "SYSTEM" | "STATION" | "UNKNOWN";
export type BehaviorAnswer = "YES" | "NO" | "UNSURE";

export const STANDARD_SURVEY_VERSIONS = ["employee-v1", "employee-v2", "employee-v3", "employee-v4", "station-v1"] as const satisfies readonly StandardSurveyVersion[];

export function isStandardSurveyVersion(version: string): version is StandardSurveyVersion {
    return (STANDARD_SURVEY_VERSIONS as readonly string[]).includes(version);
}

export interface LocalizedText {
    th: string;
    en: string;
}

export interface ReasonOption {
    key: string;
    label: LocalizedText;
    owner: QuestionOwner;
}

export interface ServiceAreaOption {
    key: string;
    label: LocalizedText;
}

export interface BehaviorQuestion {
    key: EmployeeBehaviorQuestionKey;
    label: LocalizedText;
    /** คะแนนเต็มของเกณฑ์เมื่อคำถามนี้ใช้เป็น rubric; v2 เดิมไม่มีน้ำหนักคะแนน */
    weight?: number;
}

export interface SurveyDefinition {
    version: SurveyVersion;
    maxReasons: number;
    commentMaxLength: number;
    reasonOptions: ReasonOption[];
    behaviorQuestions: BehaviorQuestion[];
}

export const RATING_OPTIONS: { value: number; label: LocalizedText }[] = [
    { value: 1, label: { th: "ไม่พอใจมาก", en: "Very dissatisfied" } },
    { value: 2, label: { th: "ไม่พอใจ", en: "Dissatisfied" } },
    { value: 3, label: { th: "ปานกลาง", en: "Neutral" } },
    { value: 4, label: { th: "พอใจ", en: "Satisfied" } },
    { value: 5, label: { th: "พอใจมาก", en: "Very satisfied" } },
];

/** ตัวเลือกที่เป็น "ตัวเลือกเดี่ยว" — เลือกแล้วยกเลิกตัวอื่นทันที */
export const SINGLETON_CHOICE_KEYS = new Set(["unspecified", "unsure"]);
/** ตัวเลือกที่ตรึงไว้ท้ายรายการเสมอ */
export const PINNED_TAIL_KEYS = new Set(["other", "unspecified", "unsure"]);

export const TARGET_CONFIRMATION_QUESTION: LocalizedText = {
    th: "วันนี้ {target} เป็นผู้ให้บริการคุณใช่ไหม",
    en: "Did {target} serve you today",
};

export const EMPLOYEE_REASON_OPTIONS: ReasonOption[] = [
    { key: "employee_courtesy", label: { th: "การพูดจาและความสุภาพ", en: "Courtesy and politeness" }, owner: "EMPLOYEE" },
    { key: "employee_clarity", label: { th: "ความชัดเจนของข้อมูล", en: "Clarity of information" }, owner: "EMPLOYEE" },
    { key: "employee_accuracy", label: { th: "ความถูกต้องของบริการ", en: "Accuracy of service" }, owner: "EMPLOYEE" },
    { key: "employee_helpfulness", label: { th: "การใส่ใจและช่วยแก้ปัญหา", en: "Helpfulness" }, owner: "EMPLOYEE" },
    { key: "employee_safety", label: { th: "การปฏิบัติตามขั้นตอนความปลอดภัยขณะให้บริการ", en: "Safety procedure compliance" }, owner: "EMPLOYEE" },
    { key: "employee_fairness", label: { th: "ความเท่าเทียมในการให้บริการ", en: "Fairness of service" }, owner: "EMPLOYEE" },
    { key: "system_wait", label: { th: "เวลารอหรือจำนวนพนักงาน", en: "Waiting time or staffing" }, owner: "SYSTEM" },
    { key: "system_process", label: { th: "ขั้นตอนหรือระบบชำระเงิน", en: "Process or payment system" }, owner: "SYSTEM" },
    { key: "system_availability", label: { th: "สินค้าหรืออุปกรณ์ไม่พร้อม", en: "Product or equipment unavailable" }, owner: "SYSTEM" },
    { key: "other", label: { th: "อื่น ๆ", en: "Other" }, owner: "UNKNOWN" },
    { key: "unspecified", label: { th: "ไม่สะดวกระบุ", en: "Prefer not to say" }, owner: "UNKNOWN" },
];

export const EMPLOYEE_BEHAVIOR_QUESTION_KEYS = [
    "appearance_neat",
    "vehicle_guidance",
    "greeted_customer",
    "order_repeated",
    "special_service_offered",
    "thanked_customer",
    "front_sign_placed",
] as const;

/** employee-v3: rubric หน้าลานตามป้าย Caltex รวม 64 คะแนน */
export const EMPLOYEE_SCORE_QUESTION_KEYS = [
    "uniform_and_name_badge",
    "guide_vehicle_immediately",
    "receive_driver_side",
    "caltex_greeting",
    "front_service_sign",
    "repeat_fuel_amount_before",
    "offer_rewards_promotion",
    "repeat_fuel_amount_after",
    "thank_and_guide_exit",
] as const;

export type EmployeeV2BehaviorQuestionKey = (typeof EMPLOYEE_BEHAVIOR_QUESTION_KEYS)[number];
export type EmployeeScoreQuestionKey = (typeof EMPLOYEE_SCORE_QUESTION_KEYS)[number];
export type EmployeeBehaviorQuestionKey = EmployeeV2BehaviorQuestionKey | EmployeeScoreQuestionKey;
export type EmployeeBehaviorAnswers = Partial<Record<EmployeeBehaviorQuestionKey, BehaviorAnswer>>;

/** คำถามพฤติกรรมที่เพิ่มใน employee-v2 — key ที่เผยแพร่แล้วห้ามเปลี่ยนความหมาย */
export const EMPLOYEE_BEHAVIOR_QUESTIONS: BehaviorQuestion[] = [
    {
        key: "appearance_neat",
        label: { th: "พนักงานแต่งกายสะอาดและเรียบร้อย", en: "The employee was clean and neatly dressed" },
    },
    {
        key: "vehicle_guidance",
        label: { th: "พนักงานโบกรถและแนะนำจุดจอดอย่างเหมาะสม", en: "The employee guided your vehicle to the service point" },
    },
    {
        key: "greeted_customer",
        label: { th: "พนักงานกล่าวทักทายคุณ", en: "The employee greeted you" },
    },
    {
        key: "order_repeated",
        label: { th: "พนักงานทวนรายการที่คุณสั่ง", en: "The employee repeated your order" },
    },
    {
        key: "special_service_offered",
        label: { th: "พนักงานเสนอผลิตภัณฑ์หรือบริการพิเศษ", en: "The employee offered special products or services" },
    },
    {
        key: "thanked_customer",
        label: { th: "พนักงานกล่าวขอบคุณหลังให้บริการ", en: "The employee thanked you after the service" },
    },
    {
        key: "front_sign_placed",
        label: { th: "พนักงานวางป้ายบริการหน้ารถ", en: "The employee placed the service sign in front of the vehicle" },
    },
];

/**
 * employee-v3 — เกณฑ์บริการหน้าลานจากป้ายตรวจ 64 คะแนน
 * YES = ได้คะแนนเต็มข้อนั้น, NO = 0, UNSURE = ตัดน้ำหนักข้อนั้นออกจากฐานคำนวณ
 */
export const EMPLOYEE_SCORE_QUESTIONS: BehaviorQuestion[] = [
    { key: "uniform_and_name_badge", weight: 15, label: { th: "พนักงานแต่งกายตามมาตรฐานและมีป้ายชื่อเรียบร้อย", en: "The employee wore the standard uniform and name badge neatly" } },
    { key: "guide_vehicle_immediately", weight: 10, label: { th: "พนักงานโบกรถเข้ารับบริการทันที", en: "The employee promptly guided your vehicle into the service point" } },
    { key: "receive_driver_side", weight: 3, label: { th: "พนักงานเข้ารับรถทางฝั่งคนขับ", en: "The employee approached your vehicle from the driver's side" } },
    { key: "caltex_greeting", weight: 10, label: { th: "พนักงานกล่าวทักทาย “คาลเท็กซ์ สวัสดีครับ/ค่ะ”", en: "The employee greeted you with the Caltex greeting" } },
    { key: "front_service_sign", weight: 3, label: { th: "พนักงานวางป้ายบริการหน้ารถ", en: "The employee placed the service sign in front of the vehicle" } },
    { key: "repeat_fuel_amount_before", weight: 4, label: { th: "พนักงานทวนประเภทน้ำมันและจำนวนเงินก่อนเติม", en: "The employee repeated the fuel type and amount before fueling" } },
    { key: "offer_rewards_promotion", weight: 5, label: { th: "พนักงานเสนอ Caltex Rewards หรือโปรโมชั่นที่เกี่ยวข้อง", en: "The employee offered Caltex Rewards or a relevant promotion" } },
    { key: "repeat_fuel_amount_after", weight: 4, label: { th: "ตอนรับชำระเงิน พนักงานทวนประเภทน้ำมันและจำนวนเงินหลังเติม", en: "At payment, the employee repeated the fuel type and amount after fueling" } },
    { key: "thank_and_guide_exit", weight: 10, label: { th: "พนักงานกล่าวขอบคุณและโบกรถออกจากสถานี", en: "The employee thanked you and guided your vehicle out" } },
];

export const EMPLOYEE_SCORE_TOTAL = EMPLOYEE_SCORE_QUESTIONS.reduce((sum, question) => sum + (question.weight ?? 0), 0);

export function employeeBehaviorQuestionsForVersion(version: StandardSurveyVersion): BehaviorQuestion[] {
    if (version === "employee-v2") return EMPLOYEE_BEHAVIOR_QUESTIONS;
    if (version === "employee-v3" || version === "employee-v4") return EMPLOYEE_SCORE_QUESTIONS;
    return [];
}

export function employeeBehaviorQuestionKeysForVersion(version: StandardSurveyVersion): readonly EmployeeBehaviorQuestionKey[] {
    return employeeBehaviorQuestionsForVersion(version).map((question) => question.key);
}


export const STATION_REASON_OPTIONS: ReasonOption[] = [
    { key: "station_cleanliness", label: { th: "ความสะอาด", en: "Cleanliness" }, owner: "STATION" },
    { key: "station_orderliness", label: { th: "ความเป็นระเบียบ", en: "Orderliness" }, owner: "STATION" },
    { key: "station_wait", label: { th: "เวลารอ", en: "Waiting time" }, owner: "STATION" },
    { key: "station_signage", label: { th: "ป้ายและข้อมูล", en: "Signage and information" }, owner: "STATION" },
    { key: "station_facilities", label: { th: "ความพร้อมของอุปกรณ์หรือจุดบริการ", en: "Facility readiness" }, owner: "STATION" },
    { key: "station_access", label: { th: "ความสะดวกในการเข้าใช้", en: "Ease of access" }, owner: "STATION" },
    { key: "station_safety", label: { th: "ความปลอดภัย", en: "Safety" }, owner: "STATION" },
    { key: "station_staff_service", label: { th: "การบริการของพนักงานโดยรวม", en: "Overall staff service" }, owner: "STATION" },
    { key: "station_process", label: { th: "ขั้นตอนการให้บริการ", en: "Service process" }, owner: "STATION" },
    { key: "station_availability", label: { th: "สินค้าหรือบริการพร้อมใช้งาน", en: "Product or service availability" }, owner: "STATION" },
    { key: "other", label: { th: "อื่น ๆ", en: "Other" }, owner: "UNKNOWN" },
    { key: "unspecified", label: { th: "ไม่สะดวกระบุ", en: "Prefer not to say" }, owner: "UNKNOWN" },
];

export const SERVICE_AREAS: ServiceAreaOption[] = [
    { key: "fuel_service", label: { th: "จุดเติมน้ำมันหรือดูแลรถ", en: "Fuel or car service" } },
    { key: "payment_shop", label: { th: "จุดชำระเงินหรือร้านค้า", en: "Payment counter or shop" } },
    { key: "food_beverage", label: { th: "อาหารหรือเครื่องดื่ม", en: "Food or beverage" } },
    { key: "information_help", label: { th: "จุดข้อมูลหรือขอความช่วยเหลือ", en: "Information or help desk" } },
    { key: "restroom", label: { th: "ห้องน้ำ", en: "Restroom" } },
    { key: "parking_access", label: { th: "ทางเข้า ทางออก หรือที่จอดรถ", en: "Entrance, exit, or parking" } },
    { key: "other", label: { th: "อื่น ๆ", en: "Other" } },
    { key: "unsure", label: { th: "ไม่แน่ใจ", en: "Not sure" } },
];

export const INCIDENT_TYPES: { key: string; label: LocalizedText; severity: "HIGH" | "URGENT" }[] = [
    { key: "safety_accident", label: { th: "ความปลอดภัยหรืออุบัติเหตุ", en: "Safety or accident" }, severity: "URGENT" },
    { key: "violence_threat", label: { th: "การข่มขู่หรือใช้ความรุนแรง", en: "Threat or violence" }, severity: "URGENT" },
    { key: "harassment_discrimination", label: { th: "การคุกคามหรือเลือกปฏิบัติ", en: "Harassment or discrimination" }, severity: "URGENT" },
    { key: "fraud_wrong_charge", label: { th: "การทุจริตหรือเรียกเก็บเงินผิด", en: "Fraud or wrong charge" }, severity: "URGENT" },
    { key: "hazardous_area", label: { th: "อุปกรณ์หรือพื้นที่ที่เป็นอันตราย", en: "Hazardous equipment or area" }, severity: "URGENT" },
    { key: "privacy", label: { th: "ข้อมูลส่วนบุคคลหรือความเป็นส่วนตัว", en: "Personal data or privacy" }, severity: "HIGH" },
    { key: "other", label: { th: "อื่น ๆ", en: "Other" }, severity: "HIGH" },
];

export const SURVEYS: Record<SurveyVersion, SurveyDefinition> = {
    "employee-v1": {
        version: "employee-v1",
        maxReasons: 2,
        commentMaxLength: 500,
        reasonOptions: EMPLOYEE_REASON_OPTIONS,
        behaviorQuestions: [],
    },
    "employee-v2": {
        version: "employee-v2",
        maxReasons: 2,
        commentMaxLength: 500,
        reasonOptions: EMPLOYEE_REASON_OPTIONS,
        behaviorQuestions: EMPLOYEE_BEHAVIOR_QUESTIONS,
    },
    "employee-v3": {
        version: "employee-v3",
        maxReasons: 2,
        commentMaxLength: 500,
        reasonOptions: EMPLOYEE_REASON_OPTIONS,
        behaviorQuestions: EMPLOYEE_SCORE_QUESTIONS,
    },
    "employee-v4": {
        version: "employee-v4",
        maxReasons: 2,
        commentMaxLength: 500,
        reasonOptions: EMPLOYEE_REASON_OPTIONS,
        behaviorQuestions: EMPLOYEE_SCORE_QUESTIONS,
    },
    "station-v1": {
        version: "station-v1",
        maxReasons: 3,
        commentMaxLength: 300,
        reasonOptions: STATION_REASON_OPTIONS,
        behaviorQuestions: [],
    },
    // incident ไม่มี reason ให้เลือก — ใช้ incidentKey แทน
    "incident-v1": {
        version: "incident-v1",
        maxReasons: 0,
        commentMaxLength: 1000,
        reasonOptions: [],
        behaviorQuestions: [],
    },
};

export function getSurvey(version: string): SurveyDefinition | undefined {
    return SURVEYS[version as SurveyVersion];
}

export function isValidReasonKey(version: SurveyVersion, key: string): boolean {
    return SURVEYS[version].reasonOptions.some((o) => o.key === key);
}

export function isValidServiceArea(key: string): boolean {
    return SERVICE_AREAS.some((a) => a.key === key);
}

export function isValidIncidentKey(key: string): boolean {
    return INCIDENT_TYPES.some((t) => t.key === key);
}

export function getReasonOwner(key: string): QuestionOwner {
    const found =
        EMPLOYEE_REASON_OPTIONS.find((o) => o.key === key) ??
        STATION_REASON_OPTIONS.find((o) => o.key === key);
    return found?.owner ?? "UNKNOWN";
}

/** หมุนลำดับตัวเลือกตาม visitId เพื่อลด bias ตำแหน่ง โดยตรึง other/unspecified/unsure ไว้ท้าย */
export function shuffledOptionOrder(allKeys: string[], visitSeed: string): string[] {
    let hash = 0;
    for (let i = 0; i < visitSeed.length; i++) {
        hash = (hash * 31 + visitSeed.charCodeAt(i)) >>> 0;
    }
    const head = allKeys.filter((k) => !PINNED_TAIL_KEYS.has(k));
    const tail = allKeys.filter((k) => PINNED_TAIL_KEYS.has(k));
    const rotated = head
        .map((k, i) => {
            // mix ตำแหน่งเข้ากับ seed แบบ avalanche เพื่อไม่ให้ seed ใกล้กันได้ลำดับเดียวกัน
            let h = (hash ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0;
            h ^= h >>> 16;
            h = Math.imul(h, 0x85ebca6b) >>> 0;
            h ^= h >>> 13;
            return { k, r: h % 1009 };
        })
        .sort((a, b) => a.r - b.r);
    return [...rotated.map((x) => x.k), ...tail];
}

export const PRIVACY_NOTICE_VERSION = "privacy-v1";
