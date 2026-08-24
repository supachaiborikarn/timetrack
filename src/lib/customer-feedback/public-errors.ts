import { NextResponse } from "next/server";

/**
 * รหัสข้อผิดพลาดของ API สาธารณะ (เสียงลูกค้า)
 *
 * client เลือกข้อความตามภาษาที่ลูกค้ากดไว้จาก `code` — ข้อความไทยที่แนบมาใน `error`
 * เป็น fallback สำหรับ client รุ่นเก่าและสำหรับอ่าน log เท่านั้น ห้ามให้ client
 * แปลจากข้อความ เพราะข้อความเปลี่ยนได้แต่ code ต้องคงที่
 */
export const PUBLIC_ERROR_MESSAGES = {
    PUBLIC_DISABLED: "ระบบยังไม่เปิดรับความคิดเห็น",
    INVALID_QR: "ไม่พบแบบประเมินนี้ โปรดสแกน QR ที่จุดบริการอีกครั้ง",
    RESOLVE_RATE_LIMITED: "เปิดแบบประเมินบ่อยเกินไป กรุณารอสักครู่",
    MANUAL_CODE_RATE_LIMITED: "ลองรหัสบ่อยเกินไป กรุณารอ 1 นาที",
    SEARCH_RATE_LIMITED: "ค้นหาบ่อยเกินไป",
    SERVER_BUSY: "ระบบมีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้ง",
    SESSION_EXPIRED: "เซสชันหมดอายุ กรุณาสแกน QR อีกครั้ง",
    INCIDENT_SESSION_EXPIRED: "เซสชันหมดอายุ กรุณาเริ่มใหม่อีกครั้ง",
    FORM_EXPIRED: "แบบประเมินหมดอายุ กรุณาสแกน QR ใหม่อีกครั้ง",
    INCIDENT_FORM_EXPIRED: "แบบแจ้งเหตุหมดอายุ กรุณาเริ่มใหม่อีกครั้ง",
    INCIDENT_NOT_FOUND: "ไม่พบแบบแจ้งเหตุนี้ กรุณาเริ่มใหม่อีกครั้ง",
    ALREADY_SUBMITTED: "เราได้รับความคิดเห็นนี้แล้ว",
    QR_ROTATED: "ป้ายนี้ถูกเปลี่ยนรหัสแล้ว กรุณาสแกนป้ายใหม่",
    QR_INACTIVE: "แบบประเมินนี้ปิดใช้งานแล้ว",
    STATION_NOT_ELIGIBLE: "สถานีที่เลือกไม่พร้อมรับแบบประเมิน",
    INCIDENT_STATION_NOT_ELIGIBLE: "สถานีที่เลือกไม่พร้อมรับแบบแจ้งเหตุ",
    DUPLICATE_MISMATCH: "คำขอซ้ำไม่ตรงกัน",
    PAYLOAD_TOO_LARGE: "ข้อมูลใหญ่เกินไป",
    SUBMIT_FAILED: "ส่งไม่สำเร็จ",
    SUBMIT_ERROR: "ยังส่งความคิดเห็นไม่ได้ คำตอบของคุณยังอยู่ในหน้านี้",
    SERVER_ERROR: "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง",
} as const;

export type PublicErrorCode = keyof typeof PUBLIC_ERROR_MESSAGES;

/** failure จาก submitStandardResponse → รหัสที่ client แปลได้ */
export const STANDARD_FAILURE_CODES: Record<string, PublicErrorCode> = {
    TOKEN_INVALID: "SESSION_EXPIRED",
    VISIT_NOT_FOUND: "INVALID_QR",
    VISIT_NOT_OPEN: "ALREADY_SUBMITTED",
    FORM_EXPIRED: "FORM_EXPIRED",
    QR_ROTATED: "QR_ROTATED",
    QR_INACTIVE: "QR_INACTIVE",
    TARGET_INACTIVE: "QR_INACTIVE",
    STATION_NOT_ELIGIBLE: "STATION_NOT_ELIGIBLE",
    ALREADY_SUBMITTED: "ALREADY_SUBMITTED",
};

/** failure จาก submitIncidentResponse → รหัสที่ client แปลได้ */
export const INCIDENT_FAILURE_CODES: Record<string, PublicErrorCode> = {
    TOKEN_INVALID: "INCIDENT_SESSION_EXPIRED",
    VISIT_NOT_FOUND: "INCIDENT_NOT_FOUND",
    VISIT_NOT_OPEN: "ALREADY_SUBMITTED",
    FORM_EXPIRED: "INCIDENT_FORM_EXPIRED",
    STATION_NOT_ELIGIBLE: "INCIDENT_STATION_NOT_ELIGIBLE",
};

export function publicErrorBody(code: PublicErrorCode): { error: string; code: PublicErrorCode } {
    return { error: PUBLIC_ERROR_MESSAGES[code], code };
}

/** ตอบ error ของหน้าสาธารณะพร้อม code และ no-store เสมอ */
export function publicError(code: PublicErrorCode, status: number, headers?: Record<string, string>): NextResponse {
    const response = NextResponse.json(publicErrorBody(code), { status });
    response.headers.set("Cache-Control", "no-store");
    for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
    return response;
}
