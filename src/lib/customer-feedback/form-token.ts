import { createHmac, timingSafeEqual } from "crypto";
import { sha256Hex } from "./token";

/**
 * Signed visit token ของแบบประเมินเสียงลูกค้า
 *
 * ผูกกับ visitId, visitKind, targetType, surveyVersion, qrCodeId+qrVersion (STANDARD)
 * และ issuedAt — ใช้ค่า min fill / max age ของตัวเอง (3 วินาที / 30 นาที)
 * ไม่ใช้ค่า 10 วินาทีของใบสมัครงาน
 */

const MIN_FILL_TIME_MS = 3_000;
const MAX_TOKEN_AGE_MS = 30 * 60 * 1000;

export interface VisitTokenPayload {
    visitId: string;
    visitKind: "STANDARD" | "INCIDENT";
    targetType: "EMPLOYEE" | "STATION" | "UNKNOWN";
    surveyVersion: string;
    qrCodeId: string | null;
    qrVersion: number | null;
    issuedAt: number;
}

function sign(payload: string): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET is not set");
    return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createVisitToken(payload: Omit<VisitTokenPayload, "issuedAt">): { token: string; issuedAt: number; tokenHash: string } {
    const full: VisitTokenPayload = { ...payload, issuedAt: Date.now() };
    const encoded = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
    const token = `${encoded}.${sign(encoded)}`;
    return { token, issuedAt: full.issuedAt, tokenHash: sha256Hex(token) };
}

export function verifyVisitToken(token: unknown): { valid: boolean; reason?: string; payload?: VisitTokenPayload } {
    if (typeof token !== "string") return { valid: false, reason: "missing" };
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return { valid: false, reason: "malformed" };
    const expected = sign(encoded);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: "bad-signature" };
    let payload: VisitTokenPayload;
    try {
        payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    } catch {
        return { valid: false, reason: "malformed" };
    }
    const age = Date.now() - payload.issuedAt;
    if (age < MIN_FILL_TIME_MS) return { valid: false, reason: "too-fast" };
    if (age > MAX_TOKEN_AGE_MS) return { valid: false, reason: "expired" };
    return { valid: true, payload };
}

/** ดึง Bearer token จาก header — token ต้องอยู่ใน Authorization เท่านั้น */
export function extractBearerToken(headers: Headers): string | null {
    const auth = headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) return null;
    const token = auth.slice("Bearer ".length).trim();
    return token || null;
}
