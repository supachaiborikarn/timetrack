/**
 * Minimal width/height sniffing for JPEG/PNG/WebP, used to confirm an upload
 * actually decodes as an image (not just a file with matching magic bytes)
 * and to store dimensions for admin UI thumbnails. Returns null when the
 * format can't be parsed (e.g. lossless WebP/VP8L) — callers should treat
 * that as "unknown", not as a rejection, since magic-byte checks already ran.
 */
export function getImageDimensions(buf: Buffer, mimeType: string): { width: number; height: number } | null {
    try {
        if (mimeType === "image/png") return readPng(buf);
        if (mimeType === "image/jpeg") return readJpeg(buf);
        if (mimeType === "image/webp") return readWebp(buf);
        return null;
    } catch {
        return null;
    }
}

function readPng(buf: Buffer): { width: number; height: number } | null {
    if (buf.length < 24) return null;
    if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpeg(buf: Buffer): { width: number; height: number } | null {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let offset = 2;
    while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) return null;
        const marker = buf[offset + 1];
        // SOFn markers (baseline/progressive), excluding DHT(C4)/JPG(C8)/DAC(CC)
        const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        const segmentLength = buf.readUInt16BE(offset + 2);
        if (isSOF) {
            return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
        }
        if (marker === 0xd8 || marker === 0xd9) {
            offset += 2;
            continue;
        }
        offset += 2 + segmentLength;
    }
    return null;
}

function readWebp(buf: Buffer): { width: number; height: number } | null {
    if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
    const chunk = buf.toString("ascii", 12, 16);

    if (chunk === "VP8X") {
        // 24-bit little-endian width-1 / height-1 starting at byte 24
        const width = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
        const height = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
        return { width, height };
    }

    if (chunk === "VP8 ") {
        // Lossy: 14-bit width/height (masking off scale bits) after a 3-byte frame tag + sync code at offset 23
        if (buf.length < 30 || buf[20] !== 0x9d || buf[21] !== 0x01 || buf[22] !== 0x2a) return null;
        const width = buf.readUInt16LE(23) & 0x3fff;
        const height = buf.readUInt16LE(25) & 0x3fff;
        return { width, height };
    }

    // VP8L (lossless) uses bit-packed dimensions — not worth hand-parsing here.
    return null;
}
