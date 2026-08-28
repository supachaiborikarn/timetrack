import { describe, expect, it } from "vitest";
import { buildCustomerFeedbackA4PosterHtml } from "@/lib/customer-feedback/print-poster";

describe("customer feedback A4 landscape poster", () => {
    it("builds a Caltex-branded employee poster with the employee name as the dominant element", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "AB12CD34",
            targetType: "EMPLOYEE",
            targetLabel: "พี่เมย์",
            subtitle: "พนักงานบริการ · สถานีบริการศุภชัย",
            version: 3,
        });

        expect(html).toContain("@page { size: A4 landscape; margin: 0; }");
        expect(html).toContain("width: 297mm");
        expect(html).toContain("height: 210mm");
        expect(html).toContain("CALTEX");
        expect(html).toContain("ENJOY THE JOURNEY");
        expect(html).toContain("ช่วยประเมินการบริการของฉัน");
        expect(html).toContain('class="target target-employee"');
        expect(html).toContain("font-size: 25mm");
        expect(html).toContain("พี่เมย์");
        expect(html).toContain("AB12CD34");
        expect(html).toContain("QR version 3");
        expect(html).toContain("<svg");
    });

    it("uses collective wording and a smaller target hierarchy for station posters", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "STN12345",
            targetType: "STATION",
            targetLabel: "สถานีบริการตัวอย่าง",
            subtitle: "จุดบริการหลัก",
        });

        expect(html).toContain("ช่วยประเมินการบริการของเรา");
        expect(html).toContain('class="target target-station"');
        expect(html).toContain("สถานีบริการตัวอย่าง");
    });

    it("escapes public text and shows a clear test watermark", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "TEST1234",
            targetType: "EMPLOYEE",
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
