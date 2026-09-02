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
    overallPoints: 100,
    workPoints: 60,
    customerPoints: 40,
    from: "2026-08-01T00:00:00.000Z",
    toExclusive: "2026-08-30T00:00:00.000Z",
    calculatedAt: "2026-08-30T08:30:00.000Z",
    monthlyEvaluationTarget: 60,
    monthlyFrom: "2026-07-31T17:00:00.000Z",
    monthlyToExclusive: "2026-08-31T17:00:00.000Z",
    employees: [
        {
            employeeId: "emp-1",
            rank: 1,
            label: "สมชาย ใจดี",
            stationId: "station-1",
            stationLabel: "สถานีหนึ่ง",
            latestResponseAt: "2026-08-29T00:00:00.000Z",
            responseCount: 10,
            monthlyEvaluationCount: 42,
            minimumSample: 10,
            meetsMinimumSample: true,
            score64: 55.5,
            overallScore: 87,
            workPoints: 52,
            workPointsMax: 60,
            customerPoints: 34.7,
            customerPointsMax: 40,
            customerIncluded: true,
            isProvisional: false,
            components: { presence: 22, punctuality: 13, completion: 9, breakDiscipline: 8 },
            counts: {
                scheduledDays: 10,
                requiredDays: 9,
                presentDays: 8,
                absentDays: 1,
                approvedLeaveDays: 1,
                pendingLeaveDays: 0,
                dayOffDays: 0,
                upcomingDays: 0,
                inProgressDays: 0,
                lateDays: 1,
                earlyLeaveDays: 0,
                overBreakDays: 1,
                leaveAttendanceOverlapDays: 0,
                duplicateLeaveDays: 0,
                unscheduledAttendanceDays: 0,
            },
            dataIssues: [],
            earnedWeight: 55.5,
            evaluableWeight: 64,
            excludedWeight: 0,
            criteria,
        },
        {
            employeeId: "emp-2",
            rank: null,
            label: "สมหญิง บริการดี",
            stationId: "station-2",
            stationLabel: "สถานีสอง",
            latestResponseAt: "2026-08-29T00:00:00.000Z",
            responseCount: 8,
            monthlyEvaluationCount: 60,
            minimumSample: 10,
            meetsMinimumSample: false,
            score64: null,
            overallScore: null,
            workPoints: 55,
            workPointsMax: 60,
            customerPoints: null,
            customerPointsMax: 40,
            customerIncluded: false,
            isProvisional: true,
            components: { presence: 25, punctuality: 12, completion: 10, breakDiscipline: 8 },
            counts: {
                scheduledDays: 10,
                requiredDays: 10,
                presentDays: 10,
                absentDays: 0,
                approvedLeaveDays: 0,
                pendingLeaveDays: 0,
                dayOffDays: 0,
                upcomingDays: 0,
                inProgressDays: 0,
                lateDays: 2,
                earlyLeaveDays: 0,
                overBreakDays: 1,
                leaveAttendanceOverlapDays: 0,
                duplicateLeaveDays: 0,
                unscheduledAttendanceDays: 0,
            },
            dataIssues: [],
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

    it("shows the combined ranking with work and customer points", async () => {
        render(<EmployeeScoresTab />);

        expect(await screen.findByText("อันดับผลงานรวม")).toBeTruthy();
        expect(screen.getByText("เวลาทำงาน / 60")).toBeTruthy();
        expect(screen.getByText("ลูกค้า / 40")).toBeTruthy();
        expect(screen.getByText("คะแนนรวม / 100")).toBeTruthy();
        const row = screen.getByText("สมชาย ใจดี").closest("tr");
        expect(row).not.toBeNull();
        expect(within(row!).getByText("52.0 / 60")).toBeTruthy();
        expect(within(row!).getByText("34.7 / 40")).toBeTruthy();
        expect(within(row!).getByText("87")).toBeTruthy();
    });

    it("does not poll the score API while the page stays open", async () => {
        const intervalSpy = vi.spyOn(window, "setInterval");

        render(<EmployeeScoresTab />);
        await screen.findByText("อันดับผลงานรวม");

        expect(intervalSpy.mock.calls.some(([, delay]) => delay === 60_000)).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        intervalSpy.mockRestore();
    });

    it("opens a dedicated individual view from the overview table", async () => {
        render(<EmployeeScoresTab />);

        await screen.findByText("สมชาย ใจดี");
        const row = screen.getByText("สมหญิง บริการดี").closest("tr");
        expect(row).not.toBeNull();
        fireEvent.click(within(row!).getByRole("button", { name: "ดูคะแนนรายคน" }));

        expect(await screen.findByText("รายละเอียดคะแนนลูกค้า — สมหญิง บริการดี")).toBeTruthy();
        expect(screen.getByRole("tab", { name: "รายบุคคล" }).getAttribute("aria-selected")).toBe("true");
        expect(screen.getByText(/ยังไม่แสดงคะแนนรายข้อ.*10 แบบประเมิน/)).toBeTruthy();
    });

    it("lets the admin switch employees inside the individual menu", async () => {
        render(<EmployeeScoresTab />);

        await screen.findByText("สมชาย ใจดี");
        fireEvent.click(screen.getByRole("tab", { name: "รายบุคคล" }));
        expect(await screen.findByText("รายละเอียดคะแนนลูกค้า — สมชาย ใจดี")).toBeTruthy();

        const chooser = screen.getByText("เลือกพนักงาน").closest("div");
        expect(chooser).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: /สมหญิง บริการดี/ }));

        expect(await screen.findByText("รายละเอียดคะแนนลูกค้า — สมหญิง บริการดี")).toBeTruthy();
        expect(screen.getByLabelText("ค้นหาพนักงาน")).toBeTruthy();
        const progress = screen.getByRole("progressbar", { name: "ยอดประเมินเดือนนี้ สมหญิง บริการดี" });
        expect(progress.getAttribute("aria-valuenow")).toBe("60");
        expect(progress.getAttribute("aria-valuemax")).toBe("60");
        expect(screen.getByText("ถึงเป้าแล้ว")).toBeTruthy();
    });

    it("shows current-month evaluation progress separately from the selected score-period count", async () => {
        render(<EmployeeScoresTab />);

        const progress = await screen.findByRole("progressbar", { name: "ยอดประเมินเดือนนี้ สมชาย ใจดี" });
        expect(progress.getAttribute("aria-valuenow")).toBe("42");
        expect(progress.getAttribute("aria-valuemax")).toBe("60");
        expect(screen.getByText("ขาด 18")).toBeTruthy();
        const row = screen.getByText("สมชาย ใจดี").closest("tr");
        expect(row).not.toBeNull();
        expect(within(row!).getByText("VALID 10/10")).toBeTruthy();
        expect(within(row!).getByText("42 / 60 แบบ")).toBeTruthy();
    });
});
