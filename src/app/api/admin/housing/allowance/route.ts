import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/logger";
import { getHousingAllowanceDefault } from "@/lib/server/housing-settings";
import {
    defaultAllowanceDate,
    effectiveHousingAllowance,
    formatMonthLabel,
    HOUSING_ALLOWANCE_INCOME_TYPE,
    isSelfReportedHousing,
    monthRange,
} from "@/lib/housing";
import type { Role } from "@prisma/client";

/**
 * Turns "who lives in their own place" into money: one SpecialIncome row per
 * eligible employee per month, which the payroll run then picks up like any
 * other special income.
 *
 * GET previews the run, POST performs it. Both share `collect()` so what HR is
 * shown is exactly what gets written — no second, subtly different query.
 */

type Candidate = {
    userId: string;
    employeeId: string;
    name: string;
    stationId: string | null;
    stationName: string | null;
    amount: number;
    alreadyIssued: boolean;
    /** The employee set their own status, so nobody at HR has confirmed it yet. */
    selfReported: boolean;
};

function parsePeriod(request: NextRequest): { year: number; month: number } | null {
    const year = Number(request.nextUrl.searchParams.get("year"));
    const month = Number(request.nextUrl.searchParams.get("month"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
    if (!Number.isInteger(month) || month < 1 || month > 12) return null;
    return { year, month };
}

async function collect(year: number, month: number): Promise<{ candidates: Candidate[]; companyDefault: number }> {
    const companyDefault = await getHousingAllowanceDefault();
    const { start, end } = monthRange(year, month);

    const employees = await prisma.user.findMany({
        where: { isActive: true, housingStatus: "OWN_HOUSING" },
        orderBy: { employeeId: "asc" },
        select: {
            id: true,
            employeeId: true,
            name: true,
            stationId: true,
            housingAllowance: true,
            housingUpdatedById: true,
            station: { select: { name: true } },
        },
    });

    // One query for the whole month rather than one per employee — this runs over
    // every active employee and the per-row version was the obvious N+1.
    const issued = await prisma.specialIncome.findMany({
        where: {
            userId: { in: employees.map((e) => e.id) },
            type: HOUSING_ALLOWANCE_INCOME_TYPE,
            date: { gte: start, lte: end },
        },
        select: { userId: true },
    });
    const issuedUserIds = new Set(issued.map((i) => i.userId));

    return {
        companyDefault,
        candidates: employees.map((e) => ({
            userId: e.id,
            employeeId: e.employeeId,
            name: e.name,
            stationId: e.stationId,
            stationName: e.station?.name ?? null,
            amount: effectiveHousingAllowance(e.housingAllowance == null ? null : Number(e.housingAllowance), companyDefault),
            alreadyIssued: issuedUserIds.has(e.id),
            selfReported: isSelfReportedHousing(e.id, e.housingUpdatedById),
        })),
    };
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "housing.view"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข้อมูลที่พัก" }, { status: 403 });
        }

        const period = parsePeriod(request);
        if (!period) return NextResponse.json({ error: "ระบุเดือน/ปีไม่ถูกต้อง" }, { status: 400 });

        const { candidates, companyDefault } = await collect(period.year, period.month);
        const pending = candidates.filter((c) => !c.alreadyIssued);

        return NextResponse.json({
            month: period.month,
            year: period.year,
            monthLabel: formatMonthLabel(period.year, period.month),
            effectiveDate: defaultAllowanceDate(period.year, period.month),
            companyDefault,
            candidates,
            summary: {
                eligible: candidates.length,
                pending: pending.length,
                alreadyIssued: candidates.length - pending.length,
                pendingAmount: pending.reduce((sum, c) => sum + c.amount, 0),
                zeroAmount: pending.filter((c) => c.amount <= 0).length,
                selfReported: pending.filter((c) => c.selfReported).length,
            },
        });
    } catch (error) {
        console.error("Error previewing housing allowance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "housing.manage"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์สร้างรายการค่าที่พัก" }, { status: 403 });
        }

        const body = await request.json();
        const year = Number(body.year);
        const month = Number(body.month);
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
            return NextResponse.json({ error: "ระบุเดือน/ปีไม่ถูกต้อง" }, { status: 400 });
        }

        const effectiveDate = typeof body.effectiveDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.effectiveDate)
            ? body.effectiveDate
            : defaultAllowanceDate(year, month);

        const { candidates } = await collect(year, month);
        // Anyone already paid this month is skipped, so re-running after adding one
        // more employee tops up rather than double-paying everyone.
        const toCreate = candidates.filter((c) => !c.alreadyIssued && c.amount > 0);

        if (toCreate.length === 0) {
            return NextResponse.json({
                created: 0,
                skipped: candidates.length,
                message: "ไม่มีรายการใหม่ที่ต้องสร้าง",
            });
        }

        const monthLabel = formatMonthLabel(year, month);
        const date = new Date(`${effectiveDate}T00:00:00+07:00`);

        await prisma.specialIncome.createMany({
            data: toCreate.map((c) => ({
                userId: c.userId,
                date,
                stationId: c.stationId,
                type: HOUSING_ALLOWANCE_INCOME_TYPE,
                description: `ค่าที่พัก ${monthLabel}`,
                amount: c.amount,
                status: "PENDING",
                createdBy: session.user.id,
            })),
        });

        await prisma.notification.createMany({
            data: toCreate.map((c) => ({
                userId: c.userId,
                type: "SPECIAL_INCOME",
                title: "คุณได้รับค่าที่พัก",
                message: `ค่าที่พัก ${monthLabel} ฿${c.amount.toLocaleString("th-TH")}`,
                link: "/history",
            })),
        });

        await logActivity(
            session.user.id,
            "CREATE",
            "SpecialIncome",
            `สร้างค่าที่พัก ${monthLabel} จำนวน ${toCreate.length} รายการ รวม ${toCreate.reduce((s, c) => s + c.amount, 0)} บาท`
        );

        return NextResponse.json({
            created: toCreate.length,
            skipped: candidates.length - toCreate.length,
            totalAmount: toCreate.reduce((sum, c) => sum + c.amount, 0),
        });
    } catch (error) {
        console.error("Error generating housing allowance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
