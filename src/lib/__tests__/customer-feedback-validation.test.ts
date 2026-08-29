import { describe, it, expect } from "vitest";
import {
    validateStandardPayload,
    validateIncidentPayload,
    validatePhone,
    validateEmail,
} from "@/lib/customer-feedback/validation";
import {
    shuffledOptionOrder,
    SURVEYS,
    EMPLOYEE_BEHAVIOR_QUESTIONS,
    EMPLOYEE_BEHAVIOR_QUESTION_KEYS,
    EMPLOYEE_SCORE_QUESTIONS,
    EMPLOYEE_SCORE_QUESTION_KEYS,
    EMPLOYEE_SCORE_TOTAL,
    EMPLOYEE_REASON_OPTIONS,
    STATION_REASON_OPTIONS,
} from "@/lib/customer-feedback/questions";
import { standardCaseSeverity, incidentCaseSeverity, caseDueAt, SEVERITY_SLA_HOURS } from "@/lib/customer-feedback/cases";
import { summarizeRatingDistribution, summarizeRatings, meetsMinimumSample } from "@/lib/customer-feedback/metrics";

describe("question registry", () => {
    it("question key ไม่ซ้ำในแต่ละ survey", () => {
        for (const options of [EMPLOYEE_REASON_OPTIONS, STATION_REASON_OPTIONS]) {
            const keys = options.map((o) => o.key);
            expect(new Set(keys).size).toBe(keys.length);
        }
    });

    it("survey version ทั้งห้ามีค่าครบ", () => {
        expect(SURVEYS["employee-v1"].maxReasons).toBe(2);
        expect(SURVEYS["employee-v2"].behaviorQuestions).toEqual(EMPLOYEE_BEHAVIOR_QUESTIONS);
        expect(SURVEYS["employee-v3"].behaviorQuestions).toEqual(EMPLOYEE_SCORE_QUESTIONS);
        expect(SURVEYS["station-v1"].maxReasons).toBe(3);
        expect(SURVEYS["incident-v1"].commentMaxLength).toBe(1000);
    });

    it("employee-v2 มีคำถามพฤติกรรม 7 ข้อพร้อมคำแปลไทยและอังกฤษ", () => {
        expect(EMPLOYEE_BEHAVIOR_QUESTIONS.map((question) => question.key)).toEqual(EMPLOYEE_BEHAVIOR_QUESTION_KEYS);
        expect(new Set(EMPLOYEE_BEHAVIOR_QUESTION_KEYS).size).toBe(7);
        for (const question of EMPLOYEE_BEHAVIOR_QUESTIONS) {
            expect(question.label.th.length).toBeGreaterThan(0);
            expect(question.label.en.length).toBeGreaterThan(0);
        }
    });

    it("employee-v3 มี 9 เกณฑ์และน้ำหนักรวม 64 คะแนน", () => {
        expect(EMPLOYEE_SCORE_QUESTIONS.map((question) => question.key)).toEqual(EMPLOYEE_SCORE_QUESTION_KEYS);
        expect(new Set(EMPLOYEE_SCORE_QUESTION_KEYS).size).toBe(9);
        expect(EMPLOYEE_SCORE_TOTAL).toBe(64);
        expect(EMPLOYEE_SCORE_QUESTIONS.reduce((sum, question) => sum + (question.weight ?? 0), 0)).toBe(64);
    });

    it("หมุนลำดับตัวเลือกตาม seed และตรึง other/unspecified ท้ายรายการ", () => {
        const keys = EMPLOYEE_REASON_OPTIONS.map((o) => o.key);
        const order1 = shuffledOptionOrder(keys, "seed-a");
        const order2 = shuffledOptionOrder(keys, "seed-a");
        expect(order1).toEqual(order2);
        expect(order1[order1.length - 1]).toBe("unspecified");
        expect(order1[order1.length - 2]).toBe("other");
        const order3 = shuffledOptionOrder(keys, "seed-b");
        // head อย่างน้อยต้องเรียงต่างกันบางตำแหน่ง
        expect(order1.join(",")).not.toBe(order3.join(","));
    });
});

describe("standard payload validation", () => {
    const behaviorAnswers = {
        appearance_neat: "YES",
        vehicle_guidance: "NO",
        greeted_customer: "UNSURE",
        order_repeated: "YES",
        special_service_offered: "NO",
        thanked_customer: "YES",
        front_sign_placed: "UNSURE",
    } as const;
    const scoreAnswers = {
        uniform_and_name_badge: "YES",
        guide_vehicle_immediately: "YES",
        receive_driver_side: "NO",
        caltex_greeting: "YES",
        front_service_sign: "YES",
        repeat_fuel_amount_before: "YES",
        offer_rewards_promotion: "UNSURE",
        repeat_fuel_amount_after: "YES",
        thank_and_guide_exit: "YES",
    } as const;
    const base = {
        targetConfirmation: "YES",
        overallRating: 5,
        reasonKeys: ["employee_courtesy"],
        serviceAreas: [],
        wantsFollowUp: false,
        language: "th",
    };

    it("รับ payload ปกติ", () => {
        const result = validateStandardPayload(base);
        expect(result.ok).toBe(true);
    });

    it("ปฏิเสธคะแนนนอก 1–5", () => {
        for (const rating of [0, 6, 3.5, "4"]) {
            const result = validateStandardPayload({ ...base, overallRating: rating });
            expect(result.ok).toBe(false);
        }
    });

    it("คะแนน 1–2 ต้องมีสาเหตุ", () => {
        const result = validateStandardPayload({ ...base, overallRating: 2, reasonKeys: [] });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some((e) => e.field === "reasonKeys")).toBe(true);
        }
    });

    it("คะแนน 3–5 ไม่ต้องมีสาเหตุ", () => {
        const result = validateStandardPayload({ ...base, overallRating: 3, reasonKeys: [] });
        expect(result.ok).toBe(true);
    });

    it("unspecified ส่งร่วมกับค่าอื่นไม่ได้", () => {
        const result = validateStandardPayload({ ...base, overallRating: 2, reasonKeys: ["unspecified", "employee_courtesy"] });
        expect(result.ok).toBe(false);
    });

    it("ปฏิเสธ key ที่ไม่อยู่ใน allowlist", () => {
        const result = validateStandardPayload({ ...base, employeeId: "hack", validity: "VALID" });
        expect(result.ok).toBe(false);
    });

    it("ปฏิเสธ targetConfirmation ไม่ใช่ YES", () => {
        const result = validateStandardPayload({ ...base, targetConfirmation: "NO" });
        expect(result.ok).toBe(false);
    });

    it("wantsFollowUp=true ต้องมี contact และ false ห้ามมี contact", () => {
        const no = validateStandardPayload({ ...base, wantsFollowUp: true });
        expect(no.ok).toBe(false);
        const extra = validateStandardPayload({
            ...base,
            wantsFollowUp: false,
            contact: { consent: true, channel: "PHONE", value: "0812345678" },
        });
        expect(extra.ok).toBe(false);
        const okContact = validateStandardPayload({
            ...base,
            wantsFollowUp: true,
            contact: { consent: true, channel: "PHONE", value: "0812345678" },
        });
        expect(okContact.ok).toBe(true);
    });

    it("serviceAreas ไม่อยู่ใน registry ถูกปฏิเสธ และ unsure เป็นตัวเลือกเดี่ยว", () => {
        expect(validateStandardPayload({ ...base, serviceAreas: ["swimming_pool"] }).ok).toBe(false);
        expect(validateStandardPayload({ ...base, serviceAreas: ["unsure", "restroom"] }).ok).toBe(false);
    });

    it("บังคับชนิดของรายการ ภาษา และสถานี แทนการเปลี่ยนค่าผิดเป็นค่าว่าง", () => {
        expect(validateStandardPayload({ ...base, reasonKeys: "employee_courtesy" }).ok).toBe(false);
        expect(validateStandardPayload({ ...base, serviceAreas: "restroom" }).ok).toBe(false);
        expect(validateStandardPayload({ ...base, language: "jp" }).ok).toBe(false);
        expect(validateStandardPayload({ ...base, selectedStationId: 123 }).ok).toBe(false);
    });

    it("แยกกติกาส่วนบริการของแบบพนักงานและสถานี", () => {
        expect(validateStandardPayload({ ...base, serviceAreas: ["restroom"] }, "employee-v1").ok).toBe(false);
        expect(validateStandardPayload({
            ...base,
            reasonKeys: ["station_cleanliness"],
            serviceAreas: [],
        }, "station-v1").ok).toBe(false);
        expect(validateStandardPayload({
            ...base,
            reasonKeys: ["station_cleanliness"],
            serviceAreas: ["restroom"],
        }, "station-v1").ok).toBe(true);
    });

    it("ใช้ reason registry และเพดานของ station-v1", () => {
        const station = validateStandardPayload({
            ...base,
            overallRating: 2,
            reasonKeys: ["station_cleanliness", "station_wait", "station_safety"],
            serviceAreas: ["restroom"],
        }, "station-v1");
        expect(station.ok).toBe(true);

        const employee = validateStandardPayload({
            ...base,
            reasonKeys: ["station_cleanliness"],
        }, "employee-v1");
        expect(employee.ok).toBe(false);
    });

    it("ใช้ความยาว comment ของ survey ที่ Visit ระบุ", () => {
        const comment = "ก".repeat(301);
        expect(validateStandardPayload({ ...base, comment }, "employee-v1").ok).toBe(true);
        expect(validateStandardPayload({ ...base, comment }, "station-v1").ok).toBe(false);
    });

    it("employee-v2 บังคับ behaviorAnswers ให้ครบ 7 ข้อและคืนค่าที่ validate แล้ว", () => {
        const result = validateStandardPayload({ ...base, behaviorAnswers }, "employee-v2");
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.behaviorAnswers).toEqual(behaviorAnswers);

        expect(validateStandardPayload(base, "employee-v2").ok).toBe(false);
        expect(validateStandardPayload({
            ...base,
            behaviorAnswers: { ...behaviorAnswers, thanked_customer: undefined },
        }, "employee-v2").ok).toBe(false);
    });

    it("employee-v3 บังคับคำตอบ rubric ครบ 9 ข้อและไม่รับ key ของ v2", () => {
        const result = validateStandardPayload({ ...base, behaviorAnswers: scoreAnswers }, "employee-v3");
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.behaviorAnswers).toEqual(scoreAnswers);

        expect(validateStandardPayload({
            ...base,
            behaviorAnswers: { ...scoreAnswers, thank_and_guide_exit: undefined },
        }, "employee-v3").ok).toBe(false);
        expect(validateStandardPayload({ ...base, behaviorAnswers }, "employee-v3").ok).toBe(false);
    });

    it("employee-v2 ปฏิเสธ key เกินและค่าที่ไม่ใช่ YES, NO, UNSURE", () => {
        expect(validateStandardPayload({
            ...base,
            behaviorAnswers: { ...behaviorAnswers, unknown_behavior: "YES" },
        }, "employee-v2").ok).toBe(false);
        expect(validateStandardPayload({
            ...base,
            behaviorAnswers: { ...behaviorAnswers, appearance_neat: "MAYBE" },
        }, "employee-v2").ok).toBe(false);
    });

    it("employee-v1 และ station-v1 ห้ามส่ง behaviorAnswers เพื่อรักษา payload รุ่นเดิม", () => {
        expect(validateStandardPayload({ ...base, behaviorAnswers }, "employee-v1").ok).toBe(false);
        expect(validateStandardPayload({
            ...base,
            reasonKeys: ["station_cleanliness"],
            serviceAreas: ["restroom"],
            behaviorAnswers,
        }, "station-v1").ok).toBe(false);
    });

    it("ปฏิเสธ durationSeconds จาก client เพราะ server เป็นผู้คำนวณ", () => {
        const result = validateStandardPayload({ ...base, durationSeconds: 999_999 });
        expect(result.ok).toBe(false);
    });
});

describe("incident payload validation", () => {
    const base = {
        incidentKey: "safety_accident",
        dangerStatus: "NO",
        occurredAt: new Date().toISOString(),
        noDetail: false,
        comment: "เกิดอุบัติเหตุบริเวณหัวจ่าย",
        wantsFollowUp: false,
        language: "th",
    };

    it("รับ incident ปกติ", () => {
        expect(validateIncidentPayload(base).ok).toBe(true);
    });

    it("ต้องมี comment หรือ noDetail อย่างใดอย่างหนึ่ง และห้ามส่งทั้งคู่", () => {
        expect(validateIncidentPayload({ ...base, comment: "", noDetail: false }).ok).toBe(false);
        expect(validateIncidentPayload({ ...base, comment: undefined, noDetail: true }).ok).toBe(true);
        expect(validateIncidentPayload({ ...base, comment: "มีข้อมูล", noDetail: true }).ok).toBe(false);
    });

    it("incidentKey ต้องอยู่ใน registry", () => {
        expect(validateIncidentPayload({ ...base, incidentKey: "not_a_key" }).ok).toBe(false);
    });

    it("บังคับชนิด noDetail ภาษา และสถานีของ incident", () => {
        expect(validateIncidentPayload({ ...base, noDetail: "false" }).ok).toBe(false);
        expect(validateIncidentPayload({ ...base, language: "jp" }).ok).toBe(false);
        expect(validateIncidentPayload({ ...base, selectedStationId: 123 }).ok).toBe(false);
    });

    it("occurredAt อนาคตถูกปฏิเสธ", () => {
        expect(validateIncidentPayload({ ...base, occurredAt: new Date(Date.now() + 3600 * 1000).toISOString() }).ok).toBe(false);
    });

    it("ปฏิเสธ durationSeconds จาก client เพราะ server เป็นผู้คำนวณ", () => {
        expect(validateIncidentPayload({ ...base, durationSeconds: 120 }).ok).toBe(false);
    });
});

describe("contact validation", () => {
    it("โทรศัพท์รับ 8–15 หลักและตัดสัญลักษณ์", () => {
        expect(validatePhone("081-234-5678")).toBe(true);
        expect(validatePhone("+66812345678")).toBe(true);
        expect(validatePhone("12345")).toBe(false);
    });

    it("อีเมลตรวจรูปแบบและความยาว", () => {
        expect(validateEmail("a@b.co")).toBe(true);
        expect(validateEmail("a@b")).toBe(false);
    });
});

describe("case severity", () => {
    it("คะแนน 1–2 สร้าง HIGH", () => {
        expect(standardCaseSeverity({ overallRating: 1, reasonKeys: ["employee_courtesy"], wantsFollowUp: false })).toBe("HIGH");
        expect(standardCaseSeverity({ overallRating: 2, reasonKeys: ["unspecified"], wantsFollowUp: false })).toBe("HIGH");
    });

    it("คะแนน 3–5 ขอติดต่อกลับสร้าง NORMAL", () => {
        expect(standardCaseSeverity({ overallRating: 5, reasonKeys: [], wantsFollowUp: true })).toBe("NORMAL");
    });

    it("คะแนน 3 ปกติไม่สร้างเคส", () => {
        expect(standardCaseSeverity({ overallRating: 3, reasonKeys: [], wantsFollowUp: false })).toBeNull();
    });

    it("คะแนน 3 พร้อมสาเหตุความปลอดภัยสร้าง HIGH", () => {
        expect(standardCaseSeverity({ overallRating: 3, reasonKeys: ["employee_safety"], wantsFollowUp: false })).toBe("HIGH");
    });

    it("incident ร้ายแรงสร้าง URGENT และ danger YES ยกระดับทุก key", () => {
        expect(incidentCaseSeverity("safety_accident", "NO")).toBe("URGENT");
        expect(incidentCaseSeverity("privacy", "NO")).toBe("HIGH");
        expect(incidentCaseSeverity("other", "YES")).toBe("URGENT");
    });

    it("dueAt ตาม SLA ชั่วโมง", () => {
        const from = new Date("2026-08-23T00:00:00Z");
        expect(caseDueAt("URGENT", from).getTime() - from.getTime()).toBe(SEVERITY_SLA_HOURS.URGENT * 3600 * 1000);
        expect(caseDueAt("HIGH", from).getTime() - from.getTime()).toBe(24 * 3600 * 1000);
    });
});

describe("metrics", () => {
    it("summary คำนวณค่าเฉลี่ย positive negative distribution", () => {
        const s = summarizeRatings([5, 4, 4, 3, 1]);
        expect(s.count).toBe(5);
        expect(s.average).toBeCloseTo(3.4);
        expect(s.positiveRate).toBeCloseTo(60);
        expect(s.negativeRate).toBeCloseTo(20);
        expect(s.distribution[5]).toBe(1);
    });

    it("ข้อมูลว่างไม่มีค่าเฉลี่ย", () => {
        expect(summarizeRatings([]).average).toBeNull();
    });

    it("สร้างสัดส่วนคะแนนย้อนหลังจากยอดแยกคะแนนรายวัน", () => {
        expect(summarizeRatingDistribution({ 1: 2, 2: 1, 3: 2, 4: 3, 5: 2 })).toEqual({
            count: 10,
            average: 3.2,
            positiveRate: 50,
            negativeRate: 30,
            distribution: { 1: 2, 2: 1, 3: 2, 4: 3, 5: 2 },
        });
    });

    it("minimum sample 10 ข้อ", () => {
        expect(meetsMinimumSample(9)).toBe(false);
        expect(meetsMinimumSample(10)).toBe(true);
    });
});
