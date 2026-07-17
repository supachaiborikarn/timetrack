import {
    AttendanceDailySummary,
    AttendanceGroupSummary,
    AttendancePersonSummary,
    AttendanceStationSummary,
    groupAttendanceByStation,
} from "@/lib/attendance-summary";
import { DiscordEmbed } from "@/lib/discord";

const COLOR_GREEN = 0x22c55e;
const COLOR_AMBER = 0xf59e0b;
const COLOR_RED = 0xef4444;
const DISCORD_FIELD_LIMIT = 1024;

function truncate(value: string, limit: number = DISCORD_FIELD_LIMIT): string {
    return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}

function formatThaiDate(dateKey: string): string {
    const [year, month, day] = dateKey.split("-").map(Number);
    return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year + 543}`;
}

function displayName(person: AttendancePersonSummary): string {
    const nickName = person.nickName ? ` (${person.nickName})` : "";
    return `${person.name}${nickName} — ${person.departmentName}`;
}

function personList(people: AttendancePersonSummary[]): string {
    if (people.length === 0) return "ไม่มี";
    return truncate(people.map((person, index) => `${index + 1}. ${displayName(person)}`).join("\n"));
}

function reportColor(absent: number, pending: number): number {
    if (absent > 0) return COLOR_RED;
    if (pending > 0) return COLOR_AMBER;
    return COLOR_GREEN;
}

export function buildShiftAttendanceEmbed(group: AttendanceGroupSummary): DiscordEmbed {
    const isComplete = group.absentWithoutLeave.length === 0 && group.pendingLeave.length === 0;
    const statusLabel = isComplete ? "✅ รายชื่อครบตามสถานะ" : "🚨 พบคนที่ต้องตรวจสอบ";

    return {
        title: `${statusLabel} • ${group.stationName}`,
        description: `วันที่ ${formatThaiDate(group.dateKey)} • ${group.shiftName} (${group.startTime}-${group.endTime})`,
        color: reportColor(group.absentWithoutLeave.length, group.pendingLeave.length),
        fields: [
            {
                name: "สรุป",
                value: [
                    `ต้องมา ${group.scheduled} คน`,
                    `มาแล้ว ${group.present.length} คน`,
                    `ลาอนุมัติ ${group.approvedLeave.length} คน`,
                    `ลารออนุมัติ ${group.pendingLeave.length} คน`,
                    `ขาดโดยไม่ลา ${group.absentWithoutLeave.length} คน`,
                ].join("\n"),
                inline: true,
            },
            {
                name: "ขาดโดยไม่ลา",
                value: personList(group.absentWithoutLeave),
            },
            {
                name: "ลารออนุมัติ",
                value: personList(group.pendingLeave),
            },
            {
                name: "ลาอนุมัติ",
                value: personList(group.approvedLeave),
            },
        ],
        footer: { text: "HR Payroll • ตรวจหลังเริ่มกะตามเวลาที่ตั้งไว้" },
        timestamp: new Date().toISOString(),
    };
}

function buildStationAttendanceEmbed(station: AttendanceStationSummary, dateKey: string): DiscordEmbed {
    const shiftLines = station.groups.map((group) => {
        const upcoming = group.upcoming.length > 0 ? ` • ยังไม่ถึงเวลา ${group.upcoming.length}` : "";
        return `**${group.startTime} ${group.shiftName}** — มา ${group.present.length}/${group.scheduled} • ลา ${group.approvedLeave.length} • รอ ${group.pendingLeave.length} • ขาด ${group.absentWithoutLeave.length}${upcoming}`;
    });

    return {
        title: `📊 สรุปพนักงานประจำวัน • ${station.stationName}`,
        description: `วันที่ ${formatThaiDate(dateKey)}`,
        color: reportColor(station.absentWithoutLeave, station.pendingLeave),
        fields: [
            {
                name: "ยอดรวม",
                value: [
                    `มีกะ ${station.scheduled} คน`,
                    `มาแล้ว ${station.present} คน`,
                    `ลาอนุมัติ ${station.approvedLeave} คน`,
                    `ลารออนุมัติ ${station.pendingLeave} คน`,
                    `ขาดโดยไม่ลา ${station.absentWithoutLeave} คน`,
                    `ยังไม่ถึงเวลากะ ${station.upcoming} คน`,
                ].join("\n"),
                inline: true,
            },
            {
                name: "แยกตามกะ",
                value: truncate(shiftLines.join("\n") || "ไม่มีตารางกะ"),
            },
            {
                name: "ขาดโดยไม่ลา",
                value: personList(station.absentPeople),
            },
            {
                name: "ลารออนุมัติ",
                value: personList(station.pendingLeavePeople),
            },
            {
                name: "ลาอนุมัติ",
                value: personList(station.approvedLeavePeople),
            },
        ],
        footer: { text: "HR Payroll • สรุปจากตารางกะ การลงเวลา และใบลา" },
        timestamp: new Date().toISOString(),
    };
}

export function buildDailyAttendanceEmbeds(summary: AttendanceDailySummary): DiscordEmbed[] {
    return groupAttendanceByStation(summary)
        .slice(0, 10)
        .map((station) => buildStationAttendanceEmbed(station, summary.dateKey));
}

export function buildCompactAttendanceMessage(group: AttendanceGroupSummary): string {
    const absentNames = group.absentWithoutLeave.map((person) => person.nickName || person.name).join(", ");
    const pendingNames = group.pendingLeave.map((person) => person.nickName || person.name).join(", ");
    const details = [
        `มา ${group.present.length}/${group.scheduled} คน`,
        `ลาอนุมัติ ${group.approvedLeave.length} คน`,
        `ขาดโดยไม่ลา ${group.absentWithoutLeave.length} คน${absentNames ? `: ${absentNames}` : ""}`,
    ];
    if (pendingNames) details.push(`ลารออนุมัติ: ${pendingNames}`);
    return truncate(details.join(" • "), 500);
}
