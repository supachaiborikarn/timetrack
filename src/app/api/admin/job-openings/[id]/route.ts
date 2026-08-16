import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "job_opening.manage"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.jobOpening.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });

        const body = await request.json();
        const data: Record<string, unknown> = {};

        // The slug is deliberately never updated — it's a public URL that may already be on a
        // printed QR poster, and changing it would break every link handed out so far.
        if (body.title !== undefined) {
            const title = cleanText(body.title, 150);
            if (!title) return NextResponse.json({ error: "กรุณากรอกชื่อตำแหน่ง" }, { status: 400 });
            data.title = title;
        }
        if (body.description !== undefined) {
            const description = cleanText(body.description, 5000);
            if (!description) return NextResponse.json({ error: "กรุณากรอกรายละเอียดงาน" }, { status: 400 });
            data.description = description;
        }
        if (body.responsibilities !== undefined) data.responsibilities = optionalText(body.responsibilities, 5000);
        if (body.requirements !== undefined) data.requirements = optionalText(body.requirements, 5000);
        if (body.benefits !== undefined) data.benefits = optionalText(body.benefits, 5000);
        if (body.employmentType !== undefined) {
            data.employmentType = EMPLOYMENT_TYPES.has(String(body.employmentType)) ? String(body.employmentType) : null;
        }
        if (body.stationId !== undefined) data.stationId = optionalText(body.stationId, 60);
        if (body.departmentId !== undefined) data.departmentId = optionalText(body.departmentId, 60);
        if (body.salaryMin !== undefined) data.salaryMin = optionalMoney(body.salaryMin);
        if (body.salaryMax !== undefined) data.salaryMax = optionalMoney(body.salaryMax);
        if (body.salaryNote !== undefined) data.salaryNote = optionalText(body.salaryNote, 120);
        if (body.positionsAvailable !== undefined) {
            const count = Number(body.positionsAvailable);
            data.positionsAvailable = Number.isFinite(count) && count > 0 ? Math.floor(count) : null;
        }
        if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
        if (body.closesAt !== undefined) data.closesAt = body.closesAt ? new Date(body.closesAt) : null;

        await prisma.jobOpening.update({ where: { id }, data });
        await logActivity(session.user.id, "UPDATE", "JobOpening", `แก้ไขประกาศรับสมัคร: ${existing.title}`, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating job opening:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "job_opening.manage"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.jobOpening.findUnique({
            where: { id },
            include: { _count: { select: { applications: true } } },
        });
        if (!existing) return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });

        // Applications point back at the opening they came from; deleting it would erase that
        // history, so a posting with applicants can only be closed, not removed.
        if (existing._count.applications > 0) {
            return NextResponse.json(
                { error: `ประกาศนี้มีผู้สมัคร ${existing._count.applications} คนแล้ว ลบไม่ได้ — ใช้วิธีปิดรับสมัครแทน` },
                { status: 400 }
            );
        }

        await prisma.jobOpening.delete({ where: { id } });
        await logActivity(session.user.id, "DELETE", "JobOpening", `ลบประกาศรับสมัคร: ${existing.title}`, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting job opening:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
