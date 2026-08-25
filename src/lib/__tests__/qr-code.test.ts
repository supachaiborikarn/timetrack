import { describe, expect, it } from "vitest";

import { generateQRCodeSVG } from "@/lib/qr-code";

describe("generateQRCodeSVG", () => {
    it("keeps a four-module white quiet zone around the QR data", () => {
        const size = 410;
        const svg = generateQRCodeSVG("https://example.com/f#token=test", size);
        const darkRects = [...svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)"/g)];

        expect(darkRects.length).toBeGreaterThan(0);
        const cellSize = Number(darkRects[0][3]);
        const minimumDarkCoordinate = Math.min(
            ...darkRects.flatMap((match) => [Number(match[1]), Number(match[2])]),
        );
        const maximumDarkEdge = Math.max(
            ...darkRects.flatMap((match) => [
                Number(match[1]) + Number(match[3]),
                Number(match[2]) + Number(match[3]),
            ]),
        );

        expect(minimumDarkCoordinate).toBeGreaterThanOrEqual(cellSize * 4);
        expect(size - maximumDarkEdge).toBeGreaterThanOrEqual(cellSize * 4);
    });
});
