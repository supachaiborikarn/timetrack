import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { PreviousWeeklyResultCard, WeeklyChampionBanner } from "./weekly-result";
import type { PreviousWeeklyResult } from "@/lib/competition/weekly-results";

const previous: PreviousWeeklyResult = {
    championReward: { status: "AVAILABLE", rewardLabel: null, rewardValueBaht: null },
    periodKey: "2026-08-31", from: "2026-08-30T17:00:00Z", to: "2026-09-06T17:00:00Z",
    announcementAt: "2026-09-07T00:30:00Z", finalizedAt: null, status: "AWAITING_FINALIZATION",
    standings: [{ employeeLabelSnapshot: "หนึ่ง", totalScore: 88.5, finalRank: null, isEligible: true, fairPlayStatus: "CLEAR" }],
};

afterEach(cleanup);

describe("weekly result visibility", () => {
    it("shows the prior scores and waiting state before Monday finalization", () => {
        render(<PreviousWeeklyResultCard result={previous} />);
        expect(screen.getByRole("heading", { name: /ผลสัปดาห์ก่อน/ })).toHaveTextContent("31 ส.ค. – 6 ก.ย. 2569");
        expect(screen.getByText(/รอประกาศผล/)).toBeInTheDocument();
        expect(screen.getByText("หนึ่ง")).toBeInTheDocument();
        expect(screen.getByText("88.50")).toBeInTheDocument();
        expect(screen.queryByText("🥇")).not.toBeInTheDocument();
    });

    it("shows the official winner after finalization", () => {
        render(<PreviousWeeklyResultCard result={{ ...previous, status: "FINALIZED", standings: [{ ...previous.standings[0], finalRank: 1 }] }} />);
        expect(screen.getByText("ผลอย่างเป็นทางการ")).toBeInTheDocument();
        expect(screen.getByText("🥇")).toBeInTheDocument();
    });

    it("explains a finalized round without a champion and retains its scores", () => {
        render(<PreviousWeeklyResultCard result={{ ...previous, status: "FINALIZED", standings: [{ ...previous.standings[0], isEligible: false }] }} />);
        expect(screen.getByText("รอบนี้ไม่มีผู้ผ่านเกณฑ์รับตำแหน่งแชมป์")).toBeInTheDocument();
        expect(screen.getByText("88.50")).toBeInTheDocument();
    });

    it("keeps the last champion on the dashboard while the next result awaits review", () => {
        render(<WeeklyChampionBanner latest={{ periodKey: "2026-08-24", standings: [{ employeeLabelSnapshot: "แชมป์เดิม", finalRank: 1 }] }} previous={{ ...previous, status: "PENDING_REVIEW" }} />);
        expect(screen.getByText("แชมป์เดิม")).toBeInTheDocument();
        expect(screen.getByText("2026-08-24")).toBeInTheDocument();
        expect(screen.getByText(/รอตรวจสอบผลก่อนประกาศแชมป์/)).toBeInTheDocument();
    });

    it("shows a dashboard waiting message when no champion has ever been finalized", () => {
        render(<WeeklyChampionBanner latest={null} previous={previous} />);
        expect(screen.getByText(/รอประกาศผล/)).toBeInTheDocument();
        expect(screen.queryByText("หนึ่ง")).not.toBeInTheDocument();
    });

    it.each([
        ["AVAILABLE", "รอเลือกรางวัล"],
        ["SELECTED", "เลือกแล้ว: Champion Meal (300 บาท) · รอมอบ"],
        ["FULFILLED", "ได้รับแล้ว: Champion Meal (300 บาท)"],
        ["CANCELLED", "รางวัลถูกยกเลิก"],
    ] as const)("shows %s reward status after the champion's name", (status, text) => {
        render(<WeeklyChampionBanner latest={{ periodKey: "2026-08-31", standings: [{ employeeLabelSnapshot: "หนึ่ง", finalRank: 1 }], championReward: { status, rewardLabel: "Champion Meal", rewardValueBaht: 300 } }} previous={previous} />);
        expect(screen.getByText("หนึ่ง")).toHaveTextContent(`หนึ่ง· ${text}`);
        if (status !== "FULFILLED") expect(screen.queryByText(/ได้รับแล้ว/)).not.toBeInTheDocument();
    });
});
