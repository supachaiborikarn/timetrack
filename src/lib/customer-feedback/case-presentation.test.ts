import { describe, expect, it } from "vitest";
import {
    feedbackBehaviorFindings,
    feedbackCaseNotificationMessage,
    feedbackCaseTrigger,
    feedbackReasonLabels,
} from "./case-presentation";

const standardRatingOne = {
    kind: "STANDARD",
    surveyVersion: "employee-v4",
    overallRating: 1,
    reasonKeys: ["employee_courtesy", "employee_accuracy"],
    wantsFollowUp: false,
    employeeLabelSnapshot: "มะนาว",
    answers: [
        { questionKey: "uniform_and_name_badge", state: "ANSWERED", choiceValues: ["YES"] },
        { questionKey: "caltex_greeting", state: "ANSWERED", choiceValues: ["NO"] },
        { questionKey: "thank_and_guide_exit", state: "ANSWERED", choiceValues: ["UNSURE"] },
    ],
};

describe("customer feedback case presentation", () => {
    it("explains that rating 1 is the reason a HIGH case exists", () => {
        expect(feedbackCaseTrigger(standardRatingOne)).toEqual({
            headline: "ติดตามความพึงพอใจต่ำ: 1/5 — ไม่พอใจมาก",
            detail: "คะแนน 1–2 เปิดเคสติดตาม HIGH อัตโนมัติ แต่ยังไม่ถือว่าเป็นข้อร้องเรียนหรือความผิดของพนักงานจนกว่าจะตรวจสาเหตุและคำตอบรายข้อ",
        });
        expect(feedbackReasonLabels("employee-v4", standardRatingOne.reasonKeys)).toEqual([
            "การพูดจาและความสุภาพ",
            "ความถูกต้องของบริการ",
        ]);
    });

    it("surfaces failed rubric answers instead of treating a missing comment as no detail", () => {
        const findings = feedbackBehaviorFindings(standardRatingOne.surveyVersion, standardRatingOne.answers);
        expect(findings.find((finding) => finding.questionKey === "caltex_greeting")).toMatchObject({
            label: "พนักงานกล่าวทักทาย “คาลเท็กซ์ สวัสดีครับ/ค่ะ”",
            weight: 10,
            answer: "NO",
        });
    });

    it("puts rating, employee and selected reasons directly in HIGH notifications", () => {
        expect(feedbackCaseNotificationMessage(standardRatingOne, "HIGH", "negative-feedback")).toBe(
            "มะนาว: ติดตามความพึงพอใจต่ำ: 1/5 — ไม่พอใจมาก · สาเหตุ: การพูดจาและความสุภาพ, ความถูกต้องของบริการ"
        );
    });
});


it("does not treat low overall rating with all passed criteria as employee fault", () => {
    const response = {
        kind: "STANDARD",
        surveyVersion: "employee-v4",
        overallRating: 2,
        reasonKeys: ["system_wait"],
        wantsFollowUp: false,
        answers: [
            { questionKey: "uniform_and_name_badge", state: "ANSWERED", choiceValues: ["YES"] },
            { questionKey: "guide_vehicle_immediately", state: "ANSWERED", choiceValues: ["YES"] },
            { questionKey: "receive_driver_side", state: "ANSWERED", choiceValues: ["YES"] },
            { questionKey: "caltex_greeting", state: "ANSWERED", choiceValues: ["YES"] },
            { questionKey: "front_service_sign", state: "ANSWERED", choiceValues: ["YES"] },
            { questionKey: "repeat_fuel_amount_before", state: "ANSWERED", choiceValues: ["YES"] },
            { questionKey: "offer_rewards_promotion", state: "ANSWERED", choiceValues: ["YES"] },
            { questionKey: "repeat_fuel_amount_after", state: "ANSWERED", choiceValues: ["YES"] },
            { questionKey: "thank_and_guide_exit", state: "ANSWERED", choiceValues: ["YES"] },
        ],
    };
    expect(feedbackCaseTrigger(response).headline).toContain("ติดตามความพึงพอใจต่ำ");
});
