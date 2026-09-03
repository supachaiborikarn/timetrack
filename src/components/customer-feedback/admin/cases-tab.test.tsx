import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
    fetchMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: toastErrorMock, success: toastSuccessMock } }));

import { CasesTab } from "./cases-tab";

const unscopedCase = {
    id: "case-1",
    severity: "URGENT",
    status: "OPEN",
    category: "SAFETY",
    stationId: null,
    dueAt: "2026-08-24T12:00:00.000Z",
    acknowledgedAt: null,
    createdAt: "2026-08-24T10:00:00.000Z",
    assignedTo: null,
    response: {
        refCode: "CF-001",
        kind: "INCIDENT",
        overallRating: null,
        incidentKey: "unsafe",
        stationLabelSnapshot: null,
        employeeLabelSnapshot: null,
        comment: "พื้นลื่น",
    },
};

describe("CasesTab station assignment", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
        fetchMock
            .mockResolvedValueOnce(new Response(JSON.stringify({ cases: [unscopedCase], total: 1 }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                stations: [
                    { id: "station-1", name: "สถานีหนึ่ง", isActive: true },
                    { id: "station-closed", name: "สถานีปิด", isActive: false },
                ],
            }), { status: 200, headers: { "Content-Type": "application/json" } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ message: "อัปเดตเคสแล้ว" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ cases: [], total: 0 }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }));
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("lets ADMIN or HR choose an active station for an unscoped case", async () => {
        render(<CasesTab currentUserId="admin-1" canSetStation />);

        fireEvent.click(await screen.findByRole("button", { name: "ดูสาเหตุ / วิธีจัดการ" }));
        fireEvent.click(screen.getByRole("button", { name: "ระบุสถานี" }));

        const picker = await screen.findByLabelText("สถานี");
        await waitFor(() => expect(screen.getByRole("option", { name: "สถานีหนึ่ง" })).toBeTruthy());
        expect(screen.queryByRole("option", { name: "สถานีปิด" })).toBeNull();
        fireEvent.change(picker, { target: { value: "station-1" } });
        fireEvent.click(screen.getByRole("button", { name: "ยืนยันสถานี" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            "/api/admin/customer-feedback/cases/case-1",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({ action: "set-station", stationId: "station-1" }),
            }),
        ));
    });
});


describe("CasesTab actionable feedback details", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
        fetchMock.mockResolvedValue(new Response(JSON.stringify({
            cases: [{
                id: "case-rating-1",
                severity: "HIGH",
                status: "OPEN",
                category: "negative-feedback",
                stationId: "station-1",
                dueAt: "2026-09-04T10:00:00.000Z",
                acknowledgedAt: null,
                createdAt: "2026-09-03T10:00:00.000Z",
                assignedTo: null,
                response: {
                    refCode: "FB-RATING1",
                    kind: "STANDARD",
                    surveyVersion: "employee-v4",
                    overallRating: 1,
                    reasonKeys: ["employee_courtesy"],
                    serviceAreas: [],
                    incidentKey: null,
                    dangerStatus: null,
                    occurredAt: null,
                    noDetail: false,
                    stationLabelSnapshot: "วัชรเกียรติออยล์",
                    employeeLabelSnapshot: "มะนาว",
                    departmentLabelSnapshot: "WKO FUEL",
                    shiftLabelSnapshot: "กะเช้า",
                    wantsFollowUp: false,
                    validity: "VALID",
                    submittedAt: "2026-09-03T09:30:00.000Z",
                    comment: null,
                    answers: [
                        { questionKey: "caltex_greeting", state: "ANSWERED", numberValue: null, textValue: null, choiceValues: ["NO"] },
                        { questionKey: "uniform_and_name_badge", state: "ANSWERED", numberValue: null, textValue: null, choiceValues: ["YES"] },
                    ],
                },
            }],
            total: 1,
        }), { status: 200, headers: { "Content-Type": "application/json" } }));
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("shows why the case was opened, selected reasons, failed service items and useful no-comment wording", async () => {
        render(<CasesTab currentUserId="admin-1" canSetStation />);

        expect((await screen.findAllByText("ลูกค้าให้ 1/5 — ไม่พอใจมาก")).length).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole("button", { name: "ดูสาเหตุ / วิธีจัดการ" }));

        expect(screen.getByText("คะแนน 1–2 เปิดเคส HIGH อัตโนมัติ และต้องรับทราบภายใน 24 ชั่วโมง")).toBeTruthy();
        expect(screen.getAllByText("การพูดจาและความสุภาพ").length).toBeGreaterThan(0);
        expect(screen.getAllByText(/พนักงานกล่าวทักทาย/).length).toBeGreaterThan(0);
        expect(screen.getByText(/ลูกค้าไม่ได้พิมพ์ข้อความเพิ่มเติม/)).toBeTruthy();
        expect(screen.getByText(/ไม่ได้หมายความว่าไม่มีข้อมูล/)).toBeTruthy();
    });
});
