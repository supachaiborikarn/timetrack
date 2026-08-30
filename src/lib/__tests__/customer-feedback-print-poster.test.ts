import { describe, expect, it } from "vitest";
import {
    buildCustomerFeedbackA4PosterHtml,
    buildCustomerFeedbackSmallLabelA4SheetHtml,
    buildCustomerFeedbackSmallLabelHtml,
} from "@/lib/customer-feedback/print-poster";

describe("customer feedback small label", () => {
    it("uses the A4 Caltex visual language in an exact 54 x 88 mm layout", () => {
        const html = buildCustomerFeedbackSmallLabelHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "X7A4K9D2",
            targetType: "EMPLOYEE",
            targetLabel: "เบียร์",
            positionLabel: "พนักงานเติมน้ำมัน",
            stationLabel: "สถานีบริการคาลเท็กซ์ พหลโยธิน กม. 18",
            assetBaseUrl: "https://timetrack.example",
            version: 4,
        });

        expect(html).toContain("@page { size: 54mm 88mm; margin: 0; }");
        expect(html).toContain("width: 54mm");
        expect(html).toContain("height: 88mm");
        expect(html).toContain("https://timetrack.example/customer-feedback/caltex-logo.png");
        expect(html).toContain("https://timetrack.example/customer-feedback/techron-logo.png");
        expect(html).toContain("https://timetrack.example/fonts/Kanit-Black.ttf");
        expect(html).toContain("https://timetrack.example/fonts/Sriracha-Regular.ttf");
        expect(html).toContain("ENJOY THE JOURNEY");
        expect(html).toContain("ช่วยประเมินการบริการของ");
        expect(html).toContain('class="small-target small-target-xl"');
        expect(html).toContain("เบียร์");
        expect(html).toContain("วันนี้ผมบริการคุณเป็นอย่างไรบ้าง?");
        expect(html).toContain("พนักงานเติมน้ำมัน");
        expect(html).toContain("สถานีบริการคาลเท็กซ์ พหลโยธิน กม. 18");
        expect(html).toContain("small-scan-pill");
        expect(html).toContain("small-qr-shell");
        expect(html).not.toContain("qr-brand");
        expect(html).toContain("small-bottom-sweep");
        expect(html).toContain("ขอบคุณทุกความคิดเห็น");
        expect(html).toContain('<div class="small-version">v4</div>');
    });

    it("keeps a large unobstructed QR field and renders the fallback code as eight cells", () => {
        const html = buildCustomerFeedbackSmallLabelHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "SAFE1234",
            targetType: "EMPLOYEE",
            targetLabel: "เมย์",
        });

        expect(html).toContain("width: 35mm");
        expect(html).toContain("height: 35mm");
        expect((html.match(/class="small-code-cell"/g) ?? []).length).toBe(8);
        expect(html).toContain("grid-template-columns: repeat(8, 1fr)");
        expect(html).toContain("border: .25mm solid var(--brand-red)");
    });


    it("builds A4 portrait batch sheets with nine exact-size labels per page", () => {
        const inputs = Array.from({ length: 10 }, (_, index) => ({
            qrUrl: `https://timetrack.example/f?t=token-${index}`,
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: `ABCD${String(index).padStart(4, "0")}`.slice(0, 8),
            targetType: "EMPLOYEE" as const,
            targetLabel: `พนง${index + 1}`,
            positionLabel: "พนักงานเติมน้ำมัน",
            stationLabel: "สถานีหนึ่ง",
            assetBaseUrl: "https://timetrack.example",
        }));

        const html = buildCustomerFeedbackSmallLabelA4SheetHtml(inputs);

        expect(html).toContain("@page { size: A4 portrait; margin: 0; }");
        expect(html).toContain("grid-template-columns: repeat(3, 54mm)");
        expect(html).toContain("grid-template-rows: repeat(3, 88mm)");
        expect(html).toContain("column-gap: 4mm");
        expect(html).toContain("row-gap: 4mm");
        expect((html.match(/class="small-label-a4-page"/g) ?? []).length).toBe(2);
        expect((html.match(/class="small-label-slot"/g) ?? []).length).toBe(10);
        expect((html.match(/class="small-label-card employee-label"/g) ?? []).length).toBe(10);
    });

    it("uses station wording, scales long labels, and preserves the same compact brand system", () => {
        const html = buildCustomerFeedbackSmallLabelHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "STN12345",
            targetType: "STATION",
            targetLabel: "สถานีบริการชื่อยาวมากเป็นพิเศษ",
            stationLabel: "สถานีบริการชื่อยาวมากเป็นพิเศษ",
        });

        expect(html).toContain("ช่วยประเมินการบริการของเรา");
        expect(html).toContain("วันนี้การบริการของเราเป็นอย่างไรบ้าง?");
        expect(html).toContain("QR ประเมินสถานี");
        expect(html).toContain('class="small-target small-target-sm"');
        expect(html).toContain("small-identity");
    });

    it("escapes public text and shows the test ribbon", () => {
        const html = buildCustomerFeedbackSmallLabelHtml({
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
});

describe("customer feedback A4 landscape poster", () => {
    it("builds the approved Caltex employee reference layout with live data", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "X7A4K9D2",
            targetType: "EMPLOYEE",
            targetLabel: "เบียร์",
            positionLabel: "พนักงานเติมน้ำมัน",
            stationLabel: "สถานีบริการคาลเท็กซ์ พหลโยธิน กม. 18",
            assetBaseUrl: "https://timetrack.example",
            version: 3,
        });

        expect(html).toContain("@page { size: A4 landscape; margin: 0; }");
        expect(html).toContain("width: 297mm");
        expect(html).toContain("height: 210mm");
        expect(html).toContain("https://timetrack.example/customer-feedback/caltex-logo.png");
        expect(html).toContain("https://timetrack.example/customer-feedback/techron-logo.png");
        expect(html).toContain("https://timetrack.example/fonts/Kanit-Black.ttf");
        expect(html).toContain("https://timetrack.example/fonts/Sriracha-Regular.ttf");
        expect(html).toContain("ENJOY THE JOURNEY");
        expect(html).toContain("ช่วยประเมินการบริการของ");
        expect(html).toContain('class="target target-xl"');
        expect(html).toContain("เบียร์");
        expect(html).toContain("วันนี้ผมบริการคุณเป็นอย่างไรบ้าง?");
        expect(html).toContain("heart-doodle");
        expect(html).toContain("ตำแหน่ง :");
        expect(html).toContain("พนักงานเติมน้ำมัน");
        expect(html).toContain("สถานีบริการคาลเท็กซ์ พหลโยธิน กม. 18");
        expect(html).toContain("fact-band");
        expect(html).toContain("สแกนเพื่อประเมิน");
        expect(html).toContain("qr-brand");
        expect(html).toContain("กรอกรหัสนี้เพื่อประเมิน");
        expect((html.match(/class="code-cell"/g) ?? []).length).toBe(8);
        expect(html).toContain("X</span>");
        expect(html).toContain("2</span>");
        expect(html).toContain("bottom-sweep");
        expect(html).toContain("https://timetrack.example/customer-feedback/techron-logo.png");
        expect(html).toContain("CLEAN AND PROTECT");
        expect(html).toContain("ขอบคุณทุกความคิดเห็น เพื่อบริการที่ดีกว่าเดิม");
        expect(html).toContain("QR version 3");
        expect(html).toContain("<svg");
    });

    it("scales a long public employee label down while keeping the reference layout", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "LONG1234",
            targetType: "EMPLOYEE",
            targetLabel: "พนักงานชื่อยาวมากเป็นพิเศษ",
        });

        expect(html).toContain('class="target target-sm"');
        expect(html).toContain("qr-card");
        expect(html).toContain("fact-band");
    });

    it("uses station wording and station identity while preserving the same Caltex poster system", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "STN12345",
            targetType: "STATION",
            targetLabel: "ศุภชัยบริการ",
            stationLabel: "ศุภชัยบริการ",
            subtitle: "จุดบริการหลัก",
        });

        expect(html).toContain("ช่วยประเมินการบริการของเรา");
        expect(html).toContain("วันนี้การบริการของเราเป็นอย่างไรบ้าง?");
        expect(html).toContain("ประเภท :");
        expect(html).toContain("QR ประเมินสถานี");
        expect(html).toContain("สถานีบริการ :");
        expect(html).toContain("ศุภชัยบริการ");
        expect(html).toContain("/customer-feedback/techron-logo.png");
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

    it("renders the manual code as eight separate red-bordered cells", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "SAFE1234",
            targetType: "EMPLOYEE",
            targetLabel: "เมย์",
        });

        expect((html.match(/class="code-cell"/g) ?? []).length).toBe(8);
        expect(html).toContain("grid-template-columns: repeat(8, 1fr)");
        expect(html).toContain("border: .45mm solid var(--brand-red)");
    });

    it("keeps print assets absolute when an app origin is supplied", () => {
        const html = buildCustomerFeedbackA4PosterHtml({
            qrUrl: "https://timetrack.example/f?t=demo-token",
            manualEntryUrl: "https://timetrack.example/f",
            manualCode: "ASSET123",
            targetType: "EMPLOYEE",
            targetLabel: "กอล์ฟ",
            assetBaseUrl: "https://timetrack-lake.vercel.app/",
        });

        expect(html).toContain('src="https://timetrack-lake.vercel.app/customer-feedback/caltex-logo.png"');
        expect(html).toContain('src="https://timetrack-lake.vercel.app/customer-feedback/techron-logo.png"');
        expect(html).toContain('src="https://timetrack-lake.vercel.app/customer-feedback/techron-logo.png"');
        expect(html).toContain('url("https://timetrack-lake.vercel.app/fonts/Kanit-Regular.ttf")');
    });
});
