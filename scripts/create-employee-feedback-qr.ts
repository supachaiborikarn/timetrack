/**
 * สร้าง QR เสียงลูกค้าให้พนักงานรายคน แล้วออกไฟล์ป้ายติดตัวสำหรับพิมพ์
 *
 *   npx tsx scripts/create-employee-feedback-qr.ts            # ดูก่อนว่าจะทำอะไร (ไม่เขียนอะไรเลย)
 *   npx tsx scripts/create-employee-feedback-qr.ts --apply    # สร้างจริง
 *   npx tsx scripts/create-employee-feedback-qr.ts --reprint  # ออกป้ายใหม่จาก QR ที่มีอยู่แล้ว
 *
 * เงื่อนไข (ตรงกับ POST /api/admin/customer-feedback/qr-codes):
 * - พนักงานต้อง active และ **มีชื่อเล่น** — ไม่มีชื่อเล่นข้ามไป ไม่ตกไปใช้ชื่อจริง
 * - สร้างมาแล้ว isActive = false ต้องบันทึกการรับทราบข้อมูลสาธารณะก่อนเปิดใช้
 * - หนึ่งคนมี EMPLOYEE QR ที่ active ได้ใบเดียว (partial unique index กันไว้อีกชั้น)
 *
 * ป้ายออกเป็นไฟล์ HTML สั่งพิมพ์จากเบราว์เซอร์ได้เลย ขนาดป้าย 54x86 มม. (เท่าบัตรพนักงานแนวตั้ง)
 */
import { PrismaClient, Role } from "@prisma/client";
import { buildQrSecrets, buildFeedbackUrl, buildManualEntryUrl, revealQrToken } from "../src/lib/customer-feedback/token";
import { resolveEmployeePublicLabel } from "../src/lib/customer-feedback/public-identity";
import qrcode from "qrcode-generator";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const REPRINT = process.argv.includes("--reprint");
const DEFAULT_POSITION = "พนักงานบริการ";

/** บทบาทที่ให้บริการลูกค้าหน้างาน — ผู้ดูแลระบบ/HR ไม่ต้องมีป้าย */
const CUSTOMER_FACING_ROLES: Role[] = ["EMPLOYEE", "CASHIER", "MANAGER"];

const OUT_DIR = path.join(process.cwd(), "tmp");
const OUT_FILE = path.join(OUT_DIR, "employee-feedback-badges.html");

interface Badge {
    employeeId: string;
    label: string;
    position: string;
    stationName: string;
    url: string;
    manualCode: string;
}

function qrSvg(text: string, size: number): string {
    // typeNumber 0 = auto, 'M' = 15% error correction (พอสำหรับป้ายที่อาจเปื้อน)
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const cell = size / count;
    let rects = "";
    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
                rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
            }
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!
    );
}

function badgeSheet(badges: Badge[], manualEntryUrl: string): string {
    const cards = badges
        .map(
            (b) => `
  <div class="badge">
    <div class="head">ช่วยให้คะแนนบริการ</div>
    <div class="qr">${qrSvg(b.url, 150)}</div>
    <div class="name">${escapeHtml(b.label)}</div>
    <div class="position">${escapeHtml(b.position)}</div>
    <div class="station">${escapeHtml(b.stationName)}</div>
    <div class="manual">สแกนไม่ได้? เข้า <span class="mono">${escapeHtml(manualEntryUrl.replace(/^https?:\/\//, ""))}</span><br/>แล้วกรอกรหัส <span class="code">${escapeHtml(b.manualCode)}</span></div>
  </div>`
        )
        .join("\n");

    return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<title>ป้าย QR เสียงลูกค้า (${badges.length} ใบ)</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: "Noto Sans Thai", "Sarabun", system-ui, sans-serif; margin: 0; background: #f5f5f5; }
  .sheet { display: flex; flex-wrap: wrap; gap: 4mm; padding: 4mm; }
  .badge {
    width: 54mm; height: 86mm; background: #fff; border: 1px dashed #bbb; border-radius: 3mm;
    padding: 3mm; display: flex; flex-direction: column; align-items: center; text-align: center;
    page-break-inside: avoid; break-inside: avoid;
  }
  .head { font-size: 9pt; color: #444; margin-bottom: 1.5mm; }
  .qr svg { width: 34mm; height: 34mm; display: block; }
  .name { font-size: 16pt; font-weight: 700; margin-top: 2mm; line-height: 1.1; }
  .position { font-size: 9pt; color: #555; }
  .station { font-size: 8pt; color: #888; margin-top: 0.5mm; }
  .manual { font-size: 6.5pt; color: #666; margin-top: auto; line-height: 1.35; }
  .mono { font-family: ui-monospace, Menlo, monospace; }
  .code { font-family: ui-monospace, Menlo, monospace; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.5px; color: #000; }
  .note { padding: 4mm; font-size: 10pt; color: #444; }
  @media print { body { background: #fff; } .note { display: none; } .badge { border-color: #ddd; } }
</style>
</head>
<body>
<div class="note">
  ป้าย ${badges.length} ใบ — สั่งพิมพ์แล้วตัดตามเส้นประ (54×86 มม. เท่าบัตรพนักงาน)<br/>
  QR ยังไม่เปิดใช้งานจนกว่าจะบันทึกการรับทราบข้อมูลสาธารณะของพนักงานแต่ละคนในหน้า admin
</div>
<div class="sheet">
${cards}
</div>
</body>
</html>`;
}

async function main() {
    const employees = await prisma.user.findMany({
        where: { isActive: true, role: { in: CUSTOMER_FACING_ROLES } },
        select: {
            id: true, employeeId: true, name: true, nickName: true,
            station: { select: { name: true } },
            feedbackQrs: {
                where: { targetType: "EMPLOYEE" },
                select: { id: true, isActive: true, publicLabel: true, publicPosition: true, tokenCiphertext: true, manualCodeCiphertext: true },
            },
        },
        orderBy: [{ station: { name: "asc" } }, { nickName: "asc" }],
    });

    const badges: Badge[] = [];
    const skipped: { employeeId: string; why: string }[] = [];
    let created = 0;
    let reused = 0;

    for (const emp of employees) {
        const stationName = emp.station?.name ?? "ไม่ระบุสถานี";
        const existing = emp.feedbackQrs[0];

        if (existing) {
            if (!REPRINT) {
                skipped.push({ employeeId: emp.employeeId, why: "มี QR อยู่แล้ว (ใช้ --reprint เพื่อออกป้ายใหม่)" });
                continue;
            }
            badges.push({
                employeeId: emp.employeeId,
                label: existing.publicLabel,
                position: existing.publicPosition ?? DEFAULT_POSITION,
                stationName,
                url: buildFeedbackUrl(revealQrToken(existing.tokenCiphertext)),
                manualCode: revealQrToken(existing.manualCodeCiphertext),
            });
            reused++;
            continue;
        }

        const labelResult = resolveEmployeePublicLabel(emp.nickName, emp.name);
        if (!labelResult.ok) {
            skipped.push({ employeeId: emp.employeeId, why: labelResult.message });
            continue;
        }

        if (!APPLY) {
            badges.push({
                employeeId: emp.employeeId,
                label: labelResult.label,
                position: DEFAULT_POSITION,
                stationName,
                url: buildFeedbackUrl("PREVIEW-ONLY-NOT-A-REAL-TOKEN"),
                manualCode: "XXXXXXXX",
            });
            created++;
            continue;
        }

        const secrets = buildQrSecrets();
        await prisma.customerFeedbackQr.create({
            data: {
                ...secrets.columns,
                targetType: "EMPLOYEE",
                employeeId: emp.id,
                stationId: null,
                publicLabel: labelResult.label,
                publicPosition: DEFAULT_POSITION,
                placement: "EMPLOYEE_BADGE",
                placementKey: "EMPLOYEE_PRIMARY",
                isPrimary: true,
                isActive: false,
                isTest: false,
                needsReprint: true,
            },
        });
        badges.push({
            employeeId: emp.employeeId,
            label: labelResult.label,
            position: DEFAULT_POSITION,
            stationName,
            url: buildFeedbackUrl(secrets.token),
            manualCode: secrets.manualCode,
        });
        created++;
    }

    // เตือนชื่อซ้ำ — ลูกค้าแยกไม่ออกว่าให้คะแนนใคร
    const byStation = new Map<string, Map<string, string[]>>();
    for (const b of badges) {
        const perStation = byStation.get(b.stationName) ?? new Map<string, string[]>();
        perStation.set(b.label, [...(perStation.get(b.label) ?? []), b.employeeId]);
        byStation.set(b.stationName, perStation);
    }

    console.log(`\n${APPLY ? "สร้างจริง" : "ดูก่อน (ยังไม่เขียนอะไร)"}${REPRINT ? " + ออกป้ายใหม่จากของเดิม" : ""}\n`);
    console.log(`พนักงานที่ให้บริการลูกค้า (active): ${employees.length}`);
    console.log(`  จะสร้าง/สร้างแล้ว : ${created}`);
    if (REPRINT) console.log(`  ออกป้ายใหม่       : ${reused}`);
    console.log(`  ข้าม              : ${skipped.length}`);

    if (skipped.length > 0) {
        console.log("\nรายชื่อที่ข้าม:");
        for (const s of skipped) console.log(`  - ${s.employeeId}: ${s.why}`);
    }

    let clashes = 0;
    for (const [station, labels] of byStation) {
        for (const [label, ids] of labels) {
            if (ids.length > 1) {
                if (clashes === 0) console.log("\n⚠ ชื่อซ้ำในสถานีเดียวกัน — ลูกค้าอาจให้คะแนนผิดคน:");
                console.log(`  - ${station}: "${label}" ใช้ร่วมกัน ${ids.length} คน (${ids.join(", ")})`);
                clashes++;
            }
        }
    }

    if (badges.length > 0) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
        fs.writeFileSync(OUT_FILE, badgeSheet(badges, buildManualEntryUrl()));
        console.log(`\nไฟล์ป้าย: ${OUT_FILE} (${badges.length} ใบ)`);
        if (!APPLY) console.log("  ⚠ โหมดดูก่อน — QR ในไฟล์เป็นของปลอม สั่ง --apply เพื่อสร้างของจริง");
    }

    if (APPLY) {
        console.log("\nขั้นต่อไป: เข้า /admin/customer-feedback แท็บ QR Codes");
        console.log("  บันทึกการรับทราบข้อมูลสาธารณะรายคน → พิมพ์ป้าย → activate");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
