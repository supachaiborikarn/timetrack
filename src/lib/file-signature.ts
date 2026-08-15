/**
 * Magic-byte sniffing for uploads. Never trust the client-declared Content-Type —
 * this is the source of truth for what a file actually is.
 */
export type SniffedMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function sniffMimeType(buf: Buffer): SniffedMime | null {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return "image/jpeg";
    }
    if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
        return "image/png";
    }
    if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
        return "image/webp";
    }
    if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "%PDF") {
        return "application/pdf";
    }
    return null;
}
