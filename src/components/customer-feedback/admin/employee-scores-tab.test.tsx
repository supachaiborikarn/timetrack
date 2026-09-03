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
            temporalStats: {
                peakHour: "08:00 - 09:00 (6 แบบ)",
                peakSlot: "เช้าเร่งด่วน (06:00 - 09:00) (6 แบบ)",
                hourly: Array.from({ length: 24 }, (_, h) => ({
                    hour: h,
                    label: `${h.toString().padStart(2, "0")}:00`,
                    responseCount: h === 8 ? 6 : 1,
                    score64: 55.5,
                })),
                timeSlots: [
                    { slotKey: "morning_rush", label: "เช้าเร่งด่วน (06:00 - 09:00)", timeRange: "06:00 - 09:00", responseCount: 6, score64: 58.0, isPeak: true },
                    { slotKey: "daytime", label: "กลางวันทั่วไป (09:00 - 16:00)", timeRange: "09:00 - 16:00", responseCount: 2, score64: 54.0, isPeak: false },
                    { slotKey: "evening_rush", label: "เย็นเร่งด่วน (16:00 - 19:30)", timeRange: "16:00 - 19:30", responseCount: 2, score64: 52.0, isPeak: false },
                    { slotKey: "night", label: "ค่ำ / นอกเวลาเร่งด่วน", timeRange: "19:30 - 06:00", responseCount: 0, score64: null, isPeak: false },
                ],
                shifts: [
                    { shiftLabel: "กะเช้า", responseCount: 7, score64: 57.0 },
                    { shiftLabel: "กะบ่าย", responseCount: 3, score64: 52.0 },
                ],
                dayOfWeek: [
                    { type: "weekday", label: "วันธรรมดา (จ.-ศ.)", responseCount: 8, score64: 56.0 },
                    { type: "weekend", label: "วันหยุด (ส.-อา.)", responseCount: 2, score64: 53.0 },
                ],
                progression: {
                    buckets: [
                        { periodKey: "week-1", label: "สัปดาห์ที่ 1", startDate: "2026-08-01", endDate: "2026-08-07", responseCount: 5, score64: 52.0, customerPoints: 32.5 },
                        { periodKey: "week-2", label: "สัปดาห์ที่ 2", startDate: "2026-08-08", endDate: "2026-08-14", responseCount: 5, score64: 55.5, customerPoints: 34.7 },
                    ],
                    trend: "improving",
                    delta: 3.5,
                    summaryText: "คะแนนเฉลี่ยปรับตัวดีขึ้น +3.5 คะแนน เทียบกับช่วงก่อนหน้า (มีพัฒนาการ ↗)",
                },
                rushHourRubric: [
                    {
                        questionKey: "uniform_and_name_badge",
                        label: { th: "แต่งกายและป้ายชื่อ", en: "Uniform and badge" },
                        weight: 15,
                        normalRate: 100,
                        rushHourRate: 80,
                        gap: -20,
                        isDropAlert: true,
                    },
                ],
                recentFeedbacks: [
                    {
                        id: "fb-1",
                        submittedAt: "2026-08-29T08:30:00.000Z",
                        timeLabel: "29 ส.ค. 69 08:30 น.",
                        shiftLabel: "กะเช้า",
                        durationSeconds: 35,
                        score64: 58.0,
                        comment: "น้องบริการสุภาพและรวดเร็วมากครับ",
                        missedCriteria: ["แต่งกายและป้ายชื่อ"],
                    },
                ],
            },
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

    it("navigates through the individual temporal subtabs and displays detailed time analytics", async () => {
        render(<EmployeeScoresTab />);

        await screen.findByText("สมชาย ใจดี");
        fireEvent.click(screen.getByRole("tab", { name: "รายบุคคล" }));
        expect(await screen.findByText("รายละเอียดคะแนนลูกค้า — สมชาย ใจดี")).toBeTruthy();

        // 1. Overview subtab shows progression trend
        expect(screen.getByText(/มีพัฒนาการ \(\+3.5 คะแนน ↗\)/)).toBeTruthy();
        expect(screen.getByText(/ช่วงประเมินหนาแน่น:/)).toBeTruthy();
        expect(screen.getByText("แนวโน้มคะแนนการบริการ (Score Progression)")).toBeTruthy();

        // 2. Switch to Time & Shift subtab
        fireEvent.click(screen.getByRole("button", { name: "ช่วงเวลา & กะทำงาน" }));
        expect(screen.getByText("ปริมาณและคะแนนเฉลี่ยรายชั่วโมง (Bangkok Time)")).toBeTruthy();
        expect(screen.getByText("เปรียบเทียบตามกะการทำงาน (Shift Breakdown)")).toBeTruthy();
        expect(screen.getByText("วันธรรมดา vs วันหยุดสุดสัปดาห์")).toBeTruthy();
        expect(screen.getByText("กะเช้า")).toBeTruthy();

        // 3. Switch to Rubric 9-steps subtab
        fireEvent.click(screen.getByRole("button", { name: "เกณฑ์ 9 ข้อ & ชม.เร่งด่วน" }));
        expect(screen.getByText("การวิเคราะห์เกณฑ์ 9 ขั้นตอน Caltex และจุดตกหล่นช่วงเร่งด่วน")).toBeTruthy();
        expect(screen.getByText("ตกหล่นช่วงเร่งด่วน")).toBeTruthy();

        // 4. Switch to Customer Comments subtab
        fireEvent.click(screen.getByRole("button", { name: /ความคิดเห็นลูกค้า/ }));
        expect(screen.getByText("บันทึกคำตอบและความคิดเห็นจากลูกค้า (Customer Feedback Feed)")).toBeTruthy();
        expect(screen.getByText(/น้องบริการสุภาพและรวดเร็วมากครับ/)).toBeTruthy();
    });
});
