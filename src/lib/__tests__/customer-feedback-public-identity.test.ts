import { describe, it, expect } from "vitest";

/**
 * นโยบาย: พนักงานรับการประเมินด้วย "ชื่อเล่น" เท่านั้น
 * ป้าย QR ที่ลูกค้าเห็นต้องไม่มีชื่อจริง/นามสกุล
 */

import {
    resolveEmployeePublicLabel,
    duplicateLabelWarning,
    PUBLIC_LABEL_MAX_LENGTH,
} from "@/lib/customer-feedback/public-identity";

describe("ชื่อบนป้ายของพนักงาน", () => {
    it("ใช้ชื่อเล่นเมื่อมี", () => {
        const r = resolveEmployeePublicLabel("เอ็ม", "ประสิทธิ์ แข็งแกร่ง");
        expect(r).toEqual({ ok: true, label: "เอ็ม" });
    });

    it("ไม่มีชื่อเล่น = สร้างไม่ได้ ไม่ตกไปใช้ชื่อจริง", () => {
        const r = resolveEmployeePublicLabel(null, "ประสิทธิ์ แข็งแกร่ง");
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.reason).toBe("NO_NICKNAME");
            // ชื่อจริงต้องไม่โผล่ในข้อความ error
            expect(r.message).not.toContain("ประสิทธิ์");
        }
    });

    it("ชื่อเล่นเป็นช่องว่างล้วนก็นับว่าไม่มี", () => {
        const r = resolveEmployeePublicLabel("   ", "ประสิทธิ์ แข็งแกร่ง");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe("NO_NICKNAME");
    });

    it("ผู้ดูแลพิมพ์ชื่อเองได้ (สะกดชื่อเล่นได้หลายแบบ)", () => {
        const r = resolveEmployeePublicLabel("เอ็ม", "ประสิทธิ์ แข็งแกร่ง", "เอ็ม หน้าลาน");
        expect(r).toEqual({ ok: true, label: "เอ็ม หน้าลาน" });
    });

    it("แต่พิมพ์ชื่อจริงเต็มไม่ได้", () => {
        const r = resolveEmployeePublicLabel("เอ็ม", "ประสิทธิ์ แข็งแกร่ง", "ประสิทธิ์ แข็งแกร่ง");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe("LOOKS_LIKE_LEGAL_NAME");
    });

    it("ถ้าประวัติบันทึกชื่อไว้คำเดียว ไม่ต้องดัก (บางคนใช้ชื่อเล่นเป็นชื่อ)", () => {
        const r = resolveEmployeePublicLabel("เมย์", "เมย์");
        expect(r).toEqual({ ok: true, label: "เมย์" });
    });

    it("ยาวเกินกำหนดไม่ผ่าน", () => {
        const r = resolveEmployeePublicLabel("ก".repeat(PUBLIC_LABEL_MAX_LENGTH + 1), "ประสิทธิ์ แข็งแกร่ง");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe("TOO_LONG");
    });

    it("ตัดช่องว่างซ้ำซ้อนออก", () => {
        const r = resolveEmployeePublicLabel("  เอ็ม   ใหญ่  ", "ประสิทธิ์ แข็งแกร่ง");
        expect(r).toEqual({ ok: true, label: "เอ็ม ใหญ่" });
    });
});

describe("ชื่อเล่นซ้ำในสถานีเดียวกัน", () => {
    it("เตือนเมื่อซ้ำ — คะแนนอาจไปลงผิดคน", () => {
        expect(duplicateLabelWarning("เอ็ม", ["บี", "เอ็ม"])).toContain("เอ็ม");
    });

    it("ไม่เตือนเมื่อไม่ซ้ำ", () => {
        expect(duplicateLabelWarning("เอ็ม", ["บี", "หนิง"])).toBeNull();
    });

    it("เทียบแบบไม่สนช่องว่างหัวท้าย", () => {
        expect(duplicateLabelWarning("เอ็ม", ["  เอ็ม  "])).not.toBeNull();
    });
});
