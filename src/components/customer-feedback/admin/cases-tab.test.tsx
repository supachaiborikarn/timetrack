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

        fireEvent.click(await screen.findByRole("button", { name: "เปิดรายละเอียด" }));
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
