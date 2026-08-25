import QRCodeGenerator from "qrcode-generator";

/**
 * Renders text as a standalone QR code SVG string.
 *
 * SVG (rather than canvas) so the result stays crisp at any print size — these get blown up
 * onto A4 posters stuck on a wall.
 */
export function generateQRCodeSVG(text: string, size: number = 200): string {
    const qr = QRCodeGenerator(0, "M");
    qr.addData(text);
    qr.make();

    const modules = qr.getModuleCount();
    // QR readers need a clear border around the data modules. Four modules is
    // the standard minimum quiet zone and keeps printed codes reliable.
    const quietZoneModules = 4;
    const cellSize = size / (modules + quietZoneModules * 2);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="white"/>`;

    for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
            if (qr.isDark(row, col)) {
                svg += `<rect x="${(col + quietZoneModules) * cellSize}" y="${(row + quietZoneModules) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
            }
        }
    }

    svg += "</svg>";
    return svg;
}

/** Triggers a browser download of the given QR code as an .svg file. */
export function downloadQRCodeSVG(text: string, filename: string, size: number = 600): void {
    const svg = generateQRCodeSVG(text, size);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
    link.click();
    URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Opens a print-ready A4 poster for a job posting in a new tab.
 * Returns false when the browser blocked the popup so the caller can tell the user.
 */
export function printJobPoster(input: {
    /** URL encoded into the QR — must be percent-encoded so every scanner resolves it. */
    url: string;
    /** Same link in readable form for the text printed under the QR. Defaults to `url`. */
    displayUrl?: string;
    companyName: string;
    title: string;
    details: string[];
    footerNote?: string;
}): boolean {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return false;

    const qrSvg = generateQRCodeSVG(input.url, 520);
    const detailRows = input.details
        .filter(Boolean)
        .map((line) => `<div class="detail">${escapeHtml(line)}</div>`)
        .join("");

    printWindow.document.write(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>${escapeHtml(input.title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Sarabun", "Noto Sans Thai", -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0; padding: 0; color: #111;
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
  }
  .poster { width: 100%; max-width: 720px; text-align: center; padding: 24px; }
  .company { font-size: 20px; color: #555; margin-bottom: 4px; }
  .heading { font-size: 30px; font-weight: 700; margin: 0 0 6px; }
  .title { font-size: 40px; font-weight: 800; margin: 12px 0 18px; line-height: 1.25; }
  .details { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 22px; margin-bottom: 22px; }
  .detail { font-size: 20px; color: #333; }
  .qr { display: inline-block; padding: 16px; border: 3px solid #111; border-radius: 12px; }
  .qr svg { display: block; width: 100%; height: auto; max-width: 420px; }
  .cta { font-size: 26px; font-weight: 700; margin: 20px 0 8px; }
  .url { font-size: 15px; color: #666; word-break: break-all; }
  .footer { margin-top: 18px; font-size: 17px; color: #444; }
  @media print { body { min-height: auto; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="poster">
    <div class="company">${escapeHtml(input.companyName)}</div>
    <div class="heading">รับสมัครงาน</div>
    <div class="title">${escapeHtml(input.title)}</div>
    <div class="details">${detailRows}</div>
    <div class="qr">${qrSvg}</div>
    <div class="cta">สแกนเพื่อดูรายละเอียดและสมัครงาน</div>
    <div class="url">${escapeHtml(input.displayUrl ?? input.url)}</div>
    ${input.footerNote ? `<div class="footer">${escapeHtml(input.footerNote)}</div>` : ""}
  </div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    // Give the new document a moment to lay out before invoking print.
    setTimeout(() => printWindow.print(), 400);
    return true;
}
