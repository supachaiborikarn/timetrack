import { generateQRCodeSVG } from "@/lib/qr-code";

export type CustomerFeedbackPosterTargetType = "EMPLOYEE" | "STATION";

export interface CustomerFeedbackA4PosterInput {
    qrUrl: string;
    manualEntryUrl: string;
    manualCode: string;
    targetType: CustomerFeedbackPosterTargetType;
    targetLabel: string;
    publicPosition?: string;
    stationLabel?: string;
    placementLabel?: string;
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

function employeeNameSizeClass(label: string): string {
    const length = [...label.trim()].length;
    if (length <= 10) return "name-short";
    if (length <= 18) return "name-medium";
    return "name-long";
}

/**
 * A4 landscape customer-feedback sign for front-of-car / counter display.
 * Layout follows the approved visual mockup while keeping all data and QR values dynamic.
 */
export function buildCustomerFeedbackA4PosterHtml(input: CustomerFeedbackA4PosterInput): string {
    const qrSvg = generateQRCodeSVG(input.qrUrl, 900);
    const targetLabel = escapeHtml(input.targetLabel);
    const publicPosition = input.publicPosition ? escapeHtml(input.publicPosition) : "";
    const stationLabel = input.stationLabel ? escapeHtml(input.stationLabel) : "";
    const placementLabel = input.placementLabel ? escapeHtml(input.placementLabel) : "";
    const subtitle = input.subtitle ? escapeHtml(input.subtitle) : "";
    const manualEntryUrl = escapeHtml(input.manualEntryUrl);
    const manualCode = escapeHtml(input.manualCode);
    const version = input.version ? `QR version ${input.version}` : "";
    const isEmployee = input.targetType === "EMPLOYEE";
    const nameSizeClass = isEmployee ? employeeNameSizeClass(input.targetLabel) : "name-station";

    const invitation = isEmployee ? "ช่วยประเมินการบริการของฉัน" : "ช่วยประเมินการบริการของเรา";
    const question = isEmployee
        ? "วันนี้ฉันบริการคุณเป็นอย่างไรบ้าง?"
        : "ความคิดเห็นของคุณช่วยให้เราปรับปรุงบริการได้ดียิ่งขึ้น";
    const infoLine = isEmployee
        ? [publicPosition ? `ตำแหน่ง: ${publicPosition}` : "", stationLabel ? `สถานี: ${stationLabel}` : ""]
            .filter(Boolean)
            .join("  •  ")
        : [stationLabel, placementLabel].filter(Boolean).join("  •  ") || subtitle;
    const footerStation = stationLabel || (isEmployee ? "สถานีบริการ Caltex" : targetLabel);

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
    color: #102a56;
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
      linear-gradient(180deg, rgba(255,255,255,.98) 0%, #ffffff 79%, #fbfbfd 100%);
  }
  .voice-header {
    position: absolute;
    left: 0;
    top: 0;
    width: 157mm;
    height: 28mm;
    display: flex;
    align-items: center;
    gap: 5mm;
    padding: 0 15mm 0 13mm;
    border-bottom-right-radius: 12mm;
    background: linear-gradient(135deg, #f5b400 0%, #ffd34f 55%, #f5b400 100%);
    border-bottom: .6mm solid #d99d00;
    box-shadow: 0 2mm 4mm rgba(171,113,0,.16);
    z-index: 2;
  }
  .voice-icon {
    width: 16mm;
    height: 16mm;
    display: grid;
    place-items: center;
    border: 1.6mm solid #fff;
    border-radius: 50%;
    background: rgba(255,255,255,.18);
    color: #fff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8mm;
    line-height: 1;
    font-weight: 900;
    letter-spacing: -.7mm;
  }
  .voice-title {
    color: #102a56;
    font-size: 12mm;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -.2mm;
    text-shadow: 0 .4mm 0 rgba(255,255,255,.8);
  }
  .test-ribbon {
    position: absolute;
    top: 6mm;
    right: -19mm;
    width: 78mm;
    transform: rotate(39deg);
    background: #d71920;
    color: #fff;
    text-align: center;
    padding: 2mm 0;
    font-size: 4.8mm;
    font-weight: 950;
    z-index: 20;
    box-shadow: 0 .8mm 2mm rgba(0,0,0,.18);
  }
  .content {
    position: absolute;
    left: 13mm;
    right: 13mm;
    top: 34mm;
    bottom: 28mm;
    display: grid;
    grid-template-columns: 1.08fr .92fr;
    gap: 11mm;
  }
  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding-top: 3mm;
  }
  .invitation {
    margin: 0 0 3mm;
    color: #17233a;
    font-size: 8.7mm;
    line-height: 1.15;
    font-weight: 900;
  }
  .target {
    margin: 0;
    color: #102a56;
    font-weight: 950;
    line-height: .92;
    letter-spacing: -.65mm;
    overflow-wrap: anywhere;
    text-shadow:
      1.1mm 1.1mm 0 rgba(255,255,255,.95),
      1.8mm 1.8mm 2.2mm rgba(16,42,86,.10);
  }
  .name-short { font-size: 31mm; }
  .name-medium { font-size: 25mm; }
  .name-long { font-size: 20mm; line-height: 1; }
  .name-station { font-size: 16mm; line-height: 1.05; }
  .question {
    margin-top: 4mm;
    color: #17385e;
    font-size: 6.3mm;
    line-height: 1.35;
    font-weight: 750;
    font-style: italic;
  }
  .info-pill {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    max-width: 100%;
    margin-top: 5mm;
    padding: 2.4mm 5mm 2.2mm;
    border-radius: 3.2mm;
    background: #102a56;
    color: #fff;
    font-size: 4.7mm;
    line-height: 1.35;
    font-weight: 850;
  }
  .info-pill .dot {
    color: #f5b400;
    padding: 0 1.8mm;
  }
  .fast-facts {
    display: flex;
    align-items: center;
    gap: 5mm;
    margin-top: 4mm;
    color: #17233a;
    font-size: 4.5mm;
    font-weight: 800;
  }
  .fast-fact {
    display: flex;
    align-items: center;
    gap: 2mm;
    white-space: nowrap;
  }
  .fast-icon {
    width: 7mm;
    height: 7mm;
    display: grid;
    place-items: center;
    border: .65mm solid #f5b400;
    border-radius: 50%;
    color: #102a56;
    font-size: 3.7mm;
    font-weight: 950;
  }
  .benefit-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4mm;
    margin-top: 6mm;
  }
  .benefit {
    min-height: 21mm;
    display: grid;
    grid-template-columns: 9mm 1fr;
    align-items: center;
    gap: 2.5mm;
    padding: 3mm 3mm;
    border: .45mm solid #e5b32c;
    border-radius: 4mm;
    background: #fff;
    color: #17233a;
    box-shadow: 0 1mm 2.6mm rgba(30,41,59,.05);
  }
  .benefit-icon {
    width: 9mm;
    height: 9mm;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #f5b400;
    color: #fff;
    font-size: 4.2mm;
    font-weight: 950;
  }
  .benefit-text {
    font-size: 4mm;
    line-height: 1.25;
    font-weight: 850;
  }
  .feedback-note {
    margin-top: 5mm;
    display: flex;
    align-items: center;
    gap: 3mm;
    color: #303846;
    font-size: 4.1mm;
    font-weight: 720;
  }
  .heart {
    width: 8.5mm;
    height: 8.5mm;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #f5b400;
    color: #fff;
    font-size: 5mm;
    font-weight: 900;
  }
  .qr-card {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 6mm 7mm 5mm;
    border: .75mm solid #e8b73a;
    border-radius: 6.5mm;
    background: #fff;
    box-shadow: 0 2.2mm 5.5mm rgba(16,42,86,.12);
  }
  .scan-pill {
    width: 83%;
    min-height: 13mm;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #102a56;
    color: #fff;
    font-size: 6.7mm;
    line-height: 1;
    font-weight: 950;
    margin-bottom: 3.5mm;
  }
  .qr {
    width: 104mm;
    height: 104mm;
    background: #fff;
  }
  .qr svg { display: block; width: 100%; height: 100%; }
  .or-line {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 3mm;
    margin-top: 1.5mm;
    color: #596579;
    font-size: 3.6mm;
    font-weight: 850;
  }
  .or-line::before, .or-line::after {
    content: "";
    height: .35mm;
    background: #98a2b3;
  }
  .manual-label {
    margin-top: 1mm;
    max-width: 100%;
    text-align: center;
    color: #303846;
    font-size: 3.55mm;
    line-height: 1.35;
    font-weight: 760;
  }
  .manual {
    width: 100%;
    margin-top: 2.5mm;
    padding: 3.3mm 2mm 3mm 4mm;
    border: .5mm solid #e8b73a;
    border-radius: 3.5mm;
    background: #fff9e9;
    color: #102a56;
    text-align: center;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 9.5mm;
    line-height: 1;
    font-weight: 950;
    letter-spacing: 1.6mm;
  }
  .url {
    margin-top: 2.5mm;
    max-width: 100%;
    color: #102a56;
    font-size: 3.15mm;
    line-height: 1.35;
    font-weight: 800;
    word-break: break-all;
    text-align: center;
  }
  .version {
    position: absolute;
    right: 3mm;
    bottom: 2mm;
    color: #a8b0bd;
    font-size: 2.4mm;
  }
  .footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 27mm;
    overflow: hidden;
    background: linear-gradient(180deg, #ffd756 0%, #f5b400 100%);
    border-top: .6mm solid #e7ab00;
  }
  .footer::before {
    content: "";
    position: absolute;
    left: -12mm;
    top: -8mm;
    width: 190mm;
    height: 15mm;
    border-radius: 50%;
    background: #fff;
    transform: rotate(-1deg);
  }
  .footer-inner {
    position: relative;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8mm;
    padding: 8mm 13mm 4.5mm;
  }
  .caltex-lockup {
    display: flex;
    align-items: center;
    gap: 4mm;
    min-width: 0;
  }
  .caltex-logo { width: 55mm; height: 17mm; display: block; }
  .brand-slogan {
    padding-left: 4mm;
    border-left: .55mm solid rgba(16,42,86,.35);
    color: #d71920;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 3.6mm;
    line-height: 1.08;
    font-weight: 950;
    letter-spacing: .25mm;
    white-space: nowrap;
  }
  .footer-station {
    max-width: 90mm;
    color: #102a56;
    text-align: right;
    font-size: 5.2mm;
    line-height: 1.15;
    font-weight: 950;
  }
  .footer-station small {
    display: block;
    margin-top: 1mm;
    color: #d71920;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 3.1mm;
    font-weight: 950;
    letter-spacing: .25mm;
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
    ${input.isTest ? '<div class="test-ribbon">ตัวอย่าง / แบบทดสอบ</div>' : ""}
    <div class="voice-header">
      <div class="voice-icon">•••</div>
      <div class="voice-title">เสียงลูกค้า</div>
    </div>

    <div class="content">
      <div class="copy">
        <h1 class="invitation">${invitation}</h1>
        <div class="target ${nameSizeClass}">${targetLabel}</div>
        <div class="question">${question}</div>
        ${infoLine ? `<div class="info-pill">${infoLine}</div>` : ""}
        <div class="fast-facts">
          <div class="fast-fact"><span class="fast-icon">1</span><span>ใช้เวลาประมาณ 1 นาที</span></div>
          <div class="fast-fact"><span class="fast-icon">✓</span><span>ไม่ต้องระบุชื่อ</span></div>
        </div>
        <div class="benefit-grid">
          <div class="benefit"><div class="benefit-icon">✓</div><div class="benefit-text">ไม่ต้อง<br>ล็อกอิน</div></div>
          <div class="benefit"><div class="benefit-icon">✓</div><div class="benefit-text">ไม่ต้อง<br>ระบุชื่อ</div></div>
          <div class="benefit"><div class="benefit-icon">1</div><div class="benefit-text">ใช้เวลา<br>ประมาณ 1 นาที</div></div>
        </div>
        <div class="feedback-note"><span class="heart">♥</span><span>ความคิดเห็นของคุณช่วยให้เราปรับปรุงบริการได้ดียิ่งขึ้น</span></div>
      </div>

      <div class="qr-card">
        <div class="scan-pill">สแกนเพื่อประเมิน</div>
        <div class="qr">${qrSvg}</div>
        <div class="or-line">หรือ</div>
        <div class="manual-label">สแกนไม่ได้? เข้า ${manualEntryUrl}<br>แล้วกรอกรหัสนี้เพื่อประเมิน</div>
        <div class="manual">${manualCode}</div>
        <div class="url">${manualEntryUrl}</div>
        <div class="version">${escapeHtml(version)}</div>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-inner">
        ${caltexBrandLockup()}
        <div class="footer-station">${footerStation}<small>ENJOY THE JOURNEY</small></div>
      </div>
    </footer>
  </section>
</body>
</html>`;
}
