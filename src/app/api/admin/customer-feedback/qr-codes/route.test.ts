import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    authMock,
    accessMock,
    permissionMock,
    scopeMock,
    buildSecretsMock,
    userFindUniqueMock,
    stationFindUniqueMock,
    qrFindFirstMock,
    qrFindManyMock,
    transactionMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    accessMock: vi.fn(),
    permissionMock: vi.fn(),
    scopeMock: vi.fn(),
    buildSecretsMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    stationFindUniqueMock: vi.fn(),
    qrFindFirstMock: vi.fn(),
    qrFindManyMock: vi.fn(),
    transactionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: accessMock,
    requireFeedbackPermission: permissionMock,
    getStationScope: scopeMock,
    parseOptionalFeedbackFilter: vi.fn(),
    resolveFeedbackStationId: vi.fn(),
}));
vi.mock("@/lib/customer-feedback/token", () => ({
    buildQrSecrets: buildSecretsMock,
    buildFeedbackUrl: vi.fn(),
    buildManualEntryUrl: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: userFindUniqueMock },
        station: { findUnique: stationFindUniqueMock },
        customerFeedbackQr: { findFirst: qrFindFirstMock, findMany: qrFindManyMock },
        $transaction: transactionMock,
    },
}));

import { POST } from "./route";

describe("POST /api/admin/customer-feedback/qr-codes validation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "manager-1" } });
        accessMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "manager-1", role: "MANAGER", stationId: "station-own" },
        });
        permissionMock.mockResolvedValue({ ok: true });
        scopeMock.mockResolvedValue({ ok: true, stationId: "station-own" });
        buildSecretsMock.mockReturnValue({ columns: {}, token: "token", manualCode: "code" });
        qrFindFirstMock.mockResolvedValue(null);
        qrFindManyMock.mockResolvedValue([]);
    });

    it.each([
        [{ targetType: "STATION", stationId: "station-own", placement: "EMPLOYEE_BADGE" }, "placement ไม่ถูกต้อง"],
        [{ targetType: "STATION", stationId: "station-own", placementKey: "" }, "placementKey ต้องยาว 1–100 ตัวอักษร"],
        [{ targetType: "STATION", stationId: "station-own", serviceAreaKey: "hidden-area" }, "serviceAreaKey ไม่ถูกต้อง"],
        [{ targetType: "STATION", stationId: "station-own", isTest: "yes" }, "isTest ต้องเป็น true หรือ false"],
        [{ targetType: "EMPLOYEE", employeeId: 123 }, "employeeId ต้องเป็นข้อความยาว 1–100 ตัวอักษร"],
        [{ targetType: "EMPLOYEE", employeeCode: "E001", publicPosition: "x".repeat(101) }, "publicPosition ต้องเป็นข้อความยาว 1–100 ตัวอักษร"],
    ])("rejects invalid QR metadata %#", async (body, error) => {
        const response = await POST(new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        }));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error });
        expect(buildSecretsMock).not.toHaveBeenCalled();
    });

    it("uses the employee home station for manager scope on create", async () => {
        userFindUniqueMock.mockResolvedValue({
            id: "employee-1",
            employeeId: "E001",
            name: "ณัฐ",
            nickName: "นัท",
            isActive: true,
            stationId: "station-other",
        });

        const response = await POST(new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ targetType: "EMPLOYEE", employeeCode: "E001" }),
        }));

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({ error: "ไม่มีสิทธิ์สร้าง QR ให้พนักงานของสถานีอื่น" });
    });

    it("re-checks employee active state after locking the target", async () => {
        userFindUniqueMock.mockResolvedValue({
            id: "employee-1",
            employeeId: "E001",
            name: "ณัฐ",
            nickName: "นัท",
            isActive: true,
            stationId: "station-own",
        });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: false, stationId: "station-own" }) },
            customerFeedbackQr: { findFirst: vi.fn() },
        }));

        const response = await POST(new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ targetType: "EMPLOYEE", employeeCode: "E001" }),
        }));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: "พนักงานไม่อยู่ในสถานะทำงาน" });
    });

    it("re-checks station state after locking the station", async () => {
        stationFindUniqueMock.mockResolvedValue({
            id: "station-own",
            name: "สถานีเดิม",
            isActive: true,
            publicEmergencyPhone: "191",
        });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            station: { findUnique: vi.fn().mockResolvedValue({ name: "สถานีเดิม", isActive: false, publicEmergencyPhone: "191" }) },
            customerFeedbackQr: { create: vi.fn() },
        }));

        const response = await POST(new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ targetType: "STATION", stationId: "station-own" }),
        }));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: "สถานีนี้ปิดใช้งานอยู่" });
    });

    it("does not create a second production QR for the same employee", async () => {
        userFindUniqueMock.mockResolvedValue({
            id: "employee-1",
            employeeId: "E001",
            name: "ณัฐ",
            nickName: "นัท",
            isActive: true,
            stationId: "station-own",
        });
        const createMock = vi.fn();
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: true, stationId: "station-own" }) },
            customerFeedbackQr: {
                findFirst: vi.fn().mockResolvedValue({ id: "qr-production" }),
                create: createMock,
            },
        }));

        const response = await POST(new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ targetType: "EMPLOYEE", employeeCode: "E001", isTest: false }),
        }));

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            error: "เป้าหมายนี้มี QR ใช้งานจริงอยู่แล้ว กรุณาใช้รายการเดิม",
        });
        expect(createMock).not.toHaveBeenCalled();
    });

    it("does not create a second production QR for the same station placement", async () => {
        stationFindUniqueMock.mockResolvedValue({
            id: "station-own",
            name: "สถานีเดิม",
            isActive: true,
            publicEmergencyPhone: "191",
        });
        const createMock = vi.fn();
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            station: {
                findUnique: vi.fn().mockResolvedValue({
                    name: "สถานีเดิม",
                    isActive: true,
                    publicEmergencyPhone: "191",
                }),
            },
            customerFeedbackQr: {
                findFirst: vi.fn().mockResolvedValue({ id: "qr-production" }),
                create: createMock,
            },
        }));

        const response = await POST(new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                targetType: "STATION",
                stationId: "station-own",
                placement: "PUMP",
                placementKey: "PUMP_01",
                isTest: false,
            }),
        }));

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            error: "เป้าหมายนี้มี QR ใช้งานจริงอยู่แล้ว กรุณาใช้รายการเดิม",
        });
        expect(createMock).not.toHaveBeenCalled();
    });
});
