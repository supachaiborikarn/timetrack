import { NextRequest, NextResponse } from "next/server";
import { isFuelCashier } from "@/lib/cashier-employee-scope";
import { getFeedbackAccessContext } from "@/lib/customer-feedback/access";
import { prisma } from "@/lib/prisma";
import {
    CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY,
    type ChineseNewYearBonusProfile,
} from "@/lib/chinese-new-year-bonus";

type BonusProfileUser = {
    role: string;
    employeeId: string;
    stationId: string | null;
    department: { isFrontYard: boolean } | null;
};

function resolveBonusProfile(user: BonusProfileUser): ChineseNewYearBonusProfile | null {
    if (user.role === "EMPLOYEE" && user.department?.isFrontYard) return "FRONT_YARD";
    if (isFuelCashier(user) && user.stationId) return "FUEL_CASHIER";
    return null;
}

async function requireManager() {
    const access = await getFeedbackAccessContext();
    if (!access.ok) {
        return { ok: false as const, response: NextResponse.json({ error: access.message }, { status: access.status }) };
    }
    if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
        return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { ok: true as const, userId: access.ctx.userId };
}

export async function GET() {
    try {
        const access = await requireManager();
        if (!access.ok) return access.response;

        const [config, periods] = await Promise.all([
            prisma.systemConfig.findUnique({
                where: { key: CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY },
                select: { value: true },
            }),
            prisma.reviewPeriod.findMany({
                orderBy: { startDate: "desc" },
                select: {
                    id: true,
                    title: true,
                    startDate: true,
                    endDate: true,
                    isActive: true,
                    closedAt: true,
                },
            }),
        ]);

        const selectedPeriodId = config?.value ?? null;
        if (!selectedPeriodId) {
            return NextResponse.json({ selectedPeriodId: null, periods, reviews: [] });
        }

        const candidates = await prisma.user.findMany({
            where: {
                isActive: true,
                employeeStatus: "ACTIVE",
                OR: [
                    { role: "EMPLOYEE", department: { is: { isFrontYard: true } } },
                    { role: "CASHIER" },
                ],
            },
            orderBy: [{ stationId: "asc" }, { name: "asc" }],
            select: {
                id: true,
                employeeId: true,
                role: true,
                stationId: true,
                name: true,
                nickName: true,
                station: { select: { name: true } },
                department: { select: { name: true, isFrontYard: true } },
            },
        });
        const employees = candidates.flatMap((employee) => {
            const profile = resolveBonusProfile(employee);
            return profile ? [{ ...employee, profile }] : [];
        });
        const submissions = employees.length > 0
            ? await prisma.reviewSubmission.findMany({
                where: {
                    periodId: selectedPeriodId,
                    employeeId: { in: employees.map((employee) => employee.id) },
                },
                select: {
                    id: true,
                    employeeId: true,
                    selfReview: true,
                    managerReview: true,
                    rating: true,
                    status: true,
                    submittedAt: true,
                    completedAt: true,
                },
            })
            : [];
        const submissionByEmployee = new Map(submissions.map((submission) => [submission.employeeId, submission]));

        return NextResponse.json({
            selectedPeriodId,
            periods,
            reviews: employees.map((employee) => ({
                employeeId: employee.id,
                label: employee.nickName?.trim() || employee.name,
                stationLabel: employee.station?.name ?? null,
                departmentLabel: employee.department?.name ?? null,
                profile: employee.profile,
                submission: submissionByEmployee.get(employee.id) ?? null,
            })),
        });
    } catch (error) {
        console.error("[admin/performance/cny-bonus:get]", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "โหลดการตั้งค่าแต๊ะเอียไม่สำเร็จ" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const access = await requireManager();
        if (!access.ok) return access.response;

        const body = (await request.json()) as { reviewPeriodId?: unknown };
        if (typeof body.reviewPeriodId !== "string" || !body.reviewPeriodId.trim() || body.reviewPeriodId.length > 100) {
            return NextResponse.json({ error: "กรุณาเลือกรอบประเมิน" }, { status: 400 });
        }
        const reviewPeriodId = body.reviewPeriodId.trim();
        const period = await prisma.reviewPeriod.findUnique({
            where: { id: reviewPeriodId },
            select: { id: true, title: true },
        });
        if (!period) return NextResponse.json({ error: "ไม่พบรอบประเมิน" }, { status: 404 });

        await prisma.$transaction([
            prisma.systemConfig.upsert({
                where: { key: CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY },
                update: { value: period.id },
                create: { key: CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY, value: period.id },
            }),
            prisma.auditLog.create({
                data: {
                    action: "CNY_BONUS_PERIOD_SELECTED",
                    entity: "ReviewPeriod",
                    entityId: period.id,
                    details: JSON.stringify({ title: period.title }),
                    userId: access.userId,
                },
            }),
        ]);

        return NextResponse.json({ message: "ตั้งรอบคำนวณแต๊ะเอียแล้ว", selectedPeriodId: period.id });
    } catch (error) {
        console.error("[admin/performance/cny-bonus:put]", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "บันทึกรอบแต๊ะเอียไม่สำเร็จ" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const access = await requireManager();
        if (!access.ok) return access.response;

        const body = (await request.json()) as {
            periodId?: unknown;
            employeeId?: unknown;
            rating?: unknown;
            managerReview?: unknown;
        };
        if (typeof body.periodId !== "string" || !body.periodId.trim() || body.periodId.length > 100) {
            return NextResponse.json({ error: "periodId ไม่ถูกต้อง" }, { status: 400 });
        }
        if (typeof body.employeeId !== "string" || !body.employeeId.trim() || body.employeeId.length > 100) {
            return NextResponse.json({ error: "employeeId ไม่ถูกต้อง" }, { status: 400 });
        }
        if (typeof body.rating !== "number" || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
            return NextResponse.json({ error: "คะแนนหัวหน้างานต้องเป็น 1–5" }, { status: 400 });
        }
        if (body.managerReview != null && typeof body.managerReview !== "string") {
            return NextResponse.json({ error: "managerReview ไม่ถูกต้อง" }, { status: 400 });
        }
        const managerReview = typeof body.managerReview === "string" ? body.managerReview.trim() : "";
        if (managerReview.length > 5000) {
            return NextResponse.json({ error: "ความคิดเห็นหัวหน้างานยาวไม่เกิน 5,000 ตัวอักษร" }, { status: 400 });
        }

        const periodId = body.periodId.trim();
        const employeeId = body.employeeId.trim();
        const [config, target] = await Promise.all([
            prisma.systemConfig.findUnique({
                where: { key: CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY },
                select: { value: true },
            }),
            prisma.user.findUnique({
                where: { id: employeeId },
                select: {
                    isActive: true,
                    employeeStatus: true,
                    role: true,
                    employeeId: true,
                    stationId: true,
                    department: { select: { isFrontYard: true } },
                },
            }),
        ]);
        if (config?.value !== periodId) {
            return NextResponse.json({ error: "รอบนี้ไม่ใช่รอบแต๊ะเอียที่กำลังใช้งาน" }, { status: 409 });
        }
        if (!target?.isActive || target.employeeStatus !== "ACTIVE") {
            return NextResponse.json({ error: "พนักงานนี้ไม่ได้อยู่ในสถานะใช้งาน" }, { status: 400 });
        }
        const profile = resolveBonusProfile(target);
        if (!profile) {
            return NextResponse.json({ error: "บุคคลนี้ไม่อยู่ในกลุ่มคำนวณแต๊ะเอีย" }, { status: 400 });
        }

        const existing = await prisma.reviewSubmission.findUnique({
            where: { employeeId_periodId: { employeeId, periodId } },
            select: { id: true },
        });
        if (!existing) {
            return NextResponse.json(
                { error: "พนักงานยังไม่ได้ส่งแบบประเมินตนเองของรอบนี้ จึงยังบันทึกคะแนนหัวหน้างานไม่ได้" },
                { status: 409 },
            );
        }

        const now = new Date();
        const [submission] = await prisma.$transaction([
            prisma.reviewSubmission.update({
                where: { id: existing.id },
                data: {
                    rating: body.rating,
                    managerReview: managerReview || null,
                    status: "COMPLETED",
                    completedAt: now,
                },
                select: {
                    id: true,
                    employeeId: true,
                    rating: true,
                    managerReview: true,
                    status: true,
                    completedAt: true,
                },
            }),
            prisma.auditLog.create({
                data: {
                    action: "CNY_BONUS_SUPERVISOR_REVIEW_UPDATED",
                    entity: "ReviewSubmission",
                    entityId: existing.id,
                    details: JSON.stringify({ periodId, employeeId, rating: body.rating, profile }),
                    userId: access.userId,
                },
            }),
        ]);

        return NextResponse.json({ message: "บันทึกคะแนนหัวหน้างานแล้ว", submission });
    } catch (error) {
        console.error("[admin/performance/cny-bonus:patch]", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "บันทึกคะแนนหัวหน้างานไม่สำเร็จ" }, { status: 500 });
    }
}
