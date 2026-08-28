import { generateQRCodeSVG } from "@/lib/qr-code";

export type CustomerFeedbackPosterTargetType = "EMPLOYEE" | "STATION";

export interface CustomerFeedbackA4PosterInput {
    qrUrl: string;
    manualEntryUrl: string;
    manualCode: string;
    targetType: CustomerFeedbackPosterTargetType;
    targetLabel: string;
    subtitle?: string;
    isTest?: boolean;
    version?: number;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>'\"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '\"': "&quot;",
    })[character]!);
}

function caltexBrandLockup(): string {
    return `<div class="caltex-lockup" aria-label="Caltex — Enjoy the Journey">
      <svg class="caltex-logo" viewBox="0 0 258 82" role="img" aria-label="Caltex">
        <circle cx="41" cy="41" r="39" fill="#d71920"/>
        <circle cx="41" cy="41" r="31" fill="#ffffff"/>
        <polygon points="41,13 48,32 69,32 52,44 59,65 41,52 23,65 30,44 13,32 34,32" fill="#003a70"/>
        <polygon points="41,30 55,41 41,47 27,41" fill="#d71920"/>
        <text x="88" y="51" font-family="Arial,Helvetica,sans-serif" font-size="39" font-weight="900" letter-spacing="1" fill="#003a70">CALTEX</text>
      </svg>
      <div class="brand-slogan">ENJOY THE JOURNEY</div>
    </div>`;
}

/**
 * สร้างเอกสาร A4 แนวนอนสำหรับวางหน้ารถ/หน้าเคาน์เตอร์
 * โดยใช้ Caltex เป็นแบรนด์หลักและให้ป้ายบุคคลเน้นชื่อพนักงานมากที่สุด
 */
export function buildCustomerFeedbackA4PosterHtml(input: CustomerFeedbackA4PosterInput): string {
    const qrSvg = generateQRCodeSVG(input.qrUrl, 760);
    const targetLabel = escapeHtml(input.targetLabel);
    const subtitle = input.subtitle ? escapeHtml(input.subtitle) : "";
    const manualEntryUrl = escapeHtml(input.manualEntryUrl);
    const manualCode = escapeHtml(input.manualCode);
    const version = input.version ? `QR version ${input.version}` : "";
    const isEmployee = input.targetType === "EMPLOYEE";
    const invitation = isEmployee ? "ช่วยประเมินการบริการของฉัน" : "ช่วยประเมินการบริการของเรา";
    const targetClass = isEmployee ? "target target-employee" : "target target-station";

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
    color: #082f57;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    position: relative;
    width: 297mm;
    height: 210mm;
    overflow: hidden;
    background:
      radial-gradient(circle at 3% 4%, rgba(215,25,32,.06) 0 23mm, transparent 23.5mm),
      linear-gradient(180deg, #ffffff 0%, #ffffff 83%, #f7f9fb 100%);
  }
  .brandbar {
    height: 27mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3.5mm 13mm 3mm 12mm;
    border-bottom: 1.4mm solid #d71920;
    background: #fff;
  }
  .caltex-lockup { display: flex; align-items: center; gap: 5mm; min-width: 0; }
  .caltex-logo { width: 67mm; height: 21mm; display: block; }
  .brand-slogan {
    padding-left: 5mm;
    border-left: .55mm solid #cbd5e1;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 4.1mm;
    line-height: 1.08;
    font-weight: 900;
    letter-spacing: .35mm;
    color: #d71920;
    white-space: nowrap;
  }
  .voice {
    display: flex;
    align-items: center;
    gap: 2.5mm;
    font-size: 5.5mm;
    font-weight: 950;
    color: #003a70;
    white-space: nowrap;
  }
  .voice-dot {
    width: 8mm;
    height: 8mm;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #003a70;
    color: #fff;
    font-family: Arial, sans-serif;
    font-size: 4mm;
    letter-spacing: -.4mm;
  }
  .content {
    height: 183mm;
    display: grid;
    grid-template-columns: 1.1fr .9fr;
    gap: 8mm;
    padding: 10mm 12mm 10mm 14mm;
  }
  .copy {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    padding-right: 1mm;
  }
  .eyebrow {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    gap: 2mm;
    border: .65mm solid #d71920;
    border-radius: 999px;
    padding: 2.2mm 4.2mm 1.9mm;
    font-size: 4.5mm;
    font-weight: 900;
    color: #d71920;
    margin-bottom: 4.5mm;
  }
  .invitation {
    margin: 0;
    max-width: 145mm;
    font-size: 9mm;
    line-height: 1.15;
    font-weight: 900;
    color: #1f2937;
  }
  .target {
    margin-top: 2.5mm;
    color: #003a70;
    font-weight: 950;
    overflow-wrap: anywhere;
  }
  .target-employee {
    font-size: 25mm;
    line-height: .98;
    letter-spacing: -.75mm;
    text-shadow: 1.2mm 1.2mm 0 rgba(215,25,32,.11);
  }
  .target-station {
    margin-top: 5mm;
    font-size: 13mm;
    line-height: 1.08;
    letter-spacing: -.25mm;
  }
  .subtitle {
    margin-top: 3mm;
    min-height: 7mm;
    font-size: 5.2mm;
    color: #4b5563;
    font-weight: 800;
  }
  .divider {
    width: 27mm;
    height: 1.1mm;
    margin-top: 5mm;
    border-radius: 99px;
    background: #d71920;
  }
  .benefits {
    display: flex;
    flex-wrap: wrap;
    gap: 2.5mm;
    margin-top: 6mm;
  }
  .chip {
    border: .4mm solid #d9e1e8;
    border-radius: 999px;
    background: #f8fafc;
    padding: 2.25mm 3.8mm;
    font-size: 4mm;
    color: #003a70;
    font-weight: 850;
  }
  .chip b { color: #d71920; }
  .hint {
    margin-top: 5.5mm;
    font-size: 3.9mm;
    color: #5b6470;
    line-height: 1.5;
  }
  .footer-brand {
    margin-top: 5mm;
    display: flex;
    align-items: center;
    gap: 2.5mm;
    color: #003a70;
    font-size: 3.8mm;
    font-weight: 850;
  }
  .footer-brand .red { color: #d71920; }
  .qr-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: .75mm solid #d8e0e7;
    border-radius: 8mm;
    padding: 4.5mm 5mm 4mm;
    background: #fff;
    box-shadow: 2.2mm 2.2mm 0 #003a70, 4mm 4mm 0 #d71920;
  }
  .scan-title {
    display: inline-flex;
    align-items: center;
    gap: 2mm;
    font-size: 6.5mm;
    color: #003a70;
    font-weight: 950;
    margin-bottom: 1.4mm;
  }
  .scan-title::before {
    content: "";
    width: 3mm;
    height: 3mm;
    border-radius: 50%;
    background: #d71920;
  }
  .qr {
    width: 103mm;
    height: 103mm;
    background: #fff;
  }
  .qr svg { display: block; width: 100%; height: 100%; }
  .manual-label {
    margin-top: 1.5mm;
    max-width: 115mm;
    text-align: center;
    font-size: 3.4mm;
    line-height: 1.35;
    color: #667085;
    font-weight: 750;
  }
  .manual {
    margin-top: 1.5mm;
    padding: 2mm 4mm 1.8mm 6mm;
    border: .55mm solid #d71920;
    border-radius: 3mm;
    background: #fff7f7;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 7mm;
    line-height: 1;
    color: #003a70;
    font-weight: 950;
    letter-spacing: 1.8mm;
  }
  .url {
    margin-top: 2mm;
    max-width: 115mm;
    font-size: 2.8mm;
    color: #8b95a1;
    word-break: break-all;
    text-align: center;
  }
  .version {
    position: absolute;
    right: 4mm;
    bottom: 3mm;
    font-size: 2.5mm;
    color: #b2bac4;
  }
  .test {
    position: absolute;
    top: 24mm;
    right: -28mm;
    width: 105mm;
    transform: rotate(39deg);
    background: #d71920;
    color: #fff;
    text-align: center;
    padding: 2.1mm 0;
    font-size: 4.8mm;
    font-weight: 950;
    z-index: 20;
    box-shadow: 0 .6mm 1.5mm rgba(0,0,0,.18);
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
  <section class="sheet ${isEmployee ? "employee-poster" : "station-poster"}">
    ${input.isTest ? '<div class="test">ตัวอย่าง / แบบทดสอบ</div>' : ""}
    <div class="brandbar">
      ${caltexBrandLockup()}
      <div class="voice"><span class="voice-dot">•••</span>เสียงลูกค้า</div>
    </div>
    <div class="content">
      <div class="copy">
        <div class="eyebrow">ความคิดเห็นของคุณสำคัญกับเรา</div>
        <h1 class="invitation">${invitation}</h1>
        <div class="${targetClass}">${targetLabel}</div>
        <div class="subtitle">${subtitle}</div>
        <div class="divider"></div>
        <div class="benefits">
          <div class="chip"><b>✓</b> ไม่ต้องล็อกอิน</div>
          <div class="chip"><b>✓</b> ไม่ต้องระบุชื่อ</div>
          <div class="chip"><b>✓</b> ใช้เวลาประมาณ 1 นาที</div>
        </div>
        <div class="hint">
          เปิดกล้องโทรศัพท์แล้วสแกน QR ด้านขวา<br>
          สแกนไม่ได้? ใช้รหัส 8 ตัวใต้ QR ได้เช่นกัน
        </div>
        <div class="footer-brand"><span class="red">CALTEX</span><span>·</span><span>ENJOY THE JOURNEY</span></div>
      </div>
      <div class="qr-panel">
        <div class="scan-title">สแกนเพื่อประเมิน</div>
        <div class="qr">${qrSvg}</div>
        <div class="manual-label">สแกนไม่ได้? เข้า ${manualEntryUrl} แล้วกรอกรหัส</div>
        <div class="manual">${manualCode}</div>
        <div class="url">${manualEntryUrl}</div>
        <div class="version">${escapeHtml(version)}</div>
      </div>
    </div>
  </section>
</body>
</html>`;
}
