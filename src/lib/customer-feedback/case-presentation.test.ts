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
            headline: "ลูกค้าให้ 1/5 — ไม่พอใจมาก",
            detail: "คะแนน 1–2 เปิดเคส HIGH อัตโนมัติ และต้องรับทราบภายใน 24 ชั่วโมง",
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
            "มะนาว: ลูกค้าให้ 1/5 — ไม่พอใจมาก · สาเหตุ: การพูดจาและความสุภาพ, ความถูกต้องของบริการ"
        );
    });
});
