import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, openMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), openMock: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ResponsesTab } from "./responses-tab";

const responseRow = {
    id: "response-1",
    refCode: "CF-001",
    kind: "STANDARD",
    targetType: "EMPLOYEE",
    employeeLabelSnapshot: "พนักงานหนึ่ง",
    stationLabelSnapshot: "สถานีหนึ่ง",
    overallRating: 4,
    reasonKeys: [],
    incidentKey: null,
    comment: null,
    wantsFollowUp: true,
    validity: "VALID",
    submittedAt: "2026-08-24T01:00:00.000Z",
};

describe("ResponsesTab privacy and export filters", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("fetch", fetchMock);
        vi.stubGlobal("open", openMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("sends the visible kind and validity filters to CSV export", async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ responses: [], total: 0 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }));
        render(<ResponsesTab canExport canViewContact canModerate canViewIncident />);
        await screen.findByText("ยังไม่มีคำตอบ");

        fireEvent.change(screen.getByLabelText("ชนิด"), { target: { value: "STANDARD" } });
        fireEvent.change(screen.getByLabelText("สถานะข้อมูล"), { target: { value: "TEST" } });
        fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

        expect(openMock).toHaveBeenCalledWith(
            "/api/admin/customer-feedback/export?kind=STANDARD&validity=TEST",
            "_blank",
            "noopener,noreferrer",
        );
    });

    it("aborts a pending contact reveal when the filter changes", async () => {
        let contactSignal: AbortSignal | undefined;
        fetchMock.mockImplementation((input: string, init?: RequestInit) => {
            if (input.endsWith("/contact")) {
                contactSignal = init?.signal ?? undefined;
                return new Promise<Response>(() => undefined);
            }
            return Promise.resolve(new Response(JSON.stringify({ responses: [responseRow], total: 1 }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }));
        });
        render(<ResponsesTab canExport canViewContact canModerate canViewIncident />);

        await screen.findByText("พนักงานหนึ่ง");
        fireEvent.click(screen.getByTitle("ดูข้อมูลติดต่อ"));
        await waitFor(() => expect(contactSignal).toBeDefined());
        fireEvent.change(screen.getByLabelText("สถานะข้อมูล"), { target: { value: "VALID" } });

        await waitFor(() => expect(contactSignal?.aborted).toBe(true));
    });
});
