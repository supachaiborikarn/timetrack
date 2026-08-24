import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Anti-abuse ของระบบเสียงลูกค้า
 *
 * - เก็บ IP เป็น HMAC ที่หมุน secret (รายวัน/รายสัปดาห์) ไม่เก็บ IP ดิบ
 * - hash ทั้งหมดเป็นสัญญาณความเสี่ยง ห้ามใช้ hard block จากค่าเดียว
 * - persistent rate bucket ในฐานข้อมูลเพราะ memory limiter ใช้กับ
 *   serverless ไม่ได้
 */

const HASH_KEY_VERSION = "v1";

function abuseRootKey(): string {
    const key = process.env.CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY;
    if (!key) throw new Error("CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY is not set");
    return key;
}

function bangkokDateString(date: Date): string {
    // Asia/Bangkok = UTC+7 เสมอ ไม่มี DST จึงคำนวณตรง ๆ ได้
    return new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function bangkokIsoWeek(date: Date): string {
    const shifted = new Date(date.getTime() + 7 * 3600 * 1000);
    const day = shifted.getUTCDay() || 7; // จันทร์=1..อาทิตย์=7
    shifted.setUTCDate(shifted.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(shifted.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((shifted.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${shifted.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function dailyNetworkKey(date: Date): string {
    return createHmac("sha256", abuseRootKey()).update(`network:${bangkokDateString(date)}`).digest("hex");
}

export function weeklyClientKey(date: Date): string {
    return createHmac("sha256", abuseRootKey()).update(`client:${bangkokIsoWeek(date)}`).digest("hex");
}

/** HMAC ของ network signal ประจำวัน — ไม่เก็บ IP ดิบ */
export function networkHashDaily(ip: string, date: Date = new Date()): string {
    return createHmac("sha256", dailyNetworkKey(date)).update(ip).digest("hex");
}

/** HMAC ของ client signal หยาบๆ รายสัปดาห์ */
export function clientHashWeekly(ip: string, userAgent: string, date: Date = new Date()): string {
    const deviceClass = /mobile|android|iphone/i.test(userAgent) ? "mobile" : /tablet|ipad/i.test(userAgent) ? "tablet" : "desktop";
    const browser = /edg/i.test(userAgent) ? "edge" : /chrome/i.test(userAgent) ? "chrome" : /safari/i.test(userAgent) ? "safari" : /firefox/i.test(userAgent) ? "firefox" : "other";
    const os = /android/i.test(userAgent) ? "android" : /iphone|ipad|ios/i.test(userAgent) ? "ios" : /windows/i.test(userAgent) ? "windows" : /mac/i.test(userAgent) ? "mac" : "other";
    return createHmac("sha256", weeklyClientKey(date)).update(`${ip}|${browser}|${os}|${deviceClass}`).digest("hex");
}

/**
 * hash ของ clientNonce สำหรับ idempotency
 *
 * ⚠ ค่านี้มาจาก header ที่ client ส่งมาเอง จึงหมุนค่าใหม่ได้ไม่จำกัด
 * **ห้ามใช้เป็นคีย์ rate limit** — ใช้ `networkRateKey()` หรือคีย์ที่ผูกกับของจริงแทน
 */
export function resolveNonceHash(clientNonce: string, ip: string, date: Date = new Date()): string {
    return createHmac("sha256", weeklyClientKey(date)).update(`${clientNonce}|${ip}`).digest("hex");
}

/**
 * คีย์ rate limit ที่ client เปลี่ยนเองไม่ได้ — ผูกกับ IP อย่างเดียว
 *
 * ตั้งเพดานให้กว้างเพราะเครือข่ายมือถือไทยใช้ CGNAT ลูกค้าหลายคนออกไอพีเดียวกันได้
 * ตัวที่รัดจริงคือเพดานราย QR กับ global breaker
 */
export function networkRateKey(ip: string, date: Date = new Date()): string {
    return networkHashDaily(ip, date);
}

/** เพดานรวมทั้งระบบ — กันถล่มพร้อมกันจากหลายไอพี (schema กำหนดให้ใช้ keyHash = "GLOBAL") */
export async function checkGlobalLimit(
    action: string,
    limit: number,
    windowMs: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
    return checkRateLimit(action, "GLOBAL", limit, windowMs);
}

/** อ่านสถานะ bucket ปัจจุบันโดยไม่เพิ่ม counter ใช้ short-circuit circuit breaker */
export async function isRateLimitExceeded(
    action: string,
    keyHash: string,
    limit: number,
    windowMs: number,
    now: Date = new Date()
): Promise<boolean> {
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    const bucket = await prisma.customerFeedbackRateBucket.findUnique({
        where: { action_keyHash_windowStart: { action, keyHash, windowStart } },
        select: { count: true },
    });
    return (bucket?.count ?? 0) > limit;
}

/**
 * เพดานตาม spec §14.1 — ใช้เป็น circuit breaker ชั้นนอกสุด
 * ต่อนาที: สร้าง visit สำเร็จ 10,000 · คำขอที่ resolve ไม่ผ่าน 3,000
 */
export const GLOBAL_LIMITS = {
    visitCreatePerMinute: 10_000,
    invalidResolvePerMinute: 3_000,
} as const;

/** เพดานต่อ QR หนึ่งใบต่อชั่วโมง — ป้ายเดียวไม่ควรถูกเปิดถี่กว่านี้ */
export const PER_QR_RESOLVE_PER_HOUR = 120;

/** เพดานต่อเครือข่ายต่อชั่วโมง — กว้างไว้เพราะ CGNAT */
export const PER_NETWORK_RESOLVE_PER_HOUR = 300;

/** เพดานเดารหัสกรอกเองต่อเครือข่ายต่อนาที */
export const PER_NETWORK_MANUAL_CODE_PER_MINUTE = 20;

/**
 * เพดานแจ้งเหตุแบบ standalone ต่อเครือข่ายต่อชั่วโมง
 * เส้นนั้นไม่ต้องมี QR หรือ token ใด ๆ จึงเป็นทางเดียวที่คนนอกสร้างแถวได้โดยไม่มีอะไรยืนยัน
 */
export const PER_NETWORK_STANDALONE_INCIDENT_PER_HOUR = 30;

export function deviceClassOf(userAgent: string): "mobile" | "tablet" | "desktop" {
    if (/tablet|ipad/i.test(userAgent)) return "tablet";
    if (/mobile|android|iphone/i.test(userAgent)) return "mobile";
    return "desktop";
}

export function currentHashKeyVersion(): string {
    return HASH_KEY_VERSION;
}

/** เพิ่ม counter แบบ atomic ใน CustomerFeedbackRateBucket */
export async function incrementRateBucket(
    action: string,
    keyHash: string,
    windowStart: Date,
    windowMs: number
): Promise<number> {
    const expiresAt = new Date(windowStart.getTime() + Math.max(windowMs, 48 * 3600 * 1000));
    const row = await prisma.customerFeedbackRateBucket.upsert({
        where: {
            action_keyHash_windowStart: { action, keyHash, windowStart },
        },
        update: { count: { increment: 1 } },
        create: { action, keyHash, windowStart, count: 1, expiresAt },
        select: { count: true },
    });
    return row.count;
}

export async function checkRateLimit(
    action: string,
    keyHash: string,
    limit: number,
    windowMs: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
    const count = await incrementRateBucket(action, keyHash, windowStart, windowMs);
    return { allowed: count <= limit, retryAfterSec: Math.ceil(windowMs / 1000) };
}

export interface AbuseSignalInput {
    durationSeconds: number;
    sameNetworkSameQrCount: number;
    sameClientSameTargetCount?: number;
}

export interface AbuseScoreResult {
    score: number;
    reasons: string[];
}

/** คำนวณความเสี่ยง — ถึงเกณฑ์ 3 ขึ้นไปเริ่มที่ SUSPECTED */
export function computeAbuseScore(input: AbuseSignalInput): AbuseScoreResult {
    const reasons: string[] = [];
    let score = 0;
    if (input.durationSeconds < 3) {
        score += 2;
        reasons.push("fill-time-too-short");
    }
    let networkRisk = 0;
    if (input.sameNetworkSameQrCount >= 3) {
        networkRisk = 2;
        reasons.push("same-network-same-qr");
    } else if (input.sameNetworkSameQrCount === 2) {
        networkRisk = 1;
        reasons.push("repeat-network-same-qr");
    }
    let clientRisk = 0;
    if ((input.sameClientSameTargetCount ?? 0) >= 3) {
        clientRisk = 2;
        reasons.push("same-client-same-target");
    } else if ((input.sameClientSameTargetCount ?? 0) === 2) {
        clientRisk = 1;
        reasons.push("repeat-client-same-target");
    }
    // clientHashWeekly มี IP เป็นส่วนประกอบ จึงเป็นหลักฐานกลุ่มเดียวกับ networkHashDaily
    // ใช้ความเสี่ยงที่สูงกว่าเพียงครั้งเดียวเพื่อไม่ลงโทษลูกค้าหลายคนหลัง CGNAT ซ้ำสองชั้น
    score += Math.max(networkRisk, clientRisk);
    return { score, reasons };
}

export const ABUSE_SUSPECT_THRESHOLD = 3;

/** เวลาใช้งานที่เชื่อถือได้ต้อง derive จาก timestamp ฝั่ง server เท่านั้น */
export function serverDerivedDurationSeconds(
    openedAt: Date,
    startedAt: Date | null | undefined,
    now: Date = new Date()
): number {
    const base = startedAt && startedAt.getTime() <= now.getTime() ? startedAt : openedAt;
    return Math.max(0, Math.floor((now.getTime() - base.getTime()) / 1000));
}

/** ตรวจ self-evaluation ได้เฉพาะกรณี browser มี session พนักงานที่รู้ตัวตน */
export function isKnownSelfEvaluation(
    authenticatedUserId: string | null | undefined,
    targetEmployeeUserId: string | null | undefined
): boolean {
    return Boolean(authenticatedUserId && targetEmployeeUserId && authenticatedUserId === targetEmployeeUserId);
}
