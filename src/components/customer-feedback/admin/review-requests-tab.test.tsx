import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
    fetchMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: { error: toastErrorMock, success: toastSuccessMock },
}));

import { ReviewRequestsTab } from "./review-requests-tab";

function reviewRequest(id: string, employeeLabelSnapshot: string) {
    return {
        id,
        employeeLabelSnapshot,
        scopeKey: "2026-H2",
        reason: "ขอให้ตรวจสอบคะแนน",
        status: "OPEN" as const,
        resolutionNote: null,
        submittedAt: "2026-08-24T01:00:00.000Z",
        resolvedAt: null,
    };
}

describe("ReviewRequestsTab pagination", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("fetch", fetchMock);
        fetchMock
            .mockResolvedValueOnce(new Response(JSON.stringify({
                requests: [reviewRequest("request-1", "พนักงานหน้าแรก")],
                total: 51,
                page: 1,
                pageSize: 50,
            }), { status: 200, headers: { "Content-Type": "application/json" } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                requests: [reviewRequest("request-51", "พนักงานหน้าสอง")],
                total: 51,
                page: 2,
                pageSize: 50,
            }), { status: 200, headers: { "Content-Type": "application/json" } }));
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("sends the pagination contract and lets the reviewer open the next page", async () => {
        render(<ReviewRequestsTab />);

        expect(await screen.findByText("พนักงานหน้าแรก")).toBeTruthy();
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            "/api/admin/customer-feedback/review-requests?status=OPEN&page=1&pageSize=50",
            { cache: "no-store" },
        );
        expect(screen.getByText(/หน้า 1 จาก 2/)).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "หน้าถัดไป" }));

        expect(await screen.findByText("พนักงานหน้าสอง")).toBeTruthy();
        await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/admin/customer-feedback/review-requests?status=OPEN&page=2&pageSize=50",
            { cache: "no-store" },
        ));
        expect(screen.getByText(/หน้า 2 จาก 2/)).toBeTruthy();
    });
});
