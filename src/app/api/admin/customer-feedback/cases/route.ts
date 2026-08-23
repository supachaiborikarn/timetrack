import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { standardCaseSeverity } from "@/lib/customer-feedback/cases";

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

        const url = request.nextUrl;
        const severity = url.searchParams.get("severity");
        const status = url.searchParams.get("status");
        const assignee = url.searchParams.get("assignee");
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
        const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? 30));

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
            ...(severity && ["NORMAL", "HIGH", "URGENT"].includes(severity)
                ? { severity: severity as import("@prisma/client").FeedbackCaseSeverity }
                : {}),
            ...(status && ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"].includes(status)
                ? { status: status as import("@prisma/client").FeedbackCaseStatus }
                : { status: { in: ["OPEN", "IN_PROGRESS"] } }),
            ...(assignee === "me" ? { assignedToId: access.ctx.userId } : {}),
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
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.case_manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });

        const body = (await request.json()) as { responseId?: string; severity?: string };
        if (!body.responseId) return NextResponse.json({ error: "ต้องระบุ responseId" }, { status: 400 });

        const response = await prisma.customerFeedbackResponse.findUnique({ where: { id: body.responseId } });
        if (!response) return NextResponse.json({ error: "ไม่พบคำตอบ" }, { status: 404 });
        if (scope.stationId && response.stationId !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }
        const existing = await prisma.customerFeedbackCase.findUnique({ where: { responseId: response.id } });
        if (existing) return NextResponse.json({ error: "คำตอบนี้มีเคสอยู่แล้ว" }, { status: 409 });

        const severity =
            body.severity && ["NORMAL", "HIGH", "URGENT"].includes(body.severity)
                ? (body.severity as "NORMAL" | "HIGH" | "URGENT")
                : response.kind === "INCIDENT"
                    ? "HIGH"
                    : standardCaseSeverity({
                          overallRating: response.overallRating ?? 3,
                          reasonKeys: response.reasonKeys,
                          wantsFollowUp: response.wantsFollowUp,
                      }) ?? "NORMAL";

        const created = await prisma.customerFeedbackCase.create({
            data: {
                responseId: response.id,
                stationId: response.stationId,
                severity,
                category: response.kind === "INCIDENT" ? (response.incidentKey ?? "incident") : "manual",
                dueAt: new Date(Date.now() + (severity === "URGENT" ? 2 : severity === "HIGH" ? 24 : 72) * 3600 * 1000),
            },
        });
        await prisma.auditLog.create({
            data: {
                action: "CUSTOMER_FEEDBACK_CASE_CREATED",
                entity: "CustomerFeedbackCase",
                entityId: created.id,
                details: JSON.stringify({ responseId: response.id, severity }),
                userId: access.ctx.userId,
            },
        });
        return NextResponse.json({ case: { id: created.id } });
    } catch (error) {
        console.error("Error creating case:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
