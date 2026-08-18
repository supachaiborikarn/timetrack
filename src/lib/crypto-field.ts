import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

/**
 * AES-256-GCM helpers for encrypting individual sensitive fields (e.g. citizen ID)
 * before they hit the database. Separate key from AUTH_SECRET so rotating one
 * does not invalidate the other.
 *
 * Stored format: base64(iv [12 bytes] + authTag [16 bytes] + ciphertext)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
    const raw = process.env.FIELD_ENCRYPTION_KEY;
    if (!raw) {
        throw new Error("FIELD_ENCRYPTION_KEY is not set");
    }
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
        throw new Error("FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes (generate with: openssl rand -base64 32)");
    }
    return key;
}

export function encryptField(plaintext: string): string {
    const key = getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptField(stored: string): string {
    const key = getKey();
    const buf = Buffer.from(stored, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Deterministic keyed hash for exact-match lookups on a value that is stored encrypted.
 *
 * `encryptField` uses a random IV, so the same input yields different ciphertext every time and
 * can never be matched with a query. This HMAC gives a stable value to index and compare on
 * without storing the number itself. Keyed (not a bare SHA) so a stolen database can't be
 * brute-forced against the small space of 13-digit IDs.
 */
export function hashFieldForLookup(plaintext: string): string {
    const secret = process.env.FIELD_ENCRYPTION_KEY;
    if (!secret) throw new Error("FIELD_ENCRYPTION_KEY is not set");
    return createHmac("sha256", secret).update(plaintext).digest("hex");
}

/** Last 4 digits of a Thai citizen ID, kept as plaintext for display/lookup. */
export function citizenIdLast4(citizenId: string): string {
    const digits = citizenId.replace(/\D/g, "");
    return digits.slice(-4);
}
