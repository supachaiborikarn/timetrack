"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Phone, Search } from "lucide-react";
import type { PublicErrorCode } from "@/lib/customer-feedback/public-errors";
import {
    EMPLOYEE_BEHAVIOR_QUESTION_KEYS,
    EMPLOYEE_BEHAVIOR_QUESTIONS,
    type BehaviorAnswer,
    type EmployeeBehaviorQuestionKey,
} from "@/lib/customer-feedback/questions";

/**
 * แบบประเมินเสียงลูกค้าฝั่ง client — mobile-first, ไม่มีการเปลี่ยนหน้าอัตโนมัติ
 *
 * ข้อจำกัดตามแผน (§9.4): sessionStorage เก็บเฉพาะ signed visit token, ภาษา,
 * ขั้นปัจจุบัน คะแนน และ target confirmation — ห้ามเก็บ comment หรือข้อมูลติดต่อ
 * comment กับ contact อยู่ในหน่วยความจำของหน้าเท่านั้น
 */

type Lang = "th" | "en";

type ResolveResult = {
    visitToken: string;
    surveyVersion: "employee-v1" | "employee-v2" | "station-v1";
    targetType: "EMPLOYEE" | "STATION";
    target: { label: string; position: string | null };
    station: { id: string; name: string; emergencyPhone: string | null } | null;
    stationNeedsSelection: boolean;
    reasonOptionOrder: string[];
    maxReasons: number;
    commentMaxLength: number;
    serviceAreaKey: string | null;
    formExpiresAt: string;
    isTest: boolean;
};

type StationOption = { id: string; name: string; emergencyPhone: string | null };
type StationSearchResult = { id: string; name: string; publicEmergencyPhone: string | null };

type Screen =
    | "resolve"
    | "confirm-target"
    | "target-rejected"
    | "station-select"
    | "service-areas"
    | "rating"
    | "service-behaviors"
    | "reasons"
    | "submitting"
    | "done"
    | "incident-intro"
    | "incident-type"
    | "incident-danger"
    | "incident-context"
    | "incident-detail"
    | "incident-done";

const DICT = {
    th: {
        header: "เสียงลูกค้า",
        privacy: "ประกาศความเป็นส่วนตัว",
        intro: "ประเมินการให้บริการ ใช้เวลาประมาณ 1 นาที และไม่ต้องระบุชื่อ",
        manualCode: "กรอกรหัส 8 ตัวใต้ QR",
        start: "เริ่มประเมิน",
        resolveFail: "ไม่พบแบบประเมินนี้ โปรดสแกน QR ที่จุดบริการอีกครั้ง",
        confirmQ: (t: string) => `วันนี้ ${t} เป็นผู้ให้บริการคุณใช่ไหม`,
        yes: "ใช่",
        no: "ไม่ใช่",
        unsure: "ไม่แน่ใจ",
        wrongStation: "สถานีไม่ถูกต้อง",
        stationQ: "เลือกสถานีที่ใช้บริการ",
        searchStation: "พิมพ์ชื่อสถานีอย่างน้อย 2 ตัวอักษร",
        searchFail: "ยังค้นหาสถานีไม่ได้ กรุณาลองอีกครั้ง",
        confirmStationQ: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม",
        serviceAreaQ: "วันนี้คุณใช้บริการส่วนใด",
        ratingQEmployee: "โดยรวม คุณพอใจกับการให้บริการครั้งนี้เพียงใด",
        ratingQStation: "โดยรวม คุณพอใจกับการใช้บริการที่สถานีนี้วันนี้เพียงใด",
        serviceBehaviorsQ: "พนักงานทำสิ่งต่อไปนี้หรือไม่",
        behaviorAnswered: (n: number, total: number) => `ตอบแล้ว ${n}/${total} ข้อ`,
        next: "ถัดไป",
        back: "กลับ",
        addDetail: "เพิ่มรายละเอียด",
        askFollowUp: "ขอให้ติดต่อกลับ",
        submit: "ส่งความคิดเห็น",
        retry: "ลองส่งอีกครั้ง",
        submitFail: "ยังส่งความคิดเห็นไม่ได้ คำตอบของคุณยังอยู่ในหน้านี้",
        thanks: "รับความคิดเห็นแล้ว ขอบคุณที่ช่วยให้เราปรับบริการ",
        thanksStation: "รับความคิดเห็นเกี่ยวกับสถานีแล้ว ขอบคุณที่ช่วยให้เราปรับบริการ",
        rescanEmployee: "หากต้องการประเมินสถานี โปรดสแกน QR ประเมินสถานีที่จุดบริการ",
        rescanStation: "ถ้าอยากประเมินพนักงาน โปรดสแกน QR บนป้ายชื่อพนักงาน",
        incidentLink: "แจ้งเหตุเร่งด่วนหรือพฤติกรรมไม่เหมาะสม",
        incidentGo: "แจ้งเหตุต่อ",
        incidentBack: "กลับไปทำแบบประเมิน",
        incidentTypeQ: "เรื่องนี้เกี่ยวกับอะไร",
        dangerQ: "ตอนนี้มีใครอยู่ในอันตรายหรือไม่",
        dangerWarn: "ออกจากพื้นที่เสี่ยงและติดต่อผู้ดูแลหรือหมายเลขฉุกเฉินทันที",
        incidentContextQ: "เหตุเกิดที่ไหนและเมื่อไร",
        incidentStationOptional: "สถานีที่เกิดเหตุ (ไม่บังคับ)",
        incidentStationHint: "ค้นหาและเลือกเมื่อทราบสถานี หรือข้ามได้",
        incidentTime: "เวลาที่เกิดเหตุ",
        clearStation: "ล้างสถานีที่เลือก",
        emergencyNote: "หากมีอันตรายทันที ให้โทรขอความช่วยเหลือก่อนส่งแบบฟอร์ม",
        callPolice: "ตำรวจ",
        callMedical: "การแพทย์ฉุกเฉิน",
        callStation: "เบอร์ฉุกเฉินของสถานี",
        callAria: (label: string, number: string) => `โทร ${label} ${number}`,
        detailQ: "เกิดอะไรขึ้น",
        noDetail: "ไม่สะดวกให้รายละเอียด",
        contactPhone: "เบอร์โทรศัพท์",
        contactEmail: "อีเมล",
        preferredTime: "ช่วงเวลาที่สะดวก",
        anytime: "ทุกช่วงเวลา",
        morning: "ช่วงเช้า",
        afternoon: "ช่วงบ่าย",
        evening: "ช่วงเย็น",
        yourName: "ชื่อ (ไม่บังคับ)",
        incidentCaseNote: "คำตอบนี้จะสร้างเรื่องให้ทีมตรวจสอบ",
        testModeBanner: "โหมดทดสอบ — คำตอบนี้ไม่ใช้คำนวณคะแนนและไม่สร้างเคสจริง",
        refCodeLabel: "เลขอ้างอิง",
        caseCreated: "ทีมงานจะรับทราบตามระยะเวลาที่กำหนด",
        required: "กรุณาตอบคำถามนี้ก่อนดำเนินการต่อ",
        scanAgain: "สแกน QR ใหม่",
        selected: (n: number, max: number) => `เลือกแล้ว ${n}/${max}`,
    },
    en: {
        header: "Customer Feedback",
        privacy: "Privacy Notice",
        intro: "This survey takes about 1 minute. You do not need to provide your name.",
        manualCode: "Enter the 8-character code under the QR",
        start: "Start",
        resolveFail: "Survey not found. Please scan the QR code at the service point again.",
        confirmQ: (t: string) => `Did ${t} serve you today`,
        yes: "Yes",
        no: "No",
        unsure: "Not sure",
        wrongStation: "Wrong station?",
        stationQ: "Select the station you visited",
        searchStation: "Type at least 2 characters of the station name",
        searchFail: "Could not search stations. Please try again.",
        confirmStationQ: "Did you use services at this station today",
        serviceAreaQ: "Which areas did you use today",
        ratingQEmployee: "Overall, how satisfied were you with this service",
        ratingQStation: "Overall, how satisfied were you with this station today",
        serviceBehaviorsQ: "Did the employee do the following?",
        behaviorAnswered: (n: number, total: number) => `Answered ${n}/${total}`,
        next: "Next",
        back: "Back",
        addDetail: "Add details",
        askFollowUp: "Request a follow-up",
        submit: "Submit",
        retry: "Try again",
        submitFail: "Could not submit yet. Your answers are still on this page.",
        thanks: "Feedback received. Thank you for helping us improve.",
        thanksStation: "Station feedback received. Thank you for helping us improve.",
        rescanEmployee: "To rate the station, please scan the station QR at the service point.",
        rescanStation: "To rate an employee, please scan the QR on their name badge.",
        incidentLink: "Report an urgent incident or inappropriate behavior",
        incidentGo: "Continue to report",
        incidentBack: "Back to survey",
        incidentTypeQ: "What is this about",
        dangerQ: "Is anyone in danger right now",
        dangerWarn: "Leave the risky area and contact the manager or emergency number immediately.",
        incidentContextQ: "Where and when did this happen",
        incidentStationOptional: "Station where it happened (optional)",
        incidentStationHint: "Search and select the station if known, or continue without one.",
        incidentTime: "Time of incident",
        clearStation: "Clear selected station",
        emergencyNote: "If there is immediate danger, call for help before submitting this form.",
        callPolice: "Police",
        callMedical: "Medical emergency",
        callStation: "Station emergency line",
        callAria: (label: string, number: string) => `Call ${label} ${number}`,
        detailQ: "What happened",
        noDetail: "Prefer not to give details",
        contactPhone: "Phone number",
        contactEmail: "Email",
        preferredTime: "Preferred time",
        anytime: "Anytime",
        morning: "Morning",
        afternoon: "Afternoon",
        evening: "Evening",
        yourName: "Name (optional)",
        incidentCaseNote: "This report will create a case for our team to review.",
        testModeBanner: "Test mode — this response will not affect scores or create a real case.",
        refCodeLabel: "Reference code",
        caseCreated: "Our team will acknowledge within the set response time.",
        required: "Please answer this question first",
        scanAgain: "Scan again",
        selected: (n: number, max: number) => `Selected ${n}/${max}`,
    },
} as const;

/**
 * ข้อความ error ตามรหัสจาก API สาธารณะ — Record<PublicErrorCode> บังคับให้
 * เพิ่มรหัสฝั่ง server แล้วต้องเพิ่มคำแปลที่นี่ด้วย ไม่งั้น build ไม่ผ่าน
 */
const ERROR_DICT: Record<PublicErrorCode, { th: string; en: string }> = {
    PUBLIC_DISABLED: { th: "ระบบยังไม่เปิดรับความคิดเห็น", en: "Customer feedback is not open yet." },
    INVALID_QR: {
        th: "ไม่พบแบบประเมินนี้ โปรดสแกน QR ที่จุดบริการอีกครั้ง",
        en: "Survey not found. Please scan the QR code at the service point again.",
    },
    RESOLVE_RATE_LIMITED: { th: "เปิดแบบประเมินบ่อยเกินไป กรุณารอสักครู่", en: "Too many attempts. Please wait a moment." },
    MANUAL_CODE_RATE_LIMITED: { th: "ลองรหัสบ่อยเกินไป กรุณารอ 1 นาที", en: "Too many code attempts. Please wait 1 minute." },
    SEARCH_RATE_LIMITED: { th: "ค้นหาบ่อยเกินไป", en: "Too many searches. Please wait a moment." },
    REQUEST_RATE_LIMITED: { th: "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่", en: "Too many requests. Please wait a moment." },
    SERVER_BUSY: { th: "ระบบมีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้ง", en: "The system is busy. Please try again." },
    SESSION_EXPIRED: { th: "เซสชันหมดอายุ กรุณาสแกน QR อีกครั้ง", en: "Your session expired. Please scan the QR code again." },
    INCIDENT_SESSION_EXPIRED: { th: "เซสชันหมดอายุ กรุณาเริ่มใหม่อีกครั้ง", en: "Your session expired. Please start again." },
    FORM_EXPIRED: { th: "แบบประเมินหมดอายุ กรุณาสแกน QR ใหม่อีกครั้ง", en: "This survey expired. Please scan the QR code again." },
    INCIDENT_FORM_EXPIRED: { th: "แบบแจ้งเหตุหมดอายุ กรุณาเริ่มใหม่อีกครั้ง", en: "This report expired. Please start again." },
    INCIDENT_NOT_FOUND: { th: "ไม่พบแบบแจ้งเหตุนี้ กรุณาเริ่มใหม่อีกครั้ง", en: "Report not found. Please start again." },
    FORM_TOO_FAST: {
        th: "กรุณาตรวจคำตอบอีกครั้งก่อนส่ง",
        en: "Please review your answers before submitting.",
    },
    SELF_EVALUATION: {
        th: "ไม่สามารถส่งแบบประเมินของตนเองได้",
        en: "You cannot submit feedback about yourself.",
    },
    ALREADY_SUBMITTED: { th: "เราได้รับความคิดเห็นนี้แล้ว", en: "We have already received this feedback." },
    QR_ROTATED: { th: "ป้ายนี้ถูกเปลี่ยนรหัสแล้ว กรุณาสแกนป้ายใหม่", en: "This badge has a new code. Please scan it again." },
    QR_INACTIVE: { th: "แบบประเมินนี้ปิดใช้งานแล้ว", en: "This survey has been deactivated." },
    STATION_NOT_ELIGIBLE: { th: "สถานีที่เลือกไม่พร้อมรับแบบประเมิน", en: "The selected station is not accepting feedback." },
    INCIDENT_STATION_NOT_ELIGIBLE: { th: "สถานีที่เลือกไม่พร้อมรับแบบแจ้งเหตุ", en: "The selected station is not accepting reports." },
    DUPLICATE_MISMATCH: { th: "คำขอซ้ำไม่ตรงกัน", en: "This repeated request does not match the original." },
    PAYLOAD_TOO_LARGE: { th: "ข้อมูลใหญ่เกินไป", en: "Your message is too long." },
    SUBMIT_FAILED: { th: "ส่งไม่สำเร็จ", en: "Could not submit." },
    SUBMIT_ERROR: {
        th: "ยังส่งความคิดเห็นไม่ได้ คำตอบของคุณยังอยู่ในหน้านี้",
        en: "Could not submit yet. Your answers are still on this page.",
    },
    SERVER_ERROR: { th: "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง", en: "Something went wrong. Please try again." },
};

type DictErrorKey = "resolveFail" | "searchFail" | "submitFail" | "required";

/**
 * เก็บ error เป็น "ตัวระบุ" ไม่ใช่ข้อความสำเร็จรูป เพื่อให้กดสลับภาษาแล้ว
 * ข้อความที่ค้างบนจอเปลี่ยนตามด้วย — raw ใช้เฉพาะข้อความที่ไม่มีรหัสกำกับ
 */
type UiError =
    | { kind: "code"; code: PublicErrorCode; field?: string }
    | { kind: "dict"; key: DictErrorKey; field?: string }
    | { kind: "raw"; text: string; field?: string }
    | null;

const VALIDATION_ERROR_COPY: Record<string, { th: string; en: string }> = {
    body: { th: "ข้อมูลในแบบฟอร์มไม่ถูกต้อง", en: "Some form information is invalid." },
    targetConfirmation: { th: "กรุณายืนยันเป้าหมายก่อนส่ง", en: "Please confirm the person or station before submitting." },
    overallRating: { th: "กรุณาเลือกคะแนน 1–5", en: "Please select a rating from 1 to 5." },
    behaviorAnswers: { th: "กรุณาตอบพฤติกรรมการบริการให้ครบทุกข้อ", en: "Please answer every service behavior question." },
    reasonKeys: { th: "กรุณาตรวจสอบเหตุผลที่เลือก", en: "Please review the selected reasons." },
    serviceAreas: { th: "กรุณาตรวจสอบส่วนบริการที่เลือก", en: "Please review the selected service areas." },
    comment: { th: "กรุณาตรวจสอบรายละเอียดที่กรอก", en: "Please review the details you entered." },
    noDetail: { th: "กรุณาเลือกกรอกรายละเอียดหรือไม่สะดวกให้รายละเอียดอย่างใดอย่างหนึ่ง", en: "Please either enter details or choose not to provide them." },
    contact: { th: "กรุณาตรวจสอบข้อมูลติดต่อกลับ", en: "Please review your contact details." },
    incidentKey: { th: "กรุณาเลือกประเภทเหตุ", en: "Please select the incident type." },
    dangerStatus: { th: "กรุณาระบุว่ามีอันตรายในขณะนี้หรือไม่", en: "Please say whether anyone is currently in danger." },
    occurredAt: { th: "กรุณาตรวจสอบเวลาเกิดเหตุ", en: "Please review the incident time." },
    selectedStationId: { th: "กรุณาตรวจสอบสถานีที่เลือก", en: "Please review the selected station." },
};

function validationCopy(field: string | undefined, lang: Lang, fallbackMessage: string): string {
    if (!field) return lang === "th" ? fallbackMessage : "Please review the form and try again.";
    const normalized = field.startsWith("contact")
        ? "contact"
        : field.startsWith("behaviorAnswers")
            ? "behaviorAnswers"
            : field;
    return VALIDATION_ERROR_COPY[normalized]?.[lang] ?? (lang === "th" ? fallbackMessage : "Please review this field and try again.");
}

function toUiError(data: unknown, fallback: DictErrorKey, lang: Lang): UiError {
    const body = data as { code?: unknown; error?: unknown; errors?: unknown } | null;
    if (typeof body?.code === "string" && body.code in ERROR_DICT) {
        return { kind: "code", code: body.code as PublicErrorCode };
    }
    if (Array.isArray(body?.errors)) {
        const first = body.errors.find(
            (item): item is { field?: unknown; message: string } =>
                typeof item === "object" && item !== null && typeof (item as { message?: unknown }).message === "string"
        );
        if (first) {
            const rawField = typeof first.field === "string" ? first.field : undefined;
            const field = rawField?.startsWith("contact")
                ? "contact"
                : rawField?.startsWith("behaviorAnswers")
                    ? "behaviorAnswers"
                    : rawField;
            return {
                kind: "raw",
                text: validationCopy(rawField, lang, first.message),
                field,
            };
        }
    }
    if (typeof body?.error === "string" && body.error.length > 0) {
        return lang === "th" ? { kind: "raw", text: body.error } : { kind: "dict", key: fallback };
    }
    return { kind: "dict", key: fallback };
}

const REASONS = {
    employee_courtesy: { th: "การพูดจาและความสุภาพ", en: "Courtesy and politeness" },
    employee_clarity: { th: "ความชัดเจนของข้อมูล", en: "Clarity of information" },
    employee_accuracy: { th: "ความถูกต้องของบริการ", en: "Accuracy of service" },
    employee_helpfulness: { th: "การใส่ใจและช่วยแก้ปัญหา", en: "Helpfulness" },
    employee_safety: { th: "การปฏิบัติตามขั้นตอนความปลอดภัยขณะให้บริการ", en: "Safety procedure compliance" },
    employee_fairness: { th: "ความเท่าเทียมในการให้บริการ", en: "Fairness of service" },
    system_wait: { th: "เวลารอหรือจำนวนพนักงาน", en: "Waiting time or staffing" },
    system_process: { th: "ขั้นตอนหรือระบบชำระเงิน", en: "Process or payment system" },
    system_availability: { th: "สินค้าหรืออุปกรณ์ไม่พร้อม", en: "Product or equipment unavailable" },
    station_cleanliness: { th: "ความสะอาด", en: "Cleanliness" },
    station_orderliness: { th: "ความเป็นระเบียบ", en: "Orderliness" },
    station_wait: { th: "เวลารอ", en: "Waiting time" },
    station_signage: { th: "ป้ายและข้อมูล", en: "Signage and information" },
    station_facilities: { th: "ความพร้อมของอุปกรณ์หรือจุดบริการ", en: "Facility readiness" },
    station_access: { th: "ความสะดวกในการเข้าใช้", en: "Ease of access" },
    station_safety: { th: "ความปลอดภัย", en: "Safety" },
    station_staff_service: { th: "การบริการของพนักงานโดยรวม", en: "Overall staff service" },
    station_process: { th: "ขั้นตอนการให้บริการ", en: "Service process" },
    station_availability: { th: "สินค้าหรือบริการพร้อมใช้งาน", en: "Product or service availability" },
    other: { th: "อื่น ๆ", en: "Other" },
    unspecified: { th: "ไม่สะดวกระบุ", en: "Prefer not to say" },
} as const;

const SERVICE_AREAS = {
    fuel_service: { th: "จุดเติมน้ำมันหรือดูแลรถ", en: "Fuel or car service" },
    payment_shop: { th: "จุดชำระเงินหรือร้านค้า", en: "Payment counter or shop" },
    food_beverage: { th: "อาหารหรือเครื่องดื่ม", en: "Food or beverage" },
    information_help: { th: "จุดข้อมูลหรือขอความช่วยเหลือ", en: "Information or help desk" },
    restroom: { th: "ห้องน้ำ", en: "Restroom" },
    parking_access: { th: "ทางเข้า ทางออก หรือที่จอดรถ", en: "Entrance, exit, or parking" },
    other: { th: "อื่น ๆ", en: "Other" },
    unsure: { th: "ไม่แน่ใจ", en: "Not sure" },
} as const;

const INCIDENT_TYPES = {
    safety_accident: { th: "ความปลอดภัยหรืออุบัติเหตุ", en: "Safety or accident" },
    violence_threat: { th: "การข่มขู่หรือใช้ความรุนแรง", en: "Threat or violence" },
    harassment_discrimination: { th: "การคุกคามหรือเลือกปฏิบัติ", en: "Harassment or discrimination" },
    fraud_wrong_charge: { th: "การทุจริตหรือเรียกเก็บเงินผิด", en: "Fraud or wrong charge" },
    privacy: { th: "ข้อมูลส่วนบุคคลหรือความเป็นส่วนตัว", en: "Personal data or privacy" },
    hazardous_area: { th: "อุปกรณ์หรือพื้นที่ที่เป็นอันตราย", en: "Hazardous equipment or area" },
    other: { th: "อื่น ๆ", en: "Other" },
} as const;

const RATINGS = [
    { value: 1, th: "ไม่พอใจมาก", en: "Very dissatisfied" },
    { value: 2, th: "ไม่พอใจ", en: "Dissatisfied" },
    { value: 3, th: "ปานกลาง", en: "Neutral" },
    { value: 4, th: "พอใจ", en: "Satisfied" },
    { value: 5, th: "พอใจมาก", en: "Very satisfied" },
] as const;

type BehaviorAnswers = Partial<Record<EmployeeBehaviorQuestionKey, BehaviorAnswer>>;

function isBehaviorAnswer(value: unknown): value is BehaviorAnswer {
    return value === "YES" || value === "NO" || value === "UNSURE";
}

function isBehaviorAnswers(value: unknown): value is BehaviorAnswers {
    if (!isRecord(value)) return false;
    return Object.entries(value).every(([key, answer]) =>
        EMPLOYEE_BEHAVIOR_QUESTION_KEYS.includes(key as EmployeeBehaviorQuestionKey) && isBehaviorAnswer(answer)
    );
}

function hasCompleteBehaviorAnswers(
    answers: BehaviorAnswers
): answers is Record<EmployeeBehaviorQuestionKey, BehaviorAnswer> {
    return EMPLOYEE_BEHAVIOR_QUESTION_KEYS.every((key) => isBehaviorAnswer(answers[key]));
}

function tr<T extends { th: string; en: string }>(item: T, lang: Lang): string {
    return item[lang];
}

function reasonQuestion(rating: number, lang: Lang): string {
    if (rating >= 4) return lang === "th" ? "เรื่องใดทำให้คุณพอใจ" : "What made you satisfied";
    if (rating === 3) return lang === "th" ? "เรื่องใดมีผลต่อคะแนนนี้" : "What affected this score";
    return lang === "th" ? "เรื่องใดควรปรับก่อน" : "What should be improved first";
}

function commentQuestion(rating: number, lang: Lang, kind: "employee" | "station"): string {
    if (kind === "station") {
        return lang === "th" ? "ถ้าสถานีปรับหรือเพิ่มได้ 1 อย่าง คุณอยากให้ทำอะไร" : "If the station could change one thing, what would it be";
    }
    if (rating >= 4) return lang === "th" ? "มีอะไรที่อยากชมเพิ่มเติมไหม" : "Anything you would like to praise";
    if (rating === 3) return lang === "th" ? "มีอะไรที่จะทำให้บริการครั้งหน้าดีขึ้นไหม" : "What would make the next visit better";
    return lang === "th" ? "ช่วยเล่าว่าเกิดอะไรขึ้น เพื่อให้เราตรวจสอบได้ตรงจุด" : "Please tell us what happened so we can investigate";
}

function localDateTimeInputValue(date: Date = new Date()): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

export function nextFeedbackChoice(current: string[], key: string): string[] {
    const singletonKeys = new Set(["unspecified", "unsure"]);
    if (singletonKeys.has(key)) return current.includes(key) ? [] : [key];
    if (current.includes(key)) return current.filter((item) => item !== key);
    return [...current.filter((item) => !singletonKeys.has(item)), key];
}

export type StableRequestKey = { fingerprint: string; key: string } | null;

export function stableRequestKey(
    current: StableRequestKey,
    fingerprint: string,
    createKey: () => string
): Exclude<StableRequestKey, null> {
    if (current?.fingerprint === fingerprint) return current;
    return { fingerprint, key: createKey() };
}

const SAFE_FEEDBACK_DRAFT_KEY = "cf_feedback_draft_v1";
const VISIT_TOKEN_STORAGE_KEY = "cf_visit_token";
const SAFE_DRAFT_SCREENS = [
    "confirm-target",
    "station-select",
    "service-areas",
    "rating",
    "service-behaviors",
    "reasons",
] as const;
type SafeDraftScreen = typeof SAFE_DRAFT_SCREENS[number];

type SafeFeedbackDraft = {
    version: 1;
    language: Lang;
    screen: SafeDraftScreen;
    result: ResolveResult;
    selectedStation: StationOption | null;
    confirmation: "YES" | "NO" | "UNSURE" | null;
    serviceAreas: string[];
    rating: number | null;
    behaviorAnswers?: BehaviorAnswers;
    reasonKeys: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isStationOption(value: unknown): value is StationOption {
    return isRecord(value)
        && typeof value.id === "string"
        && typeof value.name === "string"
        && (value.emergencyPhone === null || typeof value.emergencyPhone === "string");
}

function isStationSearchResult(value: unknown): value is StationSearchResult {
    return isRecord(value)
        && typeof value.id === "string"
        && typeof value.name === "string"
        && (value.publicEmergencyPhone === null || typeof value.publicEmergencyPhone === "string");
}

function isResolveResult(value: unknown): value is ResolveResult {
    if (!isRecord(value) || !isRecord(value.target)) return false;
    const stationValid = value.station === null || isStationOption(value.station);
    return typeof value.visitToken === "string"
        && value.visitToken.length > 0
        && (value.surveyVersion === "employee-v1" || value.surveyVersion === "employee-v2" || value.surveyVersion === "station-v1")
        && (value.targetType === "EMPLOYEE" || value.targetType === "STATION")
        && typeof value.target.label === "string"
        && (value.target.position === null || typeof value.target.position === "string")
        && stationValid
        && typeof value.stationNeedsSelection === "boolean"
        && Array.isArray(value.reasonOptionOrder)
        && value.reasonOptionOrder.every((key) => typeof key === "string")
        && typeof value.maxReasons === "number"
        && typeof value.commentMaxLength === "number"
        && (value.serviceAreaKey === null || typeof value.serviceAreaKey === "string")
        && typeof value.formExpiresAt === "string"
        && Number.isFinite(new Date(value.formExpiresAt).getTime())
        && new Date(value.formExpiresAt).getTime() > Date.now()
        && typeof value.isTest === "boolean";
}

function clearStoredFeedbackDraft(removeVisitToken = true): void {
    try {
        sessionStorage.removeItem(SAFE_FEEDBACK_DRAFT_KEY);
        if (removeVisitToken) sessionStorage.removeItem(VISIT_TOKEN_STORAGE_KEY);
    } catch {
        // private browsing บางโหมดปิด storage ได้ แต่แบบฟอร์มยังทำงานต่อในหน่วยความจำ
    }
}

function readSafeFeedbackDraft(): SafeFeedbackDraft | null {
    try {
        const raw = sessionStorage.getItem(SAFE_FEEDBACK_DRAFT_KEY);
        if (!raw) return null;
        const value: unknown = JSON.parse(raw);
        if (!isRecord(value)
            || value.version !== 1
            || (value.language !== "th" && value.language !== "en")
            || !SAFE_DRAFT_SCREENS.includes(value.screen as SafeDraftScreen)
            || !isResolveResult(value.result)
            || !(value.selectedStation === null || isStationOption(value.selectedStation))
            || !(value.confirmation === null || value.confirmation === "YES" || value.confirmation === "NO" || value.confirmation === "UNSURE")
            || !Array.isArray(value.serviceAreas)
            || !value.serviceAreas.every((key) => typeof key === "string")
            || !(value.rating === null || (Number.isInteger(value.rating) && Number(value.rating) >= 1 && Number(value.rating) <= 5))
            || !(value.behaviorAnswers === undefined || isBehaviorAnswers(value.behaviorAnswers))
            || !Array.isArray(value.reasonKeys)
            || !value.reasonKeys.every((key) => typeof key === "string")) {
            clearStoredFeedbackDraft();
            return null;
        }
        return value as SafeFeedbackDraft;
    } catch {
        clearStoredFeedbackDraft();
        return null;
    }
}

function writeSafeFeedbackDraft(draft: SafeFeedbackDraft): void {
    try {
        sessionStorage.setItem(SAFE_FEEDBACK_DRAFT_KEY, JSON.stringify(draft));
        sessionStorage.setItem(VISIT_TOKEN_STORAGE_KEY, draft.result.visitToken);
        sessionStorage.setItem("cf_lang", draft.language);
    } catch {
        // แบบฟอร์มยังทำงานในหน่วยความจำเมื่อ browser ไม่อนุญาต storage
    }
}

export function FeedbackForm() {
    const [lang, setLang] = useState<Lang>("th");
    const t = DICT[lang];
    const [screen, setScreen] = useState<Screen>("resolve");
    const [manualCode, setManualCode] = useState("");
    const [pendingResolveToken, setPendingResolveToken] = useState<string | null>(null);
    const [resolveError, setResolveError] = useState<UiError>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ResolveResult | null>(null);
    const [selectedStation, setSelectedStation] = useState<StationOption | null>(null);
    const [stationQuery, setStationQuery] = useState("");
    const [stationResults, setStationResults] = useState<StationSearchResult[]>([]);
    const [stationSearchError, setStationSearchError] = useState<UiError>(null);
    const [confirmation, setConfirmation] = useState<"YES" | "NO" | "UNSURE" | null>(null);
    const [serviceAreas, setServiceAreas] = useState<string[]>([]);
    const [rating, setRating] = useState<number | null>(null);
    const [behaviorAnswers, setBehaviorAnswers] = useState<BehaviorAnswers>({});
    const [reasonKeys, setReasonKeys] = useState<string[]>([]);
    const [showComment, setShowComment] = useState(false);
    const [comment, setComment] = useState("");
    const [wantsFollowUp, setWantsFollowUp] = useState(false);
    const [contactChannel, setContactChannel] = useState<"PHONE" | "EMAIL">("PHONE");
    const [contactValue, setContactValue] = useState("");
    const [contactName, setContactName] = useState("");
    const [preferredTime, setPreferredTime] = useState("ANYTIME");
    const [error, setError] = useState<UiError>(null);
    const [refCode, setRefCode] = useState<string | null>(null);
    const [caseSeverity, setCaseSeverity] = useState<string | null>(null);
    // incident state
    const [incidentToken, setIncidentToken] = useState<string | null>(null);
    const [incidentKey, setIncidentKey] = useState<string | null>(null);
    const [dangerStatus, setDangerStatus] = useState<"YES" | "NO" | "UNSURE" | null>(null);
    const [incidentStation, setIncidentStation] = useState<StationOption | null>(null);
    const [incidentStationQuery, setIncidentStationQuery] = useState("");
    const [incidentStationResults, setIncidentStationResults] = useState<StationSearchResult[]>([]);
    const [incidentStationSearchError, setIncidentStationSearchError] = useState<UiError>(null);
    const [incidentOccurredAt, setIncidentOccurredAt] = useState(() => localDateTimeInputValue());
    const [incidentNoDetail, setIncidentNoDetail] = useState(false);
    const [incidentComment, setIncidentComment] = useState("");
    const [incidentWantsFollowUp, setIncidentWantsFollowUp] = useState(false);
    const [incidentContactChannel, setIncidentContactChannel] = useState<"PHONE" | "EMAIL">("PHONE");
    const [incidentContactValue, setIncidentContactValue] = useState("");
    const [incidentContactName, setIncidentContactName] = useState("");
    const [incidentPreferredTime, setIncidentPreferredTime] = useState("ANYTIME");
    // จำหน้าที่ลูกค้ากดลิงก์แจ้งเหตุเพื่อกลับมาต่อได้ถูกต้อง (§7 รักษาร่างเดิมไว้)
    const [preIncidentScreen, setPreIncidentScreen] = useState<Screen>("resolve");
    const headingRef = useRef<HTMLHeadingElement>(null);
    const errorAlertRef = useRef<HTMLParagraphElement>(null);
    const resolveIdempotencyKeyRef = useRef<StableRequestKey>(null);
    const standardIdempotencyKeyRef = useRef<StableRequestKey>(null);
    const incidentIdempotencyKeyRef = useRef<StableRequestKey>(null);
    const incidentStartKeyRef = useRef<StableRequestKey>(null);
    const activeStandardVisitTokenRef = useRef<string | null>(null);
    const completedStandardVisitTokenRef = useRef<string | null>(null);
    const stationSearchControlsRef = useRef<Record<"standard" | "incident", {
        timer: ReturnType<typeof setTimeout> | null;
        controller: AbortController | null;
    }>>({
        standard: { timer: null, controller: null },
        incident: { timer: null, controller: null },
    });

    // คืนภาษาที่ลูกค้าเลือกไว้ — ตั้งใน effect ไม่ใช่ initial state เพื่อไม่ให้ hydrate ไม่ตรงกับ SSR
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem("cf_lang");
            if (saved === "th" || saved === "en") setLang(saved);
        } catch {
            // browser บางโหมดปิด sessionStorage
        }
    }, []);

    useEffect(() => {
        const previous = document.documentElement.lang;
        document.documentElement.lang = lang;
        return () => {
            document.documentElement.lang = previous || "th";
        };
    }, [lang]);

    // QR ใหม่ต้องชนะ draft เดิมเสมอ; ถ้าไม่มี QR จึงค่อยกู้ draft ที่ไม่เก็บข้อความหรือข้อมูลติดต่อ
    useEffect(() => {
        const hash = window.location.hash;
        const match = hash.match(/^#t=(.+)$/);
        if (match) {
            clearStoredFeedbackDraft();
            activeStandardVisitTokenRef.current = null;
            setPendingResolveToken(match[1]);
            void doResolve(match[1], undefined);
            history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
            return;
        }

        const draft = readSafeFeedbackDraft();
        if (draft) {
            activeStandardVisitTokenRef.current = draft.result.visitToken;
            setLang(draft.language);
            setResult(draft.result);
            setSelectedStation(draft.selectedStation);
            setConfirmation(draft.confirmation);
            setServiceAreas(draft.serviceAreas);
            setRating(draft.rating);
            setBehaviorAnswers(draft.behaviorAnswers ?? {});
            setReasonKeys(draft.reasonKeys);
            try {
                sessionStorage.setItem(VISIT_TOKEN_STORAGE_KEY, draft.result.visitToken);
            } catch {
                // browser บางโหมดปิด sessionStorage
            }
            setScreen(draft.screen);
        } else {
            // token รุ่นเก่าที่ไม่มี draft จับคู่ต้องไม่ถูกนำไปผูกกับเหตุหรือแบบประเมินใหม่
            try {
                sessionStorage.removeItem(VISIT_TOKEN_STORAGE_KEY);
            } catch {
                // browser บางโหมดปิด sessionStorage
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!result || !SAFE_DRAFT_SCREENS.includes(screen as SafeDraftScreen)) return;
        writeSafeFeedbackDraft({
            version: 1,
            language: lang,
            screen: screen as SafeDraftScreen,
            result,
            selectedStation,
            confirmation,
            serviceAreas,
            rating,
            behaviorAnswers,
            reasonKeys,
        });
    }, [behaviorAnswers, confirmation, lang, rating, reasonKeys, result, screen, selectedStation, serviceAreas]);

    useEffect(() => () => {
        for (const control of Object.values(stationSearchControlsRef.current)) {
            if (control.timer) clearTimeout(control.timer);
            control.controller?.abort();
        }
    }, []);

    // focus ไปหัวข้อคำถามเมื่อเปลี่ยนขั้น
    useEffect(() => {
        headingRef.current?.focus();
    }, [screen]);

    useEffect(() => {
        if (!error) return;
        const fieldTargets: Record<string, string> = {
            targetConfirmation: "confirmation-group",
            overallRating: "rating-group",
            behaviorAnswers: "service-behaviors-group",
            reasonKeys: "reason-group",
            serviceAreas: "service-area-group",
            contact: screen === "incident-detail" ? "incident-contact-value" : "contact-value",
            occurredAt: "incident-occurred-at",
            incidentKey: "incident-type-group",
            dangerStatus: "incident-danger-group",
            comment: screen === "incident-detail" ? "incident-comment" : "comment",
            noDetail: "incident-comment",
        };
        const targetId = error.field ? fieldTargets[error.field] : undefined;
        const frame = requestAnimationFrame(() => {
            const target = targetId ? document.getElementById(targetId) : null;
            (target ?? errorAlertRef.current)?.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [error, screen]);

    const reasonOptions = useMemo(() => {
        if (!result) return [];
        const all = result.reasonOptionOrder;
        return all.filter((k) => k in REASONS);
    }, [result]);

    const doResolve = useCallback(async (token?: string, code?: string) => {
        setBusy(true);
        setResolveError(null);
        try {
            const requestBody = token ? { token } : { manualCode: code };
            const stableKey = stableRequestKey(
                resolveIdempotencyKeyRef.current,
                JSON.stringify(requestBody),
                () => crypto.randomUUID()
            );
            resolveIdempotencyKeyRef.current = stableKey;
            const res = await fetch("/api/public/customer-feedback/resolve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Resolve-Idempotency-Key": stableKey.key,
                },
                body: JSON.stringify(requestBody),
            });
            if (!res.ok) {
                // ใช้ข้อความจริงจาก server (เช่น ระบบยังไม่เปิด / rate limit) แล้วจึง fallback
                const data = await res.json().catch(() => null);
                setResolveError(toUiError(data, "resolveFail", lang));
                return;
            }
            const data: ResolveResult = await res.json();
            setResult(data);
            setPendingResolveToken(null);
            setBehaviorAnswers({});
            activeStandardVisitTokenRef.current = data.visitToken;
            completedStandardVisitTokenRef.current = null;
            resolveIdempotencyKeyRef.current = null;
            standardIdempotencyKeyRef.current = null;
            try {
                sessionStorage.setItem(VISIT_TOKEN_STORAGE_KEY, data.visitToken);
                sessionStorage.setItem("cf_lang", lang);
            } catch {
                // browser บางโหมดปิด sessionStorage; state ปัจจุบันยังแสดงแบบฟอร์มได้
            }
            setScreen("confirm-target");
        } catch {
            setResolveError({ kind: "dict", key: "submitFail" });
        } finally {
            setBusy(false);
        }
    }, [lang]);

    const postProgress = useCallback(
        async (payload: Record<string, unknown>) => {
            const token = activeStandardVisitTokenRef.current;
            if (!token) return;
            await fetch("/api/public/customer-feedback/visits/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ language: lang, ...payload }),
            }).catch(() => undefined);
        },
        [lang]
    );

    const scheduleStationSearch = useCallback((
        scope: "standard" | "incident",
        q: string,
        tokenOverride?: string | null
    ) => {
        const control = stationSearchControlsRef.current[scope];
        if (control.timer) clearTimeout(control.timer);
        control.timer = null;
        control.controller?.abort();
        control.controller = null;

        const setResults = scope === "standard" ? setStationResults : setIncidentStationResults;
        const setSearchError = scope === "standard" ? setStationSearchError : setIncidentStationSearchError;
        const query = q.trim();
        setSearchError(null);
        if (query.length < 2) {
            setResults([]);
            return;
        }
        setResults([]);

        control.timer = setTimeout(() => {
            control.timer = null;
            let token = tokenOverride;
            if (!token) {
                try {
                    token = sessionStorage.getItem(VISIT_TOKEN_STORAGE_KEY);
                } catch {
                    token = null;
                }
            }
            if (!token) {
                setResults([]);
                return;
            }

            const controller = new AbortController();
            control.controller = controller;
            void (async () => {
                try {
                    const res = await fetch(`/api/public/customer-feedback/stations?q=${encodeURIComponent(query)}`, {
                        headers: { Authorization: `Bearer ${token}` },
                        signal: controller.signal,
                    });
                    const data: unknown = await res.json().catch(() => null);
                    if (controller.signal.aborted) return;
                    if (!res.ok) {
                        setResults([]);
                        setSearchError(toUiError(data, "searchFail", lang));
                        return;
                    }
                    const stations = isRecord(data) && Array.isArray(data.stations)
                        ? data.stations.filter(isStationSearchResult)
                        : [];
                    setResults(stations);
                } catch (searchError) {
                    if (searchError instanceof DOMException && searchError.name === "AbortError") return;
                    if (controller.signal.aborted) return;
                    setResults([]);
                    setSearchError({ kind: "dict", key: "searchFail" });
                } finally {
                    if (control.controller === controller) control.controller = null;
                }
            })();
        }, 300);
    }, [lang]);

    const toggleChoice = (key: string, current: string[], setter: (v: string[]) => void) => {
        setter(nextFeedbackChoice(current, key));
    };

    const submitStandard = useCallback(async () => {
        if (!result || rating === null) return;
        if (result.surveyVersion === "employee-v2" && !hasCompleteBehaviorAnswers(behaviorAnswers)) {
            setError({ kind: "dict", key: "required", field: "behaviorAnswers" });
            setScreen("service-behaviors");
            return;
        }
        if (rating <= 2 && reasonKeys.length === 0) {
            setError({ kind: "dict", key: "required", field: "reasonKeys" });
            setScreen("reasons");
            return;
        }
        if (wantsFollowUp && !contactValue.trim()) {
            setError({ kind: "dict", key: "required", field: "contact" });
            setScreen("reasons");
            return;
        }
        setBusy(true);
        setError(null);
        setScreen("submitting");
        const payload: Record<string, unknown> = {
            targetConfirmation: "YES",
            overallRating: rating,
            reasonKeys,
            serviceAreas,
            comment: comment.trim() || undefined,
            wantsFollowUp,
            language: lang,
        };
        if (result.surveyVersion === "employee-v2") {
            payload.behaviorAnswers = Object.fromEntries(
                EMPLOYEE_BEHAVIOR_QUESTION_KEYS.map((key) => [key, behaviorAnswers[key]])
            );
        }
        if (selectedStation) payload.selectedStationId = selectedStation.id;
        if (wantsFollowUp) {
            payload.contact = {
                consent: true,
                channel: contactChannel,
                value: contactValue,
                name: contactName || undefined,
                preferredTime,
            };
        }
        const stableKey = stableRequestKey(
            standardIdempotencyKeyRef.current,
            JSON.stringify(payload),
            () => crypto.randomUUID()
        );
        standardIdempotencyKeyRef.current = stableKey;
        try {
            const token = activeStandardVisitTokenRef.current;
            if (!token) {
                setError({ kind: "code", code: "SESSION_EXPIRED" });
                setScreen("reasons");
                return;
            }
            const res = await fetch("/api/public/customer-feedback/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": stableKey.key },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                const uiError = toUiError(data, "submitFail", lang);
                setError(uiError);
                if (uiError?.field === "serviceAreas") setScreen("service-areas");
                else if (uiError?.field === "overallRating") setScreen("rating");
                else if (uiError?.field === "behaviorAnswers") setScreen("service-behaviors");
                else if (uiError?.field === "targetConfirmation") setScreen("confirm-target");
                else setScreen("reasons");
                return;
            }
            setRefCode(data.refCode ?? null);
            setCaseSeverity(data.severity ?? null);
            setScreen("done");
            standardIdempotencyKeyRef.current = null;
            completedStandardVisitTokenRef.current = token;
            activeStandardVisitTokenRef.current = null;
            clearStoredFeedbackDraft();
        } catch {
            setError({ kind: "dict", key: "submitFail" });
            setScreen("reasons");
        } finally {
            setBusy(false);
        }
    }, [result, rating, behaviorAnswers, reasonKeys, serviceAreas, comment, wantsFollowUp, selectedStation, contactChannel, contactValue, contactName, preferredTime, lang]);

    const startIncident = useCallback(async () => {
        if (incidentToken) {
            setScreen("incident-type");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const token = activeStandardVisitTokenRef.current ?? completedStandardVisitTokenRef.current;
            const startKey = stableRequestKey(
                incidentStartKeyRef.current,
                token ?? "standalone",
                () => crypto.randomUUID()
            );
            incidentStartKeyRef.current = startKey;
            const res = await fetch("/api/public/customer-feedback/incidents/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    "Resolve-Idempotency-Key": startKey.key,
                },
                body: "{}",
            });
            if (!res.ok) {
                setError(toUiError(await res.json().catch(() => null), "submitFail", lang));
                return;
            }
            const data = await res.json();
            setIncidentToken(data.visitToken);
            incidentStartKeyRef.current = null;
            setIncidentStation(selectedStation ?? (result?.station ? { id: result.station.id, name: result.station.name, emergencyPhone: result.station.emergencyPhone } : null));
            setIncidentOccurredAt(localDateTimeInputValue());
            setIncidentKey(null);
            setDangerStatus(null);
            setIncidentNoDetail(false);
            setIncidentComment("");
            setIncidentWantsFollowUp(false);
            setIncidentContactChannel("PHONE");
            setIncidentContactValue("");
            setIncidentContactName("");
            setIncidentPreferredTime("ANYTIME");
            setIncidentStationQuery("");
            setIncidentStationResults([]);
            incidentIdempotencyKeyRef.current = null;
            setScreen("incident-type");
        } catch {
            setError({ kind: "dict", key: "submitFail" });
        } finally {
            setBusy(false);
        }
    }, [incidentToken, lang, result, selectedStation]);

    const submitIncident = useCallback(async () => {
        if (!incidentKey || !dangerStatus) return;
        if (!incidentOccurredAt || Number.isNaN(new Date(incidentOccurredAt).getTime())) {
            setError({ kind: "dict", key: "required", field: "occurredAt" });
            setScreen("incident-context");
            return;
        }
        if (!incidentNoDetail && !incidentComment.trim()) {
            setError({ kind: "dict", key: "required", field: "comment" });
            setScreen("incident-detail");
            return;
        }
        if (incidentWantsFollowUp && !incidentContactValue.trim()) {
            setError({ kind: "dict", key: "required", field: "contact" });
            setScreen("incident-detail");
            return;
        }
        setBusy(true);
        setError(null);
        setScreen("submitting");
        const payload: Record<string, unknown> = {
            incidentKey,
            dangerStatus,
            occurredAt: new Date(incidentOccurredAt).toISOString(),
            noDetail: incidentNoDetail,
            comment: incidentNoDetail ? undefined : incidentComment.trim() || undefined,
            wantsFollowUp: incidentWantsFollowUp,
            language: lang,
        };
        if (incidentStation) payload.selectedStationId = incidentStation.id;
        if (incidentWantsFollowUp) {
            payload.contact = {
                consent: true,
                channel: incidentContactChannel,
                value: incidentContactValue,
                name: incidentContactName || undefined,
                preferredTime: incidentPreferredTime,
            };
        }
        const stableKey = stableRequestKey(
            incidentIdempotencyKeyRef.current,
            JSON.stringify(payload),
            () => crypto.randomUUID()
        );
        incidentIdempotencyKeyRef.current = stableKey;
        try {
            const res = await fetch("/api/public/customer-feedback/incidents", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${incidentToken}`, "Idempotency-Key": stableKey.key },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                const uiError = toUiError(data, "submitFail", lang);
                setError(uiError);
                if (uiError?.field === "occurredAt" || uiError?.field === "selectedStationId") setScreen("incident-context");
                else if (uiError?.field === "incidentKey") setScreen("incident-type");
                else if (uiError?.field === "dangerStatus") setScreen("incident-danger");
                else setScreen("incident-detail");
                return;
            }
            setRefCode(data.refCode ?? null);
            setCaseSeverity(data.severity ?? null);
            setScreen("incident-done");
            incidentIdempotencyKeyRef.current = null;
            if (!result) clearStoredFeedbackDraft();
        } catch {
            setError({ kind: "dict", key: "submitFail" });
            setScreen("incident-detail");
        } finally {
            setBusy(false);
        }
    }, [incidentKey, dangerStatus, incidentOccurredAt, incidentNoDetail, incidentComment, incidentWantsFollowUp, incidentStation, incidentContactChannel, incidentContactValue, incidentContactName, incidentPreferredTime, lang, incidentToken, result]);

    const emergencyPhone = incidentStation?.emergencyPhone ?? selectedStation?.emergencyPhone ?? result?.station?.emergencyPhone ?? null;

    // ---------- render helpers ----------

    const primaryBtn = (label: string, onClick: () => void, disabled = false) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || busy}
            className="w-full min-h-[56px] rounded-xl bg-yellow-400 px-6 py-4 text-base font-bold text-neutral-900 shadow-sm transition active:scale-[0.99] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 motion-reduce:transform-none motion-reduce:transition-none"
        >
            {busy ? (
                <span role="status" className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
                    <span className="sr-only">{lang === "th" ? "กำลังดำเนินการ" : "Processing"}</span>
                </span>
            ) : label}
        </button>
    );

    const errorLabel = (e: UiError): string | null => {
        if (!e) return null;
        if (e.kind === "code") return ERROR_DICT[e.code][lang];
        if (e.kind === "dict") return t[e.key];
        return e.text;
    };

    const errorBox = (e: UiError) =>
        e ? (
            <p ref={errorAlertRef} role="alert" tabIndex={-1} className="rounded-lg bg-red-50 p-3 text-sm text-red-700 focus:outline-none">
                {errorLabel(e)}
            </p>
        ) : null;

    const secondaryBtn = (label: string, onClick: () => void) => (
        <button
            type="button"
            onClick={onClick}
            className="w-full min-h-[48px] rounded-xl border border-neutral-300 bg-white px-6 py-3 text-base font-medium text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
        >
            {label}
        </button>
    );

    const header = (
        <header className="flex items-center justify-between border-b border-neutral-200 bg-yellow-400 px-4 py-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
                <span className="inline-block h-3 w-3 rounded-full bg-neutral-900" aria-hidden />
                {t.header}
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        const next = lang === "th" ? "en" : "th";
                        setLang(next);
                        sessionStorage.setItem("cf_lang", next);
                    }}
                    className="min-h-[44px] rounded-lg border border-neutral-900/20 px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                    aria-label="Change language"
                >
                    {lang === "th" ? "EN" : "ไทย"}
                </button>
            </div>
        </header>
    );

    const incidentFooter = !["incident-intro", "incident-type", "incident-danger", "incident-context", "incident-detail", "incident-done"].includes(screen) ? (
        <div className="px-4 pb-8 pt-2">
            <button
                type="button"
                disabled={busy}
                onClick={() => {
                    setPreIncidentScreen(screen);
                    setScreen("incident-intro");
                }}
                className="w-full min-h-[44px] rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
            >
                {t.incidentLink}
            </button>
        </div>
    ) : (
        <div className="px-4 pb-8 pt-2">
            {emergencyPhone && (
                <a
                    href={`tel:${emergencyPhone}`}
                    aria-label={t.callAria(t.callStation, emergencyPhone)}
                    className="mb-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                >
                    <Phone className="h-4 w-4" aria-hidden /> {t.callStation} {emergencyPhone}
                </a>
            )}
            <div className="grid grid-cols-2 gap-2">
                <a
                    href="tel:191"
                    aria-label={t.callAria(t.callPolice, "191")}
                    className="flex min-h-[52px] flex-col items-center justify-center rounded-lg border border-neutral-300 px-2 py-2 text-neutral-700"
                >
                    <span className="flex items-center text-sm font-semibold">
                        <Phone className="mr-1 h-4 w-4" aria-hidden /> 191
                    </span>
                    <span className="text-xs text-neutral-500">{t.callPolice}</span>
                </a>
                <a
                    href="tel:1669"
                    aria-label={t.callAria(t.callMedical, "1669")}
                    className="flex min-h-[52px] flex-col items-center justify-center rounded-lg border border-neutral-300 px-2 py-2 text-neutral-700"
                >
                    <span className="flex items-center text-sm font-semibold">
                        <Phone className="mr-1 h-4 w-4" aria-hidden /> 1669
                    </span>
                    <span className="text-xs text-neutral-500">{t.callMedical}</span>
                </a>
            </div>
        </div>
    );

    const card = (children: React.ReactNode) => (
        <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-md flex-col">
            {header}
            {result?.isTest && (
                <p role="status" className="mx-4 mt-4 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                    {t.testModeBanner}
                </p>
            )}
            <div className="flex-1 px-4 py-6">{children}</div>
            {incidentFooter}
            <div className="px-4 pb-6 text-center">
                <a
                    href="/feedback/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center px-3 text-sm font-medium text-neutral-600 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                >
                    {t.privacy}
                </a>
            </div>
        </div>
    );

    const H = ({ children }: { children: React.ReactNode }) => (
        <h1 ref={headingRef} tabIndex={-1} className="mb-1 text-xl font-bold leading-snug focus:outline-none">
            {children}
        </h1>
    );

    // ---------- screens ----------

    if (screen === "resolve") {
        return card(
            <div className="space-y-6">
                <H>{t.header}</H>
                <p className="text-neutral-600">{t.intro}</p>
                {errorBox(resolveError)}
                <div className="space-y-2">
                    <label htmlFor="manual-code" className="text-sm font-semibold">
                        {t.manualCode}
                    </label>
                    <input
                        id="manual-code"
                        value={manualCode}
                        onChange={(e) => {
                            setManualCode(e.target.value.toUpperCase());
                            setPendingResolveToken(null);
                        }}
                        maxLength={8}
                        autoCapitalize="characters"
                        className="min-h-[48px] w-full rounded-xl border border-neutral-300 px-4 text-lg tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                        placeholder="XXXXXXXX"
                    />
                </div>
                {primaryBtn(
                    pendingResolveToken ? t.retry : t.start,
                    () => void doResolve(pendingResolveToken ?? undefined, pendingResolveToken ? undefined : manualCode),
                    !pendingResolveToken && manualCode.length !== 8
                )}
            </div>
        );
    }

    if (screen === "confirm-target" && result) {
        const isEmployee = result.targetType === "EMPLOYEE";
        const station = selectedStation ?? result.station;
        const targetLabel = isEmployee ? result.target.label : station?.name ?? "";
        return card(
            <div className="space-y-6">
                <p className="text-sm text-neutral-500">{t.intro}</p>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-lg font-bold">{isEmployee ? result.target.label : station?.name}</p>
                    {isEmployee && result.target.position && <p className="text-sm text-neutral-600">{result.target.position}</p>}
                    {station && <p className="mt-1 text-sm text-neutral-600">{station.name}</p>}
                    {isEmployee && (
                        <button
                            type="button"
                            onClick={() => {
                                setStationQuery("");
                                setStationResults([]);
                                setScreen("station-select");
                            }}
                            className="mt-1 inline-flex min-h-[44px] items-center text-sm text-blue-700 underline underline-offset-4"
                        >
                            {t.wrongStation}
                        </button>
                    )}
                </div>
                <H>{isEmployee ? t.confirmQ(targetLabel) : t.confirmStationQ}</H>
                <fieldset id="confirmation-group" tabIndex={-1} className="space-y-2 focus:outline-none">
                    <legend className="sr-only">{isEmployee ? t.confirmQ(targetLabel) : t.confirmStationQ}</legend>
                    {(["YES", "NO", "UNSURE"] as const).map((v) => (
                        <label
                            key={v}
                            className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${confirmation === v ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                        >
                            <input
                                type="radio"
                                name="confirm"
                                value={v}
                                checked={confirmation === v}
                                onChange={() => setConfirmation(v)}
                                className="h-5 w-5 accent-yellow-500"
                            />
                            {v === "YES" ? t.yes : v === "NO" ? t.no : t.unsure}
                        </label>
                    ))}
                </fieldset>
                {errorBox(error)}
                {primaryBtn(t.next, async () => {
                    if (!confirmation) {
                        setError({ kind: "dict", key: "required" });
                        return;
                    }
                    await postProgress({ targetConfirmation: confirmation, startedAt: true, lastStep: "confirm-target" });
                    if (confirmation !== "YES") {
                        activeStandardVisitTokenRef.current = null;
                        clearStoredFeedbackDraft();
                        setScreen("target-rejected");
                        return;
                    }
                    // สถานี EMPLOYEE ที่ยังไม่มี -> ต้องเลือกก่อน
                    if (result.targetType === "EMPLOYEE" && !result.station && !selectedStation) {
                        setScreen("station-select");
                        return;
                    }
                    // สถานีที่กำหนดจุดบริการไว้ล่วงหน้ายังต้องให้ลูกค้ายืนยันหรือแก้ไขได้
                    if (result.targetType === "STATION") {
                        if (result.serviceAreaKey && serviceAreas.length === 0) setServiceAreas([result.serviceAreaKey]);
                        setScreen("service-areas");
                        return;
                    }
                    setScreen("rating");
                })}
            </div>
        );
    }

    if (screen === "station-select") {
        return card(
            <div className="space-y-4">
                <H>{t.stationQ}</H>
                <div className="space-y-2">
                    <label htmlFor="station-q" className="flex items-center gap-2 text-sm font-semibold">
                        <Search className="h-4 w-4" aria-hidden /> {t.searchStation}
                    </label>
                    <input
                        id="station-q"
                        value={stationQuery}
                        onChange={(e) => {
                            setStationQuery(e.target.value);
                            scheduleStationSearch("standard", e.target.value, result?.visitToken);
                        }}
                        className="min-h-[48px] w-full rounded-xl border border-neutral-300 px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                    />
                </div>
                {errorBox(stationSearchError)}
                <ul className="space-y-2">
                    {stationResults.map((s) => (
                        <li key={s.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStation({ id: s.id, name: s.name, emergencyPhone: s.publicEmergencyPhone });
                                    setStationQuery("");
                                    scheduleStationSearch("standard", "", result?.visitToken);
                                    setScreen("confirm-target");
                                }}
                                className="min-h-[56px] w-full rounded-xl border border-neutral-300 px-4 py-3 text-left font-medium hover:border-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                            >
                                {s.name}
                            </button>
                        </li>
                    ))}
                </ul>
                {result && secondaryBtn(t.back, () => {
                    setStationQuery("");
                    scheduleStationSearch("standard", "", result.visitToken);
                    setScreen("confirm-target");
                })}
            </div>
        );
    }

    if (screen === "target-rejected") {
        return card(
            <div className="space-y-4">
                <H>{t.yes === "Yes" ? "Thank you" : "ขอบคุณ"}</H>
                <p className="text-neutral-600">{result?.targetType === "EMPLOYEE" ? t.rescanEmployee : t.rescanStation}</p>
                {primaryBtn(t.scanAgain, () => window.location.reload())}
            </div>
        );
    }

    if (screen === "service-areas" && result) {
        const keys = Object.keys(SERVICE_AREAS);
        return card(
            <div className="space-y-4">
                <H>{t.serviceAreaQ}</H>
                <p className="text-sm text-neutral-500">{t.selected(serviceAreas.length, keys.length)}</p>
                {result.serviceAreaKey && (
                    <p className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
                        {lang === "th" ? "จุดบริการจากป้ายถูกเลือกไว้แล้ว คุณแก้ไขได้" : "The service area from this sign is preselected. You can change it."}
                    </p>
                )}
                <fieldset id="service-area-group" tabIndex={-1} className="flex flex-wrap gap-2 focus:outline-none">
                    <legend className="sr-only">{t.serviceAreaQ}</legend>
                    {keys.map((k) => {
                        const active = serviceAreas.includes(k);
                        return (
                            <label
                                key={k}
                                className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${active ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={() => toggleChoice(k, serviceAreas, setServiceAreas)}
                                    className="mr-2 h-4 w-4 accent-yellow-500"
                                />
                                {tr(SERVICE_AREAS[k as keyof typeof SERVICE_AREAS], lang)}
                            </label>
                        );
                    })}
                </fieldset>
                {primaryBtn(t.next, () => {
                    if (serviceAreas.length === 0) {
                        setError({ kind: "dict", key: "required" });
                        return;
                    }
                    setError(null);
                    void postProgress({ lastStep: "service-areas" });
                    setScreen("rating");
                })}
                {errorBox(error)}
            </div>
        );
    }

    if (screen === "rating" && result) {
        return card(
            <div className="space-y-4">
                <H>{result.targetType === "EMPLOYEE" ? t.ratingQEmployee : t.ratingQStation}</H>
                <fieldset id="rating-group" tabIndex={-1} className="space-y-2 focus:outline-none">
                    <legend className="sr-only">{result.targetType === "EMPLOYEE" ? t.ratingQEmployee : t.ratingQStation}</legend>
                    {RATINGS.map((r) => (
                        <label
                            key={r.value}
                            className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${rating === r.value ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                        >
                            <input
                                type="radio"
                                name="rating"
                                value={r.value}
                                checked={rating === r.value}
                                onChange={() => setRating(r.value)}
                                className="h-5 w-5 accent-yellow-500"
                            />
                            {r.value}. {tr(r, lang)}
                        </label>
                    ))}
                </fieldset>
                {primaryBtn(t.next, () => {
                    if (rating === null) {
                        setError({ kind: "dict", key: "required" });
                        return;
                    }
                    setError(null);
                    void postProgress({ lastStep: "rating" });
                    setReasonKeys([]);
                    setScreen(result.surveyVersion === "employee-v2" ? "service-behaviors" : "reasons");
                })}
                {errorBox(error)}
            </div>
        );
    }

    if (screen === "service-behaviors" && result?.surveyVersion === "employee-v2") {
        const answeredCount = EMPLOYEE_BEHAVIOR_QUESTION_KEYS.filter((key) => isBehaviorAnswer(behaviorAnswers[key])).length;
        const behaviorError = error?.field === "behaviorAnswers";
        return card(
            <div className="space-y-4">
                <H>{t.serviceBehaviorsQ}</H>
                <p id="service-behaviors-progress" className="text-sm text-neutral-500">
                    {t.behaviorAnswered(answeredCount, EMPLOYEE_BEHAVIOR_QUESTION_KEYS.length)}
                </p>
                <div
                    id="service-behaviors-group"
                    tabIndex={-1}
                    aria-describedby="service-behaviors-progress"
                    aria-invalid={behaviorError || undefined}
                    className="space-y-4 focus:outline-none"
                >
                    {EMPLOYEE_BEHAVIOR_QUESTIONS.map(({ key, label }, index) => (
                        <fieldset key={key} className="rounded-xl border border-neutral-200 bg-white p-3">
                            <legend className="px-1 text-sm font-semibold leading-snug">
                                {index + 1}. {tr(label, lang)}
                            </legend>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {(["YES", "NO", "UNSURE"] as const).map((answer) => {
                                    const active = behaviorAnswers[key] === answer;
                                    return (
                                        <label
                                            key={answer}
                                            className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${active ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                                        >
                                            <input
                                                type="radio"
                                                name={`behavior-${key}`}
                                                value={answer}
                                                checked={active}
                                                onChange={() => {
                                                    const next = { ...behaviorAnswers, [key]: answer };
                                                    setBehaviorAnswers(next);
                                                    if (hasCompleteBehaviorAnswers(next)) setError(null);
                                                }}
                                                className="sr-only"
                                            />
                                            {answer === "YES" ? t.yes : answer === "NO" ? t.no : t.unsure}
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>
                    ))}
                </div>
                {errorBox(error)}
                {primaryBtn(t.next, () => {
                    if (!hasCompleteBehaviorAnswers(behaviorAnswers)) {
                        setError({ kind: "dict", key: "required", field: "behaviorAnswers" });
                        return;
                    }
                    setError(null);
                    void postProgress({ lastStep: "service-behaviors" });
                    setScreen("reasons");
                })}
                {secondaryBtn(t.back, () => {
                    setError(null);
                    setScreen("rating");
                })}
            </div>
        );
    }

    if (screen === "reasons" && result && rating !== null) {
        const maxReasons = result.maxReasons;
        return card(
            <div className="space-y-4">
                <H>{reasonQuestion(rating, lang)}</H>
                <p className="text-sm text-neutral-500">{t.selected(reasonKeys.length, maxReasons)}</p>
                <fieldset id="reason-group" tabIndex={-1} className="flex flex-wrap gap-2 focus:outline-none">
                    <legend className="sr-only">{reasonQuestion(rating, lang)}</legend>
                    {reasonOptions.map((k) => {
                        const active = reasonKeys.includes(k);
                        return (
                            <label
                                key={k}
                                className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${active ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={active}
                                    disabled={!active && reasonKeys.length >= maxReasons}
                                    onChange={() => toggleChoice(k, reasonKeys, setReasonKeys)}
                                    className="mr-2 h-4 w-4 accent-yellow-500"
                                />
                                {tr(REASONS[k as keyof typeof REASONS], lang)}
                            </label>
                        );
                    })}
                </fieldset>
                <div className="space-y-2">
                    {!showComment ? (
                        secondaryBtn(t.addDetail, () => setShowComment(true))
                    ) : (
                        <div className="space-y-1">
                            <label htmlFor="comment" className="text-sm font-semibold">
                                {commentQuestion(rating, lang, result.targetType === "EMPLOYEE" ? "employee" : "station")}
                            </label>
                            <textarea
                                id="comment"
                                value={comment}
                                maxLength={result.commentMaxLength}
                                rows={4}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full rounded-xl border border-neutral-300 p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                                placeholder={lang === "th" ? "กรุณาระบุเหตุการณ์หรือขั้นตอนที่พบ และหลีกเลี่ยงข้อมูลส่วนตัวที่ไม่จำเป็น" : "Please describe what happened. Avoid unnecessary personal details."}
                            />
                            <p className="text-right text-xs text-neutral-600">{comment.length}/{result.commentMaxLength}</p>
                        </div>
                    )}
                </div>
                <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-neutral-300 px-4 text-sm font-medium">
                    <input type="checkbox" checked={wantsFollowUp} onChange={(e) => setWantsFollowUp(e.target.checked)} className="h-5 w-5 accent-yellow-500" />
                    {t.askFollowUp}
                </label>
                {wantsFollowUp && (
                    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        <fieldset className="grid grid-cols-2 gap-2">
                            <legend className="sr-only">{t.askFollowUp}</legend>
                            {(["PHONE", "EMAIL"] as const).map((c) => (
                                <label key={c} className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-semibold has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${contactChannel === c ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}>
                                    <input type="radio" name="channel" checked={contactChannel === c} onChange={() => setContactChannel(c)} className="sr-only" />
                                    {c === "PHONE" ? t.contactPhone : t.contactEmail}
                                </label>
                            ))}
                        </fieldset>
                        <input
                            id="contact-value"
                            value={contactValue}
                            onChange={(e) => setContactValue(e.target.value)}
                            inputMode={contactChannel === "PHONE" ? "tel" : "email"}
                            placeholder={contactChannel === "PHONE" ? "08x-xxx-xxxx" : "you@example.com"}
                            aria-label={contactChannel === "PHONE" ? t.contactPhone : t.contactEmail}
                            className="min-h-[48px] w-full rounded-lg border border-neutral-300 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                        />
                        <input
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            maxLength={100}
                            placeholder={t.yourName}
                            aria-label={t.yourName}
                            className="min-h-[48px] w-full rounded-lg border border-neutral-300 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                        />
                        <label htmlFor="preferred-time" className="block text-sm font-semibold">{t.preferredTime}</label>
                        <select
                            id="preferred-time"
                            value={preferredTime}
                            onChange={(e) => setPreferredTime(e.target.value)}
                            className="min-h-[48px] w-full rounded-lg border border-neutral-300 px-3"
                        >
                            <option value="ANYTIME">{t.anytime}</option>
                            <option value="MORNING">{t.morning}</option>
                            <option value="AFTERNOON">{t.afternoon}</option>
                            <option value="EVENING">{t.evening}</option>
                        </select>
                    </div>
                )}
                {rating <= 2 && !result.isTest && <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t.incidentCaseNote}</p>}
                {errorBox(error)}
                {primaryBtn(t.submit, () => void submitStandard())}
                {secondaryBtn(t.back, () => setScreen(
                    result.targetType === "STATION"
                        ? "service-areas"
                        : result.surveyVersion === "employee-v2"
                            ? "service-behaviors"
                            : "rating"
                ))}
            </div>
        );
    }

    if (screen === "submitting") {
        return card(
            <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500 motion-reduce:animate-none" aria-hidden />
                <p className="text-sm text-neutral-700">{lang === "th" ? "กำลังส่งข้อมูล" : "Submitting"}</p>
            </div>
        );
    }

    if (screen === "done") {
        return card(
            <div className="space-y-4 py-8">
                <CheckCircle2 className="h-14 w-14 text-green-600" aria-hidden />
                <H>{result?.targetType === "STATION" ? t.thanksStation : t.thanks}</H>
                {result?.targetType === "EMPLOYEE" && <p className="text-neutral-600">{t.rescanEmployee}</p>}
                {result?.targetType === "STATION" && <p className="text-neutral-600">{t.rescanStation}</p>}
                {refCode && (
                    <p className="rounded-xl bg-neutral-100 p-3 text-sm">
                        {t.refCodeLabel}: <span className="font-mono font-bold">{refCode}</span>
                        {caseSeverity && !result?.isTest && <span className="mt-1 block text-neutral-500">{t.caseCreated}</span>}
                    </p>
                )}
            </div>
        );
    }

    if (screen === "incident-intro") {
        return card(
            <div className="space-y-4">
                <H>{t.incidentLink}</H>
                {/* เบอร์ฉุกเฉินอยู่ในแถบล่างของทุกหน้าแจ้งเหตุแล้ว — ไม่ซ้ำที่นี่ */}
                <p className="text-neutral-600">{t.emergencyNote}</p>
                {errorBox(error)}
                {primaryBtn(t.incidentGo, () => void startIncident())}
                {secondaryBtn(t.incidentBack, () => setScreen(preIncidentScreen))}
            </div>
        );
    }

    if (screen === "incident-type") {
        return card(
            <div className="space-y-4">
                <H>{t.incidentTypeQ}</H>
                <fieldset id="incident-type-group" tabIndex={-1} className="space-y-2 focus:outline-none">
                    <legend className="sr-only">{t.incidentTypeQ}</legend>
                    {Object.keys(INCIDENT_TYPES).map((k) => (
                        <label
                            key={k}
                            className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${incidentKey === k ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                        >
                            <input type="radio" name="incident-type" checked={incidentKey === k} onChange={() => { setIncidentKey(k); setError(null); }} className="h-5 w-5 accent-yellow-500" />
                            {tr(INCIDENT_TYPES[k as keyof typeof INCIDENT_TYPES], lang)}
                        </label>
                    ))}
                </fieldset>
                {errorBox(error)}
                {primaryBtn(t.next, () => {
                    if (!incidentKey) {
                        setError({ kind: "dict", key: "required", field: "incidentKey" });
                        return;
                    }
                    setError(null);
                    setScreen("incident-danger");
                })}
                {secondaryBtn(t.back, () => setScreen("incident-intro"))}
            </div>
        );
    }

    if (screen === "incident-danger") {
        return card(
            <div className="space-y-4">
                <H>{t.dangerQ}</H>
                {dangerStatus === "YES" && (
                    <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                        {t.dangerWarn}
                    </p>
                )}
                <fieldset id="incident-danger-group" tabIndex={-1} className="space-y-2 focus:outline-none">
                    <legend className="sr-only">{t.dangerQ}</legend>
                    {(["YES", "NO", "UNSURE"] as const).map((v) => (
                        <label
                            key={v}
                            className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${dangerStatus === v ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                        >
                            <input type="radio" name="danger" checked={dangerStatus === v} onChange={() => { setDangerStatus(v); setError(null); }} className="h-5 w-5 accent-yellow-500" />
                            {v === "YES" ? (lang === "th" ? "มี" : "Yes") : v === "NO" ? (lang === "th" ? "ไม่มี" : "No") : t.unsure}
                        </label>
                    ))}
                </fieldset>
                {errorBox(error)}
                {primaryBtn(t.next, () => {
                    if (!dangerStatus) {
                        setError({ kind: "dict", key: "required", field: "dangerStatus" });
                        return;
                    }
                    setError(null);
                    setScreen("incident-context");
                })}
                {secondaryBtn(t.back, () => setScreen("incident-type"))}
            </div>
        );
    }

    if (screen === "incident-context") {
        return card(
            <div className="space-y-4">
                <H>{t.incidentContextQ}</H>
                <div className="space-y-2">
                    <label htmlFor="incident-occurred-at" className="text-sm font-semibold">{t.incidentTime}</label>
                    <input
                        id="incident-occurred-at"
                        type="datetime-local"
                        value={incidentOccurredAt}
                        max={localDateTimeInputValue(new Date(Date.now() + 5 * 60_000))}
                        onChange={(event) => {
                            setIncidentOccurredAt(event.target.value);
                            setError(null);
                        }}
                        className="min-h-[48px] w-full rounded-xl border border-neutral-300 px-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="incident-station-q" className="flex items-center gap-2 text-sm font-semibold">
                        <Search className="h-4 w-4" aria-hidden /> {t.incidentStationOptional}
                    </label>
                    <p className="text-sm text-neutral-600">{t.incidentStationHint}</p>
                    {incidentStation && (
                        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-3">
                            <p className="font-semibold">{incidentStation.name}</p>
                            <button
                                type="button"
                                onClick={() => setIncidentStation(null)}
                                className="mt-1 inline-flex min-h-[44px] items-center text-sm text-blue-700 underline underline-offset-4"
                            >
                                {t.clearStation}
                            </button>
                        </div>
                    )}
                    <input
                        id="incident-station-q"
                        value={incidentStationQuery}
                        onChange={(event) => {
                            const value = event.target.value;
                            setIncidentStationQuery(value);
                            scheduleStationSearch("incident", value, incidentToken);
                        }}
                        placeholder={t.searchStation}
                        className="min-h-[48px] w-full rounded-xl border border-neutral-300 px-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                    />
                    {errorBox(incidentStationSearchError)}
                    <ul className="space-y-2">
                        {incidentStationResults.map((station) => (
                            <li key={station.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIncidentStation({ id: station.id, name: station.name, emergencyPhone: station.publicEmergencyPhone });
                                        setIncidentStationQuery("");
                                        scheduleStationSearch("incident", "", incidentToken);
                                    }}
                                    className="min-h-[52px] w-full rounded-xl border border-neutral-300 px-4 py-3 text-left font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                                >
                                    {station.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                {errorBox(error)}
                {primaryBtn(t.next, () => {
                    if (!incidentOccurredAt || Number.isNaN(new Date(incidentOccurredAt).getTime())) {
                        setError({ kind: "dict", key: "required", field: "occurredAt" });
                        return;
                    }
                    setError(null);
                    setScreen("incident-detail");
                })}
                {secondaryBtn(t.back, () => setScreen("incident-danger"))}
            </div>
        );
    }

    if (screen === "incident-detail") {
        return card(
            <div className="space-y-4">
                <H>{t.detailQ}</H>
                <div className="space-y-1">
                    <label htmlFor="incident-comment" className="text-sm font-semibold">{t.detailQ}</label>
                    <textarea
                        id="incident-comment"
                        value={incidentComment}
                        maxLength={1000}
                        rows={5}
                        disabled={incidentNoDetail}
                        onChange={(e) => { setIncidentComment(e.target.value); setError(null); }}
                        className="w-full rounded-xl border border-neutral-300 p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600 disabled:bg-neutral-100"
                    />
                    <p className="text-right text-xs text-neutral-600">{incidentComment.length}/1000</p>
                </div>
                <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-neutral-300 px-4 text-sm font-medium">
                    <input type="checkbox" checked={incidentNoDetail} onChange={(e) => { setIncidentNoDetail(e.target.checked); setError(null); }} className="h-5 w-5 accent-yellow-500" />
                    {t.noDetail}
                </label>
                <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-neutral-300 px-4 text-sm font-medium">
                    <input type="checkbox" checked={incidentWantsFollowUp} onChange={(e) => setIncidentWantsFollowUp(e.target.checked)} className="h-5 w-5 accent-yellow-500" />
                    {t.askFollowUp}
                </label>
                {incidentWantsFollowUp && (
                    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        <fieldset className="grid grid-cols-2 gap-2">
                            <legend className="sr-only">{t.askFollowUp}</legend>
                            {(["PHONE", "EMAIL"] as const).map((c) => (
                                <label key={c} className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-semibold ${incidentContactChannel === c ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}>
                                    <input type="radio" name="incident-channel" checked={incidentContactChannel === c} onChange={() => setIncidentContactChannel(c)} className="sr-only" />
                                    {c === "PHONE" ? t.contactPhone : t.contactEmail}
                                </label>
                            ))}
                        </fieldset>
                        <input
                            id="incident-contact-value"
                            value={incidentContactValue}
                            onChange={(e) => { setIncidentContactValue(e.target.value); setError(null); }}
                            inputMode={incidentContactChannel === "PHONE" ? "tel" : "email"}
                            placeholder={incidentContactChannel === "PHONE" ? "08x-xxx-xxxx" : "you@example.com"}
                            aria-label={incidentContactChannel === "PHONE" ? t.contactPhone : t.contactEmail}
                            className="min-h-[48px] w-full rounded-lg border border-neutral-300 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                        />
                        <input
                            value={incidentContactName}
                            onChange={(e) => setIncidentContactName(e.target.value)}
                            maxLength={100}
                            placeholder={t.yourName}
                            aria-label={t.yourName}
                            className="min-h-[48px] w-full rounded-lg border border-neutral-300 px-3"
                        />
                        <label htmlFor="incident-preferred-time" className="block text-sm font-semibold">{t.preferredTime}</label>
                        <select
                            id="incident-preferred-time"
                            value={incidentPreferredTime}
                            onChange={(e) => setIncidentPreferredTime(e.target.value)}
                            className="min-h-[48px] w-full rounded-lg border border-neutral-300 px-3"
                        >
                            <option value="ANYTIME">{t.anytime}</option>
                            <option value="MORNING">{t.morning}</option>
                            <option value="AFTERNOON">{t.afternoon}</option>
                            <option value="EVENING">{t.evening}</option>
                        </select>
                    </div>
                )}
                {!result?.isTest && <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t.incidentCaseNote}</p>}
                {errorBox(error)}
                {primaryBtn(t.submit, () => void submitIncident())}
                {secondaryBtn(t.back, () => setScreen("incident-context"))}
            </div>
        );
    }

    if (screen === "incident-done") {
        return card(
            <div className="space-y-4 py-8">
                <CheckCircle2 className="h-14 w-14 text-green-600" aria-hidden />
                <H>{lang === "th" ? "รับรายงานแล้ว ขอบคุณที่แจ้งให้เราทราบ" : "Report received. Thank you."}</H>
                {refCode && (
                    <p className="rounded-xl bg-neutral-100 p-3 text-sm">
                        {t.refCodeLabel}: <span className="font-mono font-bold">{refCode}</span>
                        {caseSeverity && !result?.isTest && <span className="mt-1 block text-neutral-500">{t.caseCreated}</span>}
                    </p>
                )}
            </div>
        );
    }

    return card(
        <div className="space-y-4">
            <H>{t.header}</H>
            <p className="text-neutral-600">{t.submitFail}</p>
            {primaryBtn(t.scanAgain, () => window.location.reload())}
        </div>
    );
}
