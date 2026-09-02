import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    assignments: vi.fn(),
    attendances: vi.fn(),
    leaves: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        shiftAssignment: { findMany: mocks.assignments },
        attendance: { findMany: mocks.attendances },
        leave: { findMany: mocks.leaves },
    },
}));

import { GET } from "./route";

const user = (id: string) => ({
    id,
    name: id,
    nickName: null,
    employeeId: id,
    station: { id: "station-1", name: "วัชรเกียรติ" },
});

describe("payroll absence overlaps", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
        mocks.attendances.mockResolvedValue([]);
        mocks.leaves.mockResolvedValue([]);
    });

    it("reports only employees who have an assignment and identifies day-off overlap", async () => {
        const date = new Date("2026-09-01T00:00:00+07:00");
        mocks.assignments.mockResolvedValue([
            { date, isDayOff: true, user: user("employee-1") },
            { date, isDayOff: true, user: user("employee-2") },
        ]);

        const response = await GET(new NextRequest(
            "http://localhost/api/admin/payroll/absence-overlaps?startDate=2026-09-01&endDate=2026-09-01",
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.totalOverlapDays).toBe(1);
        expect(body.overlaps[0].absentEmployees).toEqual([
            expect.objectContaining({ id: "employee-1", reason: "DAY_OFF" }),
            expect.objectContaining({ id: "employee-2", reason: "DAY_OFF" }),
        ]);
    });

    it("does not report scheduled employees who checked in", async () => {
        const date = new Date("2026-09-01T00:00:00+07:00");
        mocks.assignments.mockResolvedValue([
            { date, isDayOff: false, user: user("employee-1") },
            { date, isDayOff: false, user: user("employee-2") },
        ]);
        mocks.attendances.mockResolvedValue([
            { userId: "employee-1", date, checkInTime: new Date("2026-09-01T08:00:00+07:00") },
            { userId: "employee-2", date, checkInTime: new Date("2026-09-01T08:00:00+07:00") },
        ]);

        const response = await GET(new NextRequest(
            "http://localhost/api/admin/payroll/absence-overlaps?startDate=2026-09-01&endDate=2026-09-01",
        ));
        const body = await response.json();

        expect(body.overlaps).toEqual([]);
    });
});
