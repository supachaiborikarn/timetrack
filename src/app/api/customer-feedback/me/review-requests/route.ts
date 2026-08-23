import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * GET  /api/customer-feedback/me/review-requests — ดูคำขอทบทวนของตนเอง
 * POST /api/customer-feedback/me/review-requests — ส่งคำขอทบทวน
 * employeeId มาจาก session เท่านั้น และไม่เปิดเผย comment ดิบ
 */

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true } });
    if (!user?.isActive) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allowed = await hasPermission(user.role, "customer_feedback.review_request");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const requests = await prisma.customerFeedbackReviewRequest.findMany({
        where: { employeeId: session.user.id },
        orderBy: { submittedAt: "desc" },
        take: 20,
        select: {
            id: true,
            scopeKey: true,
            reason: true,
            status: true,
            resolutionNote: true,
            submittedAt: true,
            resolvedAt: true,
        },
    });
    return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, isActive: true, name: true },
        });
        if (!user?.isActive) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const allowed = await hasPermission(user.role, "customer_feedback.review_request");
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = (await request.json()) as { reason?: string; reviewPeriodId?: string };
        const reason = body.reason?.trim();
        if (!reason || reason.length < 10) {
            return NextResponse.json({ error: "กรุณาอธิบายเหตุผลอย่างน้อย 10 ตัวอักษร" }, { status: 400 });
        }
        if (reason.length > 500) {
            return NextResponse.json({ error: "เหตุผลยาวไม่เกิน 500 ตัวอักษร" }, { status: 400 });
        }

        const scopeKey = body.reviewPeriodId ?? "GENERAL";
        // partial unique: หนึ่งคำขอ OPEN/IN_REVIEW ต่อ scopeKey
        const existing = await prisma.customerFeedbackReviewRequest.findFirst({
            where: { employeeId: session.user.id, scopeKey, status: { in: ["OPEN", "IN_REVIEW"] } },
        });
        if (existing) {
            return NextResponse.json({ error: "คุณมีคำขอทบทวนที่ยังไม่ปิดในขอบเขตนี้อยู่แล้ว" }, { status: 409 });
        }

        const created = await prisma.customerFeedbackReviewRequest.create({
            data: {
                employeeId: session.user.id,
                employeeLabelSnapshot: user.name,
                reviewPeriodId: body.reviewPeriodId ?? null,
                scopeKey,
                reason,
            },
        });
        return NextResponse.json({ request: { id: created.id } });
    } catch (error) {
        console.error("Error creating review request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
