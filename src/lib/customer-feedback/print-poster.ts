import { generateQRCodeSVG } from "@/lib/qr-code";

export type CustomerFeedbackPosterTargetType = "EMPLOYEE" | "STATION";

export interface CustomerFeedbackA4PosterInput {
    qrUrl: string;
    manualEntryUrl: string;
    manualCode: string;
    targetType: CustomerFeedbackPosterTargetType;
    targetLabel: string;
    subtitle?: string;
    positionLabel?: string;
    stationLabel?: string;
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

function speechIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 12h44a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H30L18 57v-9h-8a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="22" cy="30" r="3.8" fill="currentColor"/><circle cx="32" cy="30" r="3.8" fill="currentColor"/><circle cx="42" cy="30" r="3.8" fill="currentColor"/></svg>`;
}

function clockIcon(): string {
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="4"/><path d="M24 13v12l8 5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function checkIcon(): string {
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="4"/><path d="m15 24 6 6 13-14" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function lockIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="15" y="28" width="34" height="25" rx="6" fill="currentColor"/><path d="M22 28v-7c0-7 4-12 10-12s10 5 10 12v7" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="40" r="3" fill="#fff"/></svg>`;
}

function personIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="22" r="12" fill="currentColor"/><path d="M10 55c1-13 10-20 22-20s21 7 22 20" fill="currentColor"/></svg>`;
}

function oneMinuteIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="5"/><text x="32" y="40" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="25" font-weight="900" fill="currentColor">1</text></svg>`;
}

function heartIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 55S8 41 8 23c0-8 6-14 14-14 5 0 9 3 10 7 2-4 6-7 11-7 8 0 13 6 13 14 0 18-24 32-24 32Z" fill="currentColor"/></svg>`;
}

function caltexBrandLockup(): string {
    return `<div class="caltex-lockup" aria-label="Caltex — Enjoy the Journey">
      <svg class="caltex-logo" viewBox="0 0 270 82" role="img" aria-label="Caltex">
        <circle cx="41" cy="41" r="39" fill="#d71920"/>
        <circle cx="41" cy="41" r="31" fill="#ffffff"/>
        <polygon points="41,13 48,32 69,32 52,44 59,65 41,52 23,65 30,44 13,32 34,32" fill="#003a70"/>
        <polygon points="41,30 55,41 41,47 27,41" fill="#d71920"/>
        <text x="88" y="51" font-family="Arial,Helvetica,sans-serif" font-size="39" font-weight="900" letter-spacing="1" fill="#003a70">CALTEX</text>
      </svg>
      <span class="brand-divider"></span>
      <span class="brand-slogan">ENJOY THE JOURNEY</span>
    </div>`;
}

function visibleThaiLength(value: string): number {
    return Array.from(value.trim()).filter((character) => !/[\u0E31-\u0E3A\u0E47-\u0E4E]/.test(character)).length;
}

/**
 * A4 landscape customer-feedback sign based on the approved yellow/navy mockup.
 * Everything that varies by QR remains live HTML/SVG: name, station, QR, fallback code and URL.
 */
export function buildCustomerFeedbackA4PosterHtml(input: CustomerFeedbackA4PosterInput): string {
    const qrSvg = generateQRCodeSVG(input.qrUrl, 920);
    const targetLabel = escapeHtml(input.targetLabel);
    const subtitle = input.subtitle ? escapeHtml(input.subtitle) : "";
    const positionLabel = input.positionLabel ? escapeHtml(input.positionLabel) : "";
    const stationLabel = input.stationLabel ? escapeHtml(input.stationLabel) : "";
    const manualEntryUrl = escapeHtml(input.manualEntryUrl);
    const manualCode = escapeHtml(input.manualCode);
    const version = input.version ? `QR version ${input.version}` : "";
    const isEmployee = input.targetType === "EMPLOYEE";
    const invitation = isEmployee ? "ช่วยประเมินการบริการของฉัน" : "ช่วยประเมินการบริการของเรา";
    const question = isEmployee ? "วันนี้ฉันบริการคุณเป็นอย่างไรบ้าง?" : "วันนี้การบริการของเราเป็นอย่างไรบ้าง?";
    const resolvedStation = stationLabel || (isEmployee ? subtitle.split(" · ").slice(-1)[0] : targetLabel);
    const resolvedPosition = positionLabel || (isEmployee ? subtitle.split(" · ")[0] : "");
    const employeeNameLength = visibleThaiLength(input.targetLabel);
    const employeeNameClass = employeeNameLength <= 6 ? "name-xl" : employeeNameLength <= 10 ? "name-lg" : "name-md";
    const targetClass = isEmployee ? `target employee-name ${employeeNameClass}` : "target station-name";

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
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    position: relative;
    width: 297mm;
    height: 210mm;
    overflow: hidden;
    background: #ffffff;
  }
  .voice-banner {
    position: absolute;
    z-index: 5;
    left: 0;
    top: 0;
    width: 156mm;
    height: 23mm;
    display: flex;
    align-items: center;
    gap: 4mm;
    padding-left: 15mm;
    color: #07366c;
    background: linear-gradient(100deg, #ffc20e 0%, #ffd45c 70%, #ffc20e 100%);
    border-bottom-right-radius: 11mm;
    box-shadow: 0 1.3mm 0 #e7aa00, 0 3mm 7mm rgba(15,23,42,.10);
  }
  .voice-icon {
    width: 13mm;
    height: 13mm;
    display: grid;
    place-items: center;
    border: 1.3mm solid #ffffff;
    border-radius: 50%;
    color: #ffffff;
  }
  .voice-icon svg { width: 8.5mm; height: 8.5mm; }
  .voice-title {
    font-size: 10.2mm;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -.35mm;
  }
  .main {
    position: absolute;
    left: 0;
    right: 0;
    top: 23mm;
    bottom: 22mm;
    display: grid;
    grid-template-columns: 53.5% 46.5%;
  }
  .left {
    position: relative;
    padding: 8mm 9mm 5mm 14mm;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .invitation {
    margin: 0;
    font-size: 8.4mm;
    line-height: 1.1;
    font-weight: 950;
    letter-spacing: -.2mm;
    color: #082f57;
  }
  .target {
    margin-top: 1mm;
    max-width: 145mm;
    color: #082f57;
    font-weight: 950;
    letter-spacing: -1mm;
    text-shadow: 0 1.4mm 0 rgba(2,47,87,.08);
    overflow-wrap: anywhere;
  }
  .employee-name { line-height: .92; }
  .employee-name.name-xl { font-size: 31mm; }
  .employee-name.name-lg { font-size: 25mm; }
  .employee-name.name-md { font-size: 20mm; line-height: 1; }
  .station-name { margin-top: 6mm; font-size: 15mm; line-height: 1.04; letter-spacing: -.45mm; }
  .question {
    margin-top: 2mm;
    font-size: 6.3mm;
    line-height: 1.15;
    font-weight: 800;
    font-style: italic;
    color: #0e477e;
  }
  .meta-pill {
    align-self: flex-start;
    max-width: 144mm;
    margin-top: 4.5mm;
    padding: 2.5mm 4.5mm 2.3mm;
    border-radius: 3.2mm;
    background: #0a376e;
    color: #ffffff;
    font-size: 4.55mm;
    line-height: 1.2;
    font-weight: 850;
  }
  .quick-facts {
    display: flex;
    align-items: center;
    gap: 6mm;
    margin-top: 4mm;
  }
  .fact {
    display: flex;
    align-items: center;
    gap: 1.6mm;
    color: #111827;
    font-size: 4.2mm;
    font-weight: 800;
    white-space: nowrap;
  }
  .fact-icon {
    width: 6mm;
    height: 6mm;
    color: #f4b400;
    flex: 0 0 auto;
  }
  .fact-icon svg { width: 100%; height: 100%; display: block; }
  .benefit-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3mm;
    margin-top: 5mm;
    max-width: 144mm;
  }
  .benefit {
    min-height: 20mm;
    display: grid;
    grid-template-columns: 12mm 1fr;
    align-items: center;
    gap: 2.4mm;
    padding: 3mm 3mm;
    border: .55mm solid #efb514;
    border-radius: 4mm;
    background: #fffefa;
    color: #111827;
    font-size: 3.8mm;
    line-height: 1.25;
    font-weight: 850;
  }
  .benefit-icon {
    width: 10mm;
    height: 10mm;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #f4b400;
    color: #ffffff;
  }
  .benefit-icon svg { width: 6.5mm; height: 6.5mm; }
  .improve-row {
    display: flex;
    align-items: center;
    gap: 2.5mm;
    margin-top: 4.5mm;
    max-width: 144mm;
    color: #2b3440;
    font-size: 3.7mm;
    line-height: 1.3;
    font-weight: 750;
  }
  .heart {
    width: 7mm;
    height: 7mm;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #ffc20e;
    color: #ffffff;
    flex: 0 0 auto;
  }
  .heart svg { width: 4.3mm; height: 4.3mm; }
  .right {
    position: relative;
    padding: 5mm 13mm 5mm 6mm;
  }
  .qr-card {
    width: 100%;
    height: 155mm;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4.5mm 7mm 4mm;
    border: .65mm solid #efb514;
    border-radius: 7mm;
    background: #ffffff;
    box-shadow: 0 2mm 5mm rgba(15,23,42,.08);
  }
  .scan-pill {
    width: 83mm;
    min-height: 13mm;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #0a376e;
    color: #ffffff;
    font-size: 6.3mm;
    line-height: 1;
    font-weight: 950;
    margin-bottom: 3mm;
  }
  .qr-wrap {
    width: 85mm;
    height: 85mm;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    background: #ffffff;
  }
  .qr-wrap svg { display: block; width: 100%; height: 100%; }
  .or-row {
    width: 96%;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 3mm;
    margin-top: 2.3mm;
    color: #667085;
    font-size: 3.4mm;
    font-weight: 850;
  }
  .or-line { height: .35mm; background: #9aa8b7; }
  .manual-help {
    margin-top: 2mm;
    max-width: 105mm;
    text-align: center;
    color: #223047;
    font-size: 3.35mm;
    line-height: 1.35;
    font-weight: 800;
  }
  .manual-code {
    width: 99%;
    margin-top: 3mm;
    padding: 2.5mm 2mm 2.2mm;
    border: .55mm solid #efb514;
    border-radius: 4mm;
    background: linear-gradient(180deg, #fffdf3 0%, #fff8d9 100%);
    color: #082f57;
    text-align: center;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 10.5mm;
    line-height: 1;
    font-weight: 950;
    letter-spacing: 1.1mm;
  }
  .manual-url {
    margin-top: 2mm;
    max-width: 108mm;
    color: #25334a;
    text-align: center;
    font-size: 2.95mm;
    line-height: 1.25;
    font-weight: 750;
    word-break: break-all;
  }
  .version {
    margin-top: auto;
    color: #a0a8b2;
    font-size: 2.25mm;
  }
  .footer-wave {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 297mm;
    height: 28mm;
    pointer-events: none;
  }
  .footer-content {
    position: absolute;
    z-index: 3;
    left: 14mm;
    right: 13mm;
    bottom: 4.2mm;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8mm;
  }
  .caltex-lockup { display: flex; align-items: center; min-width: 0; }
  .caltex-logo { width: 51mm; height: 15.5mm; display: block; flex: 0 0 auto; }
  .brand-divider { width: .35mm; height: 7mm; margin: 0 3.5mm; background: rgba(8,47,87,.45); }
  .brand-slogan {
    color: #d71920;
    font-family: Arial,Helvetica,sans-serif;
    font-size: 3.6mm;
    font-weight: 900;
    letter-spacing: .18mm;
    white-space: nowrap;
  }
  .station-signature { text-align: right; color: #082f57; }
  .station-signature .station { font-size: 5.6mm; line-height: 1.05; font-weight: 950; }
  .station-signature .tagline { margin-top: .8mm; color: #d71920; font-family: Arial,Helvetica,sans-serif; font-size: 2.8mm; font-weight: 900; letter-spacing: .15mm; }
  .test-ribbon {
    position: absolute;
    z-index: 20;
    top: 10mm;
    right: -27mm;
    width: 100mm;
    transform: rotate(39deg);
    background: #d71920;
    color: #ffffff;
    text-align: center;
    padding: 2.2mm 0;
    font-size: 4.8mm;
    font-weight: 950;
    box-shadow: 0 .8mm 2mm rgba(0,0,0,.18);
  }
  @media screen {
    body { background: #d9dde3; padding: 8px; }
    .sheet { margin: 0 auto; box-shadow: 0 8px 28px rgba(0,0,0,.16); }
  }
  @media print {
    body { background: #ffffff; padding: 0; }
    .sheet { box-shadow: none; }
  }
</style>
</head>
<body>
  <section class="sheet ${isEmployee ? "employee-poster" : "station-poster"}">
    ${input.isTest ? '<div class="test-ribbon">ตัวอย่าง / แบบทดสอบ</div>' : ""}

    <div class="voice-banner">
      <span class="voice-icon">${speechIcon()}</span>
      <span class="voice-title">เสียงลูกค้า</span>
    </div>

    <div class="main">
      <div class="left">
        <h1 class="invitation">${invitation}</h1>
        <div class="${targetClass}">${targetLabel}</div>
        <div class="question">${question}</div>

        <div class="meta-pill">
          ${isEmployee
            ? `ตำแหน่ง: ${resolvedPosition || "พนักงานบริการ"} · สถานี: ${resolvedStation || "-"}`
            : `${resolvedStation}${subtitle ? ` · ${subtitle}` : ""}`}
        </div>

        <div class="quick-facts">
          <div class="fact"><span class="fact-icon">${clockIcon()}</span><span>ใช้เวลาประมาณ 1 นาที</span></div>
          <div class="fact"><span class="fact-icon">${checkIcon()}</span><span>ไม่ต้องระบุชื่อ</span></div>
        </div>

        <div class="benefit-cards">
          <div class="benefit"><span class="benefit-icon">${lockIcon()}</span><span>ไม่ต้อง<br>ล็อกอิน</span></div>
          <div class="benefit"><span class="benefit-icon">${personIcon()}</span><span>ไม่ต้อง<br>ระบุชื่อ</span></div>
          <div class="benefit"><span class="benefit-icon">${oneMinuteIcon()}</span><span>ใช้เวลา<br>ประมาณ 1 นาที</span></div>
        </div>

        <div class="improve-row">
          <span class="heart">${heartIcon()}</span>
          <span>ความคิดเห็นของคุณช่วยให้เราปรับปรุงบริการได้ดียิ่งขึ้น</span>
        </div>
      </div>

      <div class="right">
        <div class="qr-card">
          <div class="scan-pill">สแกนเพื่อประเมิน</div>
          <div class="qr-wrap">${qrSvg}</div>
          <div class="or-row"><span class="or-line"></span><span>หรือ</span><span class="or-line"></span></div>
          <div class="manual-help">สแกนไม่ได้? เข้า ${manualEntryUrl}<br>แล้วกรอกรหัสนี้เพื่อประเมิน</div>
          <div class="manual-code">${manualCode}</div>
          <div class="manual-url">${manualEntryUrl}</div>
          <div class="version">${escapeHtml(version)}</div>
        </div>
      </div>
    </div>

    <svg class="footer-wave" viewBox="0 0 1200 180" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 66 C145 25 270 44 380 77 C505 113 612 110 736 73 C865 35 1012 30 1200 61 L1200 180 L0 180 Z" fill="#ffc20e"/>
      <path d="M0 58 C145 17 270 36 380 69 C505 105 612 102 736 65 C865 27 1012 22 1200 53" fill="none" stroke="#f2a900" stroke-width="4"/>
    </svg>
    <div class="footer-content">
      ${caltexBrandLockup()}
      <div class="station-signature">
        <div class="station">${resolvedStation || targetLabel}</div>
        <div class="tagline">ENJOY THE JOURNEY</div>
      </div>
    </div>
  </section>
</body>
</html>`;
}
