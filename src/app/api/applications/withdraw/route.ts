import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRate, getClientIp } from "@/lib/rate-limit";
import { purgeCitizenIdCopies } from "@/lib/application-privacy";

export const runtime = "nodejs";

const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;
const PURGE_DAYS = 180;
const NOT_FOUND_MESSAGE = "ไม่พบใบสมัคร กรุณาตรวจสอบรหัสอ้างอิงและเบอร์โทรอีกครั้ง";

export async function POST(request: NextRequest) {
    const ip = getClientIp(request.headers);
    const rate = checkRate(`applications:withdraw:${ip}`, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
        return NextResponse.json({ error: "ลองบ่อยเกินไป กรุณาลองใหม่ภายหลัง" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
    }

    let body: { ref?: string; phone?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
    }

    const ref = body.ref?.trim();
    const phone = body.phone?.trim().replace(/[^\d+]/g, "");
    if (!ref || !phone) {
        return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 400 });
    }

    const application = await prisma.jobApplication.findFirst({ where: { refCode: ref, phone } });
    if (!application) {
        return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    if (application.status === "HIRED") {
        return NextResponse.json({ error: "ใบสมัครนี้ได้รับการจ้างงานแล้ว ไม่สามารถถอนใบสมัครได้" }, { status: 400 });
    }

    if (application.status !== "WITHDRAWN") {
        await prisma.jobApplication.update({
            where: { id: application.id },
            data: {
                status: "WITHDRAWN",
                purgeAfter: new Date(Date.now() + PURGE_DAYS * 24 * 60 * 60 * 1000),
            },
        });
        await purgeCitizenIdCopies(application.id);
    }

    return NextResponse.json({ success: true });
}
