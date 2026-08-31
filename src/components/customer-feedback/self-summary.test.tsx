import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { CustomerFeedbackSelfSummary } from "./self-summary";

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

describe("CustomerFeedbackSelfSummary evaluation count visibility", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock.mockImplementation((input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("/review-requests")) return Promise.resolve(jsonResponse({}, 403));
            return Promise.resolve(jsonResponse({
                meetsMinimum: false,
                summary: {},
                message: "กำลังรวบรวมข้อมูลสำหรับคะแนนสรุป",
                source: "LIVE",
                scope: null,
                topReasons: [],
            }));
        });
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("shows a neutral collection status without a count or threshold", async () => {
        render(<CustomerFeedbackSelfSummary />);

        expect(await screen.findByText("กำลังรวบรวมข้อมูลสำหรับคะแนนสรุป")).toBeTruthy();
        expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
        expect(screen.queryByText(/คำตอบ/)).toBeNull();
    });

    it("shows a ready score without labeling the number of responses", async () => {
        fetchMock.mockImplementation((input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("/review-requests")) return Promise.resolve(jsonResponse({}, 403));
            return Promise.resolve(jsonResponse({
                meetsMinimum: true,
                summary: { average: 4.5, positiveRate: 80, negativeRate: 10 },
                message: null,
                source: "LIVE",
                scope: null,
                topReasons: [{ key: "employee_courtesy" }],
            }));
        });

        render(<CustomerFeedbackSelfSummary />);

        expect(await screen.findByText("4.50")).toBeTruthy();
        expect(screen.getByText("คะแนนเฉลี่ย")).toBeTruthy();
        expect(screen.queryByText(/คำตอบ/)).toBeNull();
        expect(screen.getByText("การพูดจาและความสุภาพ")).toBeTruthy();
    });
});
