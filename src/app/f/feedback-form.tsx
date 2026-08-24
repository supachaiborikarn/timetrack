"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Phone, Search } from "lucide-react";
import type { PublicErrorCode } from "@/lib/customer-feedback/public-errors";

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
    surveyVersion: "employee-v1" | "station-v1";
    targetType: "EMPLOYEE" | "STATION";
    target: { label: string; position: string | null };
    station: { id: string; name: string; emergencyPhone: string | null } | null;
    stationNeedsSelection: boolean;
    reasonOptionOrder: string[];
    maxReasons: number;
    commentMaxLength: number;
    serviceAreaKey: string | null;
    formExpiresAt: string;
};

type Screen =
    | "resolve"
    | "confirm-target"
    | "target-rejected"
    | "station-select"
    | "service-areas"
    | "rating"
    | "reasons"
    | "submitting"
    | "done"
    | "incident-intro"
    | "incident-type"
    | "incident-danger"
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
        confirmStationQ: "วันนี้คุณใช้บริการที่สถานีนี้ใช่ไหม",
        serviceAreaQ: "วันนี้คุณใช้บริการส่วนใด",
        ratingQEmployee: "โดยรวม คุณพอใจกับการให้บริการครั้งนี้เพียงใด",
        ratingQStation: "โดยรวม คุณพอใจกับการใช้บริการที่สถานีนี้วันนี้เพียงใด",
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
        refCodeLabel: "เลขอ้างอิง",
        caseCreated: "ทีมงานจะรับทราบตามระยะเวลาที่กำหนด",
        required: "กรุณาตอบคำถามนี้ก่อนดำเนินการต่อ",
        scanAgain: "สแกน QR ใหม่",
        selected: (n: number, max: number) => `เลือกแล้ว ${n}/${max}`,
    },
    en: {
        header: "Customer Feedback",
        privacy: "Privacy Notice",
        intro: "This survey takes about 1 minute and is anonymous.",
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
        confirmStationQ: "Did you use services at this station today",
        serviceAreaQ: "Which areas did you use today",
        ratingQEmployee: "Overall, how satisfied were you with this service",
        ratingQStation: "Overall, how satisfied were you with this station today",
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
    SERVER_BUSY: { th: "ระบบมีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้ง", en: "The system is busy. Please try again." },
    SESSION_EXPIRED: { th: "เซสชันหมดอายุ กรุณาสแกน QR อีกครั้ง", en: "Your session expired. Please scan the QR code again." },
    INCIDENT_SESSION_EXPIRED: { th: "เซสชันหมดอายุ กรุณาเริ่มใหม่อีกครั้ง", en: "Your session expired. Please start again." },
    FORM_EXPIRED: { th: "แบบประเมินหมดอายุ กรุณาสแกน QR ใหม่อีกครั้ง", en: "This survey expired. Please scan the QR code again." },
    INCIDENT_FORM_EXPIRED: { th: "แบบแจ้งเหตุหมดอายุ กรุณาเริ่มใหม่อีกครั้ง", en: "This report expired. Please start again." },
    INCIDENT_NOT_FOUND: { th: "ไม่พบแบบแจ้งเหตุนี้ กรุณาเริ่มใหม่อีกครั้ง", en: "Report not found. Please start again." },
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

type DictErrorKey = "resolveFail" | "submitFail" | "required";

/**
 * เก็บ error เป็น "ตัวระบุ" ไม่ใช่ข้อความสำเร็จรูป เพื่อให้กดสลับภาษาแล้ว
 * ข้อความที่ค้างบนจอเปลี่ยนตามด้วย — raw ใช้เฉพาะข้อความที่ไม่มีรหัสกำกับ
 */
type UiError =
    | { kind: "code"; code: PublicErrorCode }
    | { kind: "dict"; key: DictErrorKey }
    | { kind: "raw"; text: string }
    | null;

function toUiError(data: unknown, fallback: DictErrorKey): UiError {
    const body = data as { code?: unknown; error?: unknown } | null;
    if (typeof body?.code === "string" && body.code in ERROR_DICT) {
        return { kind: "code", code: body.code as PublicErrorCode };
    }
    if (typeof body?.error === "string" && body.error.length > 0) return { kind: "raw", text: body.error };
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

export function FeedbackForm() {
    const [lang, setLang] = useState<Lang>("th");
    const t = DICT[lang];
    const [screen, setScreen] = useState<Screen>("resolve");
    const [manualCode, setManualCode] = useState("");
    const [resolveError, setResolveError] = useState<UiError>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ResolveResult | null>(null);
    const [selectedStation, setSelectedStation] = useState<{ id: string; name: string; emergencyPhone: string | null } | null>(null);
    const [stationQuery, setStationQuery] = useState("");
    const [stationResults, setStationResults] = useState<{ id: string; name: string; publicEmergencyPhone: string | null }[]>([]);
    const [confirmation, setConfirmation] = useState<"YES" | "NO" | "UNSURE" | null>(null);
    const [serviceAreas, setServiceAreas] = useState<string[]>([]);
    const [rating, setRating] = useState<number | null>(null);
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
    const [noDetail, setNoDetail] = useState(false);
    const startedAtRef = useRef<number>(Date.now());
    // จำหน้าที่ลูกค้ากดลิงก์แจ้งเหตุเพื่อกลับมาต่อได้ถูกต้อง (§7 รักษาร่างเดิมไว้)
    const [preIncidentScreen, setPreIncidentScreen] = useState<Screen>("resolve");
    const headingRef = useRef<HTMLHeadingElement>(null);

    // คืนภาษาที่ลูกค้าเลือกไว้ — ตั้งใน effect ไม่ใช่ initial state เพื่อไม่ให้ hydrate ไม่ตรงกับ SSR
    useEffect(() => {
        const saved = sessionStorage.getItem("cf_lang");
        if (saved === "th" || saved === "en") setLang(saved);
    }, []);

    // โหลด token จาก URL fragment แล้ว resolve + ลบ fragment
    useEffect(() => {
        const hash = window.location.hash;
        const match = hash.match(/^#t=(.+)$/);
        if (match) {
            void doResolve(match[1], undefined);
            history.replaceState(null, "", window.location.pathname);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // focus ไปหัวข้อคำถามเมื่อเปลี่ยนขั้น
    useEffect(() => {
        headingRef.current?.focus();
    }, [screen]);

    const reasonOptions = useMemo(() => {
        if (!result) return [];
        const all = result.reasonOptionOrder;
        return all.filter((k) => k in REASONS);
    }, [result]);

    const doResolve = useCallback(async (token?: string, code?: string) => {
        setBusy(true);
        setResolveError(null);
        try {
            const nonce = Math.random().toString(36).slice(2);
            const res = await fetch("/api/public/customer-feedback/resolve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Resolve-Idempotency-Key": nonce,
                },
                body: JSON.stringify(token ? { token } : { manualCode: code }),
            });
            if (!res.ok) {
                // ใช้ข้อความจริงจาก server (เช่น ระบบยังไม่เปิด / rate limit) แล้วจึง fallback
                const data = await res.json().catch(() => null);
                setResolveError(toUiError(data, "resolveFail"));
                return;
            }
            const data: ResolveResult = await res.json();
            setResult(data);
            sessionStorage.setItem("cf_visit_token", data.visitToken);
            sessionStorage.setItem("cf_lang", lang);
            startedAtRef.current = Date.now();
            setScreen("confirm-target");
        } catch {
            setResolveError({ kind: "dict", key: "submitFail" });
        } finally {
            setBusy(false);
        }
    }, [lang]);

    const postProgress = useCallback(
        async (payload: Record<string, unknown>) => {
            const token = sessionStorage.getItem("cf_visit_token");
            if (!token) return;
            await fetch("/api/public/customer-feedback/visits/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ language: lang, ...payload }),
            }).catch(() => undefined);
        },
        [lang]
    );

    const searchStations = useCallback(async (q: string) => {
        const token = sessionStorage.getItem("cf_visit_token");
        if (!token || q.trim().length < 2) {
            setStationResults([]);
            return;
        }
        const res = await fetch(`/api/public/customer-feedback/stations?q=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        if (!res || !res.ok) {
            setStationResults([]);
            return;
        }
        const data = await res.json();
        setStationResults(data.stations ?? []);
    }, []);

    const toggleChoice = (key: string, current: string[], setter: (v: string[]) => void, singleton: boolean) => {
        if (singleton && key === "unspecified" || singleton && key === "unsure") {
            setter(current.includes(key) ? [] : [key]);
            return;
        }
        if (current.includes(key)) {
            setter(current.filter((k) => k !== key));
        } else {
            setter([...current.filter((k) => key === "other" || !["unspecified", "unsure"].includes(k)), key]);
        }
    };

    const submitStandard = useCallback(async () => {
        if (!result || rating === null) return;
        setBusy(true);
        setError(null);
        setScreen("submitting");
        const idemKey = crypto.randomUUID();
        const payload: Record<string, unknown> = {
            targetConfirmation: "YES",
            overallRating: rating,
            reasonKeys,
            serviceAreas,
            comment: comment.trim() || undefined,
            wantsFollowUp,
            language: lang,
            durationSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
        };
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
        try {
            const token = sessionStorage.getItem("cf_visit_token");
            const res = await fetch("/api/public/customer-feedback/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": idemKey },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(toUiError(data, "submitFail"));
                setScreen("reasons");
                return;
            }
            setRefCode(data.refCode ?? null);
            setCaseSeverity(data.severity ?? null);
            setScreen("done");
            sessionStorage.removeItem("cf_visit_token");
        } catch {
            setError({ kind: "dict", key: "submitFail" });
            setScreen("reasons");
        } finally {
            setBusy(false);
        }
    }, [result, rating, reasonKeys, serviceAreas, comment, wantsFollowUp, selectedStation, contactChannel, contactValue, contactName, preferredTime, lang]);

    const startIncident = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const token = sessionStorage.getItem("cf_visit_token");
            const res = await fetch("/api/public/customer-feedback/incidents/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    "Resolve-Idempotency-Key": Math.random().toString(36).slice(2),
                },
                body: "{}",
            });
            if (!res.ok) {
                setError(toUiError(await res.json().catch(() => null), "submitFail"));
                return;
            }
            const data = await res.json();
            setIncidentToken(data.visitToken);
            setScreen("incident-type");
        } catch {
            setError({ kind: "dict", key: "submitFail" });
        } finally {
            setBusy(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);

    const submitIncident = useCallback(async () => {
        if (!incidentKey || !dangerStatus) return;
        setBusy(true);
        setError(null);
        setScreen("submitting");
        const idemKey = crypto.randomUUID();
        const payload: Record<string, unknown> = {
            incidentKey,
            dangerStatus,
            occurredAt: new Date().toISOString(),
            noDetail,
            comment: noDetail ? undefined : comment.trim() || undefined,
            wantsFollowUp,
            language: lang,
            durationSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
        };
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
        try {
            const res = await fetch("/api/public/customer-feedback/incidents", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${incidentToken}`, "Idempotency-Key": idemKey },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(toUiError(data, "submitFail"));
                setScreen("incident-detail");
                return;
            }
            setRefCode(data.refCode ?? null);
            setCaseSeverity(data.severity ?? null);
            setScreen("incident-done");
            sessionStorage.removeItem("cf_visit_token");
        } catch {
            setError({ kind: "dict", key: "submitFail" });
            setScreen("incident-detail");
        } finally {
            setBusy(false);
        }
    }, [incidentKey, dangerStatus, noDetail, comment, wantsFollowUp, selectedStation, contactChannel, contactValue, contactName, preferredTime, lang, incidentToken]);

    const emergencyPhone = selectedStation?.emergencyPhone ?? result?.station?.emergencyPhone ?? null;

    // ---------- render helpers ----------

    const primaryBtn = (label: string, onClick: () => void, disabled = false) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || busy}
            className="w-full min-h-[56px] rounded-xl bg-yellow-400 px-6 py-4 text-base font-bold text-neutral-900 shadow-sm transition active:scale-[0.99] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
        >
            {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : label}
        </button>
    );

    const errorLabel = (e: UiError): string | null => {
        if (!e) return null;
        if (e.kind === "code") return ERROR_DICT[e.code][lang];
        if (e.kind === "dict") return t[e.key];
        return e.text;
    };

    const errorBox = (e: UiError) =>
        e ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorLabel(e)}</p> : null;

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
                    className="rounded-lg border border-neutral-900/20 px-3 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                    aria-label="Change language"
                >
                    {lang === "th" ? "EN" : "ไทย"}
                </button>
            </div>
        </header>
    );

    const incidentFooter = !["incident-intro", "incident-type", "incident-danger", "incident-detail", "done", "incident-done"].includes(screen) ? (
        <div className="px-4 pb-8 pt-2">
            <button
                type="button"
                onClick={() => {
                    setPreIncidentScreen(screen);
                    setScreen("incident-intro");
                }}
                className="w-full min-h-[44px] rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
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
            <div className="flex-1 px-4 py-6">{children}</div>
            {incidentFooter}
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
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        autoCapitalize="characters"
                        className="min-h-[48px] w-full rounded-xl border border-neutral-300 px-4 text-lg tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                        placeholder="XXXXXXXX"
                    />
                </div>
                {primaryBtn(t.start, () => void doResolve(undefined, manualCode), manualCode.length !== 8)}
                <p className="text-xs text-neutral-500">
                    <a href="/feedback/privacy" target="_blank" rel="noopener noreferrer" className="underline">
                        {t.privacy}
                    </a>
                </p>
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
                    {station && (
                        <p className="mt-1 text-sm text-neutral-600">
                            {station.name}
                            {!isEmployee && (
                                <button type="button" onClick={() => setScreen("station-select")} className="ml-2 text-xs text-blue-600 underline">
                                    {t.wrongStation}
                                </button>
                            )}
                        </p>
                    )}
                    {isEmployee && (
                        <button
                            type="button"
                            onClick={() => {
                                setStationQuery("");
                                setStationResults([]);
                                setScreen("station-select");
                            }}
                            className="mt-1 text-xs text-blue-600 underline"
                        >
                            {t.wrongStation}
                        </button>
                    )}
                </div>
                <H>{isEmployee ? t.confirmQ(targetLabel) : t.confirmStationQ}</H>
                <fieldset className="space-y-2">
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
                        setScreen("target-rejected");
                        return;
                    }
                    // สถานี EMPLOYEE ที่ยังไม่มี -> ต้องเลือกก่อน
                    if (result.targetType === "EMPLOYEE" && !result.station && !selectedStation) {
                        setScreen("station-select");
                        return;
                    }
                    // STATION flow มีหน้า service areas (ซ่อนได้ถ้า QR จุดย่อยกำหนดมา)
                    if (result.targetType === "STATION" && !result.serviceAreaKey) {
                        setScreen("service-areas");
                        return;
                    }
                    if (result.targetType === "STATION" && result.serviceAreaKey) {
                        setServiceAreas([result.serviceAreaKey]);
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
                            void searchStations(e.target.value);
                        }}
                        className="min-h-[48px] w-full rounded-xl border border-neutral-300 px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                    />
                </div>
                <ul className="space-y-2">
                    {stationResults.map((s) => (
                        <li key={s.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStation({ id: s.id, name: s.name, emergencyPhone: s.publicEmergencyPhone });
                                    setScreen("confirm-target");
                                }}
                                className="min-h-[56px] w-full rounded-xl border border-neutral-300 px-4 py-3 text-left font-medium hover:border-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
                            >
                                {s.name}
                            </button>
                        </li>
                    ))}
                </ul>
                {result && secondaryBtn(t.back, () => setScreen("confirm-target"))}
            </div>
        );
    }

    if (screen === "target-rejected") {
        return card(
            <div className="space-y-4">
                <H>{t.yes === "Yes" ? "Thank you" : "ขอบคุณ"}</H>
                <p className="text-neutral-600">{result?.targetType === "EMPLOYEE" ? t.rescanEmployee : t.rescanStation}</p>
                <a href="/f" className="block">{primaryBtn(t.scanAgain, () => window.location.reload())}</a>
            </div>
        );
    }

    if (screen === "service-areas" && result) {
        const keys = Object.keys(SERVICE_AREAS);
        return card(
            <div className="space-y-4">
                <H>{t.serviceAreaQ}</H>
                <p className="text-sm text-neutral-500">{t.selected(serviceAreas.length, keys.length)}</p>
                <div className="flex flex-wrap gap-2">
                    {keys.map((k) => {
                        const active = serviceAreas.includes(k);
                        const singleton = k === "unsure";
                        return (
                            <label
                                key={k}
                                className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${active ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={() => toggleChoice(k, serviceAreas, setServiceAreas, singleton)}
                                    className="mr-2 h-4 w-4 accent-yellow-500"
                                />
                                {tr(SERVICE_AREAS[k as keyof typeof SERVICE_AREAS], lang)}
                            </label>
                        );
                    })}
                </div>
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
                <fieldset className="space-y-2">
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
                    setScreen("reasons");
                })}
                {errorBox(error)}
            </div>
        );
    }

    if (screen === "reasons" && result && rating !== null) {
        const maxReasons = result.maxReasons;
        return card(
            <div className="space-y-4">
                <H>{reasonQuestion(rating, lang)}</H>
                <p className="text-sm text-neutral-500">{t.selected(reasonKeys.length, maxReasons)}</p>
                <div className="flex flex-wrap gap-2">
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
                                    onChange={() => toggleChoice(k, reasonKeys, setReasonKeys, true)}
                                    className="mr-2 h-4 w-4 accent-yellow-500"
                                />
                                {tr(REASONS[k as keyof typeof REASONS], lang)}
                            </label>
                        );
                    })}
                </div>
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
                            <p className="text-right text-xs text-neutral-400">{comment.length}/{result.commentMaxLength}</p>
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
                {rating <= 2 && <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t.incidentCaseNote}</p>}
                {errorBox(error)}
                {primaryBtn(t.submit, () => void submitStandard())}
                {secondaryBtn(t.back, () => setScreen(result.targetType === "STATION" && !result.serviceAreaKey ? "service-areas" : "rating"))}
            </div>
        );
    }

    if (screen === "submitting") {
        return card(
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" aria-label="loading" />
            </div>
        );
    }

    if (screen === "done") {
        return card(
            <div className="space-y-4 py-8">
                <CheckCircle2 className="h-14 w-14 text-green-600" aria-hidden />
                <H>{result?.targetType === "STATION" ? t.thanksStation : t.thanks}</H>
                {result?.targetType === "EMPLOYEE" && <p className="text-neutral-600">{t.rescanEmployee}</p>}
                {refCode && (
                    <p className="rounded-xl bg-neutral-100 p-3 text-sm">
                        {t.refCodeLabel}: <span className="font-mono font-bold">{refCode}</span>
                        {caseSeverity && <span className="mt-1 block text-neutral-500">{t.caseCreated}</span>}
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
                <fieldset className="space-y-2">
                    <legend className="sr-only">{t.incidentTypeQ}</legend>
                    {Object.keys(INCIDENT_TYPES).map((k) => (
                        <label
                            key={k}
                            className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${incidentKey === k ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                        >
                            <input type="radio" name="incident-type" checked={incidentKey === k} onChange={() => setIncidentKey(k)} className="h-5 w-5 accent-yellow-500" />
                            {tr(INCIDENT_TYPES[k as keyof typeof INCIDENT_TYPES], lang)}
                        </label>
                    ))}
                </fieldset>
                {primaryBtn(t.next, () => incidentKey && setScreen("incident-danger"))}
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
                <fieldset className="space-y-2">
                    <legend className="sr-only">{t.dangerQ}</legend>
                    {(["YES", "NO", "UNSURE"] as const).map((v) => (
                        <label
                            key={v}
                            className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-medium has-[:checked]:border-yellow-500 has-[:checked]:bg-yellow-50 ${dangerStatus === v ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}
                        >
                            <input type="radio" name="danger" checked={dangerStatus === v} onChange={() => setDangerStatus(v)} className="h-5 w-5 accent-yellow-500" />
                            {v === "YES" ? (lang === "th" ? "มี" : "Yes") : v === "NO" ? (lang === "th" ? "ไม่มี" : "No") : t.unsure}
                        </label>
                    ))}
                </fieldset>
                {primaryBtn(t.next, () => dangerStatus && setScreen("incident-detail"))}
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
                        value={comment}
                        maxLength={1000}
                        rows={5}
                        disabled={noDetail}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600 disabled:bg-neutral-100"
                    />
                    <p className="text-right text-xs text-neutral-400">{comment.length}/1000</p>
                </div>
                <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-neutral-300 px-4 text-sm font-medium">
                    <input type="checkbox" checked={noDetail} onChange={(e) => setNoDetail(e.target.checked)} className="h-5 w-5 accent-yellow-500" />
                    {t.noDetail}
                </label>
                <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-neutral-300 px-4 text-sm font-medium">
                    <input type="checkbox" checked={wantsFollowUp} onChange={(e) => setWantsFollowUp(e.target.checked)} className="h-5 w-5 accent-yellow-500" />
                    {t.askFollowUp}
                </label>
                {wantsFollowUp && (
                    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        <fieldset className="grid grid-cols-2 gap-2">
                            {(["PHONE", "EMAIL"] as const).map((c) => (
                                <label key={c} className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-semibold ${contactChannel === c ? "border-yellow-500 bg-yellow-50" : "border-neutral-300"}`}>
                                    <input type="radio" name="incident-channel" checked={contactChannel === c} onChange={() => setContactChannel(c)} className="sr-only" />
                                    {c === "PHONE" ? t.contactPhone : t.contactEmail}
                                </label>
                            ))}
                        </fieldset>
                        <input
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
                            className="min-h-[48px] w-full rounded-lg border border-neutral-300 px-3"
                        />
                    </div>
                )}
                <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t.incidentCaseNote}</p>
                {errorBox(error)}
                {primaryBtn(t.submit, () => void submitIncident())}
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
                        <span className="mt-1 block text-neutral-500">{t.caseCreated}</span>
                    </p>
                )}
            </div>
        );
    }

    return card(
        <div className="space-y-4">
            <H>{t.header}</H>
            <p className="text-neutral-600">{t.submitFail}</p>
            <a href="/f">{primaryBtn(t.scanAgain, () => window.location.reload())}</a>
        </div>
    );
}
