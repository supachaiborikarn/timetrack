import { describe, it, expect } from "vitest";

/**
 * Unit tests ของ token/manual code/URL ของระบบเสียงลูกค้า
 * รันโดยไม่ต้องแตะฐานข้อมูล
 */

process.env.CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY = "test-manual-key";
process.env.CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY = "test-abuse-key";
process.env.APP_BASE_URL = "https://feedback.example.co.th";

import {
    generateFeedbackToken,
    generateManualCode,
    sha256Hex,
    hashManualCode,
    manualCodeMatches,
    buildFeedbackUrl,
    buildQrSecrets,
} from "@/lib/customer-feedback/token";
import { networkHashDaily, clientHashWeekly, computeAbuseScore } from "@/lib/customer-feedback/anti-abuse";

describe("feedback token", () => {
    it("มี entropy อย่างน้อย 128 bits (18 bytes base64url = 24 ตัวอักษร)", () => {
        const token = generateFeedbackToken();
        expect(token).toHaveLength(24);
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("สุ่มไม่ซ้ำ", () => {
        const tokens = new Set(Array.from({ length: 100 }, () => generateFeedbackToken()));
        expect(tokens.size).toBe(100);
    });

    it("sha256Hex ให้ค่าคงที่", () => {
        expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
        expect(sha256Hex("abc")).not.toBe(sha256Hex("abd"));
    });
});

describe("manual code", () => {
    it("ยาว 8 ตัวและไม่มีอักษรสับสน (0 O 1 I)", () => {
        for (let i = 0; i < 50; i++) {
            const code = generateManualCode();
            expect(code).toHaveLength(8);
            expect(code).not.toMatch(/[0O1I]/);
        }
    });

    it("HMAC ตรวจรหัสถูก/ผิดได้", () => {
        const hash = hashManualCode("ABCDEFGH");
        expect(manualCodeMatches("ABCDEFGH", hash)).toBe(true);
        expect(manualCodeMatches("ABCDEFGX", hash)).toBe(false);
        // case-insensitive
        expect(manualCodeMatches("abcdefgh", hash)).toBe(true);
    });
});

describe("canonical URL", () => {
    it("ใส่รหัสใน URL fragment (#t=)", () => {
        const url = buildFeedbackUrl("abc123");
        expect(url).toBe("https://feedback.example.co.th/f#t=abc123");
    });
});

describe("abuse hash", () => {
    const day1 = new Date("2026-08-23T10:00:00Z");
    const day2 = new Date("2026-08-24T10:00:00Z");

    it("hash เดียวกันในวันเดียวกัน ต่างกันข้ามวัน (ค่า daily เปลี่ยน)", () => {
        const a = networkHashDaily("1.2.3.4", day1);
        // 16:00Z = 23:00 ตามเวลากรุงเทพ ยังอยู่วันเดียวกัน
        const b = networkHashDaily("1.2.3.4", new Date("2026-08-23T16:00:00Z"));
        const c = networkHashDaily("1.2.3.4", day2);
        expect(a).toBe(b);
        expect(a).not.toBe(c);
    });

    it("client hash แยกตามอุปกรณ์หยาบ", () => {
        const mobile = clientHashWeekly("1.2.3.4", "Mozilla/5.0 iPhone Safari", day1);
        const desktop = clientHashWeekly("1.2.3.4", "Mozilla/5.0 Windows Chrome", day1);
        expect(mobile).not.toBe(desktop);
    });
});

describe("abuse score", () => {
    it("กรอกเร็วกว่า 3 วินาทีได้คะแนนเสี่ยง", () => {
        const result = computeAbuseScore({ durationSeconds: 1, sameNetworkSameQrCount: 0 });
        expect(result.score).toBeGreaterThanOrEqual(2);
        expect(result.reasons).toContain("fill-time-too-short");
    });

    it("ส่งซ้ำจาก network เดิมสะสมความเสี่ยง", () => {
        const result = computeAbuseScore({ durationSeconds: 60, sameNetworkSameQrCount: 3 });
        expect(result.score).toBeGreaterThanOrEqual(2);
        expect(result.reasons).toContain("same-network-same-qr");
    });

    it("คำตอบปกติได้คะแนนต่ำ", () => {
        const result = computeAbuseScore({ durationSeconds: 45, sameNetworkSameQrCount: 0 });
        expect(result.score).toBe(0);
    });
});

describe("buildQrSecrets", () => {
    /**
     * regression: เดิมคืน token/manualCode ปนกับคอลัมน์ ทำให้มีที่เรียก `data: { ...secrets }`
     * แล้ว Prisma ตายตอน runtime — สร้างและ rotate QR พังทุกเส้น แต่ tsc จับไม่ได้
     */
    it("columns มีเฉพาะฟิลด์ที่เป็นคอลัมน์จริงในตาราง", () => {
        const secrets = buildQrSecrets();
        expect(Object.keys(secrets.columns).sort()).toEqual([
            "manualCodeCiphertext",
            "manualCodeHash",
            "manualCodeHint",
            "tokenCiphertext",
            "tokenHash",
            "tokenHint",
        ]);
    });

    it("ค่า plaintext ต้องไม่หลุดเข้าไปใน columns", () => {
        const secrets = buildQrSecrets();
        const values = Object.values(secrets.columns);
        expect(values).not.toContain(secrets.token);
        expect(values).not.toContain(secrets.manualCode);
    });

    it("hint เป็นท้ายของค่าจริง ใช้ตรวจป้ายได้", () => {
        const secrets = buildQrSecrets();
        expect(secrets.token.endsWith(secrets.columns.tokenHint)).toBe(true);
        expect(secrets.manualCode.endsWith(secrets.columns.manualCodeHint)).toBe(true);
    });
});
