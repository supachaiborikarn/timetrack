/**
 * ตัวตนสาธารณะของพนักงานในระบบเสียงลูกค้า
 *
 * นโยบาย (เจ้าของตัดสิน 23 ส.ค. 2569): **พนักงานรับการประเมินด้วยชื่อเล่น**
 * ป้าย QR ที่ลูกค้าเห็นต้องไม่มีชื่อจริงหรือนามสกุล
 *
 * เดิมโค้ด fallback ไปใช้ชื่อจริงส่วนแรกเมื่อไม่มีชื่อเล่น ซึ่งขัดกับนโยบายนี้
 * ตอนนี้ถ้าไม่มีชื่อเล่นจะสร้าง QR ไม่ได้ ต้องไปกรอกชื่อเล่นในประวัติพนักงานก่อน
 */

export const PUBLIC_LABEL_MAX_LENGTH = 24;

export type PublicLabelRejection =
    | "NO_NICKNAME"
    | "LOOKS_LIKE_LEGAL_NAME"
    | "TOO_LONG";

export type PublicLabelResult =
    | { ok: true; label: string }
    | { ok: false; reason: PublicLabelRejection; message: string };

function normalize(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

/**
 * หาชื่อที่จะขึ้นป้าย
 *
 * @param nickName ชื่อเล่นในประวัติพนักงาน
 * @param legalName ชื่อจริงเต็ม ใช้ตรวจว่าไม่หลุดไปขึ้นป้าย
 * @param requested ชื่อที่ผู้ดูแลพิมพ์มาเอง (สะกดชื่อเล่นได้หลายแบบ จึงยอมให้แก้)
 */
export function resolveEmployeePublicLabel(
    nickName: string | null | undefined,
    legalName: string,
    requested?: string | null
): PublicLabelResult {
    const candidate = normalize(requested ?? nickName ?? "");

    if (!candidate) {
        return {
            ok: false,
            reason: "NO_NICKNAME",
            message: "พนักงานคนนี้ยังไม่มีชื่อเล่นในระบบ — กรอกชื่อเล่นในประวัติพนักงานก่อนสร้าง QR",
        };
    }

    if (candidate.length > PUBLIC_LABEL_MAX_LENGTH) {
        return {
            ok: false,
            reason: "TOO_LONG",
            message: `ชื่อบนป้ายยาวเกิน ${PUBLIC_LABEL_MAX_LENGTH} ตัวอักษร`,
        };
    }

    // กันชื่อจริงหลุดขึ้นป้าย — เทียบเฉพาะกรณีชื่อจริงเป็นชื่อ+นามสกุล
    // ถ้าประวัติบันทึกชื่อไว้คำเดียว (บางคนใช้ชื่อเล่นเป็นชื่อ) ไม่ต้องดัก
    const legal = normalize(legalName);
    if (legal.includes(" ") && candidate.toLowerCase() === legal.toLowerCase()) {
        return {
            ok: false,
            reason: "LOOKS_LIKE_LEGAL_NAME",
            message: "ชื่อบนป้ายต้องเป็นชื่อเล่น ไม่ใช่ชื่อจริงเต็ม",
        };
    }

    return { ok: true, label: candidate };
}

/**
 * ข้อความเตือนเมื่อชื่อเล่นซ้ำกับเพื่อนร่วมสถานี
 *
 * ไม่ block เพราะผู้ดูแลอาจตั้งชื่อแยกเอง (เช่น "เอ็ม (หน้าลาน)")
 * แต่ต้องเตือน เพราะถ้าลูกค้าแยกไม่ออก คะแนนจะไปลงผิดคนแล้วไหลเข้ารอบประเมิน
 */
export function duplicateLabelWarning(label: string, othersAtStation: string[]): string | null {
    const clash = othersAtStation.some((other) => normalize(other).toLowerCase() === normalize(label).toLowerCase());
    if (!clash) return null;
    return `สถานีนี้มีพนักงานใช้ชื่อ "${label}" อยู่แล้ว ลูกค้าอาจให้คะแนนผิดคน — ควรตั้งชื่อบนป้ายให้แยกกันได้`;
}
