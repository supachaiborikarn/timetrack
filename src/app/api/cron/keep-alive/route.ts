import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/keep-alive
 * 
 * Lightweight endpoint to keep Neon database warm and prevent
 * the 3-5s cold start penalty on free tier (auto-suspend after 5min idle).
 * 
 * Called externally by UptimeRobot (free) every 4 minutes.
 * Uses a trivial SELECT 1 query — costs virtually nothing.
 */
export async function GET() {
    try {
        if (process.env.ENABLE_KEEP_ALIVE !== "true") {
            return NextResponse.json(
                { ok: true, disabled: true, reason: "keep-alive is disabled to save free-tier compute" },
                {
                    headers: {
                        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
                    },
                },
            );
        }

        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true, ts: new Date().toISOString() });
    } catch (error) {
        console.error("Keep-alive failed:", error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
