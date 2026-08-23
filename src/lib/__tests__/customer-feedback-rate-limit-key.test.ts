import { describe, it, expect } from "vitest";

/**
 * Regression test ของช่องโหว่ rate limit
 *
 * เดิม /resolve และ /incidents/start ใช้ `resolveNonceHash()` เป็นคีย์ rate limit
 * ซึ่งคำนวณจาก header `Resolve-Idempotency-Key` ที่ client ส่งมาเอง
 * สุ่ม header ใหม่ทุกครั้ง = ได้ bucket ใหม่ทุกครั้ง = rate limit ไม่ทำงานเลย
 *
 * คีย์ rate limit ต้องมาจากสิ่งที่ client เปลี่ยนเองไม่ได้เท่านั้น
 */

process.env.CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY = "test-abuse-key";

import { resolveNonceHash, networkRateKey } from "@/lib/customer-feedback/anti-abuse";

const AT = new Date("2026-08-23T12:00:00Z");
const IP = "203.0.113.9";

describe("คีย์ rate limit ต้องปลอมไม่ได้", () => {
    it("resolveNonceHash เปลี่ยนตาม header ที่ client ส่งมา (จึงใช้เป็นคีย์ rate limit ไม่ได้)", () => {
        const a = resolveNonceHash("client-chosen-1", IP, AT);
        const b = resolveNonceHash("client-chosen-2", IP, AT);
        expect(a).not.toBe(b);
    });

    it("networkRateKey ไม่ขยับตาม header ที่ client ส่งมา", () => {
        // ไม่ว่าจะสุ่ม nonce กี่ค่า คีย์ที่ใช้จำกัดอัตราต้องเป็นค่าเดิม
        const keys = new Set(
            Array.from({ length: 50 }, () => networkRateKey(IP, AT))
        );
        expect(keys.size).toBe(1);
    });

    it("networkRateKey แยกกันตาม IP", () => {
        expect(networkRateKey("198.51.100.1", AT)).not.toBe(networkRateKey("198.51.100.2", AT));
    });

    it("networkRateKey หมุนรายวันตามเวลาไทย", () => {
        // 2026-08-23T18:00Z = 24 ส.ค. 01:00 ตามเวลาไทย จึงต้องคนละวันกับ 12:00Z
        const sameDay = networkRateKey(IP, new Date("2026-08-23T16:00:00Z"));
        const nextDay = networkRateKey(IP, new Date("2026-08-23T18:00:00Z"));
        expect(networkRateKey(IP, AT)).toBe(sameDay);
        expect(sameDay).not.toBe(nextDay);
    });

    it("ไม่มี IP ดิบอยู่ในคีย์", () => {
        expect(networkRateKey(IP, AT)).not.toContain(IP);
        expect(networkRateKey(IP, AT)).toMatch(/^[0-9a-f]{64}$/);
    });
});
