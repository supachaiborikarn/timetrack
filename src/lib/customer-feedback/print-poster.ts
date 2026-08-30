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
    /** Origin of the running app, e.g. https://timetrack-lake.vercel.app. */
    assetBaseUrl?: string;
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

function visibleThaiLength(value: string): number {
    return Array.from(value.trim()).filter((character) => !/[\u0E31-\u0E3A\u0E47-\u0E4E]/.test(character)).length;
}

function personIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="19" r="11" fill="currentColor"/><path d="M11 55c2-14 10-21 21-21s20 7 21 21" fill="currentColor"/></svg>`;
}

function pinIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 59S12 39 12 24C12 12 21 5 32 5s20 7 20 19c0 15-20 35-20 35Z" fill="currentColor"/><circle cx="32" cy="24" r="8" fill="#fff"/></svg>`;
}

function clockIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="5"/><path d="M32 18v15l10 6" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function anonymousIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 25c4-9 11-14 20-14s16 5 20 14c-5 4-12 7-20 7s-15-3-20-7Z" fill="currentColor"/><path d="M15 29c1 16 7 24 17 24s16-8 17-24c-5 4-10 6-17 6s-12-2-17-6Z" fill="currentColor" opacity=".18"/><path d="M17 41c4-2 8-3 15-3s11 1 15 3" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
}

function shieldIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 52 14v16c0 13-8 23-20 29C20 53 12 43 12 30V14L32 6Z" fill="currentColor"/><path d="m23 31 6 6 13-15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function heartOutlineIcon(): string {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 55S8 41 8 23c0-8 6-14 14-14 5 0 9 3 10 7 2-4 6-7 11-7 8 0 13 6 13 14 0 18-24 32-24 32Z" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function makeCodeCells(code: string): string {
    return Array.from(code.trim().slice(0, 8).padEnd(8, " "))
        .map((character) => `<span class="code-cell">${character === " " ? "&nbsp;" : escapeHtml(character)}</span>`)
        .join("");
}

function absoluteAssetUrl(baseUrl: string | undefined, path: string): string {
    const normalizedBase = baseUrl?.replace(/\/$/, "") ?? "";
    return `${normalizedBase}${path}`;
}

/**
 * Shared assets/styles for the exact-size 54 x 88 mm compact customer-feedback label.
 * The compact QR stays unobstructed on white for reliable close-up scanning.
 */
function smallLabelFontFaces(assetBaseUrl?: string): string {
    return `
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(assetBaseUrl, "/fonts/Kanit-Regular.ttf")}") format("truetype"); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(assetBaseUrl, "/fonts/Kanit-SemiBold.ttf")}") format("truetype"); font-weight: 600; font-style: normal; font-display: swap; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(assetBaseUrl, "/fonts/Kanit-Bold.ttf")}") format("truetype"); font-weight: 700; font-style: normal; font-display: swap; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(assetBaseUrl, "/fonts/Kanit-ExtraBold.ttf")}") format("truetype"); font-weight: 800; font-style: normal; font-display: swap; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(assetBaseUrl, "/fonts/Kanit-Black.ttf")}") format("truetype"); font-weight: 900; font-style: normal; font-display: swap; }
  @font-face { font-family: "SrirachaPoster"; src: url("${absoluteAssetUrl(assetBaseUrl, "/fonts/Sriracha-Regular.ttf")}") format("truetype"); font-weight: 400; font-style: normal; font-display: swap; }`;
}

function smallLabelCardCss(): string {
    return `
  :root {
    --brand-teal: #003f4c;
    --brand-deep: #003845;
    --brand-red: #ed0015;
    --muted: #64757b;
  }
  * { box-sizing: border-box; }
  .small-label-card {
    position: relative;
    width: 54mm;
    height: 88mm;
    overflow: hidden;
    background:
      radial-gradient(circle at 18% 10%, rgba(0,63,76,.045), transparent 24%),
      linear-gradient(180deg, #fff 0%, #fff 91%, #fafafa 100%);
    color: var(--brand-deep);
    font-family: "KanitPoster", "Noto Sans Thai", Tahoma, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .small-brand {
    position: absolute;
    left: 3.2mm;
    top: 2.2mm;
    width: 25mm;
    z-index: 5;
  }
  .small-brand img { width: 23mm; height: auto; display: block; }
  .small-slogan {
    margin-left: 8.8mm;
    margin-top: .25mm;
    position: relative;
    display: inline-block;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 1.38mm;
    line-height: 1;
    font-weight: 900;
    font-style: italic;
    letter-spacing: .025mm;
    color: var(--brand-deep);
  }
  .small-slogan::after {
    content: "";
    position: absolute;
    left: 51%;
    right: 0;
    bottom: -.55mm;
    height: .18mm;
    border-radius: 999px;
    background: var(--brand-red);
    transform: rotate(-2deg);
  }
  .small-copy {
    position: absolute;
    left: 3mm;
    right: 3mm;
    top: 10.7mm;
    z-index: 4;
    text-align: center;
  }
  .small-prompt {
    color: var(--brand-deep);
    font-size: 2.35mm;
    line-height: 1.05;
    font-weight: 800;
    white-space: nowrap;
  }
  .small-target-wrap {
    position: relative;
    min-height: 9.4mm;
    margin-top: .25mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .small-target {
    max-width: 47mm;
    overflow: hidden;
    color: var(--brand-red);
    font-weight: 900;
    line-height: .92;
    letter-spacing: -.18mm;
    text-align: center;
  }
  .small-target-xl { font-size: 9.6mm; }
  .small-target-lg { font-size: 8.2mm; }
  .small-target-md { font-size: 6.9mm; }
  .small-target-sm { font-size: 5.4mm; line-height: 1; }
  .small-question {
    margin-top: .15mm;
    color: #00445a;
    font-family: "SrirachaPoster", "KanitPoster", sans-serif;
    font-size: 2.15mm;
    line-height: 1;
    white-space: nowrap;
  }
  .small-identity {
    margin-top: .85mm;
    padding: 0 1mm;
    overflow: hidden;
    color: #253d44;
    font-size: 1.55mm;
    line-height: 1.15;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .small-scan-pill {
    position: absolute;
    left: 13mm;
    top: 28.7mm;
    width: 28mm;
    height: 4.9mm;
    z-index: 12;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2.45mm;
    background: linear-gradient(100deg, #005060 0%, #003b4c 100%);
    box-shadow: 0 .55mm 1.4mm rgba(0,56,69,.18);
    color: #fff;
    font-size: 2.25mm;
    line-height: 1;
    font-weight: 800;
  }
  .small-qr-shell {
    position: absolute;
    left: 9.5mm;
    top: 31.6mm;
    width: 35mm;
    height: 35mm;
    z-index: 9;
    background: #fff;
  }
  .small-qr-shell svg { width: 100%; height: 100%; display: block; }
  .small-manual-kicker {
    position: absolute;
    left: 3mm;
    right: 3mm;
    top: 67.2mm;
    color: var(--muted);
    font-size: 1.55mm;
    line-height: 1;
    font-weight: 600;
    text-align: center;
  }
  .small-code-cells {
    position: absolute;
    left: 3.1mm;
    right: 3.1mm;
    top: 70.1mm;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: .45mm;
    z-index: 10;
  }
  .small-code-cell {
    height: 5.1mm;
    display: flex;
    align-items: center;
    justify-content: center;
    border: .25mm solid var(--brand-red);
    border-radius: .8mm;
    background: #fff;
    color: #090909;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 2.65mm;
    line-height: 1;
    font-weight: 900;
  }
  .small-manual-url {
    position: absolute;
    left: 3mm;
    right: 3mm;
    top: 76.15mm;
    z-index: 10;
    overflow: hidden;
    color: #253d44;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 1.25mm;
    line-height: 1.1;
    font-weight: 600;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .small-version {
    position: absolute;
    z-index: 14;
    right: 2.2mm;
    top: 78.2mm;
    color: #a7afb2;
    font-size: 1.05mm;
  }
  .small-bottom-sweep {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 54mm;
    height: 8.2mm;
    z-index: 3;
    pointer-events: none;
  }
  .small-thanks {
    position: absolute;
    z-index: 8;
    left: 3mm;
    bottom: 1.2mm;
    display: flex;
    align-items: center;
    gap: .55mm;
    color: #fff;
    font-family: "SrirachaPoster", "KanitPoster", sans-serif;
    font-size: 1.35mm;
    line-height: 1;
    white-space: nowrap;
  }
  .small-thanks svg { width: 2.15mm; height: 2.15mm; flex: 0 0 auto; }
  .small-techron {
    position: absolute;
    z-index: 13;
    right: 2.6mm;
    bottom: 1.25mm;
    width: 12mm;
    height: 4.6mm;
    transform: rotate(-2deg) skewX(-5deg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: .55mm .8mm;
    background: linear-gradient(105deg, #e80016 0%, #f51b27 70%, #c70012 100%);
  }
  .small-techron img { width: 10.3mm; height: auto; display: block; filter: brightness(0) invert(1); }
  .small-test-ribbon {
    position: absolute;
    z-index: 30;
    top: 5.5mm;
    right: -15mm;
    width: 48mm;
    transform: rotate(40deg);
    padding: .85mm 0;
    background: var(--brand-red);
    color: #fff;
    text-align: center;
    font-size: 1.65mm;
    line-height: 1;
    font-weight: 800;
    box-shadow: 0 .35mm .9mm rgba(0,0,0,.18);
  }`;
}

function smallLabelCodeCells(code: string): string {
    return Array.from(code.trim().slice(0, 8).padEnd(8, " "))
        .map((character) => `<span class="small-code-cell">${character === " " ? "&nbsp;" : escapeHtml(character)}</span>`)
        .join("");
}

function buildSmallLabelCardMarkup(input: CustomerFeedbackA4PosterInput): string {
    const qrSvg = generateQRCodeSVG(input.qrUrl, 640);
    const targetLabel = escapeHtml(input.targetLabel);
    const subtitle = input.subtitle ? escapeHtml(input.subtitle) : "";
    const positionLabel = input.positionLabel ? escapeHtml(input.positionLabel) : "";
    const stationLabel = input.stationLabel ? escapeHtml(input.stationLabel) : "";
    const manualEntryDisplay = escapeHtml(input.manualEntryUrl.replace(/^https?:\/\//, ""));
    const version = input.version ? `v${input.version}` : "";
    const isEmployee = input.targetType === "EMPLOYEE";
    const resolvedStation = stationLabel || (isEmployee ? subtitle.split(" · ").slice(-1)[0] : targetLabel);
    const resolvedPosition = positionLabel || (isEmployee ? subtitle.split(" · ")[0] : "");
    const identity = isEmployee
        ? [resolvedPosition || "พนักงานบริการ", resolvedStation || "-"].filter(Boolean).join(" · ")
        : `QR ประเมินสถานี · ${resolvedStation || targetLabel}`;
    const targetLength = visibleThaiLength(input.targetLabel);
    const targetSizeClass = targetLength <= 5
        ? "small-target-xl"
        : targetLength <= 8
            ? "small-target-lg"
            : targetLength <= 12
                ? "small-target-md"
                : "small-target-sm";
    const caltexLogo = absoluteAssetUrl(input.assetBaseUrl, "/customer-feedback/caltex-logo.png");
    const techronLogo = absoluteAssetUrl(input.assetBaseUrl, "/customer-feedback/techron-logo.png");
    const codeCells = smallLabelCodeCells(input.manualCode);
    const mainPrompt = isEmployee ? "ช่วยประเมินการบริการของ" : "ช่วยประเมินการบริการของเรา";
    const question = isEmployee ? "วันนี้ผมบริการคุณเป็นอย่างไรบ้าง?" : "วันนี้การบริการของเราเป็นอย่างไรบ้าง?";

    return `<section class="small-label-card ${isEmployee ? "employee-label" : "station-label"}">
  ${input.isTest ? '<div class="small-test-ribbon">ตัวอย่าง / แบบทดสอบ</div>' : ""}
  <div class="small-brand">
    <img src="${caltexLogo}" alt="Caltex" />
    <div class="small-slogan">ENJOY THE JOURNEY</div>
  </div>
  <div class="small-copy">
    <div class="small-prompt">${mainPrompt}</div>
    <div class="small-target-wrap"><div class="small-target ${targetSizeClass}">${targetLabel}</div></div>
    <div class="small-question">${question}</div>
    <div class="small-identity">${identity}</div>
  </div>
  <div class="small-scan-pill">สแกนเพื่อประเมิน</div>
  <div class="small-qr-shell">${qrSvg}</div>
  <div class="small-manual-kicker">สแกนไม่ได้? กรอกรหัสนี้แทน</div>
  <div class="small-code-cells">${codeCells}</div>
  <div class="small-manual-url">${manualEntryDisplay}</div>
  <div class="small-version">${escapeHtml(version)}</div>
  <svg class="small-bottom-sweep" viewBox="0 0 540 82" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 34 C95 50 180 53 264 50 C367 46 455 31 540 17 L540 82 L0 82 Z" fill="#003f4c"/>
    <path d="M0 22 C95 37 180 40 266 37 C370 33 458 20 540 7 L540 18 C457 32 369 47 264 51 C179 54 94 50 0 35 Z" fill="#ed0015"/>
    <path d="M0 19 C96 33 179 36 264 33 C367 30 455 17 540 4" fill="none" stroke="#ffffff" stroke-width="2" opacity=".95"/>
  </svg>
  <div class="small-thanks">${heartOutlineIcon()}<span>ขอบคุณทุกความคิดเห็น</span></div>
  <div class="small-techron"><img src="${techronLogo}" alt="Techron" /></div>
</section>`;
}

/**
 * Exact-size 54 x 88 mm customer-feedback label.
 * The QR remains unobstructed and the physical dimensions are fixed in millimetres.
 */
export function buildCustomerFeedbackSmallLabelHtml(input: CustomerFeedbackA4PosterInput): string {
    return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ป้ายเสียงลูกค้า 54x88 - ${escapeHtml(input.targetLabel)}</title>
<style>
  @page { size: 54mm 88mm; margin: 0; }
  ${smallLabelFontFaces(input.assetBaseUrl)}
  ${smallLabelCardCss()}
  html, body { width: 54mm; height: 88mm; margin: 0; padding: 0; }
  body { background: #fff; }
  @media screen {
    body { background: #d8dde0; padding: 8px; width: auto; height: auto; min-height: 100vh; }
    .small-label-card { margin: 0 auto; box-shadow: 0 2mm 8mm rgba(0,0,0,.2); }
  }
  @media print {
    body { padding: 0; background: #fff; }
    .small-label-card { box-shadow: none; }
  }
</style>
</head>
<body>
${buildSmallLabelCardMarkup(input)}
</body>
</html>`;
}

/**
 * A4 portrait sheet for batch-printing exact-size 54 x 88 mm labels.
 * Nine labels fit per page in a 3 x 3 grid with 4 mm cut spacing.
 */
export function buildCustomerFeedbackSmallLabelA4SheetHtml(inputs: CustomerFeedbackA4PosterInput[]): string {
    const pageSize = 9;
    const pages: string[] = [];
    for (let index = 0; index < inputs.length; index += pageSize) {
        const pageInputs = inputs.slice(index, index + pageSize);
        const slots = pageInputs
            .map((input) => `<div class="small-label-slot">${buildSmallLabelCardMarkup(input)}</div>`)
            .join("");
        pages.push(`<section class="small-label-a4-page">${slots}</section>`);
    }
    if (pages.length === 0) {
        pages.push('<section class="small-label-a4-page"><div class="small-label-empty">ไม่มีป้ายที่เลือก</div></section>');
    }
    const assetBaseUrl = inputs[0]?.assetBaseUrl;

    return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ป้ายเสียงลูกค้า 54x88 - A4 รวม</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  ${smallLabelFontFaces(assetBaseUrl)}
  ${smallLabelCardCss()}
  html, body { margin: 0; padding: 0; }
  body {
    background: #fff;
    font-family: "KanitPoster", "Noto Sans Thai", Tahoma, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .small-label-a4-page {
    width: 210mm;
    height: 297mm;
    display: grid;
    grid-template-columns: repeat(3, 54mm);
    grid-template-rows: repeat(3, 88mm);
    column-gap: 4mm;
    row-gap: 4mm;
    justify-content: center;
    align-content: center;
    break-after: page;
    page-break-after: always;
    overflow: hidden;
    background: #fff;
  }
  .small-label-a4-page:last-child { break-after: auto; page-break-after: auto; }
  .small-label-slot {
    position: relative;
    width: 54mm;
    height: 88mm;
    outline: .15mm dashed #aeb6b9;
    outline-offset: .65mm;
  }
  .small-label-empty {
    grid-column: 1 / -1;
    align-self: center;
    justify-self: center;
    color: #64757b;
    font-size: 5mm;
  }
  @media screen {
    body { background: #d8dde0; padding: 8px; }
    .small-label-a4-page { margin: 0 auto 8px; box-shadow: 0 2mm 9mm rgba(0,0,0,.18); }
  }
  @media print {
    body { background: #fff; padding: 0; }
    .small-label-a4-page { margin: 0; box-shadow: none; }
  }
</style>
</head>
<body>
${pages.join("\n")}
</body>
</html>`;
}

/**
 * A4-landscape customer-feedback poster.
 *
 * Employee posters deliberately mirror the approved Caltex reference artwork:
 * white field, real Caltex lock-up, oversized red employee name, teal information band,
 * elevated QR card, red/teal brand sweep and Techron badge.
 * All person/QR values stay live HTML/SVG so every printed poster is unique and scannable.
 */
export function buildCustomerFeedbackA4PosterHtml(input: CustomerFeedbackA4PosterInput): string {
    const qrSvg = generateQRCodeSVG(input.qrUrl, 960);
    const targetLabel = escapeHtml(input.targetLabel);
    const subtitle = input.subtitle ? escapeHtml(input.subtitle) : "";
    const positionLabel = input.positionLabel ? escapeHtml(input.positionLabel) : "";
    const stationLabel = input.stationLabel ? escapeHtml(input.stationLabel) : "";
    const manualEntryUrl = escapeHtml(input.manualEntryUrl);
    const version = input.version ? `QR version ${input.version}` : "";
    const isEmployee = input.targetType === "EMPLOYEE";
    const resolvedStation = stationLabel || (isEmployee ? subtitle.split(" · ").slice(-1)[0] : targetLabel);
    const resolvedPosition = positionLabel || (isEmployee ? subtitle.split(" · ")[0] : "");
    const targetLength = visibleThaiLength(input.targetLabel);
    const targetSizeClass = targetLength <= 6 ? "target-xl" : targetLength <= 10 ? "target-lg" : targetLength <= 15 ? "target-md" : "target-sm";
    const caltexLogo = absoluteAssetUrl(input.assetBaseUrl, "/customer-feedback/caltex-logo.png");
    const techronLogo = absoluteAssetUrl(input.assetBaseUrl, "/customer-feedback/techron-logo.png");
    const codeCells = makeCodeCells(input.manualCode);
    const mainPrompt = isEmployee ? "ช่วยประเมินการบริการของ" : "ช่วยประเมินการบริการของเรา";
    const question = isEmployee ? "วันนี้ผมบริการคุณเป็นอย่างไรบ้าง?" : "วันนี้การบริการของเราเป็นอย่างไรบ้าง?";

    return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ป้ายเสียงลูกค้า A4 - ${targetLabel}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(input.assetBaseUrl, "/fonts/Kanit-Regular.ttf")}") format("truetype"); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(input.assetBaseUrl, "/fonts/Kanit-SemiBold.ttf")}") format("truetype"); font-weight: 600; font-style: normal; font-display: swap; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(input.assetBaseUrl, "/fonts/Kanit-Bold.ttf")}") format("truetype"); font-weight: 700; font-style: normal; font-display: swap; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(input.assetBaseUrl, "/fonts/Kanit-ExtraBold.ttf")}") format("truetype"); font-weight: 800; font-style: normal; font-display: swap; }
  @font-face { font-family: "KanitPoster"; src: url("${absoluteAssetUrl(input.assetBaseUrl, "/fonts/Kanit-Black.ttf")}") format("truetype"); font-weight: 900; font-style: normal; font-display: swap; }
  @font-face { font-family: "SrirachaPoster"; src: url("${absoluteAssetUrl(input.assetBaseUrl, "/fonts/Sriracha-Regular.ttf")}") format("truetype"); font-weight: 400; font-style: normal; font-display: swap; }

  :root {
    --brand-teal: #003f4c;
    --brand-deep: #003845;
    --brand-red: #ed0015;
    --brand-blue: #003b63;
    --muted-line: #7f8c91;
  }
  * { box-sizing: border-box; }
  html, body { width: 297mm; height: 210mm; margin: 0; padding: 0; }
  body {
    background: #fff;
    color: var(--brand-deep);
    font-family: "KanitPoster", "Noto Sans Thai", Tahoma, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    position: relative;
    width: 297mm;
    height: 210mm;
    overflow: hidden;
    background:
      radial-gradient(circle at 17% 21%, rgba(0,63,76,.035), transparent 27%),
      linear-gradient(180deg, #fff 0%, #fff 79%, #fbfbfb 100%);
  }

  /* --- Caltex lock-up, top left --- */
  .brand-lockup {
    position: absolute;
    left: 12mm;
    top: 5.3mm;
    width: 68mm;
    z-index: 5;
  }
  .brand-lockup img {
    width: 64mm;
    height: auto;
    display: block;
  }
  .brand-slogan {
    margin-left: 24.5mm;
    margin-top: .7mm;
    display: inline-block;
    position: relative;
    color: #003845;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 4.2mm;
    line-height: 1;
    font-weight: 900;
    font-style: italic;
    letter-spacing: .12mm;
  }
  .brand-slogan::after {
    content: "";
    position: absolute;
    left: 51%;
    right: 0;
    bottom: -1.6mm;
    height: .55mm;
    border-radius: 999px;
    background: var(--brand-red);
    transform: rotate(-2deg);
  }

  /* --- Main copy --- */
  .copy {
    position: absolute;
    left: 17.5mm;
    top: 38.5mm;
    width: 137mm;
    z-index: 4;
  }
  .prompt {
    color: var(--brand-deep);
    font-size: 9.1mm;
    line-height: 1.08;
    font-weight: 800;
    letter-spacing: -.2mm;
    white-space: nowrap;
  }
  .target-wrap {
    position: relative;
    width: 137mm;
    height: 55mm;
    margin-top: 2.2mm;
    display: flex;
    align-items: center;
  }
  .target {
    position: relative;
    z-index: 2;
    color: var(--brand-red);
    font-weight: 900;
    line-height: .88;
    letter-spacing: -1.25mm;
    white-space: nowrap;
    text-shadow: 0 .55mm 0 rgba(237,0,21,.05);
  }
  .target-xl { font-size: 45mm; }
  .target-lg { font-size: 35mm; letter-spacing: -.85mm; }
  .target-md { font-size: 28mm; letter-spacing: -.55mm; }
  .target-sm { font-size: 22mm; letter-spacing: -.35mm; white-space: normal; line-height: .95; }
  .heart-doodle {
    position: absolute;
    right: -1mm;
    top: 9mm;
    width: 15mm;
    height: 15mm;
    color: var(--brand-red);
    transform: rotate(-8deg);
  }
  .heart-doodle svg { width: 100%; height: 100%; display: block; }
  .question {
    margin-top: -1.5mm;
    color: #00445a;
    font-family: "SrirachaPoster", "KanitPoster", sans-serif;
    font-size: 7.8mm;
    line-height: 1;
    white-space: nowrap;
  }
  .divider {
    width: 127mm;
    height: .25mm;
    margin-top: 7mm;
    background: #818b8d;
  }
  .identity {
    display: grid;
    gap: 3.2mm;
    margin-top: 5.2mm;
  }
  .identity-row {
    display: flex;
    align-items: center;
    min-height: 9mm;
    color: #121212;
    font-size: 5.8mm;
    line-height: 1.15;
  }
  .identity-icon {
    width: 9mm;
    height: 9mm;
    margin-right: 3mm;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--brand-teal);
    color: #fff;
    flex: 0 0 auto;
  }
  .identity-icon svg { width: 5.3mm; height: 5.3mm; }
  .identity-label { color: var(--brand-deep); font-weight: 800; margin-right: 1.7mm; }
  .identity-value { color: #111; font-weight: 500; }

  /* --- Dark teal three-column fact band --- */
  .fact-band {
    position: absolute;
    left: 8mm;
    top: 153mm;
    width: 154mm;
    height: 27mm;
    z-index: 6;
    display: grid;
    grid-template-columns: 1fr 1fr 1.25fr;
    overflow: hidden;
    border-radius: 7.2mm;
    background: linear-gradient(100deg, #004d59 0%, #003842 100%);
    box-shadow: 0 1.7mm 4.5mm rgba(0,56,69,.15);
    color: #fff;
  }
  .fact-band-item {
    display: grid;
    grid-template-columns: 13mm 1fr;
    align-items: center;
    gap: 2.5mm;
    padding: 4mm 5mm;
    position: relative;
  }
  .fact-band-item:not(:last-child)::after {
    content: "";
    position: absolute;
    right: 0;
    top: 5mm;
    bottom: 5mm;
    width: .35mm;
    background: rgba(255,255,255,.75);
  }
  .fact-circle {
    width: 12mm;
    height: 12mm;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #fff;
    color: var(--brand-teal);
  }
  .fact-circle svg { width: 7.4mm; height: 7.4mm; }
  .fact-small { font-size: 3.8mm; line-height: 1.05; font-weight: 400; }
  .fact-big { margin-top: .7mm; font-size: 6.3mm; line-height: 1; font-weight: 700; }
  .fact-last { font-size: 4.2mm; line-height: 1.35; font-weight: 500; }
  .fact-last strong { font-weight: 800; }

  /* --- QR card, right --- */
  .qr-card {
    position: absolute;
    left: 171mm;
    top: 29.5mm;
    width: 106mm;
    height: 138mm;
    z-index: 8;
    border-radius: 12mm;
    background: #fff;
    box-shadow: 0 3mm 7mm rgba(16,35,38,.19);
  }
  .scan-pill {
    position: absolute;
    left: 14mm;
    top: -4.1mm;
    width: 78mm;
    height: 13.2mm;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4.8mm;
    background: linear-gradient(100deg, #005060 0%, #003b4c 100%);
    box-shadow: 0 1.2mm 2mm rgba(0,56,69,.15);
    color: #fff;
    font-size: 7.2mm;
    line-height: 1;
    font-weight: 800;
  }
  .scan-rays {
    position: absolute;
    right: 2mm;
    top: -10mm;
    width: 15mm;
    height: 15mm;
    color: var(--brand-red);
  }
  .qr-shell {
    position: absolute;
    left: 14mm;
    top: 12.3mm;
    width: 78mm;
    height: 78mm;
  }
  .qr-shell svg { width: 100%; height: 100%; display: block; }
  .qr-brand {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 16mm;
    height: 16mm;
    overflow: hidden;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 1.4mm #fff;
  }
  .qr-brand img {
    height: 16mm;
    width: auto;
    max-width: none;
    display: block;
  }
  .or-row {
    position: absolute;
    left: 6mm;
    right: 6mm;
    top: 96.5mm;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 2.4mm;
    color: #17333c;
    font-size: 4.9mm;
    line-height: 1;
  }
  .or-line { height: .35mm; background: #63787f; }
  .manual-label {
    position: absolute;
    left: 5mm;
    right: 5mm;
    top: 103.5mm;
    text-align: center;
    color: #111;
    font-size: 4.9mm;
    line-height: 1;
    font-weight: 500;
  }
  .code-cells {
    position: absolute;
    left: 6mm;
    right: 6mm;
    top: 109.2mm;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 1.2mm;
  }
  .code-cell {
    height: 13.5mm;
    display: flex;
    align-items: center;
    justify-content: center;
    border: .45mm solid var(--brand-red);
    border-radius: 2.2mm;
    background: #fff;
    color: #090909;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5mm;
    line-height: 1;
    font-weight: 900;
  }
  .manual-url {
    position: absolute;
    left: 4mm;
    right: 4mm;
    top: 129.5mm;
    text-align: center;
    color: #151515;
    font-size: 3.9mm;
    line-height: 1.15;
    font-weight: 600;
    white-space: nowrap;
  }
  .version {
    position: absolute;
    right: 5mm;
    bottom: 2.4mm;
    color: #b0b6b9;
    font-size: 1.9mm;
  }

  /* --- Bottom Caltex/Techron sweep from approved artwork --- */
  .bottom-sweep {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 297mm;
    height: 46mm;
    z-index: 2;
    pointer-events: none;
  }
  .thanks {
    position: absolute;
    z-index: 7;
    left: 12mm;
    bottom: 4.8mm;
    display: flex;
    align-items: center;
    gap: 2.5mm;
    color: #fff;
    font-family: "SrirachaPoster", "KanitPoster", sans-serif;
    font-size: 4.9mm;
    line-height: 1;
    white-space: nowrap;
  }
  .thanks svg { width: 7mm; height: 7mm; flex: 0 0 auto; }
  .techron-badge {
    position: absolute;
    z-index: 9;
    right: 14mm;
    bottom: 11mm;
    width: 62mm;
    height: 21mm;
    transform: rotate(-2.3deg) skewX(-5deg);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 5mm;
    background: linear-gradient(105deg, #e80016 0%, #f51b27 70%, #c70012 100%);
    box-shadow: 0 2mm 3mm rgba(112,0,0,.18);
    color: #fff;
    font-family: Arial, Helvetica, sans-serif;
    border-top: .6mm solid rgba(255,255,255,.3);
  }
  .techron-wordmark {
    width: 48mm;
    height: auto;
    display: block;
    filter: brightness(0) invert(1);
  }
  .techron-sub {
    margin-top: 1.2mm;
    font-size: 3.7mm;
    line-height: 1;
    font-weight: 700;
    letter-spacing: .15mm;
  }

  .test-ribbon {
    position: absolute;
    z-index: 30;
    top: 10mm;
    right: -28mm;
    width: 105mm;
    transform: rotate(40deg);
    padding: 2.5mm 0;
    background: #ed0015;
    color: #fff;
    text-align: center;
    font-size: 4.7mm;
    line-height: 1;
    font-weight: 800;
    box-shadow: 0 .8mm 2mm rgba(0,0,0,.18);
  }

  @media screen {
    body { background: #d8dde0; padding: 8px; }
    .sheet { margin: 0 auto; box-shadow: 0 3mm 12mm rgba(0,0,0,.18); }
  }
  @media print {
    body { padding: 0; background: #fff; }
    .sheet { box-shadow: none; }
  }
</style>
</head>
<body>
<section class="sheet ${isEmployee ? "employee-poster" : "station-poster"}">
  ${input.isTest ? '<div class="test-ribbon">ตัวอย่าง / แบบทดสอบ</div>' : ""}

  <div class="brand-lockup">
    <img src="${caltexLogo}" alt="Caltex" />
    <div class="brand-slogan">ENJOY THE JOURNEY</div>
  </div>

  <div class="copy">
    <div class="prompt">${mainPrompt}</div>
    <div class="target-wrap">
      <div class="target ${targetSizeClass}">${targetLabel}</div>
      <span class="heart-doodle">${heartOutlineIcon()}</span>
    </div>
    <div class="question">${question}</div>
    <div class="divider"></div>
    <div class="identity">
      <div class="identity-row">
        <span class="identity-icon">${personIcon()}</span>
        <span class="identity-label">${isEmployee ? "ตำแหน่ง :" : "ประเภท :"}</span>
        <span class="identity-value">${isEmployee ? (resolvedPosition || "พนักงานบริการ") : "QR ประเมินสถานี"}</span>
      </div>
      <div class="identity-row">
        <span class="identity-icon">${pinIcon()}</span>
        <span class="identity-label">สถานีบริการ :</span>
        <span class="identity-value">${resolvedStation || "-"}</span>
      </div>
    </div>
  </div>

  <div class="fact-band">
    <div class="fact-band-item">
      <span class="fact-circle">${clockIcon()}</span>
      <span><span class="fact-small">ใช้เวลาประมาณ</span><br><span class="fact-big">1 นาที</span></span>
    </div>
    <div class="fact-band-item">
      <span class="fact-circle">${anonymousIcon()}</span>
      <span><span class="fact-small">ไม่ต้อง</span><br><span class="fact-big">ระบุชื่อ</span></span>
    </div>
    <div class="fact-band-item">
      <span class="fact-circle">${shieldIcon()}</span>
      <span class="fact-last">ความคิดเห็นของคุณ<br><strong>ช่วยให้เราพัฒนา<br>บริการให้ดียิ่งขึ้น</strong></span>
    </div>
  </div>

  <div class="qr-card">
    <div class="scan-pill">สแกนเพื่อประเมิน</div>
    <svg class="scan-rays" viewBox="0 0 64 64" aria-hidden="true"><path d="M18 6 15 27M36 10 26 29M51 22 34 35" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>
    <div class="qr-shell">
      ${qrSvg}
      <span class="qr-brand"><img src="${caltexLogo}" alt="" /></span>
    </div>
    <div class="or-row"><span class="or-line"></span><span>หรือ</span><span class="or-line"></span></div>
    <div class="manual-label">กรอกรหัสนี้เพื่อประเมิน</div>
    <div class="code-cells">${codeCells}</div>
    <div class="manual-url">เข้าเว็บไซต์ : ${manualEntryUrl}</div>
    <div class="version">${escapeHtml(version)}</div>
  </div>

  <svg class="bottom-sweep" viewBox="0 0 1492 232" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 96 C230 140 470 152 710 143 C998 132 1245 91 1492 54 L1492 232 L0 232 Z" fill="#003f4c"/>
    <path d="M0 62 C236 103 480 116 716 107 C1013 95 1268 54 1492 19 L1492 56 C1249 93 996 133 710 144 C471 153 229 140 0 98 Z" fill="#ed0015"/>
    <path d="M0 54 C236 94 477 106 714 98 C1008 88 1263 46 1492 11" fill="none" stroke="#ffffff" stroke-width="4" opacity=".95"/>
  </svg>

  <div class="thanks">${heartOutlineIcon()}<span>ขอบคุณทุกความคิดเห็น เพื่อบริการที่ดีกว่าเดิม</span></div>
  <div class="techron-badge">
    <img class="techron-wordmark" src="${techronLogo}" alt="Techron" />
    <div class="techron-sub">CLEAN AND PROTECT</div>
  </div>
</section>
</body>
</html>`;
}
