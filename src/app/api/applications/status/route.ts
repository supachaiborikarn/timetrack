import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRate, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;
const NOT_FOUND_MESSAGE = "ไม่พบใบสมัคร กรุณาตรวจสอบรหัสอ้างอิงและเบอร์โทรอีกครั้ง";

export async function GET(request: NextRequest) {
    const ip = getClientIp(request.headers);
    const rate = checkRate(`applications:status:${ip}`, LIMIT, WINDOW_MS);
    if (!rate.allowed) {
        return NextResponse.json({ error: "ตรวจสอบบ่อยเกินไป กรุณาลองใหม่ภายหลัง" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
    }

    const ref = request.nextUrl.searchParams.get("ref")?.trim();
    const phone = request.nextUrl.searchParams.get("phone")?.trim().replace(/[^\d+]/g, "");
    if (!ref || !phone) {
        return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 400 });
    }

    const application = await prisma.jobApplication.findFirst({
        where: { refCode: ref, phone },
        include: {
            station: { select: { name: true } },
            // Applicants should be able to see the terms of the role they applied for — the pay
            // especially — rather than only finding out at the interview. All of this is already
            // public on /jobs, so returning it here exposes nothing new.
            jobOpening: {
                select: {
                    slug: true, title: true, employmentType: true,
                    salaryMin: true, salaryMax: true, salaryNote: true,
                },
            },
        },
    });

    if (!application) {
        return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json({
        refCode: application.refCode,
        status: application.status,
        positionTitle: application.positionTitle,
        stationName: application.station?.name ?? null,
        createdAt: application.createdAt,
        interviewAt: application.interviewAt,
        rejectReason: application.status === "REJECTED" ? application.rejectReason : null,
        // Null for applications submitted before job postings existed — the page then points
        // them at the list of current openings instead.
        jobOpening: application.jobOpening
            ? {
                slug: application.jobOpening.slug,
                title: application.jobOpening.title,
                employmentType: application.jobOpening.employmentType,
                salaryMin: application.jobOpening.salaryMin ? Number(application.jobOpening.salaryMin) : null,
                salaryMax: application.jobOpening.salaryMax ? Number(application.jobOpening.salaryMax) : null,
                salaryNote: application.jobOpening.salaryNote,
            }
            : null,
    });
}
