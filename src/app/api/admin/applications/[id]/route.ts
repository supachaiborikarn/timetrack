import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { decryptField } from "@/lib/crypto-field";
import { formatThaiCitizenId } from "@/lib/thai-citizen-id";
import { purgeCitizenIdCopies } from "@/lib/application-privacy";
import { getStorage } from "@/lib/storage";
import { logActivity } from "@/lib/logger";
import type { Role } from "@prisma/client";

const REVIEW_STATUSES = new Set(["SUBMITTED", "SCREENING", "INTERVIEW", "OFFERED", "REJECTED"]);
const PURGE_DAYS = 180;

async function loadApplicationScoped(id: string, role: Role, userStationId: string | null | undefined) {
    const application = await prisma.jobApplication.findUnique({
        where: { id },
        include: {
            station: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            reviewedBy: { select: { id: true, name: true } },
            hiredUser: { select: { id: true, name: true, employeeId: true } },
            files: {
                select: { id: true, kind: true, mimeType: true, sizeBytes: true, width: true, height: true, createdAt: true },
            },
        },
    });
    if (!application) return null;
    if (role === "MANAGER" && userStationId && application.stationId !== userStationId) return null;
    return application;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "application.view"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const application = await loadApplicationScoped(id, role, session.user.stationId);
        if (!application) return NextResponse.json({ error: "ไม่พบใบสมัคร" }, { status: 404 });

        const canViewSensitive = await hasPermission(role, "application.view_sensitive");
        const revealCitizenId = request.nextUrl.searchParams.get("revealCitizenId") === "1";

        let citizenIdFull: string | null = null;
        if (revealCitizenId) {
            if (!canViewSensitive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            if (application.citizenIdEnc) {
                citizenIdFull = formatThaiCitizenId(decryptField(application.citizenIdEnc));
                await logActivity(session.user.id, "VIEW_SENSITIVE", "JobApplication", `ดูเลขบัตรประชาชนเต็ม: ${application.refCode}`, application.id);
            }
        }

        return NextResponse.json({
            ...application,
            name: `${application.firstName} ${application.lastName}`.trim(),
            citizenIdEnc: undefined,
            citizenIdMasked: application.citizenIdLast4 ? `x-xxxx-xxxxx-xx-${application.citizenIdLast4}` : null,
            citizenIdFull,
            canViewSensitive,
        });
    } catch (error) {
        console.error("Error fetching application:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "application.review"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const existing = await loadApplicationScoped(id, role, session.user.stationId);
        if (!existing) return NextResponse.json({ error: "ไม่พบใบสมัคร" }, { status: 404 });
        if (existing.status === "HIRED" || existing.status === "WITHDRAWN") {
            return NextResponse.json({ error: "ไม่สามารถแก้ไขใบสมัครที่จ้างแล้วหรือถอนแล้ว" }, { status: 400 });
        }

        const body = await request.json();
        const data: Record<string, unknown> = {};

        if (body.status !== undefined) {
            if (!REVIEW_STATUSES.has(body.status)) return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
            if (body.status === "REJECTED" && !String(body.rejectReason ?? existing.rejectReason ?? "").trim()) {
                return NextResponse.json({ error: "กรุณาระบุเหตุผลที่ปฏิเสธ" }, { status: 400 });
            }
            data.status = body.status;
            data.reviewedById = session.user.id;
            data.reviewedAt = new Date();
            if (body.status === "REJECTED") {
                data.purgeAfter = new Date(Date.now() + PURGE_DAYS * 24 * 60 * 60 * 1000);
            } else if (existing.status === "REJECTED") {
                // Un-rejecting (moved back into active review) — cancel the scheduled purge.
                data.purgeAfter = null;
            }
        }
        if (body.interviewAt !== undefined) data.interviewAt = body.interviewAt ? new Date(body.interviewAt) : null;
        if (body.interviewNote !== undefined) data.interviewNote = String(body.interviewNote).slice(0, 2000) || null;
        if (body.ratingScore !== undefined) {
            const score = Number(body.ratingScore);
            data.ratingScore = Number.isFinite(score) ? Math.min(5, Math.max(1, Math.round(score))) : null;
        }
        if (body.rejectReason !== undefined) data.rejectReason = String(body.rejectReason).slice(0, 500) || null;

        const updated = await prisma.jobApplication.update({ where: { id }, data });

        if (updated.status === "REJECTED" && existing.status !== "REJECTED") {
            await purgeCitizenIdCopies(id);
        }

        await logActivity(
            session.user.id,
            "REVIEW",
            "JobApplication",
            `อัปเดตใบสมัคร ${existing.refCode}: ${Object.keys(data).join(", ")}`,
            id
        );

        return NextResponse.json({ success: true, status: updated.status });
    } catch (error) {
        console.error("Error updating application:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "application.delete"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const application = await prisma.jobApplication.findUnique({ where: { id }, include: { files: true } });
        if (!application) return NextResponse.json({ error: "ไม่พบใบสมัคร" }, { status: 404 });
        if (application.status === "HIRED") {
            return NextResponse.json({ error: "ไม่สามารถลบใบสมัครที่จ้างงานแล้ว" }, { status: 400 });
        }

        const storage = getStorage();
        for (const file of application.files) {
            if (file.storageDriver === "cloudinary" && file.storageKey) {
                try {
                    await storage.delete({ driver: "cloudinary", key: file.storageKey, resourceType: "image", mimeType: file.mimeType, size: file.sizeBytes });
                } catch (error) {
                    console.error("Error deleting file from storage during application delete:", file.id, error);
                }
            }
        }

        await prisma.jobApplication.delete({ where: { id } });
        await logActivity(session.user.id, "DELETE", "JobApplication", `ลบใบสมัคร ${application.refCode} ถาวร`, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting application:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
