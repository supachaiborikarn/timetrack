import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/keep-alive
 *
 * Health check endpoint for uptime tools.
 * It does not touch Neon by default because frequent database pings keep
 * the free-tier compute awake and can burn the monthly allowance quickly.
 */
export async function GET(request: NextRequest) {
    try {
        const shouldWarmDatabase =
            process.env.ENABLE_DB_KEEP_ALIVE === "true" &&
            request.nextUrl.searchParams.get("db") === "1";

        if (!shouldWarmDatabase) {
            return NextResponse.json(
                {
                    ok: true,
                    db: false,
                    disabled: true,
                    reason: "database keep-alive is disabled to save free-tier compute",
                },
                {
                    headers: {
                        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
                    },
                },
            );
        }

        const { prisma } = await import("@/lib/prisma");
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json(
            { ok: true, db: true, ts: new Date().toISOString() },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("Keep-alive failed:", error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
