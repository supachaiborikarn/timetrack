import { after, type NextRequest, NextResponse } from "next/server";
import {
    DiscordInteraction,
    authorizeDiscordInteraction,
    executeDiscordCommand,
} from "@/lib/discord-commands";
import {
    editOriginalDiscordResponse,
    isDiscordTimestampFresh,
    verifyDiscordRequestSignature,
} from "@/lib/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_EPHEMERAL = 1 << 6;

function immediateMessage(content: string, status: number = 200): NextResponse {
    return NextResponse.json(
        {
            type: 4,
            data: {
                content,
                flags: RESPONSE_EPHEMERAL,
                allowed_mentions: { parse: [] },
            },
        },
        { status },
    );
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const timestamp = request.headers.get("x-signature-timestamp");
    const verified = verifyDiscordRequestSignature({
        rawBody,
        signature: request.headers.get("x-signature-ed25519"),
        timestamp,
        publicKey: process.env.DISCORD_PUBLIC_KEY,
    });

    if (!verified || !isDiscordTimestampFresh(timestamp)) {
        return NextResponse.json({ error: "invalid request signature" }, { status: 401 });
    }

    let interaction: DiscordInteraction;
    try {
        interaction = JSON.parse(rawBody) as DiscordInteraction;
    } catch {
        return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
    }

    if (interaction.type === 1) {
        return NextResponse.json({ type: 1 });
    }

    if (interaction.type !== 2) {
        return immediateMessage("รองรับเฉพาะคำสั่งแบบ Slash Command");
    }

    const authorization = authorizeDiscordInteraction(interaction);
    if (!authorization.allowed) {
        return immediateMessage(authorization.reason || "ไม่มีสิทธิ์ใช้คำสั่งนี้");
    }

    if (!interaction.application_id || !interaction.token) {
        return immediateMessage("ข้อมูลคำสั่งจาก Discord ไม่ครบ");
    }

    after(async () => {
        try {
            const payload = await executeDiscordCommand(interaction);
            const result = await editOriginalDiscordResponse(
                interaction.application_id,
                interaction.token,
                payload,
            );
            if (!result.ok) console.error("Discord command response failed:", result.error);
        } catch (error) {
            console.error("Discord command failed:", error);
            await editOriginalDiscordResponse(
                interaction.application_id,
                interaction.token,
                { content: "ประมวลผลคำสั่งไม่สำเร็จ กรุณาลองใหม่" },
            );
        }
    });

    return NextResponse.json({
        type: 5,
        data: {
            flags: RESPONSE_EPHEMERAL,
        },
    });
}
