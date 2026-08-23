import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { summarizeRatings, MIN_EMPLOYEE_SAMPLE } from "@/lib/customer-feedback/metrics";

/**
 * GET /api/customer-feedback/me — ผลสรุปของพนักงานที่ login
 * บังคับ employeeId จาก session เท่านั้น และใช้ข้อมูลจาก QR พนักงานเท่านั้น
 * ไม่แสดง comment ดิบ
 */

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, isActive: true },
        });
        if (!user?.isActive) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const allowed = await hasPermission(user.role, "customer_feedback.self_view");
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const responses = await prisma.customerFeedbackResponse.findMany({
            where: {
                employeeId: session.user.id,
                targetType: "EMPLOYEE",
                kind: "STANDARD",
                validity: "VALID",
                overallRating: { not: null },
            },
            orderBy: { submittedAt: "desc" },
            take: 500,
            select: { overallRating: true, reasonKeys: true, submittedAt: true },
        });

        const summary = summarizeRatings(responses.map((r) => r.overallRating!));
        const reasonCounts = new Map<string, number>();
        for (const r of responses) {
            for (const k of r.reasonKeys) reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
        }

        const meetsMinimum = summary.count >= MIN_EMPLOYEE_SAMPLE;
        return NextResponse.json({
            meetsMinimum,
            minimumSample: MIN_EMPLOYEE_SAMPLE,
            // ถ้ายังไม่ถึง minimum ให้แสดงแค่จำนวน — ไม่แสดงคะแนนสรุป
            summary: meetsMinimum
                ? { count: summary.count, average: Number(summary.average!.toFixed(2)), positiveRate: Number(summary.positiveRate!.toFixed(1)), negativeRate: Number(summary.negativeRate!.toFixed(1)), distribution: summary.distribution }
                : { count: summary.count },
            message: meetsMinimum ? null : `ยังไม่พอแสดงคะแนนสรุป ต้องมีคำตอบที่ผ่านการตรวจอย่างน้อย ${MIN_EMPLOYEE_SAMPLE} รายการ`,
            topReasons: meetsMinimum
                ? [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, count]) => ({ key, count }))
                : [],
        });
    } catch (error) {
        console.error("Error loading self summary:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
