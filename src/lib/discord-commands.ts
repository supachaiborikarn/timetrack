import { buildDailyAttendanceEmbeds } from "@/lib/attendance-discord";
import { sendAttendanceSummaryToDiscord } from "@/lib/attendance-alerts";
import { getAttendanceDailySummary } from "@/lib/attendance-summary";
import { DiscordMessagePayload } from "@/lib/discord";

interface DiscordInteractionOption {
    type: number;
    name: string;
    value?: string | number | boolean;
    options?: DiscordInteractionOption[];
}

export interface DiscordInteraction {
    id: string;
    application_id: string;
    type: number;
    token: string;
    guild_id?: string;
    member?: {
        user?: { id: string; username?: string };
        roles?: string[];
    };
    user?: { id: string; username?: string };
    data?: {
        name?: string;
        options?: DiscordInteractionOption[];
    };
}

function envSet(name: string): Set<string> {
    return new Set(
        (process.env[name] || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
    );
}

export function authorizeDiscordInteraction(interaction: DiscordInteraction): {
    allowed: boolean;
    reason?: string;
} {
    const allowedGuilds = envSet("DISCORD_ALLOWED_GUILD_IDS");
    const allowedUsers = envSet("DISCORD_ALLOWED_USER_IDS");
    const allowedRoles = envSet("DISCORD_ALLOWED_ROLE_IDS");

    if (allowedGuilds.size > 0 && (!interaction.guild_id || !allowedGuilds.has(interaction.guild_id))) {
        return { allowed: false, reason: "เซิร์ฟเวอร์ Discord นี้ไม่ได้รับอนุญาต" };
    }

    if (allowedUsers.size === 0 && allowedRoles.size === 0) {
        return { allowed: false, reason: "ยังไม่ได้ตั้งค่ารายชื่อผู้มีสิทธิ์สั่งงาน Discord" };
    }

    const userId = interaction.member?.user?.id || interaction.user?.id;
    if (userId && allowedUsers.has(userId)) return { allowed: true };

    const roles = interaction.member?.roles || [];
    if (roles.some((roleId) => allowedRoles.has(roleId))) return { allowed: true };

    return { allowed: false, reason: "บัญชี Discord นี้ไม่มีสิทธิ์ดูข้อมูลพนักงาน" };
}

function selectedSubcommand(interaction: DiscordInteraction): DiscordInteractionOption | null {
    return interaction.data?.options?.find((option) => option.type === 1) ?? null;
}

function stringOption(options: DiscordInteractionOption[] | undefined, name: string): string | undefined {
    const value = options?.find((option) => option.name === name)?.value;
    return typeof value === "string" ? value.trim() : undefined;
}

function validDateKey(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

async function executeAttendanceCommand(interaction: DiscordInteraction): Promise<DiscordMessagePayload> {
    const subcommand = selectedSubcommand(interaction);
    const action = subcommand?.name || "summary";
    const dateKey = stringOption(subcommand?.options, "date");
    const stationCode = stringOption(subcommand?.options, "station")?.toUpperCase();

    if (dateKey && !validDateKey(dateKey)) {
        return { content: "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD และต้องเป็นวันที่จริง" };
    }

    const summary = await getAttendanceDailySummary({ dateKey, stationCode });
    if (summary.groups.length === 0) {
        const stationText = stationCode ? ` ของสาขา ${stationCode}` : "";
        return { content: `ไม่พบตารางกะวันที่ ${summary.dateKey}${stationText}` };
    }

    if (action === "send") {
        const sent = await sendAttendanceSummaryToDiscord(summary);
        const errorText = sent.errors.length > 0 ? `\n${sent.errors.slice(0, 3).join("\n")}` : "";
        return {
            content: `ส่งรายงานสำเร็จ ${sent.sent} สาขา และส่งไม่สำเร็จ ${sent.failed} สาขา${errorText}`,
        };
    }

    return {
        content: `รายงานวันที่ ${summary.dateKey} • ตรวจหลังเริ่มกะ ${summary.graceMinutes} นาที`,
        embeds: buildDailyAttendanceEmbeds(summary),
    };
}

export async function executeDiscordCommand(interaction: DiscordInteraction): Promise<DiscordMessagePayload> {
    const commandName = interaction.data?.name;
    if (commandName === "attendance") {
        return executeAttendanceCommand(interaction);
    }

    return {
        content: "ยังไม่รองรับคำสั่งนี้ ใช้ /attendance summary หรือ /attendance send",
    };
}
