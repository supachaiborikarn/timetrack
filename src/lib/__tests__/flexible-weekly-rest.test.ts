import { describe, expect, it } from "vitest";
import { buildFlexibleWeeklyRestDateKeys } from "@/lib/flexible-weekly-rest";

const bkkDate = (date: string, time = "00:00") => new Date(`${date}T${time}:00+07:00`);

function shift(userId: string, date: string, isDayOff = false) {
    return {
        userId,
        date: bkkDate(date),
        isDayOff,
        shift: {
            startTime: "08:00",
            endTime: "20:00",
            breakMinutes: 60,
            isNightShift: false,
        },
    };
}

function present(userId: string, date: string) {
    return {
        userId,
        date: bkkDate(date),
        checkInTime: bkkDate(date, "08:00"),
    };
}

const members = [
    { userId: "a", stationCode: "PAP" },
    { userId: "b", stationCode: "PAP" },
];

describe("flexible weekly rest scoring policy", () => {
    it("excuses one lone PAP absence in a Bangkok Mon-Sun week", () => {
        const result = buildFlexibleWeeklyRestDateKeys({
            members,
            assignments: [shift("a", "2026-09-14"), shift("b", "2026-09-14")],
            attendances: [present("b", "2026-09-14")],
            leaves: [],
            referenceTime: bkkDate("2026-09-15", "12:00"),
        });

        expect([...result.get("a") ?? []]).toEqual(["2026-09-14"]);
        expect([...result.get("b") ?? []]).toEqual([]);
    });

    it("does not excuse overlapping absences at the same station", () => {
        const result = buildFlexibleWeeklyRestDateKeys({
            members,
            assignments: [shift("a", "2026-09-14"), shift("b", "2026-09-14")],
            attendances: [],
            leaves: [],
            referenceTime: bkkDate("2026-09-15", "12:00"),
        });

        expect([...result.get("a") ?? []]).toEqual([]);
        expect([...result.get("b") ?? []]).toEqual([]);
    });

    it("treats a peer's approved leave as an overlapping day off even before the peer shift is due", () => {
        const peerLateShift = {
            ...shift("b", "2026-09-14"),
            shift: {
                startTime: "20:00",
                endTime: "06:00",
                breakMinutes: 60,
                isNightShift: true,
            },
        };
        const result = buildFlexibleWeeklyRestDateKeys({
            members,
            assignments: [shift("a", "2026-09-14"), peerLateShift],
            attendances: [],
            leaves: [{
                userId: "b",
                startDate: bkkDate("2026-09-14"),
                endDate: bkkDate("2026-09-14", "23:59"),
                status: "APPROVED",
            }],
            referenceTime: bkkDate("2026-09-14", "12:00"),
        });

        expect([...result.get("a") ?? []]).toEqual([]);
    });

    it("excuses at most one eligible absence per employee per week", () => {
        const result = buildFlexibleWeeklyRestDateKeys({
            members,
            assignments: [
                shift("a", "2026-09-14"),
                shift("b", "2026-09-14"),
                shift("a", "2026-09-16"),
                shift("b", "2026-09-16"),
            ],
            attendances: [present("b", "2026-09-14"), present("b", "2026-09-16")],
            leaves: [],
            referenceTime: bkkDate("2026-09-17", "12:00"),
        });

        expect([...result.get("a") ?? []]).toEqual(["2026-09-14"]);
    });

    it("does not burn the weekly entitlement on an approved leave day", () => {
        const result = buildFlexibleWeeklyRestDateKeys({
            members,
            assignments: [
                shift("a", "2026-09-14"),
                shift("b", "2026-09-14"),
                shift("a", "2026-09-16"),
                shift("b", "2026-09-16"),
            ],
            attendances: [present("b", "2026-09-14"), present("b", "2026-09-16")],
            leaves: [{
                userId: "a",
                startDate: bkkDate("2026-09-14"),
                endDate: bkkDate("2026-09-14", "23:59"),
                status: "APPROVED",
            }],
            referenceTime: bkkDate("2026-09-17", "12:00"),
        });

        expect([...result.get("a") ?? []]).toEqual(["2026-09-16"]);
    });

    it("does not grant an extra flexible rest day when a scheduled day off already exists that week", () => {
        const result = buildFlexibleWeeklyRestDateKeys({
            members,
            assignments: [
                shift("a", "2026-09-14", true),
                shift("b", "2026-09-14"),
                shift("a", "2026-09-16"),
                shift("b", "2026-09-16"),
            ],
            attendances: [present("b", "2026-09-14"), present("b", "2026-09-16")],
            leaves: [],
            referenceTime: bkkDate("2026-09-17", "12:00"),
        });

        expect([...result.get("a") ?? []]).toEqual([]);
    });

    it("resets the entitlement in the next Bangkok week", () => {
        const result = buildFlexibleWeeklyRestDateKeys({
            members,
            assignments: [
                shift("a", "2026-09-14"),
                shift("b", "2026-09-14"),
                shift("a", "2026-09-21"),
                shift("b", "2026-09-21"),
            ],
            attendances: [present("b", "2026-09-14"), present("b", "2026-09-21")],
            leaves: [],
            referenceTime: bkkDate("2026-09-22", "12:00"),
        });

        expect([...result.get("a") ?? []]).toEqual(["2026-09-14", "2026-09-21"]);
    });

    it("does not apply the special policy to WKO", () => {
        const result = buildFlexibleWeeklyRestDateKeys({
            members: [
                { userId: "a", stationCode: "WKO" },
                { userId: "b", stationCode: "WKO" },
            ],
            assignments: [shift("a", "2026-09-14"), shift("b", "2026-09-14")],
            attendances: [present("b", "2026-09-14")],
            leaves: [],
            referenceTime: bkkDate("2026-09-15", "12:00"),
        });

        expect(result.size).toBe(0);
    });
});
