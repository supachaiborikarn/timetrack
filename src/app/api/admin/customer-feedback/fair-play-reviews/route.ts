import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getFeedbackAccessContext,
    getStationScope,
    parseFeedbackPagination,
    parseOptionalFeedbackFilter,
    requireFeedbackPermission,
} from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { FAIR_PLAY_REASON_CODES, explainFairPlaySignals, fairPlayReasonLabel } from "@/lib/customer-feedback/fair-play";

async function requireFairPlayReviewer() {
    if (!isCustomerFeedbackEnabled()) {
        return { ok: false as const, response: NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 }) };
    }
    const access = await getFeedbackAccessContext();
    if (!access.ok) return { ok: false as const, response: NextResponse.json({ error: access.message }, { status: access.status }) };
    if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
        return { ok: false as const, response: NextResponse.json({ error: "เฉพาะ ADMIN/HR เท่านั้น" }, { status: 403 }) };
    }
    const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.review_request_manage");
    if (!perm.ok) return { ok: false as const, response: NextResponse.json({ error: perm.message }, { status: perm.status }) };
    const scope = await getStationScope(access.ctx);
    if (!scope.ok) return { ok: false as const, response: NextResponse.json({ error: scope.message }, { status: scope.status }) };
    return { ok: true as const, ctx: access.ctx, stationId: scope.stationId };
}

async function requireFairPlayReporter() {
    if (!isCustomerFeedbackEnabled()) {
        return { ok: false as const, response: NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 }) };
    }
    const access = await getFeedbackAccessContext();
    if (!access.ok) return { ok: false as const, response: NextResponse.json({ error: access.message }, { status: access.status }) };
    if (!(["ADMIN", "HR", "MANAGER"] as const).includes(access.ctx.role as "ADMIN" | "HR" | "MANAGER")) {
        return { ok: false as const, response: NextResponse.json({ error: "เฉพาะหัวหน้างาน/ADMIN/HR เท่านั้น" }, { status: 403 }) };
    }
    const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.view_response");
    if (!perm.ok) return { ok: false as const, response: NextResponse.json({ error: perm.message }, { status: perm.status }) };
    const scope = await getStationScope(access.ctx);
    if (!scope.ok) return { ok: false as const, response: NextResponse.json({ error: scope.message }, { status: scope.status }) };
    return { ok: true as const, ctx: access.ctx, stationId: scope.stationId };
}

export async function GET(request: NextRequest) {
    try {
        const access = await requireFairPlayReviewer();
        if (!access.ok) return access.response;

        const status = parseOptionalFeedbackFilter(
            request.nextUrl.searchParams.get("status"),
            ["REVIEW", "CONFIRMED", "DISMISSED"] as const,
            "status"
        );
        if (!status.ok) return NextResponse.json({ error: status.message }, { status: 400 });
        const source = parseOptionalFeedbackFilter(
            request.nextUrl.searchParams.get("source"),
            ["MANUAL", "AUTO"] as const,
            "source"
        );
        if (!source.ok) return NextResponse.json({ error: source.message }, { status: 400 });
        const pagination = parseFeedbackPagination(
            request.nextUrl.searchParams.get("page"),
            request.nextUrl.searchParams.get("pageSize"),
            { pageSize: 50, maxPageSize: 100 }
        );
        if (!pagination.ok) return NextResponse.json({ error: pagination.message }, { status: 400 });
        const { page, pageSize } = pagination.value;

        const where = {
            ...(status.value ? { status: status.value } : {}),
            ...(source.value ? { source: source.value } : {}),
            ...(access.stationId ? { stationId: access.stationId } : {}),
        };
        const [total, rows] = await Promise.all([
            prisma.customerFeedbackFairPlayReview.count({ where }),
            prisma.customerFeedbackFairPlayReview.findMany({
                where,
                orderBy: [{ status: "asc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    response: {
                        select: {
                            refCode: true,
                            submittedAt: true,
                            overallRating: true,
                            validity: true,
                            durationSeconds: true,
                            surveyVersion: true,
                        },
                    },
                },
            }),
        ]);

        return NextResponse.json({
            reviews: rows.map((row) => ({
                id: row.id,
                responseId: row.responseId,
                refCode: row.response.refCode,
                employeeId: row.employeeId,
                employeeLabelSnapshot: row.employeeLabelSnapshot,
                stationId: row.stationId,
                source: row.source,
                reasonCode: row.reasonCode,
                reasonLabel: fairPlayReasonLabel(row.reasonCode),
                reasonNote: row.reasonNote,
                signals: row.signals,
                signalExplanations: explainFairPlaySignals({
                    signals: row.signals,
                    durationSeconds: row.response.durationSeconds,
                }),
                status: row.status,
                reportedById: row.reportedById,
                reviewedById: row.reviewedById,
                reviewedAt: row.reviewedAt,
                createdAt: row.createdAt,
                response: {
                    submittedAt: row.response.submittedAt,
                    overallRating: row.response.overallRating,
                    validity: row.response.validity,
                    durationSeconds: row.response.durationSeconds,
                    surveyVersion: row.response.surveyVersion,
                },
            })),
            total,
            page,
            pageSize,
        });
    } catch (error) {
        console.error("Error listing customer feedback fair-play reviews:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const access = await requireFairPlayReporter();
        if (!access.ok) return access.response;
        const body = (await request.json()) as { responseId?: unknown; reasonCode?: unknown; reasonNote?: unknown };
        if (typeof body.responseId !== "string" || !body.responseId.trim()) {
            return NextResponse.json({ error: "responseId ไม่ถูกต้อง" }, { status: 400 });
        }
        if (typeof body.reasonCode !== "string" || !FAIR_PLAY_REASON_CODES.includes(body.reasonCode as (typeof FAIR_PLAY_REASON_CODES)[number]) || body.reasonCode === "SUSPICIOUS_PATTERN") {
            return NextResponse.json({ error: "ประเภทเหตุไม่ถูกต้อง" }, { status: 400 });
        }
        if (body.reasonNote !== undefined && typeof body.reasonNote !== "string") {
            return NextResponse.json({ error: "รายละเอียดไม่ถูกต้อง" }, { status: 400 });
        }
        const reasonNote = typeof body.reasonNote === "string" ? body.reasonNote.trim() : "";
        if (reasonNote.length > 2000) return NextResponse.json({ error: "รายละเอียดยาวไม่เกิน 2,000 ตัวอักษร" }, { status: 400 });
        if (body.reasonCode === "OTHER" && reasonNote.length < 5) {
            return NextResponse.json({ error: "กรุณาระบุรายละเอียดอย่างน้อย 5 ตัวอักษร" }, { status: 400 });
        }

        const response = await prisma.customerFeedbackResponse.findUnique({
            where: { id: body.responseId.trim() },
            select: {
                id: true,
                kind: true,
                targetType: true,
                employeeId: true,
                employeeLabelSnapshot: true,
                stationId: true,
                validity: true,
                refCode: true,
                submittedAt: true,
            },
        });
        if (!response || response.kind !== "STANDARD" || response.targetType !== "EMPLOYEE" || !response.employeeId) {
            return NextResponse.json({ error: "เลือกได้เฉพาะแบบประเมินพนักงาน" }, { status: 404 });
        }
        if (access.stationId && response.stationId !== access.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ในสถานีนี้" }, { status: 403 });
        }
        if (response.validity === "TEST") {
            return NextResponse.json({ error: "แบบทดสอบไม่เข้ากระบวนการ Fair Play" }, { status: 400 });
        }
        const existingActive = await prisma.customerFeedbackFairPlayReview.findFirst({
            where: { responseId: response.id, status: { in: ["REVIEW", "CONFIRMED"] } },
            select: { id: true, status: true },
        });
        if (existingActive?.status === "CONFIRMED") {
            return NextResponse.json({ error: "แบบประเมินนี้ถูกยืนยัน Fair Play แล้ว ไม่สามารถนับเป็นเหตุซ้ำได้" }, { status: 409 });
        }
        if (existingActive) return NextResponse.json({ error: "แบบประเมินนี้มีรายการรอตรวจ Fair Play อยู่แล้ว" }, { status: 409 });

        const review = await prisma.$transaction(async (tx) => {
            const created = await tx.customerFeedbackFairPlayReview.create({
                data: {
                    responseId: response.id,
                    employeeId: response.employeeId,
                    employeeLabelSnapshot: response.employeeLabelSnapshot,
                    stationId: response.stationId,
                    source: "MANUAL",
                    reasonCode: body.reasonCode as string,
                    reasonNote: reasonNote || null,
                    signals: [],
                    reportedById: access.ctx.userId,
                },
            });
            await tx.auditLog.create({
                data: {
                    action: "CUSTOMER_FEEDBACK_FAIR_PLAY_REPORTED",
                    entity: "CustomerFeedbackFairPlayReview",
                    entityId: created.id,
                    details: JSON.stringify({
                        responseId: response.id,
                        refCode: response.refCode,
                        employeeId: response.employeeId,
                        submittedAt: response.submittedAt,
                        reasonCode: body.reasonCode,
                        reasonNote: reasonNote || null,
                    }),
                    userId: access.ctx.userId,
                },
            });
            return created;
        });

        return NextResponse.json({ review: { id: review.id }, message: "ส่งเข้าคิวตรวจ Fair Play แล้ว" }, { status: 201 });
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002") {
            return NextResponse.json({ error: "แบบประเมินนี้มีรายการ Fair Play ที่กำลังตรวจหรือยืนยันแล้ว" }, { status: 409 });
        }
        console.error("Error creating customer feedback fair-play review:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
