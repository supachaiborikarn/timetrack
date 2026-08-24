import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/customer-feedback/self-summary", () => ({
    CustomerFeedbackSelfSummary: () => null,
}));

import PerformancePage from "./page";

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => { resolve = done; });
    return { promise, resolve };
}

describe("PerformancePage period switching", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("ignores a late submission response from the previously selected period", async () => {
        const periodA = {
            id: "period-a", title: "รอบเอ", startDate: "2026-07-01", endDate: "2026-07-31", isActive: true,
        };
        const periodB = {
            id: "period-b", title: "รอบบี", startDate: "2026-08-01", endDate: "2026-08-31", isActive: true,
        };
        const lateA = deferred<Response>();
        fetchMock.mockImplementation((input: string) => {
            if (input === "/api/performance/periods") {
                return Promise.resolve(new Response(JSON.stringify({ periods: [periodA, periodB] }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }));
            }
            if (input.includes("periodId=period-a")) return lateA.promise;
            if (input.includes("periodId=period-b")) {
                return Promise.resolve(new Response(JSON.stringify({
                    submission: { id: "submission-b", status: "SUBMITTED", selfReview: "ผลงานรอบบี" },
                }), { status: 200, headers: { "Content-Type": "application/json" } }));
            }
            throw new Error(`Unexpected fetch: ${input}`);
        });

        render(<PerformancePage />);
        const periodSelect = await screen.findByLabelText("เลือกรอบประเมิน");
        fireEvent.change(periodSelect, { target: { value: "period-b" } });

        const review = await screen.findByDisplayValue("ผลงานรอบบี");
        lateA.resolve(new Response(JSON.stringify({
            submission: { id: "submission-a", status: "SUBMITTED", selfReview: "ผลงานรอบเอ" },
        }), { status: 200, headers: { "Content-Type": "application/json" } }));

        await waitFor(() => expect((review as HTMLTextAreaElement).value).toBe("ผลงานรอบบี"));
        expect(screen.queryByDisplayValue("ผลงานรอบเอ")).toBeNull();
    });
});
