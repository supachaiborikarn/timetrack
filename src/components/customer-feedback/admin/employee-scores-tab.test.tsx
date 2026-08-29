import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { EmployeeScoresTab } from "./employee-scores-tab";

const criteria = [
    {
        key: "uniform_and_name_badge",
        label: { th: "แต่งกายและป้ายชื่อ", en: "Uniform and badge" },
        weight: 15,
        yes: 8,
        no: 2,
        unsure: 0,
        evaluable: 10,
        earnedPerResponse: 12,
    },
];

const scoreResponse = {
    rubricVersion: "employee-v3",
    totalPoints: 64,
    from: "2026-08-01T00:00:00.000Z",
    toExclusive: "2026-08-30T00:00:00.000Z",
    employees: [
        {
            employeeId: "emp-1",
            label: "สมชาย ใจดี",
            stationId: "station-1",
            stationLabel: "สถานีหนึ่ง",
            latestResponseAt: "2026-08-29T00:00:00.000Z",
            responseCount: 10,
            minimumSample: 10,
            meetsMinimumSample: true,
            score64: 55.5,
            earnedWeight: 55.5,
            evaluableWeight: 64,
            excludedWeight: 0,
            criteria,
        },
        {
            employeeId: "emp-2",
            label: "สมหญิง บริการดี",
            stationId: "station-2",
            stationLabel: "สถานีสอง",
            latestResponseAt: "2026-08-29T00:00:00.000Z",
            responseCount: 8,
            minimumSample: 10,
            meetsMinimumSample: false,
            score64: null,
            earnedWeight: 0,
            evaluableWeight: 64,
            excludedWeight: 0,
            criteria: [{ ...criteria[0], yes: 5, no: 2, unsure: 1, evaluable: 7, earnedPerResponse: 10.7 }],
        },
    ],
};

describe("EmployeeScoresTab individual score navigation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock.mockResolvedValue(new Response(JSON.stringify(scoreResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }));
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("opens a dedicated individual view from the overview table", async () => {
        render(<EmployeeScoresTab />);

        await screen.findByText("สมชาย ใจดี");
        const row = screen.getByText("สมหญิง บริการดี").closest("tr");
        expect(row).not.toBeNull();
        fireEvent.click(within(row!).getByRole("button", { name: "ดูคะแนนรายคน" }));

        expect(await screen.findByText("รายละเอียดคะแนน — สมหญิง บริการดี")).toBeTruthy();
        expect(screen.getByRole("tab", { name: "รายบุคคล" }).getAttribute("aria-selected")).toBe("true");
        expect(screen.getByText(/ยังไม่แสดงคะแนนรายข้อ.*10 แบบประเมิน/)).toBeTruthy();
    });

    it("lets the admin switch employees inside the individual menu", async () => {
        render(<EmployeeScoresTab />);

        await screen.findByText("สมชาย ใจดี");
        fireEvent.click(screen.getByRole("tab", { name: "รายบุคคล" }));
        expect(await screen.findByText("รายละเอียดคะแนน — สมชาย ใจดี")).toBeTruthy();

        const chooser = screen.getByText("เลือกพนักงาน").closest("div");
        expect(chooser).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: /สมหญิง บริการดี/ }));

        expect(await screen.findByText("รายละเอียดคะแนน — สมหญิง บริการดี")).toBeTruthy();
        expect(screen.getByLabelText("ค้นหาพนักงาน")).toBeTruthy();
    });
});
