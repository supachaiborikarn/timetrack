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
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true, ts: new Date().toISOString() });
    } catch (error) {
        console.error("Keep-alive failed:", error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
