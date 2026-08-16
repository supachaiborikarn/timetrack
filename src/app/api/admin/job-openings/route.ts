import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { slugifyJobTitle } from "@/lib/job-opening";
import { logActivity } from "@/lib/logger";
import type { Role } from "@prisma/client";

const EMPLOYMENT_TYPES = new Set(["FULL_TIME", "PART_TIME", "DAILY"]);

function cleanText(value: unknown, maxLength: number): string {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalText(value: unknown, maxLength: number): string | null {
    return cleanText(value, maxLength) || null;
}

function optionalMoney(value: unknown): number | null {
    if (value == null || value === "") return null;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "job_opening.manage"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const openings = await prisma.jobOpening.findMany({
            orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
            include: {
                station: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
                _count: { select: { applications: true } },
            },
        });

        return NextResponse.json({
            openings: openings.map((o) => ({
                ...o,
                salaryMin: o.salaryMin ? Number(o.salaryMin) : null,
                salaryMax: o.salaryMax ? Number(o.salaryMax) : null,
                applicationCount: o._count.applications,
            })),
        });
    } catch (error) {
        console.error("Error listing job openings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "job_opening.manage"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const title = cleanText(body.title, 150);
        const description = cleanText(body.description, 5000);

        if (!title) return NextResponse.json({ error: "กรุณากรอกชื่อตำแหน่ง" }, { status: 400 });
        if (!description) return NextResponse.json({ error: "กรุณากรอกรายละเอียดงาน" }, { status: 400 });

        const stationId = optionalText(body.stationId, 60);
        if (stationId && !(await prisma.station.findUnique({ where: { id: stationId } }))) {
            return NextResponse.json({ error: "ไม่พบสาขาที่เลือก" }, { status: 400 });
        }

        // Slugs are permanent public URLs, so collisions get a numeric suffix rather than
        // overwriting someone else's posting.
        const baseSlug = slugifyJobTitle(title) || "job";
        let slug = baseSlug;
        for (let attempt = 2; await prisma.jobOpening.findUnique({ where: { slug } }); attempt++) {
            slug = `${baseSlug}-${attempt}`;
        }

        const opening = await prisma.jobOpening.create({
            data: {
                slug,
                title,
                description,
                responsibilities: optionalText(body.responsibilities, 5000),
                requirements: optionalText(body.requirements, 5000),
                benefits: optionalText(body.benefits, 5000),
                employmentType: EMPLOYMENT_TYPES.has(String(body.employmentType)) ? String(body.employmentType) : null,
                stationId,
                departmentId: optionalText(body.departmentId, 60),
                salaryMin: optionalMoney(body.salaryMin),
                salaryMax: optionalMoney(body.salaryMax),
                salaryNote: optionalText(body.salaryNote, 120),
                positionsAvailable: Number.isFinite(Number(body.positionsAvailable)) && Number(body.positionsAvailable) > 0
                    ? Math.floor(Number(body.positionsAvailable))
                    : null,
                isActive: body.isActive !== false,
                closesAt: body.closesAt ? new Date(body.closesAt) : null,
                createdById: session.user.id,
            },
        });

        await logActivity(session.user.id, "CREATE", "JobOpening", `สร้างประกาศรับสมัคร: ${title}`, opening.id);

        return NextResponse.json({ success: true, id: opening.id, slug: opening.slug });
    } catch (error) {
        console.error("Error creating job opening:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
