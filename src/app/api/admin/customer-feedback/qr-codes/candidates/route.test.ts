import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { stationFindManyMock } = vi.hoisted(() => ({ stationFindManyMock: vi.fn() }));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: vi.fn(async () => ({
        ok: true,
        ctx: { userId: "manager-1", role: "MANAGER", stationId: "station-own" },
    })),
    requireFeedbackPermission: vi.fn(async () => ({ ok: true })),
    getStationScope: vi.fn(async () => ({ ok: true, stationId: "station-own" })),
    parseOptionalFeedbackFilter: (raw: string | null, allowed: readonly string[], field: string) =>
        raw === null || raw === ""
            ? { ok: true, value: undefined }
            : allowed.includes(raw)
                ? { ok: true, value: raw }
                : { ok: false, message: `${field} ไม่ถูกต้อง` },
}));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        station: { findMany: stationFindManyMock },
        user: { findMany: vi.fn() },
    },
}));

import { GET } from "./route";

describe("customer feedback QR candidates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        stationFindManyMock.mockResolvedValue([
            {
                id: "station-own",
                name: "สถานีของเรา",
                isActive: true,
                publicEmergencyPhone: "191",
                feedbackQrs: [{ id: "qr-main", isActive: false, publicLabel: "สถานีของเรา" }],
            },
        ]);
    });

    it("returns only the manager station and its latest primary QR", async () => {
        const response = await GET(new NextRequest(
            "http://localhost/api/admin/customer-feedback/qr-codes/candidates?targetType=STATION"
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(stationFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "station-own" },
            select: expect.objectContaining({
                feedbackQrs: {
                    where: { targetType: "STATION", placement: "STATION_MAIN", isPrimary: true },
                    select: { id: true, isActive: true, publicLabel: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            }),
        }));
        expect(body).toEqual({
            stations: [{
                id: "station-own",
                name: "สถานีของเรา",
                isActive: true,
                publicEmergencyPhone: "191",
                existingQr: { id: "qr-main", isActive: false, publicLabel: "สถานีของเรา" },
            }],
            truncated: false,
        });
    });

    it("looks up the restroom slot independently from the station main QR", async () => {
        stationFindManyMock.mockResolvedValue([
            {
                id: "station-own",
                name: "สถานีของเรา",
                isActive: true,
                publicEmergencyPhone: "191",
                feedbackQrs: [],
            },
        ]);

        const response = await GET(new NextRequest(
            "http://localhost/api/admin/customer-feedback/qr-codes/candidates?targetType=STATION&stationQrKind=restroom"
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(stationFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            select: expect.objectContaining({
                feedbackQrs: {
                    where: { targetType: "STATION", placement: "RESTROOM", placementKey: "RESTROOM_MAIN" },
                    select: { id: true, isActive: true, publicLabel: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            }),
        }));
        expect(body.stations[0].existingQr).toBeNull();
    });

});
