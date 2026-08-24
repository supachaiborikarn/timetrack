import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    canViewFeedbackIncident,
    getFeedbackAccessContext,
    getStationScope,
    parseFeedbackPagination,
    parseOptionalFeedbackFilter,
    requireFeedbackPermission,
} from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { standardCaseSeverity } from "@/lib/customer-feedback/cases";
import {
    createCaseWithNotifications,
    recordUrgentIncidentAlert,
    SubmitDomainError,
} from "@/lib/customer-feedback/submit";

/**
 * GET  /api/admin/customer-feedback/cases — คิวเคส
 * POST /api/admin/customer-feedback/cases — ผู้ดูแลสร้างเคสจากคำตอบได้เอง
 */

export async function GET(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.case_manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });
        const canViewIncident = await canViewFeedbackIncident(access.ctx);

        const url = request.nextUrl;
        const severity = parseOptionalFeedbackFilter(url.searchParams.get("severity"), ["NORMAL", "HIGH", "URGENT"] as const, "severity");
        if (!severity.ok) return NextResponse.json({ error: severity.message }, { status: 400 });
        const status = parseOptionalFeedbackFilter(url.searchParams.get("status"), ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"] as const, "status");
        if (!status.ok) return NextResponse.json({ error: status.message }, { status: 400 });
        const assignee = parseOptionalFeedbackFilter(url.searchParams.get("assignee"), ["me"] as const, "assignee");
        if (!assignee.ok) return NextResponse.json({ error: assignee.message }, { status: 400 });
        const pagination = parseFeedbackPagination(url.searchParams.get("page"), url.searchParams.get("pageSize"), {
            pageSize: 30,
            maxPageSize: 50,
        });
        if (!pagination.ok) return NextResponse.json({ error: pagination.message }, { status: 400 });
        const { page, pageSize } = pagination.value;

        // เคสที่ stationId เป็น null แสดงเฉพาะ ADMIN และ HR
        const stationFilter = scope.stationId
            ? { stationId: scope.stationId }
            : access.ctx.role === "ADMIN" || access.ctx.role === "HR"
                ? {}
                : undefined;
        if (stationFilter === undefined) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }

        const where: import("@prisma/client").Prisma.CustomerFeedbackCaseWhereInput = {
            ...stationFilter,
            ...(severity.value ? { severity: severity.value } : {}),
            ...(status.value
                ? { status: status.value }
                : { status: { in: ["OPEN", "IN_PROGRESS"] } }),
            ...(assignee.value === "me" ? { assignedToId: access.ctx.userId } : {}),
            response: {
                validity: { not: "TEST" },
                ...(canViewIncident ? {} : { kind: "STANDARD" as const }),
            },
        };

        const [total, cases] = await Promise.all([
            prisma.customerFeedbackCase.count({ where }),
            prisma.customerFeedbackCase.findMany({
                where,
                // Postgres เรียง enum ตามลำดับที่ประกาศ (NORMAL, HIGH, URGENT)
                // จึงต้องใช้ desc เพื่อให้ URGENT ขึ้นก่อน แล้วค่อยเรียงตามกำหนด SLA
                orderBy: [{ severity: "desc" }, { dueAt: "asc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    response: {
                        select: {
                            refCode: true,
                            kind: true,
                            overallRating: true,
                            incidentKey: true,
                            stationLabelSnapshot: true,
                            employeeLabelSnapshot: true,
                            comment: true,
                        },
                    },
                    assignedTo: { select: { id: true, name: true } },
                },
            }),
        ]);

        return NextResponse.json({
            cases: cases.map((c) => ({
                id: c.id,
                severity: c.severity,
                status: c.status,
                category: c.category,
                stationId: c.stationId,
                dueAt: c.dueAt,
                acknowledgedAt: c.acknowledgedAt,
                assignedTo: c.assignedTo,
                createdAt: c.createdAt,
                response: c.response,
            })),
            total,
            page,
            pageSize,
        });
    } catch (error) {
        console.error("Error listing cases:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.case_manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });
        const canViewIncident = await canViewFeedbackIncident(access.ctx);

        const body = (await request.json()) as { responseId?: unknown; severity?: unknown };
        if (typeof body.responseId !== "string" || !body.responseId.trim() || body.responseId.length > 100) {
            return NextResponse.json({ error: "ต้องระบุ responseId ที่ถูกต้อง" }, { status: 400 });
        }
        if (body.severity !== undefined && (typeof body.severity !== "string" || !["NORMAL", "HIGH", "URGENT"].includes(body.severity))) {
            return NextResponse.json({ error: "severity ไม่ถูกต้อง" }, { status: 400 });
        }

        const response = await prisma.customerFeedbackResponse.findUnique({ where: { id: body.responseId.trim() } });
        if (!response) return NextResponse.json({ error: "ไม่พบคำตอบ" }, { status: 404 });
        if (response.validity === "TEST") {
            return NextResponse.json({ error: "คำตอบทดสอบไม่สร้างเคสงานจริง" }, { status: 400 });
        }
        if (scope.stationId && response.stationId !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }
        if (response.kind === "INCIDENT" && !canViewIncident) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูเหตุเร่งด่วน" }, { status: 403 });
        }
        const existing = await prisma.customerFeedbackCase.findUnique({ where: { responseId: response.id } });
        if (existing) return NextResponse.json({ error: "คำตอบนี้มีเคสอยู่แล้ว" }, { status: 409 });

        const severity =
            typeof body.severity === "string" && ["NORMAL", "HIGH", "URGENT"].includes(body.severity)
                ? (body.severity as "NORMAL" | "HIGH" | "URGENT")
                : response.kind === "INCIDENT"
                    ? "HIGH"
                    : standardCaseSeverity({
                          overallRating: response.overallRating ?? 3,
                          reasonKeys: response.reasonKeys,
                          wantsFollowUp: response.wantsFollowUp,
                      }) ?? "NORMAL";

        const now = new Date();
        const category = response.kind === "INCIDENT" ? (response.incidentKey ?? "incident") : "manual";
        const caseId = await prisma.$transaction(async (tx) => {
            const createdId = await createCaseWithNotifications(tx, {
                responseId: response.id,
                stationId: response.stationId,
                severity,
                category,
            });
            if (severity === "URGENT") {
                await recordUrgentIncidentAlert(tx, { caseId: createdId, stationId: response.stationId, now });
            }
            await tx.auditLog.create({
                data: {
                    action: "CUSTOMER_FEEDBACK_CASE_CREATED",
                    entity: "CustomerFeedbackCase",
                    entityId: createdId,
                    details: JSON.stringify({ responseId: response.id, severity }),
                    userId: access.ctx.userId,
                },
            });
            return createdId;
        });
        return NextResponse.json({ case: { id: caseId } });
    } catch (error) {
        if (error instanceof SubmitDomainError) {
            return NextResponse.json({ error: error.code }, { status: error.status });
        }
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return NextResponse.json({ error: "คำตอบนี้มีเคสอยู่แล้ว" }, { status: 409 });
        }
        console.error("Error creating case:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
