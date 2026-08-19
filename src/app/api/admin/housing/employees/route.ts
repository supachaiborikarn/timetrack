import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/logger";
import { getHousingAllowanceDefault } from "@/lib/server/housing-settings";
import {
    effectiveHousingAllowance,
    findHousingIssues,
    isEligibleForHousingAllowance,
    isHousingStatus,
} from "@/lib/housing";
import type { Role } from "@prisma/client";

/**
 * The housing roster: every active employee, where they live, and whether the
 * record makes sense. This is the survey tool — most rows start as UNKNOWN.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "housing.view"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข้อมูลที่พัก" }, { status: 403 });
        }

        const stationId = request.nextUrl.searchParams.get("stationId");
        const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

        // A MANAGER only ever sees their own branch, the same scoping the rest of
        // the admin APIs use.
        const scopedStationId = role === "MANAGER" ? session.user.stationId ?? null : stationId && stationId !== "all" ? stationId : null;

        const [employees, companyDefault] = await Promise.all([
            prisma.user.findMany({
                where: {
                    ...(includeInactive ? {} : { isActive: true }),
                    ...(scopedStationId ? { stationId: scopedStationId } : {}),
                },
                orderBy: [{ housingStatus: "asc" }, { employeeId: "asc" }],
                select: {
                    id: true,
                    employeeId: true,
                    name: true,
                    nickName: true,
                    isActive: true,
                    stationId: true,
                    station: { select: { id: true, name: true, code: true } },
                    department: { select: { id: true, name: true } },
                    housingStatus: true,
                    housingAllowance: true,
                    housingNote: true,
                    housingUpdatedAt: true,
                    dormitoryId: true,
                    dormitory: { select: { id: true, name: true, code: true, stationId: true, station: { select: { id: true, name: true } } } },
                },
            }),
            getHousingAllowanceDefault(),
        ]);

        const rows = employees.map((e) => {
            const issues = findHousingIssues({
                housingStatus: e.housingStatus,
                dormitoryId: e.dormitoryId,
                stationId: e.stationId,
                dormitoryStationId: e.dormitory?.stationId ?? null,
            });
            const eligible = isEligibleForHousingAllowance(e.housingStatus);

            return {
                id: e.id,
                employeeId: e.employeeId,
                name: e.name,
                nickName: e.nickName,
                isActive: e.isActive,
                station: e.station,
                department: e.department,
                housingStatus: e.housingStatus,
                dormitory: e.dormitory ? { id: e.dormitory.id, name: e.dormitory.name, code: e.dormitory.code, station: e.dormitory.station } : null,
                housingNote: e.housingNote,
                housingUpdatedAt: e.housingUpdatedAt,
                housingAllowance: e.housingAllowance == null ? null : Number(e.housingAllowance),
                effectiveAllowance: eligible
                    ? effectiveHousingAllowance(e.housingAllowance == null ? null : Number(e.housingAllowance), companyDefault)
                    : 0,
                issues,
            };
        });

        return NextResponse.json({
            companyDefault,
            employees: rows,
            summary: {
                total: rows.length,
                unknown: rows.filter((r) => r.housingStatus === "UNKNOWN").length,
                companyDorm: rows.filter((r) => r.housingStatus === "COMPANY_DORM").length,
                ownHousing: rows.filter((r) => r.housingStatus === "OWN_HOUSING").length,
                withIssues: rows.filter((r) => r.issues.length > 0).length,
                monthlyAllowanceTotal: rows.reduce((sum, r) => sum + r.effectiveAllowance, 0),
            },
        });
    } catch (error) {
        console.error("Error listing housing roster:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/** Records where one employee lives. */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "housing.manage"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขข้อมูลที่พัก" }, { status: 403 });
        }

        const { userId, housingStatus, dormitoryId, housingAllowance, housingNote } = await request.json();
        if (!userId || !isHousingStatus(housingStatus)) {
            return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        const employee = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, stationId: true } });
        if (!employee) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

        if (role === "MANAGER" && session.user.stationId && employee.stationId !== session.user.stationId) {
            return NextResponse.json({ error: "แก้ไขได้เฉพาะพนักงานสาขาตัวเอง" }, { status: 403 });
        }

        // The dorm only means something for a resident — clearing it alongside the
        // status is what stops the two fields from drifting apart.
        const resolvedDormitoryId = housingStatus === "COMPANY_DORM" ? dormitoryId || null : null;
        if (housingStatus === "COMPANY_DORM" && !resolvedDormitoryId) {
            return NextResponse.json({ error: "กรุณาเลือกว่าอยู่บ้านพักหลังไหน" }, { status: 400 });
        }
        if (resolvedDormitoryId) {
            const dormitory = await prisma.dormitory.findUnique({ where: { id: resolvedDormitoryId } });
            if (!dormitory) return NextResponse.json({ error: "ไม่พบที่พักที่เลือก" }, { status: 400 });
        }

        const parsedAllowance =
            housingAllowance == null || housingAllowance === "" ? null : Number(housingAllowance);
        if (parsedAllowance !== null && (!Number.isFinite(parsedAllowance) || parsedAllowance < 0)) {
            return NextResponse.json({ error: "ค่าที่พักต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                housingStatus,
                dormitoryId: resolvedDormitoryId,
                housingAllowance: parsedAllowance,
                housingNote: housingNote?.trim() || null,
                housingUpdatedAt: new Date(),
            },
        });

        await logActivity(session.user.id, "UPDATE", "User", `อัปเดตข้อมูลที่พักของ ${employee.name}`, employee.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating housing assignment:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
