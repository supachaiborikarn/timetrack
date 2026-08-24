import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    authMock,
    stationFindFirstMock,
    stationUpdateMock,
    qrCountMock,
    qrUpdateManyMock,
    auditCreateMock,
    queryRawMock,
    transactionMock,
    events,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    stationFindFirstMock: vi.fn(),
    stationUpdateMock: vi.fn(),
    qrCountMock: vi.fn(),
    qrUpdateManyMock: vi.fn(),
    auditCreateMock: vi.fn(),
    queryRawMock: vi.fn(),
    transactionMock: vi.fn(),
    events: [] as string[],
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        station: { findFirst: stationFindFirstMock, update: stationUpdateMock },
        $transaction: transactionMock,
    },
}));

import { PUT } from "./route";

function request(body: Record<string, unknown>) {
    return new Request("http://localhost/api/admin/stations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            id: "station-1",
            name: "สถานีหนึ่ง",
            code: "S1",
            latitude: 13.7,
            longitude: 100.5,
            radius: 100,
            ...body,
        }),
    });
}

describe("station feedback QR shutdown", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        events.length = 0;
        authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
        stationFindFirstMock.mockResolvedValue(null);
        queryRawMock.mockImplementation(async () => { events.push("station-lock"); return []; });
        qrCountMock.mockImplementation(async () => { events.push("qr-count"); return 2; });
        stationUpdateMock.mockImplementation(async () => {
            events.push("station-update");
            return { id: "station-1", name: "สถานีหนึ่ง", code: "S1", latitude: 13.7, longitude: 100.5, radius: 100 };
        });
        qrUpdateManyMock.mockImplementation(async () => { events.push("qr-update"); return { count: 2 }; });
        auditCreateMock.mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: queryRawMock,
            station: { update: stationUpdateMock },
            customerFeedbackQr: { count: qrCountMock, updateMany: qrUpdateManyMock },
            auditLog: { create: auditCreateMock },
        }));
    });

    it("locks and updates the station before closing its active QR codes", async () => {
        const response = await PUT(request({ isActive: false, deactivateFeedbackQr: true }));

        expect(response.status).toBe(200);
        expect(events).toEqual(["station-lock", "qr-count", "station-update", "qr-update"]);
        expect(qrUpdateManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { stationId: "station-1", isActive: true },
        }));
    });

    it("does not change the station when active QR shutdown was not confirmed", async () => {
        const response = await PUT(request({ isActive: false, deactivateFeedbackQr: false }));

        expect(response.status).toBe(400);
        expect(stationUpdateMock).not.toHaveBeenCalled();
        expect(qrUpdateManyMock).not.toHaveBeenCalled();
    });
});
