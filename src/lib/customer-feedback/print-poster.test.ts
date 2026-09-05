import { describe, expect, it } from "vitest";
import { buildCustomerFeedbackA4PosterHtml, type CustomerFeedbackA4PosterInput } from "./print-poster";

const baseInput: CustomerFeedbackA4PosterInput = {
    qrUrl: "https://example.com/f#t=restroom-test-token",
    manualEntryUrl: "https://example.com/f",
    manualCode: "ABCD2345",
    targetType: "STATION",
    targetLabel: "ห้องน้ำ สถานีทดสอบ",
    stationLabel: "สถานีทดสอบ",
    version: 2,
    assetBaseUrl: "https://example.com",
};

describe("customer feedback A4 poster", () => {
    it("renders a dedicated portrait restroom poster with restroom-only messaging", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            ...baseInput,
            posterVariant: "RESTROOM",
        });

        expect(html).toContain("@page { size: A4 portrait; margin: 0; }");
        expect(html).toContain("RESTROOM FEEDBACK");
        expect(html).toContain("ห้องน้ำ<strong>สะอาดไหม?</strong>");
        expect(html).toContain("สแกนเพื่อประเมินความสะอาด");
        expect(html).toContain("แบบประเมินห้องน้ำถามเฉพาะ 5 เรื่องนี้");
        expect(html).toContain("พื้นและพื้นที่");
        expect(html).toContain("สุขภัณฑ์และอ่าง");
        expect(html).toContain("กลิ่น");
        expect(html).toContain("ของใช้จำเป็น");
        expect(html).toContain("ถังขยะ");
        expect(html).toContain("ABCD2345"[0]);
        expect(html).not.toContain("QR ประเมินสถานี");
    });

    it("keeps the normal station poster on the existing landscape design", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            ...baseInput,
            posterVariant: "STANDARD",
            targetLabel: "สถานีทดสอบ",
        });

        expect(html).toContain("@page { size: A4 landscape; margin: 0; }");
        expect(html).toContain("QR ประเมินสถานี");
        expect(html).not.toContain("RESTROOM FEEDBACK");
        expect(html).not.toContain("แบบประเมินห้องน้ำถามเฉพาะ 5 เรื่องนี้");
    });
});
