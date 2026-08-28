import { describe, expect, it } from "vitest";
import { buildCustomerFeedbackA4PosterHtml } from "@/lib/customer-feedback/print-poster";

describe("customer feedback A4 landscape poster", () => {
    it("builds the approved yellow/navy employee layout with a dominant name and Caltex footer", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "AB12CD34",
            targetType: "EMPLOYEE",
            targetLabel: "กอล์ฟ",
            positionLabel: "พนักงานบริการ",
            stationLabel: "ศุภชัยบริการ",
            version: 3,
        });

        expect(html).toContain("@page { size: A4 landscape; margin: 0; }");
        expect(html).toContain("width: 297mm");
        expect(html).toContain("height: 210mm");
        expect(html).toContain("เสียงลูกค้า");
        expect(html).toContain("ช่วยประเมินการบริการของฉัน");
        expect(html).toContain("วันนี้ฉันบริการคุณเป็นอย่างไรบ้าง?");
        expect(html).toContain('class="target employee-name name-xl"');
        expect(html).toContain("กอล์ฟ");
        expect(html).toContain("ตำแหน่ง: พนักงานบริการ · สถานี: ศุภชัยบริการ");
        expect(html).toContain("benefit-cards");
        expect(html).toContain("footer-wave");
        expect(html).toContain("สแกนเพื่อประเมิน");
        expect(html).toContain("AB12CD34");
        expect(html).toContain("CALTEX");
        expect(html).toContain("ENJOY THE JOURNEY");
        expect(html).toContain("QR version 3");
        expect(html).toContain("<svg");
    });

    it("reduces the employee name size class when a public label is long", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "LONG1234",
            targetType: "EMPLOYEE",
            targetLabel: "พนักงานชื่อยาวมากเป็นพิเศษ",
        });

        expect(html).toContain('class="target employee-name name-md"');
    });

    it("uses station wording, station identity and placement context for station posters", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "STN12345",
            targetType: "STATION",
            targetLabel: "สถานีบริการตัวอย่าง",
            stationLabel: "สถานีบริการตัวอย่าง",
            subtitle: "จุดบริการหลัก",
        });

        expect(html).toContain("ช่วยประเมินการบริการของเรา");
        expect(html).toContain('class="target station-name"');
        expect(html).toContain("สถานีบริการตัวอย่าง · จุดบริการหลัก");
    });

    it("escapes public text and shows a clear test watermark", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "TEST1234",
            targetType: "EMPLOYEE",
            targetLabel: '<script>alert("x")</script>',
            positionLabel: "A & B",
            stationLabel: "S < 1",
            isTest: true,
        });

        expect(html).not.toContain('<script>alert("x")</script>');
        expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
        expect(html).toContain("A &amp; B");
        expect(html).toContain("S &lt; 1");
        expect(html).toContain("ตัวอย่าง / แบบทดสอบ");
    });

    it("keeps the QR card above the footer so manual code is not clipped", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "SAFE1234",
            targetType: "EMPLOYEE",
            targetLabel: "เมย์",
        });

        expect(html).toContain("bottom: 22mm");
        expect(html).toContain("height: 155mm");
        expect(html).toContain('class="manual-code">SAFE1234</div>');
    });
});
