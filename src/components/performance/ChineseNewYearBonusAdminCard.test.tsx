import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChineseNewYearBonusAdminCard } from "./ChineseNewYearBonusAdminCard";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const payload = {
    selectedPeriodId: "period-1",
    periods: [{ id: "period-1", title: "แต๊ะเอีย 2569", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-12-31T00:00:00.000Z", isActive: true, closedAt: null }],
    reviews: [{
        employeeId: "front-1", label: "พนักงานหนึ่ง", stationLabel: "ปั๊ม A", departmentLabel: "หน้าลาน", profile: "FRONT_YARD", submission: null,
    }],
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("ChineseNewYearBonusAdminCard cashier policy", () => {
    it("shows the automatic 60/20/20 cashier formula and keeps manual supervisor scoring front-yard only", async () => {
        render(<ChineseNewYearBonusAdminCard />);
        expect(await screen.findByText("เสมียนปั๊มน้ำมัน")).toBeTruthy();
        expect(screen.getByText("คะแนนเสมียนใช้ข้อมูลจริงทั้งสถานี: ผลงานพนักงาน 60% + คะแนนปั๊ม 20% + ห้องน้ำ 20%")).toBeTruthy();
        expect(screen.getByText("คะแนนหัวหน้างาน / SOP — พนักงานหน้าลาน")).toBeTruthy();
        expect(screen.getByText("ส่วนนี้ใช้กับพนักงานหน้าลานเต็ม 20 คะแนนเท่านั้น คะแนนเสมียนไม่ใช้คะแนนหัวหน้าและคำนวณอัตโนมัติจาก 60/20/20")).toBeTruthy();
        expect(screen.queryByText(/รอเสมียนส่ง Self Assessment/)).toBeNull();
    });
});
