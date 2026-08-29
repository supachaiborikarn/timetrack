import {
    getSurvey,
    isValidReasonKey,
    isValidServiceArea,
    isValidIncidentKey,
    employeeBehaviorQuestionKeysForVersion,
    type EmployeeBehaviorAnswers,
    type StandardSurveyVersion as RegistryStandardSurveyVersion,
} from "./questions";

/**
 * Shared validator ของระบบเสียงลูกค้า — client และ server ใช้ชุดเดียวกัน
 * (โปรเจกต์ไม่มี Zod — validate แบบ manual)
 *
 * กติกา §15: server รับเฉพาะ key ที่กำหนด และเป็นผู้ตัดสิน required/branching
 * ทุกอย่างอื่น (kind, validity, employeeId, qrCodeId, timestamps) derive เอง
 */

export type TargetConfirmation = "YES" | "NO" | "UNSURE";

export interface ContactInput {
    consent: boolean;
    channel: "PHONE" | "EMAIL";
    value: string;
    name?: string;
    preferredTime?: "ANYTIME" | "MORNING" | "AFTERNOON" | "EVENING";
}

export interface StandardPayload {
    targetConfirmation: TargetConfirmation;
    selectedStationId?: string;
    overallRating: number;
    reasonKeys: string[];
    serviceAreas: string[];
    comment?: string;
    wantsFollowUp: boolean;
    contact?: ContactInput;
    language: string;
    behaviorAnswers?: EmployeeBehaviorAnswers;
}

export interface IncidentPayload {
    selectedStationId?: string;
    incidentKey: string;
    dangerStatus: "YES" | "NO" | "UNSURE";
    occurredAt: string;
    noDetail: boolean;
    comment?: string;
    wantsFollowUp: boolean;
    contact?: ContactInput;
    language: string;
}

export type ValidationError = { field: string; message: string };
export type StandardSurveyVersion = RegistryStandardSurveyVersion;

const ALLOWED_STANDARD_KEYS = new Set([
    "targetConfirmation",
    "selectedStationId",
    "overallRating",
    "reasonKeys",
    "serviceAreas",
    "comment",
    "wantsFollowUp",
    "contact",
    "language",
    "behaviorAnswers",
]);

const ALLOWED_INCIDENT_KEYS = new Set([
    "selectedStationId",
    "incidentKey",
    "dangerStatus",
    "occurredAt",
    "noDetail",
    "comment",
    "wantsFollowUp",
    "contact",
    "language",
]);

const ALLOWED_CONTACT_KEYS = new Set(["consent", "channel", "value", "name", "preferredTime"]);

function rejectUnknownKeys(body: Record<string, unknown>, allowed: Set<string>): ValidationError | null {
    for (const key of Object.keys(body)) {
        if (!allowed.has(key)) return { field: key, message: `ฟิลด์ "${key}" ไม่อนุญาตให้ส่ง` };
    }
    return null;
}

export function validateLanguage(value: unknown): string | null {
    if (value !== "th" && value !== "en") return null;
    return value;
}

export function validatePhone(value: string): boolean {
    const digits = value.replace(/[\s\-()]/g, "");
    return /^\+?\d{8,15}$/.test(digits);
}

export function validateEmail(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateContact(input: unknown): { ok: true; value: ContactInput } | { ok: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    if (typeof input !== "object" || input === null) {
        return { ok: false, errors: [{ field: "contact", message: "ข้อมูลติดต่อไม่ถูกต้อง" }] };
    }
    const raw = input as Record<string, unknown>;
    for (const key of Object.keys(raw)) {
        if (!ALLOWED_CONTACT_KEYS.has(key)) {
            return { ok: false, errors: [{ field: `contact.${key}`, message: `ฟิลด์ติดต่อ "${key}" ไม่อนุญาตให้ส่ง` }] };
        }
    }
    const channel = raw.channel;
    const value = typeof raw.value === "string" ? raw.value.trim() : "";
    if (raw.consent !== true) errors.push({ field: "contact.consent", message: "ต้องยินยอมให้ติดต่อกลับก่อนส่งข้อมูลติดต่อ" });
    if (channel !== "PHONE" && channel !== "EMAIL") errors.push({ field: "contact.channel", message: "ช่องทางติดต่อไม่ถูกต้อง" });
    if (channel === "PHONE" && !validatePhone(value)) errors.push({ field: "contact.value", message: "หมายเลขโทรศัพท์ไม่ถูกต้อง" });
    if (channel === "EMAIL" && !validateEmail(value)) errors.push({ field: "contact.value", message: "อีเมลไม่ถูกต้อง" });
    if (raw.name !== undefined && (typeof raw.name !== "string" || raw.name.length > 100)) {
        errors.push({ field: "contact.name", message: "ชื่อต้องไม่เกิน 100 ตัวอักษร" });
    }
    if (raw.preferredTime !== undefined && !["ANYTIME", "MORNING", "AFTERNOON", "EVENING"].includes(raw.preferredTime as string)) {
        errors.push({ field: "contact.preferredTime", message: "ช่วงเวลาที่สะดวกไม่ถูกต้อง" });
    }
    if (errors.length > 0) return { ok: false, errors };
    return {
        ok: true,
        value: {
            consent: true,
            channel: channel as "PHONE" | "EMAIL",
            value,
            name: typeof raw.name === "string" ? raw.name.trim() : undefined,
            preferredTime: raw.preferredTime as ContactInput["preferredTime"],
        },
    };
}

function validateSharedFollowUp(
    wantsFollowUp: unknown,
    contact: unknown,
    push: (e: ValidationError) => void
): { wantsFollowUp: boolean; contact?: ContactInput } {
    if (typeof wantsFollowUp !== "boolean") {
        push({ field: "wantsFollowUp", message: "ต้องระบุว่าต้องการให้ติดต่อกลับหรือไม่" });
        return { wantsFollowUp: false };
    }
    if (wantsFollowUp) {
        if (contact === undefined) {
            push({ field: "contact", message: "กรุณากรอกข้อมูลติดต่อเมื่อขอให้ติดต่อกลับ" });
            return { wantsFollowUp: true };
        }
        const result = validateContact(contact);
        if (!result.ok) {
            result.errors.forEach(push);
            return { wantsFollowUp: true };
        }
        return { wantsFollowUp: true, contact: result.value };
    }
    if (contact !== undefined) {
        push({ field: "contact", message: "ไม่ต้องส่งข้อมูลติดต่อเมื่อไม่ขอให้ติดต่อกลับ" });
    }
    return { wantsFollowUp: false };
}

function validateBehaviorAnswers(
    raw: Record<string, unknown>,
    surveyVersion: StandardSurveyVersion,
    push: (e: ValidationError) => void
): EmployeeBehaviorAnswers | undefined {
    const wasSent = Object.prototype.hasOwnProperty.call(raw, "behaviorAnswers");
    const expectedKeys = employeeBehaviorQuestionKeysForVersion(surveyVersion);
    if (expectedKeys.length === 0) {
        if (wasSent) {
            push({ field: "behaviorAnswers", message: "แบบประเมินรุ่นนี้ไม่รับคำตอบพฤติกรรมพนักงาน" });
        }
        return undefined;
    }

    if (!wasSent || typeof raw.behaviorAnswers !== "object" || raw.behaviorAnswers === null || Array.isArray(raw.behaviorAnswers)) {
        push({ field: "behaviorAnswers", message: "กรุณาตอบคำถามพฤติกรรมพนักงานให้ครบทุกข้อ" });
        return undefined;
    }

    const answers = raw.behaviorAnswers as Record<string, unknown>;
    const allowedKeys = new Set<string>(expectedKeys);
    for (const key of Object.keys(answers)) {
        if (!allowedKeys.has(key)) {
            push({ field: `behaviorAnswers.${key}`, message: "คำถามพฤติกรรมพนักงานไม่อยู่ในรายการ" });
        }
    }
    for (const key of expectedKeys) {
        const answer = answers[key];
        if (answer !== "YES" && answer !== "NO" && answer !== "UNSURE") {
            push({ field: `behaviorAnswers.${key}`, message: "คำตอบต้องเป็น YES, NO หรือ UNSURE" });
        }
    }

    return answers as EmployeeBehaviorAnswers;
}

export function validateStandardPayload(
    body: unknown,
    surveyVersion: StandardSurveyVersion = "employee-v1"
): { ok: true; value: StandardPayload } | { ok: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    if (typeof body !== "object" || body === null) return { ok: false, errors: [{ field: "body", message: "ข้อมูลไม่ถูกต้อง" }] };
    const raw = body as Record<string, unknown>;
    const unknown = rejectUnknownKeys(raw, ALLOWED_STANDARD_KEYS);
    if (unknown) return { ok: false, errors: [unknown] };

    const behaviorAnswers = validateBehaviorAnswers(raw, surveyVersion, (e) => errors.push(e));

    if (raw.targetConfirmation !== "YES") {
        return { ok: false, errors: [{ field: "targetConfirmation", message: "ต้องยืนยันว่าเป้าหมายถูกต้องก่อนส่ง" }] };
    }

    const rating = raw.overallRating;
    if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
        errors.push({ field: "overallRating", message: "คะแนนต้องเป็น 1–5" });
    }

    const survey = getSurvey(surveyVersion)!;
    const reasonKeys = Array.isArray(raw.reasonKeys) ? (raw.reasonKeys as unknown[]) : [];
    if (!Array.isArray(raw.reasonKeys)) {
        errors.push({ field: "reasonKeys", message: "สาเหตุต้องเป็นรายการ" });
    } else if (reasonKeys.some((k) => typeof k !== "string")) {
        errors.push({ field: "reasonKeys", message: "สาเหตุไม่ถูกต้อง" });
    } else {
        const keys = reasonKeys as string[];
        const invalid = keys.find((k) => !isValidReasonKey(surveyVersion, k));
        if (invalid) errors.push({ field: "reasonKeys", message: "สาเหตุไม่อยู่ในรายการ" });
        if (keys.length > survey.maxReasons) errors.push({ field: "reasonKeys", message: `เลือกได้ไม่เกิน ${survey.maxReasons} ข้อ` });
        if (keys.includes("unspecified") && keys.length > 1) {
            errors.push({ field: "reasonKeys", message: "ไม่สะดวกระบุส่งร่วมกับค่าอื่นไม่ได้" });
        }
        if (typeof rating === "number" && rating <= 2 && keys.length === 0) {
            errors.push({ field: "reasonKeys", message: "คะแนน 1–2 ต้องเลือกสาเหตุอย่างน้อยหนึ่งข้อ" });
        }
        if (new Set(keys).size !== keys.length) errors.push({ field: "reasonKeys", message: "สาเหตุซ้ำไม่ได้" });
    }

    const serviceAreas = Array.isArray(raw.serviceAreas) ? (raw.serviceAreas as unknown[]) : [];
    if (!Array.isArray(raw.serviceAreas)) {
        errors.push({ field: "serviceAreas", message: "ส่วนบริการต้องเป็นรายการ" });
    } else if (serviceAreas.some((k) => typeof k !== "string")) {
        errors.push({ field: "serviceAreas", message: "ส่วนบริการไม่ถูกต้อง" });
    } else {
        const keys = serviceAreas as string[];
        const invalid = keys.find((k) => !isValidServiceArea(k));
        if (invalid) errors.push({ field: "serviceAreas", message: "ส่วนบริการไม่อยู่ในรายการ" });
        if (keys.includes("unsure") && keys.length > 1) {
            errors.push({ field: "serviceAreas", message: "ไม่แน่ใจส่งร่วมกับค่าอื่นไม่ได้" });
        }
        if (new Set(keys).size !== keys.length) errors.push({ field: "serviceAreas", message: "ส่วนบริการซ้ำไม่ได้" });
        if ((surveyVersion === "employee-v1" || surveyVersion === "employee-v2" || surveyVersion === "employee-v3") && keys.length > 0) {
            errors.push({ field: "serviceAreas", message: "แบบประเมินพนักงานไม่รับส่วนบริการ" });
        }
        if (surveyVersion === "station-v1" && keys.length === 0) {
            errors.push({ field: "serviceAreas", message: "กรุณาเลือกส่วนบริการอย่างน้อยหนึ่งข้อ" });
        }
    }

    if (
        raw.selectedStationId !== undefined &&
        (typeof raw.selectedStationId !== "string" || raw.selectedStationId.length < 1 || raw.selectedStationId.length > 100)
    ) {
        errors.push({ field: "selectedStationId", message: "สถานีที่เลือกไม่ถูกต้อง" });
    }

    if (raw.comment !== undefined && typeof raw.comment !== "string") {
        errors.push({ field: "comment", message: "ข้อความไม่ถูกต้อง" });
    }
    if (typeof raw.comment === "string" && raw.comment.length > survey.commentMaxLength) {
        errors.push({ field: "comment", message: `ข้อความยาวไม่เกิน ${survey.commentMaxLength} ตัวอักษร` });
    }

    const followUp = validateSharedFollowUp(raw.wantsFollowUp, raw.contact, (e) => errors.push(e));
    const language = validateLanguage(raw.language);
    if (!language) errors.push({ field: "language", message: "ภาษาไม่ถูกต้อง" });

    if (errors.length > 0) return { ok: false, errors };
    return {
        ok: true,
        value: {
            targetConfirmation: "YES",
            selectedStationId: typeof raw.selectedStationId === "string" ? raw.selectedStationId : undefined,
            overallRating: rating as number,
            reasonKeys: reasonKeys as string[],
            serviceAreas: serviceAreas as string[],
            comment: typeof raw.comment === "string" ? raw.comment : undefined,
            wantsFollowUp: followUp.wantsFollowUp,
            contact: followUp.contact,
            language: language!,
            behaviorAnswers,
        },
    };
}

export function validateIncidentPayload(body: unknown): { ok: true; value: IncidentPayload } | { ok: false; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    if (typeof body !== "object" || body === null) return { ok: false, errors: [{ field: "body", message: "ข้อมูลไม่ถูกต้อง" }] };
    const raw = body as Record<string, unknown>;
    const unknown = rejectUnknownKeys(raw, ALLOWED_INCIDENT_KEYS);
    if (unknown) return { ok: false, errors: [unknown] };

    if (typeof raw.incidentKey !== "string" || !isValidIncidentKey(raw.incidentKey)) {
        errors.push({ field: "incidentKey", message: "ประเภทเหตุไม่อยู่ในรายการ" });
    }
    if (raw.dangerStatus !== "YES" && raw.dangerStatus !== "NO" && raw.dangerStatus !== "UNSURE") {
        errors.push({ field: "dangerStatus", message: "สถานะอันตรายไม่ถูกต้อง" });
    }
    if (typeof raw.noDetail !== "boolean") {
        errors.push({ field: "noDetail", message: "สถานะรายละเอียดไม่ถูกต้อง" });
    }
    if (
        raw.selectedStationId !== undefined &&
        (typeof raw.selectedStationId !== "string" || raw.selectedStationId.length < 1 || raw.selectedStationId.length > 100)
    ) {
        errors.push({ field: "selectedStationId", message: "สถานีที่เลือกไม่ถูกต้อง" });
    }

    let occurredAt: Date | undefined;
    if (typeof raw.occurredAt === "string") {
        const parsed = new Date(raw.occurredAt);
        if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 5 * 60 * 1000) {
            errors.push({ field: "occurredAt", message: "เวลาเกิดเหตุไม่ถูกต้อง" });
        } else {
            occurredAt = parsed;
        }
    } else {
        errors.push({ field: "occurredAt", message: "ต้องระบุเวลาเกิดเหตุ" });
    }

    const comment = typeof raw.comment === "string" ? raw.comment : undefined;
    if (comment && comment.length > 1000) errors.push({ field: "comment", message: "ข้อความยาวไม่เกิน 1000 ตัวอักษร" });
    if (raw.noDetail !== true && (!comment || comment.trim().length === 0)) {
        errors.push({ field: "comment", message: "กรุณาเล่าเหตุการณ์หรือเลือกไม่สะดวกให้รายละเอียด" });
    }
    if (raw.noDetail === true && comment && comment.trim().length > 0) {
        errors.push({ field: "noDetail", message: "เลือกได้อย่างเดียวระหว่างกรอกรายละเอียดกับไม่สะดวกให้รายละเอียด" });
    }

    const followUp = validateSharedFollowUp(raw.wantsFollowUp, raw.contact, (e) => errors.push(e));
    const language = validateLanguage(raw.language);
    if (!language) errors.push({ field: "language", message: "ภาษาไม่ถูกต้อง" });

    if (errors.length > 0) return { ok: false, errors };
    return {
        ok: true,
        value: {
            selectedStationId: typeof raw.selectedStationId === "string" ? raw.selectedStationId : undefined,
            incidentKey: raw.incidentKey as string,
            dangerStatus: raw.dangerStatus as IncidentPayload["dangerStatus"],
            occurredAt: occurredAt!.toISOString(),
            noDetail: raw.noDetail === true,
            comment,
            wantsFollowUp: followUp.wantsFollowUp,
            contact: followUp.contact,
            language: language!,
        },
    };
}
