import { generateQRCodeSVG } from "@/lib/qr-code";

export interface CustomerFeedbackA4PosterInput {
    qrUrl: string;
    manualEntryUrl: string;
    manualCode: string;
    targetLabel: string;
    subtitle?: string;
    isTest?: boolean;
    version?: number;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    })[character]!);
}

/**
 * สร้างเอกสาร A4 แนวนอนสำหรับวางหน้ารถ/หน้าเคาน์เตอร์
 * โดยตั้งใจให้ QR มีขนาดใหญ่และยังมีรหัส 8 ตัวเป็น fallback เมื่อสแกนไม่ได้
 */
export function buildCustomerFeedbackA4PosterHtml(input: CustomerFeedbackA4PosterInput): string {
    const qrSvg = generateQRCodeSVG(input.qrUrl, 760);
    const targetLabel = escapeHtml(input.targetLabel);
    const subtitle = input.subtitle ? escapeHtml(input.subtitle) : "";
    const manualEntryUrl = escapeHtml(input.manualEntryUrl);
    const manualCode = escapeHtml(input.manualCode);
    const version = input.version ? `QR version ${input.version}` : "";

    return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ป้ายเสียงลูกค้า A4 - ${targetLabel}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  html, body { width: 297mm; height: 210mm; margin: 0; padding: 0; }
  body {
    font-family: "Sarabun", "Noto Sans Thai", "Tahoma", -apple-system, BlinkMacSystemFont, sans-serif;
    color: #111827;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    position: relative;
    width: 297mm;
    height: 210mm;
    overflow: hidden;
    background: #fff;
    border: 0;
  }
  .topbar {
    height: 22mm;
    background: #facc15;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14mm;
    font-weight: 900;
    letter-spacing: .2mm;
  }
  .brand { font-size: 9mm; }
  .time { font-size: 5.2mm; font-weight: 800; }
  .content {
    height: 188mm;
    display: grid;
    grid-template-columns: 1.12fr .88fr;
    gap: 8mm;
    padding: 10mm 12mm 10mm 14mm;
  }
  .copy {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }
  .eyebrow {
    display: inline-flex;
    align-self: flex-start;
    border: 1.2mm solid #111827;
    border-radius: 999px;
    padding: 2.5mm 5mm 2mm;
    font-size: 5mm;
    font-weight: 900;
    margin-bottom: 5mm;
  }
  h1 {
    margin: 0;
    font-size: 16mm;
    line-height: 1.05;
    letter-spacing: -.5mm;
    font-weight: 950;
  }
  .accent { color: #b45309; }
  .target {
    margin-top: 5mm;
    font-size: 8.6mm;
    line-height: 1.2;
    font-weight: 900;
  }
  .subtitle {
    margin-top: 2mm;
    min-height: 7mm;
    font-size: 5.3mm;
    color: #4b5563;
    font-weight: 700;
  }
  .benefits {
    display: flex;
    flex-wrap: wrap;
    gap: 2.5mm;
    margin-top: 8mm;
  }
  .chip {
    border-radius: 999px;
    background: #f3f4f6;
    padding: 2.3mm 4mm;
    font-size: 4.3mm;
    font-weight: 800;
  }
  .hint {
    margin-top: 7mm;
    font-size: 4.2mm;
    color: #4b5563;
    line-height: 1.55;
  }
  .qr-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1.2mm solid #111827;
    border-radius: 7mm;
    padding: 5mm 5mm 4mm;
    background: #fff;
    box-shadow: 2.5mm 2.5mm 0 #facc15;
  }
  .scan-title {
    font-size: 7mm;
    font-weight: 950;
    margin-bottom: 2mm;
  }
  .qr {
    width: 105mm;
    height: 105mm;
    padding: 0;
    background: #fff;
  }
  .qr svg { display: block; width: 100%; height: 100%; }
  .manual-label {
    margin-top: 2mm;
    font-size: 3.8mm;
    color: #6b7280;
    font-weight: 700;
  }
  .manual {
    margin-top: 1mm;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 7.8mm;
    line-height: 1;
    font-weight: 950;
    letter-spacing: 2.2mm;
  }
  .url {
    margin-top: 2.5mm;
    max-width: 118mm;
    font-size: 3.2mm;
    color: #6b7280;
    word-break: break-all;
    text-align: center;
  }
  .version {
    position: absolute;
    right: 4mm;
    bottom: 3mm;
    font-size: 2.7mm;
    color: #9ca3af;
  }
  .test {
    position: absolute;
    top: 27mm;
    left: -28mm;
    width: 110mm;
    transform: rotate(-36deg);
    background: #dc2626;
    color: #fff;
    text-align: center;
    padding: 2.2mm 0;
    font-size: 5mm;
    font-weight: 950;
    z-index: 10;
  }
  @media screen {
    body { background: #e5e7eb; padding: 8px; }
    .sheet { box-shadow: 0 8px 30px rgba(0,0,0,.18); margin: 0 auto; }
  }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; }
  }
</style>
</head>
<body>
  <section class="sheet">
    ${input.isTest ? '<div class="test">ตัวอย่าง / แบบทดสอบ</div>' : ""}
    <div class="topbar">
      <div class="brand">เสียงลูกค้า</div>
      <div class="time">ใช้เวลาประมาณ 1 นาที · ไม่ต้องระบุชื่อ</div>
    </div>
    <div class="content">
      <div class="copy">
        <div class="eyebrow">ความคิดเห็นของคุณสำคัญกับเรา</div>
        <h1>ช่วยประเมิน<br><span class="accent">การบริการ</span>ของเรา</h1>
        <div class="target">${targetLabel}</div>
        <div class="subtitle">${subtitle}</div>
        <div class="benefits">
          <div class="chip">✓ ไม่ต้องล็อกอิน</div>
          <div class="chip">✓ ไม่ต้องระบุชื่อ</div>
          <div class="chip">✓ ช่วยปรับปรุงบริการจริง</div>
        </div>
        <div class="hint">
          เปิดกล้องโทรศัพท์แล้วสแกน QR ด้านขวา<br>
          หากสแกนไม่ได้ สามารถกรอกรหัส 8 ตัวที่แสดงใต้ QR ได้
        </div>
      </div>
      <div class="qr-panel">
        <div class="scan-title">สแกนตรงนี้</div>
        <div class="qr">${qrSvg}</div>
        <div class="manual-label">หรือเข้า ${manualEntryUrl} แล้วกรอกรหัส</div>
        <div class="manual">${manualCode}</div>
        <div class="url">${manualEntryUrl}</div>
        <div class="version">${escapeHtml(version)}</div>
      </div>
    </div>
  </section>
</body>
</html>`;
}
