/** Helper กลางของ public feedback routes เพื่อให้ origin และ body limit ใช้กติกาเดียวกัน */

export const MAX_PUBLIC_JSON_BYTES = 16 * 1024;

export function isSameOriginRequest(request: Pick<Request, "headers">): boolean {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

    const origin = request.headers.get("origin");
    if (!origin) return true;

    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!host) return false;
    try {
        return new URL(origin).host === host.split(",")[0].trim();
    } catch {
        return false;
    }
}

export function isJsonRequest(request: Pick<Request, "headers">): boolean {
    return (request.headers.get("content-type") ?? "").toLowerCase().includes("application/json");
}

export type JsonBodyResult =
    | { ok: true; value: unknown }
    | { ok: false; reason: "INVALID_JSON" | "PAYLOAD_TOO_LARGE" };

/** อ่าน stream แบบมีเพดานจริง จึงไม่พึ่ง Content-Length ที่ client ละเว้นหรือปลอมได้ */
export async function readJsonBody(
    request: Pick<Request, "headers" | "body">,
    maxBytes: number = MAX_PUBLIC_JSON_BYTES
): Promise<JsonBodyResult> {
    const statedLength = request.headers.get("content-length");
    if (statedLength && Number.isFinite(Number(statedLength)) && Number(statedLength) > maxBytes) {
        return { ok: false, reason: "PAYLOAD_TOO_LARGE" };
    }
    if (!request.body) return { ok: false, reason: "INVALID_JSON" };

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;
    let text = "";
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            totalBytes += chunk.value.byteLength;
            if (totalBytes > maxBytes) {
                await reader.cancel();
                return { ok: false, reason: "PAYLOAD_TOO_LARGE" };
            }
            text += decoder.decode(chunk.value, { stream: true });
        }
        text += decoder.decode();
    } catch {
        return { ok: false, reason: "INVALID_JSON" };
    } finally {
        reader.releaseLock();
    }

    try {
        return { ok: true, value: JSON.parse(text) };
    } catch {
        return { ok: false, reason: "INVALID_JSON" };
    }
}
