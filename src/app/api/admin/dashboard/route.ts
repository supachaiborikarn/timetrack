import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDayBangkok } from "@/lib/date-utils";
import { calculateBreakOverageMinutes, resolveAllowedBreakMinutes } from "@/lib/break-rules";
import { GAS_CASHIER_SCOPE_LABEL, gasCashierEmployeeWhere, isGasCashier } from "@/lib/cashier-employee-scope";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ATTENDANCE_GRACE_MINUTES = 5;
const CHECKOUT_GRACE_MINUTES = 15;

type ActionTone = "critical" | "warning" | "info" | "success";
type ActionCategory = "attendance" | "break" | "approval" | "shift" | "league" | "reward" | "feedback" | "advance";

type DashboardActionItem = {
    id: string;
    tone: ActionTone;
    category: ActionCategory;
    title: string;
    detail: string;
    count: number;
    href: string;
};

function clockMinutes(value: string | null | undefined): number | null {
    if (!value) return null;
    const [hour, minute] = value.split(":").map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
}

function isShiftStartOverdue(startTime: string, nowMinutes: number) {
    const start = clockMinutes(startTime);
    return start !== null && nowMinutes > start + ATTENDANCE_GRACE_MINUTES;
}

function isShiftEndOverdue(startTime: string, endTime: string, nowMinutes: number) {
    const start = clockMinutes(startTime);
    const rawEnd = clockMinutes(endTime);
    if (start === null || rawEnd === null) return false;
    let end = rawEnd;
    let current = nowMinutes;
    if (end <= start) {
        end += 24 * 60;
        if (current < start) current += 24 * 60;
    }
    return current > end + CHECKOUT_GRACE_MINUTES;
}

function monthBoundsBangkok(reference: Date) {
    const shifted = new Date(reference.getTime() + BANGKOK_OFFSET_MS);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    return {
        from: new Date(Date.UTC(year, month, 1) - BANGKOK_OFFSET_MS),
        toExclusive: new Date(Date.UTC(year, month + 1, 1) - BANGKOK_OFFSET_MS),
    };
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const role = session.user.role;
        const isCashier = role === "CASHIER";
        const isGasOnlyCashier = isGasCashier(session.user);
        const gasCashierScope = gasCashierEmployeeWhere(session.user);
        const isStationScoped = role === "MANAGER" || role === "CASHIER";
        const viewer = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                stationId: true,
                station: { select: { id: true, code: true, name: true } },
            },
        });
        if (isStationScoped && !viewer?.stationId) {
            return NextResponse.json({ error: "ไม่พบสถานีที่รับผิดชอบ" }, { status: 403 });
        }

        const stationId = isStationScoped ? viewer!.stationId! : null;
        const userStationFilter = stationId ? { stationId } : {};
        const userRelationFilter = {
            isActive: true,
            employeeStatus: "ACTIVE" as const,
            role: "EMPLOYEE" as const,
            ...userStationFilter,
            ...(gasCashierScope ?? {}),
        };
        const nowReal = new Date();
        const bangkokClock = new Date(nowReal.getTime() + BANGKOK_OFFSET_MS);
        const nowMinutes = bangkokClock.getUTCHours() * 60 + bangkokClock.getUTCMinutes();
        const today = startOfDayBangkok(nowReal);
        const tomorrow = new Date(today.getTime() + DAY_MS);
        const isLight = new URL(request.url).searchParams.get("light") === "true";

        const scopedShiftIds = stationId
            ? (await prisma.shift.findMany({
                where: { OR: [{ stationId }, { stationId: null }] },
                select: { id: true },
            })).map((shift) => shift.id)
            : null;

        const [
            totalEmployees,
            assignments,
            attendanceRows,
            todayLeaves,
            pendingShiftSwaps,
            pendingTimeCorrections,
            pendingLeaves,
            pendingAdvances,
            openShifts,
        ] = await Promise.all([
            prisma.user.count({ where: userRelationFilter }),
            prisma.shiftAssignment.findMany({
                where: { date: today, isDayOff: false, user: userRelationFilter },
                select: {
                    userId: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            nickName: true,
                            phone: true,
                            photoUrl: true,
                            department: { select: { name: true } },
                            station: { select: { id: true, code: true, name: true } },
                        },
                    },
                    shift: {
                        select: { id: true, name: true, startTime: true, endTime: true, breakMinutes: true },
                    },
                },
                orderBy: [{ shift: { startTime: "asc" } }, { user: { name: "asc" } }],
            }),
            prisma.attendance.findMany({
                where: { date: today, user: userRelationFilter },
                select: {
                    userId: true,
                    checkInTime: true,
                    checkOutTime: true,
                    lateMinutes: true,
                    breakStartTime: true,
                    breakEndTime: true,
                    breakDurationMin: true,
                    user: {
                        select: {
                            name: true,
                            nickName: true,
                            station: { select: { code: true, name: true } },
                        },
                    },
                },
            }),
            prisma.leave.findMany({
                where: {
                    startDate: { lt: tomorrow },
                    endDate: { gte: today },
                    status: { in: ["PENDING", "APPROVED", "REJECTED"] },
                    user: userRelationFilter,
                },
                select: { userId: true, type: true, status: true },
            }),
            prisma.shiftSwap.count({
                where: {
                    status: "PENDING",
                    targetAccepted: true,
                    ...(gasCashierScope
                        ? { requester: gasCashierScope }
                        : stationId ? { requester: { stationId } } : {}),
                },
            }),
            prisma.timeCorrection.count({
                where: {
                    status: "PENDING",
                    ...(gasCashierScope
                        ? { user: gasCashierScope }
                        : stationId ? { user: { stationId } } : {}),
                },
            }),
            prisma.leave.count({
                where: {
                    status: "PENDING",
                    ...(gasCashierScope
                        ? { user: gasCashierScope }
                        : stationId ? { user: { stationId } } : {}),
                },
            }),
            prisma.advance.count({
                where: {
                    status: "PENDING",
                    ...(gasCashierScope
                        ? { user: gasCashierScope }
                        : stationId ? { user: { stationId } } : {}),
                },
            }),
            prisma.shiftPool.count({
                where: {
                    status: "OPEN",
                    date: { gte: today },
                    ...(scopedShiftIds ? { shiftId: { in: scopedShiftIds } } : {}),
                },
            }),
        ]);

        const attendanceByUser = new Map(attendanceRows.map((row) => [row.userId, row]));
        const assignmentByUser = new Map(assignments.map((row) => [row.userId, row]));
        const leaveByUser = new Map(todayLeaves.map((row) => [row.userId, row]));

        const notArrivedAssignments = assignments.filter((assignment) => {
            const attendance = attendanceByUser.get(assignment.userId);
            const leave = leaveByUser.get(assignment.userId);
            return !attendance?.checkInTime && leave?.status !== "APPROVED";
        });
        const overdueAssignments = notArrivedAssignments.filter((assignment) =>
            isShiftStartOverdue(assignment.shift.startTime, nowMinutes),
        );

        const absentEmployees = overdueAssignments.map((assignment) => {
            const leave = leaveByUser.get(assignment.userId);
            return {
                id: assignment.user.id,
                name: assignment.user.name,
                nickName: assignment.user.nickName,
                phone: assignment.user.phone,
                photoUrl: assignment.user.photoUrl,
                department: assignment.user.department?.name || "-",
                station: assignment.user.station?.name || "-",
                shiftName: assignment.shift.name,
                shiftTime: `${assignment.shift.startTime} - ${assignment.shift.endTime}`,
                leaveStatus: leave?.status ?? null,
                leaveType: leave?.type ?? null,
                overlaps: [] as string[],
            };
        });

        const notArrivedEmployees = notArrivedAssignments.map((assignment) => ({
            id: assignment.user.id,
            name: assignment.user.name,
            nickName: assignment.user.nickName,
            station: assignment.user.station?.name || "-",
            shiftName: assignment.shift.name,
            shiftTime: `${assignment.shift.startTime} - ${assignment.shift.endTime}`,
            overdue: isShiftStartOverdue(assignment.shift.startTime, nowMinutes),
        }));

        const presentEmployees = attendanceRows
            .filter((row) => Boolean(row.checkInTime))
            .map((row) => ({
                id: row.userId,
                name: row.user.name,
                nickName: row.user.nickName,
                station: row.user.station?.name || "-",
                checkedOut: Boolean(row.checkOutTime),
            }));

        const lateEmployees = attendanceRows
            .filter((row) => Boolean(row.checkInTime) && (row.lateMinutes ?? 0) > ATTENDANCE_GRACE_MINUTES)
            .map((row) => ({
                id: row.userId,
                name: row.user.name,
                nickName: row.user.nickName,
                station: row.user.station?.name || "-",
                lateMinutes: row.lateMinutes ?? 0,
                checkInTime: row.checkInTime?.toISOString() ?? null,
            }))
            .sort((a, b) => b.lateMinutes - a.lateMinutes);

        const activeBreakRows = attendanceRows.filter((row) => row.breakStartTime && !row.breakEndTime && !row.checkOutTime);
        const overBreakEmployees = activeBreakRows.flatMap((row) => {
            const assignment = assignmentByUser.get(row.userId);
            if (!row.breakStartTime) return [];
            const durationMinutes = Math.max(0, Math.floor((nowReal.getTime() - row.breakStartTime.getTime()) / 60000));
            const allowedMinutes = resolveAllowedBreakMinutes(
                row.user.station?.code,
                assignment?.shift.breakMinutes,
            );
            const overMinutes = calculateBreakOverageMinutes(durationMinutes, allowedMinutes);
            if (overMinutes <= 0) return [];
            return [{
                id: row.userId,
                name: row.user.name,
                nickName: row.user.nickName,
                station: row.user.station?.name || "-",
                durationMinutes,
                allowedMinutes,
                overMinutes,
            }];
        }).sort((a, b) => b.overMinutes - a.overMinutes);

        const checkoutOverdueEmployees = attendanceRows.flatMap((row) => {
            const assignment = assignmentByUser.get(row.userId);
            if (!assignment || !row.checkInTime || row.checkOutTime) return [];
            if (!isShiftEndOverdue(assignment.shift.startTime, assignment.shift.endTime, nowMinutes)) return [];
            return [{
                id: row.userId,
                name: row.user.name,
                nickName: row.user.nickName,
                station: row.user.station?.name || "-",
                shiftTime: `${assignment.shift.startTime} - ${assignment.shift.endTime}`,
            }];
        });

        const expectedAssignments = assignments.filter((assignment) => leaveByUser.get(assignment.userId)?.status !== "APPROVED");
        const todayExpected = expectedAssignments.length;
        const todayAttendance = expectedAssignments.filter((assignment) => Boolean(attendanceByUser.get(assignment.userId)?.checkInTime)).length;
        const workingNow = attendanceRows.filter((row) => row.checkInTime && !row.checkOutTime).length;
        const checkedOutToday = attendanceRows.filter((row) => row.checkOutTime).length;
        const onBreak = activeBreakRows.length;
        const todayOnLeave = todayLeaves.filter((row) => row.status === "APPROVED").length;
        const attendanceRate = todayExpected > 0 ? Math.min(100, Math.round((todayAttendance / todayExpected) * 100)) : 0;
        const pendingApprovals = pendingShiftSwaps + pendingTimeCorrections + pendingLeaves;

        const [leaguePendingReviews, rewardsToFulfill, customerOpenCases, customerReviewRequests] = isCashier
            ? [0, 0, 0, 0]
            : await Promise.all([
                prisma.competitionStanding.count({
                    where: {
                        fairPlayStatus: "REVIEW",
                        isEligible: true,
                        period: {
                            status: "PENDING_REVIEW",
                            ...(stationId ? { stationId } : {}),
                        },
                    },
                }),
                prisma.competitionAward.count({
                    where: { status: "SELECTED", ...(stationId ? { stationId } : {}) },
                }),
                prisma.customerFeedbackCase.count({
                    where: {
                        status: { in: ["OPEN", "IN_PROGRESS"] },
                        ...(stationId ? { stationId } : {}),
                    },
                }),
                role === "ADMIN" || role === "HR"
                    ? prisma.customerFeedbackReviewRequest.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } })
                    : Promise.resolve(0),
            ]);

        const actionItems: DashboardActionItem[] = [];
        if (absentEmployees.length > 0) {
            actionItems.push({
                id: "attendance-missing",
                tone: "critical",
                category: "attendance",
                title: `เลยเวลาเข้างาน ${absentEmployees.length} คน`,
                detail: "ตรวจว่าขาดงาน ลา หรือจำเป็นต้องลงเวลาแทน",
                count: absentEmployees.length,
                href: "/admin/attendance",
            });
        }
        if (overBreakEmployees.length > 0) {
            actionItems.push({
                id: "break-over",
                tone: "warning",
                category: "break",
                title: `พักเกินเวลา ${overBreakEmployees.length} คน`,
                detail: isCashier ? "ติดตามพนักงานและตรวจเวลาในหน้าลงเวลา" : "ตรวจรายละเอียดเวลาพักก่อนสรุป Attendance",
                count: overBreakEmployees.length,
                href: isCashier ? "/admin/attendance" : "/admin/reports/break-summary",
            });
        }
        if (checkoutOverdueEmployees.length > 0) {
            actionItems.push({
                id: "checkout-overdue",
                tone: "warning",
                category: "attendance",
                title: `เลยกะแล้วยังไม่ออกงาน ${checkoutOverdueEmployees.length} คน`,
                detail: "ตรวจว่าลืมเช็คเอาต์หรือยังทำงานต่อจริง",
                count: checkoutOverdueEmployees.length,
                href: "/admin/attendance",
            });
        }
        if (!isCashier && pendingApprovals > 0) {
            actionItems.push({
                id: "approvals",
                tone: "info",
                category: "approval",
                title: `คำขอรอตัดสินใจ ${pendingApprovals} รายการ`,
                detail: `ลา ${pendingLeaves} • แก้เวลา ${pendingTimeCorrections} • สลับกะ ${pendingShiftSwaps}`,
                count: pendingApprovals,
                href: "/admin/approvals",
            });
        }
        if (isCashier && pendingAdvances > 0) {
            actionItems.push({
                id: "advances",
                tone: "info",
                category: "advance",
                title: `รายการเบิกค่าแรงค้าง ${pendingAdvances} รายการ`,
                detail: "ตรวจเอกสาร/บันทึกรายการตามหน้าที่เสมียน",
                count: pendingAdvances,
                href: "/admin/advances",
            });
        }
        if (!isCashier && leaguePendingReviews > 0) {
            actionItems.push({
                id: "league-fair-play",
                tone: "warning",
                category: "league",
                title: `League รอตรวจ Fair Play ${leaguePendingReviews} คน`,
                detail: "ตรวจสัญญาณคะแนนผิดปกติก่อนรับรองแชมป์",
                count: leaguePendingReviews,
                href: "/admin/league",
            });
        }
        if (!isCashier && rewardsToFulfill > 0) {
            actionItems.push({
                id: "league-rewards",
                tone: "info",
                category: "reward",
                title: `รางวัลที่เลือกแล้วรอมอบ ${rewardsToFulfill} รายการ`,
                detail: "เตรียมของรางวัลและกดยืนยันเมื่อมอบจริง",
                count: rewardsToFulfill,
                href: "/admin/league",
            });
        }
        if (!isCashier && customerOpenCases > 0) {
            actionItems.push({
                id: "customer-cases",
                tone: "critical",
                category: "feedback",
                title: `เคสเสียงลูกค้าเปิดอยู่ ${customerOpenCases} เคส`,
                detail: "จัดลำดับเคสที่ต้องติดตามและปิดประเด็น",
                count: customerOpenCases,
                href: "/admin/customer-feedback?tab=cases",
            });
        }
        if ((role === "ADMIN" || role === "HR") && customerReviewRequests > 0) {
            actionItems.push({
                id: "feedback-reviews",
                tone: "warning",
                category: "feedback",
                title: `คำขอทบทวนคะแนน ${customerReviewRequests} รายการ`,
                detail: "ตรวจข้อโต้แย้งของพนักงานก่อนใช้คะแนนในรอบประเมิน",
                count: customerReviewRequests,
                href: "/admin/customer-feedback?tab=reviews",
            });
        }
        if (!isCashier && openShifts > 0) {
            actionItems.push({
                id: "open-shifts",
                tone: "info",
                category: "shift",
                title: `กะเปิดรอคน ${openShifts} กะ`,
                detail: "ตรวจ Shift Pool ก่อนเกิดกำลังคนขาด",
                count: openShifts,
                href: "/admin/shift-pool",
            });
        }

        const toneOrder: Record<ActionTone, number> = { critical: 0, warning: 1, info: 2, success: 3 };
        actionItems.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone] || b.count - a.count);

        const stats = {
            totalEmployees,
            todayAttendance,
            todayExpected,
            todayNotArrived: notArrivedEmployees.length,
            todayAbsent: absentEmployees.length,
            todayOnLeave,
            attendanceRate,
            lateToday: lateEmployees.length,
            workingNow,
            checkedOutToday,
            onBreak,
            overBreak: overBreakEmployees.length,
            checkoutOverdue: checkoutOverdueEmployees.length,
            pendingApprovals,
            pendingShiftSwaps,
            pendingTimeCorrections,
            pendingLeaves,
            pendingAdvances,
            openShifts,
            leaguePendingReviews,
            rewardsToFulfill,
            customerOpenCases,
            customerReviewRequests,
            needsAttention: actionItems.reduce((sum, item) => sum + item.count, 0),
            absentEmployees,
            notArrivedEmployees,
            presentEmployees,
            lateEmployees,
            overBreakEmployees,
            checkoutOverdueEmployees,
        };

        if (isLight) {
            const response = NextResponse.json({
                role,
                scope: {
                    station: stationId ? viewer?.station : null,
                    label: isGasOnlyCashier
                        ? `${viewer?.station?.name ?? "สถานีของฉัน"} • ${GAS_CASHIER_SCOPE_LABEL}`
                        : stationId ? viewer?.station?.name ?? "สถานีของฉัน" : "ทุกสถานี",
                },
                stats: {
                    totalEmployees: stats.totalEmployees,
                    todayAttendance: stats.todayAttendance,
                    todayExpected: stats.todayExpected,
                    todayAbsent: stats.todayAbsent,
                    lateToday: stats.lateToday,
                    overBreak: stats.overBreak,
                    pendingApprovals: stats.pendingApprovals,
                    leaguePendingReviews: stats.leaguePendingReviews,
                    rewardsToFulfill: stats.rewardsToFulfill,
                    customerOpenCases: stats.customerOpenCases,
                    needsAttention: stats.needsAttention,
                },
                actionItems,
            });
            response.headers.set("Cache-Control", "private, no-store");
            return response;
        }

        const { from: monthStart, toExclusive: monthEndExclusive } = monthBoundsBangkok(nowReal);
        const [recentSwaps, recentLeaves, recentCorrections, monthlyRecords] = await Promise.all([
            isCashier ? Promise.resolve([]) : prisma.shiftSwap.findMany({
                where: { status: "PENDING", ...(stationId ? { requester: { stationId } } : {}) },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    requester: { select: { name: true, employeeId: true } },
                    target: { select: { name: true, employeeId: true } },
                },
            }),
            isCashier ? Promise.resolve([]) : prisma.leave.findMany({
                where: { status: "PENDING", ...(stationId ? { user: { stationId } } : {}) },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: { user: { select: { name: true, employeeId: true } } },
            }),
            isCashier ? Promise.resolve([]) : prisma.timeCorrection.findMany({
                where: { status: "PENDING", ...(stationId ? { user: { stationId } } : {}) },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: { user: { select: { name: true, employeeId: true } } },
            }),
            prisma.attendance.findMany({
                where: {
                    date: { gte: monthStart, lt: monthEndExclusive },
                    user: userRelationFilter,
                },
                select: { date: true, lateMinutes: true, checkInTime: true },
            }),
        ]);

        const requests: Array<{
            id: string;
            type: "shift_swap" | "leave" | "time_correction";
            employeeName: string;
            description: string;
            createdAt: string;
        }> = [];
        recentSwaps.forEach((swap) => requests.push({
            id: swap.id,
            type: "shift_swap",
            employeeName: swap.requester?.name || "Unknown",
            description: `ขอสลับกะกับ ${swap.target?.name || "Unknown"}`,
            createdAt: swap.createdAt.toISOString(),
        }));
        recentLeaves.forEach((leave) => requests.push({
            id: leave.id,
            type: "leave",
            employeeName: leave.user?.name || "Unknown",
            description: `ขอลา ${leave.type === "SICK" ? "ป่วย" : leave.type === "VACATION" ? "พักร้อน" : leave.type === "PERSONAL" ? "กิจ" : leave.type}`,
            createdAt: leave.createdAt.toISOString(),
        }));
        recentCorrections.forEach((correction) => requests.push({
            id: correction.id,
            type: "time_correction",
            employeeName: correction.user?.name || "Unknown",
            description: `ขอแก้ไขเวลา${correction.requestType === "CHECK_IN" ? "เข้างาน" : "ออกงาน"}`,
            createdAt: correction.createdAt.toISOString(),
        }));
        requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const dailyMap = new Map<string, { onTime: number; late: number; absent: number }>();
        monthlyRecords.forEach((record) => {
            const shifted = new Date(record.date.getTime() + BANGKOK_OFFSET_MS);
            const key = shifted.toISOString().slice(0, 10);
            const bucket = dailyMap.get(key) ?? { onTime: 0, late: 0, absent: 0 };
            if (!record.checkInTime) bucket.absent++;
            else if ((record.lateMinutes ?? 0) > ATTENDANCE_GRACE_MINUTES) bucket.late++;
            else bucket.onTime++;
            dailyMap.set(key, bucket);
        });
        const monthlyAttendance = [...dailyMap.entries()]
            .map(([date, value]) => ({ date, ...value }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const response = NextResponse.json({
            role,
            scope: {
                station: stationId ? viewer?.station : null,
                label: isGasOnlyCashier
                    ? `${viewer?.station?.name ?? "สถานีของฉัน"} • ${GAS_CASHIER_SCOPE_LABEL}`
                    : stationId ? viewer?.station?.name ?? "สถานีของฉัน" : "ทุกสถานี",
            },
            stats,
            actionItems,
            recent: { requests: requests.slice(0, 5) },
            monthlyAttendance,
        });
        response.headers.set("Cache-Control", "private, no-store");
        return response;
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
