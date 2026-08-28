import { describe, expect, it } from "vitest";
import { buildCustomerFeedbackA4PosterHtml } from "@/lib/customer-feedback/print-poster";

describe("customer feedback A4 landscape poster", () => {
    it("builds a print-ready landscape A4 poster with QR and fallback code", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "AB12CD34",
            targetLabel: "สถานีบริการตัวอย่าง",
            subtitle: "จุดบริการหลัก",
            version: 3,
        });

        expect(html).toContain("@page { size: A4 landscape; margin: 0; }");
        expect(html).toContain("width: 297mm");
        expect(html).toContain("height: 210mm");
        expect(html).toContain("สถานีบริการตัวอย่าง");
        expect(html).toContain("AB12CD34");
        expect(html).toContain("QR version 3");
        expect(html).toContain("<svg");
        expect(html).toContain("ช่วยประเมิน");
    });

    it("escapes public text and shows a clear test watermark", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "TEST1234",
            targetLabel: '<script>alert("x")</script>',
            subtitle: "A & B",
            isTest: true,
        });

        expect(html).not.toContain('<script>alert("x")</script>');
        expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
        expect(html).toContain("A &amp; B");
        expect(html).toContain("ตัวอย่าง / แบบทดสอบ");
    });
});
