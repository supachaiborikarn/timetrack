import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const {
    enabledMock,
    accessMock,
    permissionMock,
    stationScopeMock,
    hasPermissionMock,
    countMock,
    findManyMock,
} = vi.hoisted(() => ({
    enabledMock: vi.fn(),
    accessMock: vi.fn(),
    permissionMock: vi.fn(),
    stationScopeMock: vi.fn(),
    hasPermissionMock: vi.fn(),
    countMock: vi.fn(),
    findManyMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackEnabled: enabledMock,
}));
vi.mock("@/lib/customer-feedback/access", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/customer-feedback/access")>();
    return {
        ...actual,
        getFeedbackAccessContext: accessMock,
        requireFeedbackPermission: permissionMock,
        getStationScope: stationScopeMock,
        canViewFeedbackIncident: hasPermissionMock,
    };
});
vi.mock("@/lib/permissions", () => ({ hasPermission: hasPermissionMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackResponse: {
            count: countMock,
            findMany: findManyMock,
        },
    },
}));

import { GET } from "./route";

function request(query = "") {
    return new NextRequest(`http://localhost/api/admin/customer-feedback/responses${query}`);
}

describe("GET /api/admin/customer-feedback/responses", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        enabledMock.mockReturnValue(true);
        accessMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "manager-1", role: "MANAGER", stationId: "station-own" },
        });
        permissionMock.mockResolvedValue({ ok: true });
        stationScopeMock.mockResolvedValue({ ok: true, stationId: "station-own" });
        hasPermissionMock.mockResolvedValue(false);
        countMock.mockResolvedValue(0);
        findManyMock.mockResolvedValue([]);
    });

    it("uses the manager station even when another station is requested", async () => {
        const response = await GET(request("?stationId=station-other"));

        expect(response.status).toBe(200);
        expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ stationId: "station-own" }),
        }));
    });

    it.each([
        ["?page=abc", "page"],
        ["?pageSize=0", "pageSize"],
        ["?kind=OTHER", "kind"],
        ["?validity=OTHER", "validity"],
        ["?from=2026-02-30", "from"],
        ["?from=2026-08-25&to=2026-08-24", "date range"],
    ])("rejects invalid query %s", async (query) => {
        const response = await GET(request(query));

        expect(response.status).toBe(400);
        expect(countMock).not.toHaveBeenCalled();
        expect(findManyMock).not.toHaveBeenCalled();
    });
});
