import { createPublicKey, verify as verifySignature } from "node:crypto";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export interface DiscordEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    fields?: DiscordEmbedField[];
    footer?: { text: string };
    timestamp?: string;
}

export interface DiscordMessagePayload {
    content?: string;
    username?: string;
    embeds?: DiscordEmbed[];
    flags?: number;
    allowed_mentions?: { parse: string[] };
}

export interface DiscordSendResult {
    ok: boolean;
    messageId?: string;
    error?: string;
}

function validDiscordWebhookUrl(value: string): URL | null {
    try {
        const url = new URL(value);
        const validHost = url.hostname === "discord.com" || url.hostname.endsWith(".discord.com") || url.hostname === "discordapp.com";
        const validPath = url.pathname.startsWith("/api/webhooks/");
        return url.protocol === "https:" && validHost && validPath ? url : null;
    } catch {
        return null;
    }
}

export function getAttendanceDiscordWebhookUrl(stationCode?: string): string | null {
    const stationKey = stationCode
        ? `DISCORD_ATTENDANCE_WEBHOOK_URL_${stationCode.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`
        : null;
    const configured = (stationKey ? process.env[stationKey] : null)
        || process.env.DISCORD_ATTENDANCE_WEBHOOK_URL
        || process.env.DISCORD_WEBHOOK_URL;

    if (!configured) return null;
    return validDiscordWebhookUrl(configured)?.toString() ?? null;
}

export async function sendDiscordWebhook(
    webhookUrl: string,
    payload: DiscordMessagePayload,
): Promise<DiscordSendResult> {
    const url = validDiscordWebhookUrl(webhookUrl);
    if (!url) return { ok: false, error: "Discord webhook URL ไม่ถูกต้อง" };
    url.searchParams.set("wait", "true");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                allowed_mentions: { parse: [] },
            }),
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            const detail = (await response.text()).slice(0, 300);
            return { ok: false, error: `Discord ตอบกลับ ${response.status}: ${detail}` };
        }

        const message = await response.json().catch(() => null) as { id?: string } | null;
        return { ok: true, messageId: message?.id };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "ส่ง Discord ไม่สำเร็จ",
        };
    }
}

export function verifyDiscordRequestSignature(input: {
    rawBody: string;
    signature: string | null;
    timestamp: string | null;
    publicKey: string | undefined;
}): boolean {
    if (!input.signature || !input.timestamp || !input.publicKey) return false;
    if (!/^[0-9a-f]{128}$/i.test(input.signature) || !/^[0-9a-f]{64}$/i.test(input.publicKey)) return false;

    try {
        const key = createPublicKey({
            key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(input.publicKey, "hex")]),
            format: "der",
            type: "spki",
        });

        return verifySignature(
            null,
            Buffer.from(input.timestamp + input.rawBody),
            key,
            Buffer.from(input.signature, "hex"),
        );
    } catch {
        return false;
    }
}

export function isDiscordTimestampFresh(
    timestamp: string | null,
    nowMs: number = Date.now(),
    maxAgeMs: number = 5 * 60 * 1000,
): boolean {
    if (!timestamp || !/^\d+$/.test(timestamp)) return false;
    const timestampMs = Number(timestamp) * 1000;
    return Number.isFinite(timestampMs) && Math.abs(nowMs - timestampMs) <= maxAgeMs;
}

export async function editOriginalDiscordResponse(
    applicationId: string,
    interactionToken: string,
    payload: DiscordMessagePayload,
): Promise<DiscordSendResult> {
    const url = `${DISCORD_API_BASE}/webhooks/${encodeURIComponent(applicationId)}/${encodeURIComponent(interactionToken)}/messages/@original`;

    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                allowed_mentions: { parse: [] },
            }),
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            const detail = (await response.text()).slice(0, 300);
            return { ok: false, error: `แก้คำตอบ Discord ไม่สำเร็จ ${response.status}: ${detail}` };
        }

        const message = await response.json().catch(() => null) as { id?: string } | null;
        return { ok: true, messageId: message?.id };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "ตอบคำสั่ง Discord ไม่สำเร็จ",
        };
    }
}
