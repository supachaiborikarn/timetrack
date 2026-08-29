import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    authMock,
    enabledMock,
    accessMock,
    permissionMock,
    stationScopeMock,
    qrFindMock,
    qrFindFirstMock,
    qrUpdateMock,
    qrUpdateManyMock,
    auditCreateMock,
    transactionMock,
    buildSecretsMock,
    buildFeedbackUrlMock,
    stationEnabledMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    enabledMock: vi.fn(),
    accessMock: vi.fn(),
    permissionMock: vi.fn(),
    stationScopeMock: vi.fn(),
    qrFindMock: vi.fn(),
    qrFindFirstMock: vi.fn(),
    qrUpdateMock: vi.fn(),
    qrUpdateManyMock: vi.fn(),
    auditCreateMock: vi.fn(),
    transactionMock: vi.fn(),
    buildSecretsMock: vi.fn(),
    buildFeedbackUrlMock: vi.fn(),
    stationEnabledMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackEnabled: enabledMock,
}));
vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: accessMock,
    requireFeedbackPermission: permissionMock,
    getStationScope: stationScopeMock,
}));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/customer-feedback/station-context", () => ({
    isStationFeedbackEnabled: stationEnabledMock,
}));
vi.mock("@/lib/customer-feedback/token", () => ({
    buildQrSecrets: buildSecretsMock,
    buildFeedbackUrl: buildFeedbackUrlMock,
    buildManualEntryUrl: vi.fn(() => "https://example.test/f"),
    revealQrToken: vi.fn(),
    revealQrManualCode: vi.fn(),
}));
vi.mock("@/lib/customer-feedback/public-identity", () => ({
    resolveEmployeePublicLabel: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackQr: {
            findUnique: qrFindMock,
            findFirst: qrFindFirstMock,
            update: qrUpdateMock,
        },
        auditLog: { create: auditCreateMock },
        $transaction: transactionMock,
    },
}));

import { PATCH } from "./route";

const employeeQr = {
    id: "qr-1",
    targetType: "EMPLOYEE",
    employeeId: "employee-1",
    stationId: null,
    employee: { id: "employee-1", isActive: true, stationId: "station-own" },
    station: null,
    isActive: false,
    isTest: false,
    publicProfileApprovedAt: new Date("2026-08-01T00:00:00.000Z"),
    publicLabel: "นัท",
    publicPosition: "พนักงานบริการ",
    needsReprint: true,
    lastPrintedAt: new Date("2026-07-01T00:00:00.000Z"),
    revokedAt: new Date("2026-08-01T00:00:00.000Z"),
    version: 2,
};

function activateRequest() {
    return new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", expectedVersion: 2 }),
    });
}

describe("PATCH /api/admin/customer-feedback/qr-codes/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        enabledMock.mockReturnValue(true);
        authMock.mockResolvedValue({ user: { id: "manager-1" } });
        accessMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "manager-1", role: "MANAGER", stationId: "station-own" },
        });
        permissionMock.mockResolvedValue({ ok: true });
        stationScopeMock.mockResolvedValue({ ok: true, stationId: "station-own" });
        qrFindMock.mockResolvedValue(employeeQr);
        qrFindFirstMock.mockResolvedValue(null);
        qrUpdateMock.mockResolvedValue({});
        qrUpdateManyMock.mockResolvedValue({ count: 1 });
        auditCreateMock.mockResolvedValue({});
        transactionMock.mockResolvedValue([]);
        buildSecretsMock.mockReturnValue({
            columns: { tokenHash: "new-hash", tokenCiphertext: "new-cipher" },
            token: "new-token",
            manualCode: "NEWCODE1",
        });
        buildFeedbackUrlMock.mockReturnValue("https://example.test/f#t=new-token");
        stationEnabledMock.mockResolvedValue(true);
    });

    it("blocks every mutation when the feature is disabled", async () => {
        enabledMock.mockReturnValue(false);

        const response = await PATCH(activateRequest(), { params: Promise.resolve({ id: "qr-1" }) });

        expect(response.status).toBe(404);
        expect(qrFindMock).not.toHaveBeenCalled();
    });

    it("requires the current QR version to be marked printed before activation", async () => {
        const response = await PATCH(activateRequest(), { params: Promise.resolve({ id: "qr-1" }) });

        expect(response.status).toBe(400);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("rejects a manager trying to mutate a QR from another station", async () => {
        qrFindMock.mockResolvedValue({
            ...employeeQr,
            needsReprint: false,
            employee: { ...employeeQr.employee, stationId: "station-other" },
        });

        const response = await PATCH(activateRequest(), { params: Promise.resolve({ id: "qr-1" }) });

        expect(response.status).toBe(403);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("returns 409 when rotate wins before activation commits", async () => {
        qrFindMock.mockResolvedValue({ ...employeeQr, needsReprint: false });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
            customerFeedbackQr: {
                findFirst: vi.fn().mockResolvedValue(null),
                updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
            auditLog: { create: vi.fn() },
        }));

        const response = await PATCH(activateRequest(), { params: Promise.resolve({ id: "qr-1" }) });

        expect(response.status).toBe(409);
    });

    it("requires expectedVersion and returns 409 when printing an old version", async () => {
        const missingVersion = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "MARK_PRINTED" }),
        });
        expect((await PATCH(missingVersion, { params: Promise.resolve({ id: "qr-1" }) })).status).toBe(400);

        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            customerFeedbackQr: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
            auditLog: { create: vi.fn() },
        }));
        const oldVersion = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "MARK_PRINTED", expectedVersion: 1 }),
        });

        expect((await PATCH(oldVersion, { params: Promise.resolve({ id: "qr-1" }) })).status).toBe(409);
    });

    it("MARK_PRINTED เปิด QR พนักงานอัตโนมัติเมื่อรับทราบแล้ว", async () => {
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        const createAudit = vi.fn().mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
            customerFeedbackQr: {
                findUnique: vi.fn().mockResolvedValue({
                    version: 2,
                    isActive: false,
                    employeeId: "employee-1",
                    publicProfileApprovedAt: new Date("2026-08-01T00:00:00.000Z"),
                    publicLabel: "นัท",
                    publicPosition: "พนักงานบริการ",
                }),
                findFirst: vi.fn().mockResolvedValue(null),
                updateMany,
            },
            auditLog: { create: createAudit },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "MARK_PRINTED", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.autoActivated).toBe(true);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "qr-1", version: 2 },
            data: expect.objectContaining({ needsReprint: false, isActive: true, revokedAt: null }),
        }));
        expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ action: "CUSTOMER_FEEDBACK_QR_PRINTED" }),
        }));
        expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ action: "CUSTOMER_FEEDBACK_QR_ACTIVATED" }),
        }));
    });

    it("MARK_PRINTED ของสถานีไม่เปิดใช้งานอัตโนมัติ", async () => {
        qrFindMock.mockResolvedValue({
            ...employeeQr,
            targetType: "STATION",
            employeeId: null,
            employee: null,
            stationId: "station-own",
            station: { id: "station-own", isActive: true, publicEmergencyPhone: "191" },
            isPrimary: true,
        });
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            customerFeedbackQr: { updateMany },
            auditLog: { create: vi.fn().mockResolvedValue({}) },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "MARK_PRINTED", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.autoActivated).toBe(false);
        expect(updateMany).toHaveBeenCalledTimes(1);
        expect(updateMany.mock.calls[0][0].data).not.toHaveProperty("isActive");
        expect(updateMany.mock.calls[0][0].data).toEqual(expect.objectContaining({ needsReprint: false }));
    });

    it("MARK_PRINTED ไม่ยอมพิมพ์หรือเปิด QR พนักงานก่อนรับทราบ", async () => {
        qrFindMock.mockResolvedValue({ ...employeeQr, publicProfileApprovedAt: null });
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "MARK_PRINTED", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });

        expect(response.status).toBe(400);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("reveal ใช้ version และข้อความบนป้ายจากแถวที่ล็อกไว้ชุดเดียวกัน", async () => {
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            customerFeedbackQr: {
                findUnique: vi.fn().mockResolvedValue({
                    version: 2,
                    targetType: "EMPLOYEE",
                    isActive: true,
                    employeeId: "employee-1",
                    publicProfileApprovedAt: new Date("2026-08-01T00:00:00.000Z"),
                    tokenCiphertext: "token-cipher",
                    manualCodeCiphertext: "manual-cipher",
                    publicLabel: "ชื่อปัจจุบัน",
                    publicPosition: "ตำแหน่งปัจจุบัน",
                }),
                findFirst: vi.fn().mockResolvedValue(null),
            },
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
            auditLog: { create: vi.fn().mockResolvedValue({}) },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "reveal", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            version: 2,
            publicLabel: "ชื่อปัจจุบัน",
            publicPosition: "ตำแหน่งปัจจุบัน",
        });
    });

    it("reveal เปิด QR พนักงานที่รับทราบแล้วก่อนคืน QR เพื่อให้สแกนจาก print preview ได้", async () => {
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        const createAudit = vi.fn().mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            customerFeedbackQr: {
                findUnique: vi.fn().mockResolvedValue({
                    version: 2,
                    targetType: "EMPLOYEE",
                    isActive: false,
                    employeeId: "employee-1",
                    publicProfileApprovedAt: new Date("2026-08-01T00:00:00.000Z"),
                    tokenCiphertext: "token-cipher",
                    manualCodeCiphertext: "manual-cipher",
                    publicLabel: "นัท",
                    publicPosition: "พนักงานบริการ",
                }),
                findFirst: vi.fn().mockResolvedValue(null),
                updateMany,
            },
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
            auditLog: { create: createAudit },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "reveal", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.autoActivated).toBe(true);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "qr-1", version: 2, isActive: false },
            data: { isActive: true, revokedAt: null },
        }));
        expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ action: "CUSTOMER_FEEDBACK_QR_ACTIVATED" }),
        }));
        expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ action: "CUSTOMER_FEEDBACK_QR_REVEALED" }),
        }));
    });

    it("rotate และ reveal ไม่รับคำสั่งที่ไม่มี version จากหน้ารายการ", async () => {
        for (const action of ["rotate", "reveal"]) {
            const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action }),
            });
            expect((await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) })).status).toBe(400);
        }
    });

    it("blocks a second active primary station QR and maps the unique-index race to 409", async () => {
        const stationQr = {
            ...employeeQr,
            targetType: "STATION",
            employeeId: null,
            stationId: "station-own",
            employee: null,
            station: { id: "station-own", isActive: true, publicEmergencyPhone: "191" },
            isPrimary: true,
            needsReprint: false,
        };
        qrFindMock.mockResolvedValue(stationQr);
        qrFindFirstMock.mockResolvedValue({ id: "qr-active" });

        const alreadyActive = await PATCH(activateRequest(), { params: Promise.resolve({ id: "qr-1" }) });
        expect(alreadyActive.status).toBe(409);
        expect(transactionMock).not.toHaveBeenCalled();

        qrFindFirstMock.mockResolvedValue(null);
        transactionMock.mockRejectedValue({ code: "P2002" });
        const raced = await PATCH(activateRequest(), { params: Promise.resolve({ id: "qr-1" }) });
        expect(raced.status).toBe(409);
        await expect(raced.json()).resolves.toEqual({
            error: "มี QR อื่นถูกเปิดใช้งานพร้อมกัน กรุณาโหลดข้อมูลใหม่",
        });
    });

    it("ไม่เปิด QR จุดย่อยก่อนมี QR หลักที่พร้อมใช้งาน", async () => {
        qrFindMock.mockResolvedValue({
            ...employeeQr,
            targetType: "STATION",
            employeeId: null,
            stationId: "station-own",
            employee: null,
            station: { id: "station-own", isActive: true, publicEmergencyPhone: "191" },
            isPrimary: false,
            needsReprint: false,
        });
        stationEnabledMock.mockResolvedValue(false);

        const response = await PATCH(activateRequest(), { params: Promise.resolve({ id: "qr-1" }) });

        expect(response.status).toBe(400);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("rejects malformed or oversized public label fields", async () => {
        const wrongType = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "update-label", expectedVersion: 2, publicLabel: 123 }),
        });
        expect((await PATCH(wrongType, { params: Promise.resolve({ id: "qr-1" }) })).status).toBe(400);

        const longPosition = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "update-label", expectedVersion: 2, publicLabel: "นัท", publicPosition: "x".repeat(101) }),
        });
        expect((await PATCH(longPosition, { params: Promise.resolve({ id: "qr-1" }) })).status).toBe(400);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("requires the employee to approve the exact current label version", async () => {
        const missing = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "approve-public-profile" }),
        });
        expect((await PATCH(missing, { params: Promise.resolve({ id: "qr-1" }) })).status).toBe(400);

        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            customerFeedbackQr: {
                findUnique: vi.fn().mockResolvedValue({
                    version: 2,
                    targetType: "EMPLOYEE",
                    isActive: false,
                    employeeId: "employee-1",
                    publicLabel: "นัท",
                    publicPosition: "พนักงานบริการ",
                }),
                updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
            auditLog: { create: vi.fn() },
        }));
        const stale = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "approve-public-profile", expectedVersion: 1 }),
        });
        expect((await PATCH(stale, { params: Promise.resolve({ id: "qr-1" }) })).status).toBe(409);
    });

    it("รับทราบข้อมูลแล้วเปิด QR พนักงานทันทีโดยยังคง needsReprint จนกว่าจะยืนยันพิมพ์", async () => {
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        const createAudit = vi.fn().mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            customerFeedbackQr: {
                findUnique: vi.fn().mockResolvedValue({
                    version: 2,
                    targetType: "EMPLOYEE",
                    isActive: false,
                    employeeId: "employee-1",
                    publicLabel: "นัท",
                    publicPosition: "พนักงานบริการ",
                }),
                findFirst: vi.fn().mockResolvedValue(null),
                updateMany,
            },
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
            auditLog: { create: createAudit },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "approve-public-profile", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.autoActivated).toBe(true);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "qr-1", version: 2, targetType: "EMPLOYEE" },
            data: expect.objectContaining({ isActive: true, revokedAt: null }),
        }));
        expect(updateMany.mock.calls[0][0].data).not.toHaveProperty("needsReprint");
        expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ action: "CUSTOMER_FEEDBACK_QR_ACTIVATED" }),
        }));
    });

    it("increments the version when a station label changes so an old print cannot win", async () => {
        qrFindMock.mockResolvedValue({
            ...employeeQr,
            targetType: "STATION",
            employeeId: null,
            employee: null,
            stationId: "station-own",
            station: { id: "station-own", isActive: true, publicEmergencyPhone: "191" },
            isPrimary: true,
            publicLabel: "ป้ายเดิม",
            publicPosition: null,
        });
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            customerFeedbackQr: { updateMany },
            auditLog: { create: vi.fn().mockResolvedValue({}) },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "update-label", expectedVersion: 2, publicLabel: "ป้ายใหม่" }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.version).toBe(3);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "qr-1", version: 2 },
            data: expect.objectContaining({ tokenHash: "new-hash", version: { increment: 1 }, needsReprint: true }),
        }));
        expect(updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
            where: expect.objectContaining({ stationId: "station-own", id: { not: "qr-1" }, isActive: true }),
            data: expect.objectContaining({ isActive: false }),
        }));
    });

    it("หมุนรหัส QR พนักงานที่รับทราบแล้วและเปิดรหัสใหม่ทันที", async () => {
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        const createAudit = vi.fn().mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            user: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
            customerFeedbackQr: {
                findUnique: vi.fn().mockResolvedValue({
                    version: 2,
                    isActive: false,
                    employeeId: "employee-1",
                    publicProfileApprovedAt: employeeQr.publicProfileApprovedAt,
                    publicLabel: employeeQr.publicLabel,
                    publicPosition: employeeQr.publicPosition,
                }),
                findFirst: vi.fn().mockResolvedValue(null),
                updateMany,
            },
            auditLog: { create: createAudit },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "rotate", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.version).toBe(3);
        expect(body.message).toContain("QR ใหม่เปิดใช้งานทันที");
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "qr-1", version: 2 },
            data: expect.objectContaining({
                tokenHash: "new-hash",
                version: { increment: 1 },
                isActive: true,
                needsReprint: true,
                revokedAt: null,
            }),
        }));
        expect(createAudit).toHaveBeenCalledTimes(2);
        expect(createAudit).toHaveBeenLastCalledWith(expect.objectContaining({
            data: expect.objectContaining({ action: "CUSTOMER_FEEDBACK_QR_ACTIVATED" }),
        }));
    });

    it("หมุนรหัส QR พนักงานที่ยังไม่รับทราบโดยคงสถานะปิดไว้", async () => {
        qrFindMock.mockResolvedValue({ ...employeeQr, publicProfileApprovedAt: null });
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        const createAudit = vi.fn().mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            user: { findUnique: vi.fn() },
            customerFeedbackQr: {
                findUnique: vi.fn().mockResolvedValue({
                    version: 2,
                    isActive: false,
                    employeeId: "employee-1",
                    publicProfileApprovedAt: null,
                    publicLabel: employeeQr.publicLabel,
                    publicPosition: employeeQr.publicPosition,
                }),
                findFirst: vi.fn(),
                updateMany,
            },
            auditLog: { create: createAudit },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "rotate", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });

        expect(response.status).toBe(200);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ isActive: false, needsReprint: true }),
        }));
        expect(updateMany.mock.calls[0][0].data.revokedAt).toBeInstanceOf(Date);
        expect(createAudit).toHaveBeenCalledTimes(1);
    });

    it("หมุน QR หลักแล้วปิด QR จุดย่อยของสถานีใน transaction เดียวกัน", async () => {
        qrFindMock.mockResolvedValue({
            ...employeeQr,
            targetType: "STATION",
            employeeId: null,
            employee: null,
            stationId: "station-own",
            station: { id: "station-own", isActive: true, publicEmergencyPhone: "191" },
            isPrimary: true,
        });
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            customerFeedbackQr: { updateMany },
            auditLog: { create: vi.fn().mockResolvedValue({}) },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "rotate", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });

        expect(response.status).toBe(200);
        expect(updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
            where: expect.objectContaining({ stationId: "station-own", id: { not: "qr-1" }, isActive: true }),
            data: expect.objectContaining({ isActive: false }),
        }));
    });

    it("สร้าง production QR แยกจาก TEST เดิมและบังคับพิมพ์ใหม่", async () => {
        qrFindMock.mockResolvedValue({ ...employeeQr, isTest: true, isActive: false });
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        const create = vi.fn().mockResolvedValue({ id: "qr-production", version: 1 });
        transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
            $queryRaw: vi.fn().mockResolvedValue([]),
            customerFeedbackQr: {
                findFirst: vi.fn().mockResolvedValue(null),
                updateMany,
                create,
            },
            auditLog: { create: vi.fn().mockResolvedValue({}) },
        }));
        const request = new NextRequest("http://localhost/api/admin/customer-feedback/qr-codes/qr-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "promote-test", expectedVersion: 2 }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ id: "qr-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.qrCode.id).toBe("qr-production");
        expect(body.sourceQrId).toBe("qr-1");
        expect(body.version).toBe(1);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "qr-1", version: 2, isTest: true, isActive: false },
            data: expect.objectContaining({ tokenHash: "new-hash", version: { increment: 1 }, needsReprint: true }),
        }));
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ tokenHash: "new-hash", isTest: false, needsReprint: true }),
        }));
    });
});
