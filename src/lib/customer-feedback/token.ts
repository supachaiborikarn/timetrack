import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { encryptField, decryptField } from "@/lib/crypto-field";

/**
 * Token และ URL ของ QR เสียงลูกค้า
 *
 * - token จริงเป็น crypto random อย่างน้อย 128 bits, base64url
 * - DB เก็บ SHA-256 (tokenHash) สำหรับ resolve และ ciphertext สำหรับพิมพ์ซ้ำ
 * - รหัสกรอกเอง 8 ตัว ตัด 0 O 1 I ออก, เก็บ HMAC + ciphertext
 * - URL ใช้ APP_BASE_URL ฝั่ง server เท่านั้น รหัสอยู่ใน fragment (#t=)
 */

const MANUAL_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateFeedbackToken(): string {
    // 18 bytes = 144 bits entropy, base64url 24 ตัวอักษร
    return randomBytes(18).toString("base64url");
}

export function generateManualCode(): string {
    const bytes = randomBytes(8);
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += MANUAL_CODE_ALPHABET[bytes[i] % MANUAL_CODE_ALPHABET.length];
    }
    return code;
}

export function sha256Hex(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

function manualCodePepper(): string {
    const key = process.env.CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY;
    if (!key) throw new Error("CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY is not set");
    return key;
}

export function hashManualCode(code: string): string {
    return createHmac("sha256", manualCodePepper()).update(code.toUpperCase()).digest("hex");
}

export function manualCodeMatches(code: string, storedHash: string): boolean {
    const expected = Buffer.from(hashManualCode(code), "hex");
    const got = Buffer.from(storedHash, "hex");
    return expected.length === got.length && timingSafeEqual(expected, got);
}

/** เก็บ token/รหัสกรอกเองลง CustomerFeedbackQr — คืนค่าที่ต้องใช้ตอนสร้าง */
/**
 * สร้างรหัสลับของ QR ใบใหม่
 *
 * `token` กับ `manualCode` เป็นค่า plaintext สำหรับพิมพ์ป้ายครั้งเดียว **ไม่ใช่คอลัมน์ในตาราง**
 * ส่วนที่ลงฐานข้อมูลได้อยู่ใน `columns` เท่านั้น — เขียน `data: { ...secrets.columns }`
 *
 * แยกออกมาเพราะเดิมรวมอยู่ก้อนเดียวแล้วมีที่เรียก `data: { ...secrets }` ซึ่ง Prisma
 * ปฏิเสธตอน runtime ("Unknown argument `token`") และ TypeScript จับไม่ได้
 * (การ spread ตัวแปรลง object literal ปิด excess property check)
 */
export function buildQrSecrets() {
    const token = generateFeedbackToken();
    const manualCode = generateManualCode();
    return {
        token,
        manualCode,
        columns: {
            tokenHash: sha256Hex(token),
            tokenCiphertext: encryptField(token),
            tokenHint: token.slice(-6),
            manualCodeHash: hashManualCode(manualCode),
            manualCodeCiphertext: encryptField(manualCode),
            manualCodeHint: manualCode.slice(-2),
        },
    };
}

export function revealQrToken(tokenCiphertext: string): string {
    return decryptField(tokenCiphertext);
}

export function revealQrManualCode(manualCodeCiphertext: string): string {
    return decryptField(manualCodeCiphertext);
}

/**
 * โฮสต์ที่ห้ามใช้สร้าง URL ใน QR ตอน production — สแกนแล้วไปไม่ถึงไหน
 *
 * เดิมบล็อก `*.vercel.app` ด้วย เจ้าของตัดสิน (23 ส.ค. 2569) ให้ใช้โดเมน vercel.app
 * ไปก่อนจนกว่าจะมีโดเมนบริษัท จึงถอดออก ข้อแลกเปลี่ยนที่รับไว้แล้ว:
 * ลูกค้าที่สแกนจะเห็นโดเมน vercel.app ซึ่งดูไม่น่าเชื่อถือ และถ้าย้ายโดเมนภายหลัง
 * ป้ายที่พิมพ์ไปแล้วทุกใบต้องพิมพ์ใหม่ทั้งหมด (rotate ไม่ช่วย เพราะโดเมนอยู่ในตัว URL)
 */
const BLOCKED_HOST_PATTERNS = [/^localhost$/i, /\.local$/i, /^127\.0\.0\.1$/, /^0\.0\.0\.0$/, /^\[::1\]$/];

function baseUrl(): string {
    const raw = process.env.APP_BASE_URL;
    if (!raw) throw new Error("APP_BASE_URL is not set");
    const url = new URL(raw);
    if (process.env.NODE_ENV === "production" && BLOCKED_HOST_PATTERNS.some((p) => p.test(url.hostname))) {
        throw new Error(`APP_BASE_URL "${url.hostname}" is not allowed in production`);
    }
    return url.origin;
}

/** URL ที่ฝังใน QR — รหัสอยู่ใน fragment เพื่อไม่ให้หลุดไป access log */
export function buildFeedbackUrl(token: string): string {
    return `${baseUrl()}/f#t=${token}`;
}

/** URL สำรองบนป้ายสำหรับคนสแกนไม่ได้ */
export function buildManualEntryUrl(): string {
    return `${baseUrl()}/f`;
}
