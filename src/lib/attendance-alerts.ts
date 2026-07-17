import { Prisma } from "@prisma/client";
import {
    AttendanceDailySummary,
    AttendanceGroupSummary,
    getAttendanceDailySummary,
    groupAttendanceByStation,
} from "@/lib/attendance-summary";
import {
    buildCompactAttendanceMessage,
    buildDailyAttendanceEmbeds,
    buildShiftAttendanceEmbed,
} from "@/lib/attendance-discord";
import {
    DiscordEmbed,
    DiscordSendResult,
    getAttendanceDiscordWebhookUrl,
    sendDiscordWebhook,
} from "@/lib/discord";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isWebPushConfigured, sendPushToUsers } from "@/lib/web-push";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const CLAIM_STALE_AFTER_MS = 20 * 60 * 1000;
const DEFAULT_DAILY_REPORT_TIME = "23:30";

type AlertReportType = "SHIFT_START" | "DAILY";

interface AlertClaimKey {
    date: Date;
    stationId: string;
    shiftId: string;
    reportType: AlertReportType;
}

export interface AttendanceAlertRunResult {
    dateKey: string;
    dueGroups: number;
    sent: number;
    skipped: number;
    failed: number;
    dailySent: number;
    discordConfigured: boolean;
    errors: string[];
}

async function claimAlert(key: AlertClaimKey): Promise<string | null> {
    try {
        const record = await prisma.attendanceAlertLog.create({
            data: {
                ...key,
                status: "PENDING",
            },
            select: { id: true },
        });
        return record.id;
    } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
            throw error;
        }
    }

    const existing = await prisma.attendanceAlertLog.findUnique({
        where: {
            date_stationId_shiftId_reportType: key,
        },
        select: {
            id: true,
            status: true,
            updatedAt: true,
        },
    });

    if (!existing) return null;
    const staleBefore = new Date(Date.now() - CLAIM_STALE_AFTER_MS);
    const canRetry = existing.status === "FAILED"
        || (existing.status === "PENDING" && existing.updatedAt < staleBefore);
    if (!canRetry) return null;

    const claimed = await prisma.attendanceAlertLog.updateMany({
        where: {
            id: existing.id,
            OR: [
                { status: "FAILED" },
                { status: "PENDING", updatedAt: { lt: staleBefore } },
            ],
        },
        data: {
            status: "PENDING",
            error: null,
        },
    });

    return claimed.count === 1 ? existing.id : null;
}

async function finishClaim(claimId: string, result: DiscordSendResult): Promise<void> {
    await prisma.attendanceAlertLog.update({
        where: { id: claimId },
        data: result.ok
            ? {
                status: "SENT",
                discordMessageId: result.messageId ?? null,
                error: null,
            }
            : {
                status: "FAILED",
                error: (result.error || "ส่ง Discord ไม่สำเร็จ").slice(0, 1000),
            },
    });
}

async function notifyManagersInApp(group: AttendanceGroupSummary): Promise<void> {
    const recipients = await prisma.user.findMany({
        where: {
            isActive: true,
            employeeStatus: "ACTIVE",
            OR: [
                { role: { in: ["ADMIN", "HR"] } },
                { role: "MANAGER", stationId: group.stationId === "UNASSIGNED" ? undefined : group.stationId },
            ],
        },
        select: { id: true },
    });
    const userIds = [...new Set(recipients.map((recipient) => recipient.id))];
    if (userIds.length === 0) return;

    const title = group.absentWithoutLeave.length > 0
        ? `พบพนักงานขาด • ${group.stationName}`
        : `สรุปพนักงานครบ • ${group.stationName}`;
    const message = buildCompactAttendanceMessage(group);
    const link = `/admin/attendance?date=${group.dateKey}`;

    await createNotifications(userIds, "ATTENDANCE_ALERT", title, message, link);

    if (isWebPushConfigured()) {
        await sendPushToUsers(userIds, {
            title,
            body: message,
            url: link,
            tag: `attendance-${group.dateKey}-${group.stationCode}-${group.shiftCode}`,
            data: {
                type: "ATTENDANCE_ALERT",
                stationCode: group.stationCode,
                shiftCode: group.shiftCode,
                date: group.dateKey,
            },
        });
    }
}

async function dispatchShiftAlert(group: AttendanceGroupSummary): Promise<"sent" | "skipped" | "failed"> {
    const webhookUrl = getAttendanceDiscordWebhookUrl(group.stationCode);
    if (!webhookUrl) return "failed";

    const claimId = await claimAlert({
        date: parseDateStringToBangkokMidnight(group.dateKey),
        stationId: group.stationId,
        shiftId: group.shiftId,
        reportType: "SHIFT_START",
    });
    if (!claimId) return "skipped";

    const result = await sendDiscordWebhook(webhookUrl, {
        username: "HR Payroll",
        embeds: [buildShiftAttendanceEmbed(group)],
    });
    await finishClaim(claimId, result);

    if (!result.ok) return "failed";

    try {
        await notifyManagersInApp(group);
    } catch (error) {
        console.error("Attendance in-app notification failed:", error);
    }
    return "sent";
}

function currentBangkokMinutes(referenceTime: Date): number {
    const shifted = new Date(referenceTime.getTime() + BANGKOK_OFFSET_MS);
    return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function isDailyAttendanceReportDue(
    referenceTime: Date,
    configuredTime: string = process.env.ATTENDANCE_DAILY_REPORT_TIME || DEFAULT_DAILY_REPORT_TIME,
): boolean {
    const match = /^(\d{2}):(\d{2})$/.exec(configuredTime);
    if (!match) return false;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return false;
    return currentBangkokMinutes(referenceTime) >= hour * 60 + minute;
}

async function dispatchDailyStationAlert(
    summary: AttendanceDailySummary,
    stationId: string,
    stationCode: string,
): Promise<"sent" | "skipped" | "failed"> {
    const webhookUrl = getAttendanceDiscordWebhookUrl(stationCode);
    if (!webhookUrl) return "failed";

    const claimId = await claimAlert({
        date: parseDateStringToBangkokMidnight(summary.dateKey),
        stationId,
        shiftId: "ALL",
        reportType: "DAILY",
    });
    if (!claimId) return "skipped";

    const stationSummary: AttendanceDailySummary = {
        ...summary,
        groups: summary.groups.filter((group) => group.stationId === stationId),
    };
    const embed = buildDailyAttendanceEmbeds(stationSummary)[0];
    const result = embed
        ? await sendDiscordWebhook(webhookUrl, { username: "HR Payroll", embeds: [embed] })
        : { ok: false, error: "ไม่พบข้อมูลสาขา" };
    await finishClaim(claimId, result);
    return result.ok ? "sent" : "failed";
}

export async function runDueAttendanceAlerts(referenceTime: Date = new Date()): Promise<AttendanceAlertRunResult> {
    const summary = await getAttendanceDailySummary({ referenceTime });
    const dueGroups = summary.groups.filter((group) => group.isDue);
    const stationSummaries = groupAttendanceByStation(summary);
    const configured = stationSummaries.some((station) => Boolean(getAttendanceDiscordWebhookUrl(station.stationCode)));
    const result: AttendanceAlertRunResult = {
        dateKey: summary.dateKey,
        dueGroups: dueGroups.length,
        sent: 0,
        skipped: 0,
        failed: 0,
        dailySent: 0,
        discordConfigured: configured,
        errors: [],
    };

    for (const group of dueGroups) {
        try {
            const status = await dispatchShiftAlert(group);
            result[status] += 1;
        } catch (error) {
            result.failed += 1;
            result.errors.push(error instanceof Error ? error.message : "ส่งรายงานกะไม่สำเร็จ");
        }
    }

    if (isDailyAttendanceReportDue(referenceTime)) {
        for (const station of stationSummaries) {
            try {
                const status = await dispatchDailyStationAlert(
                    summary,
                    station.stationId,
                    station.stationCode,
                );
                if (status === "sent") result.dailySent += 1;
                if (status === "skipped") result.skipped += 1;
                if (status === "failed") result.failed += 1;
            } catch (error) {
                result.failed += 1;
                result.errors.push(error instanceof Error ? error.message : "ส่งสรุปปลายวันไม่สำเร็จ");
            }
        }
    }

    return result;
}

export async function sendAttendanceSummaryToDiscord(
    summary: AttendanceDailySummary,
): Promise<{ sent: number; failed: number; errors: string[] }> {
    const stationSummaries = groupAttendanceByStation(summary);
    const embedsByStation = new Map<string, DiscordEmbed>();

    for (const embed of buildDailyAttendanceEmbeds(summary)) {
        const station = stationSummaries[embedsByStation.size];
        if (station) embedsByStation.set(station.stationId, embed);
    }

    const result = { sent: 0, failed: 0, errors: [] as string[] };
    for (const station of stationSummaries) {
        const webhookUrl = getAttendanceDiscordWebhookUrl(station.stationCode);
        const embed = embedsByStation.get(station.stationId);
        if (!webhookUrl || !embed) {
            result.failed += 1;
            result.errors.push(`ยังไม่ได้ตั้งค่า Discord ของ ${station.stationName}`);
            continue;
        }

        const sent = await sendDiscordWebhook(webhookUrl, {
            username: "HR Payroll",
            embeds: [embed],
        });
        if (sent.ok) result.sent += 1;
        else {
            result.failed += 1;
            result.errors.push(sent.error || `ส่ง ${station.stationName} ไม่สำเร็จ`);
        }
    }

    return result;
}
