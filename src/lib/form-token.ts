import { createHmac, timingSafeEqual } from "crypto";

/**
 * Anti-bot "minimum fill time" token for the public job application form.
 * The server stamps a signed timestamp when the page renders; on submit we
 * verify the signature (so it can't be forged) and check enough time has
 * passed since render — a bot that posts immediately fails this check.
 */

const MIN_FILL_TIME_MS = 10_000;
const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1000; // stale drafts left open past 2h must re-render

function sign(renderedAt: number): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET is not set");
    return createHmac("sha256", secret).update(String(renderedAt)).digest("hex");
}

export function createFormToken(): string {
    const renderedAt = Date.now();
    return `${renderedAt}.${sign(renderedAt)}`;
}

export function verifyFormToken(token: unknown): { valid: boolean; reason?: string } {
    if (typeof token !== "string") return { valid: false, reason: "missing" };

    const [renderedAtRaw, signature] = token.split(".");
    const renderedAt = Number(renderedAtRaw);
    if (!renderedAtRaw || !signature || !Number.isFinite(renderedAt)) {
        return { valid: false, reason: "malformed" };
    }

    const expected = sign(renderedAt);
    const expectedBuf = Buffer.from(expected, "hex");
    const gotBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== gotBuf.length || !timingSafeEqual(expectedBuf, gotBuf)) {
        return { valid: false, reason: "bad-signature" };
    }

    const age = Date.now() - renderedAt;
    if (age < MIN_FILL_TIME_MS) return { valid: false, reason: "too-fast" };
    if (age > MAX_TOKEN_AGE_MS) return { valid: false, reason: "expired" };

    return { valid: true };
}
