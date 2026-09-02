import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPayrollPeriod, startOfDayBangkok } from "@/lib/date-utils";
import { getBangkokEvaluationDayBounds, getEmployeeDailyEvaluationStatus } from "@/lib/customer-feedback/evaluation-target";
import { summarizeEmployeeRubric, type EmployeeScoreResponseInput } from "@/lib/customer-feedback/employee-score";
import { EMPLOYEE_SCORE_QUESTION_KEYS } from "@/lib/customer-feedback/questions";
import { calculateEmployeePerformance } from "@/lib/employee-performance";
import { DEFAULT_ATTENDANCE_GRACE_MINUTES } from "@/lib/attendance-summary";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/employee/dashboard
 * Returns all data needed for the employee dashboard in a single request.
 * OPTIMIZED: All independent queries run in parallel via Promise.all()
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const now = new Date();
        const { searchParams } = new URL(request.url);
        const calYear  = parseInt(searchParams.get("calYear")  || String(now.getFullYear()));
        const calMonth = parseInt(searchParams.get("calMonth") || String(now.getMonth())); // 0-indexed

        const calDate = new Date(calYear, calMonth, 1);
        const monthStart = new Date(Date.UTC(calYear, calMonth, 1) - BANGKOK_OFFSET_MS);
        const monthEndExclusive = new Date(Date.UTC(calYear, calMonth + 1, 1) - BANGKOK_OFFSET_MS);
        const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);
        const currentYear = bangkokNow.getUTCFullYear();
        const yearStart = new Date(Date.UTC(currentYear, 0, 1) - BANGKOK_OFFSET_MS);
        const yearEndExclusive = new Date(Date.UTC(currentYear + 1, 0, 1) - BANGKOK_OFFSET_MS);

        // Fetch current user early to get department info for frontyard logic
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                departmentId: true,
                station: { select: { code: true } },
                department: {
                    select: { isFrontYard: true }
                }
            },
        });

        const isFrontYard = currentUser?.department?.isFrontYard || false;
        
        const payrollPeriod = getPayrollPeriod(calDate, isFrontYard);
        const payrollStart = startOfDayBangkok(payrollPeriod.startDate);
        const payrollEnd = startOfDayBangkok(payrollPeriod.endDate);
        const payrollEndExclusive = new Date(payrollEnd.getTime() + DAY_MS);
        const todayBangkok = startOfDayBangkok(now);
        const feedbackDayBounds = getBangkokEvaluationDayBounds(now);
        const periodEndUpToToday = new Date(Math.min(payrollEnd.getTime(), todayBangkok.getTime()));
        const feedbackPeriodEnd = new Date(Math.min(payrollEndExclusive.getTime(), now.getTime()));

        // ============================================================
        // PARALLEL BATCH: Run all independent queries simultaneously
        // ============================================================
        const [
            thisMonthAttendance,
            todayAttendance,
            shiftAssignments,
            performanceLeaves,
            leaves,
            leaveBalance,
            advances,
            announcements,
            calAttendance,
            customerEvaluationCount,
            customerPerformanceResponses,
        ] = await Promise.all([
            // 1. Attendance records for this payroll period
            prisma.attendance.findMany({
                where: {
                    userId,
                    date: { gte: payrollStart, lte: periodEndUpToToday },
                },
                select: {
                    date: true,
                    checkInTime: true,
                    checkOutTime: true,
                    lateMinutes: true,
                    breakStartTime: true,
                    breakEndTime: true,
                    breakDurationMin: true,
                },
            }),

            // 2. Today's attendance (break info)
            prisma.attendance.findFirst({
                where: { userId, date: todayBangkok },
                select: { breakStartTime: true, breakEndTime: true, breakDurationMin: true },
            }),

            // 3. Shift days through today. Day-off rows are retained so they cannot enter the score.
            prisma.shiftAssignment.findMany({
                where: {
                    userId,
                    date: { gte: payrollStart, lte: periodEndUpToToday },
                },
                select: {
                    date: true,
                    isDayOff: true,
                    shift: {
                        select: {
                            startTime: true,
                            endTime: true,
                            breakMinutes: true,
                            isNightShift: true,
                        },
                    },
                },
            }),

            // 4. Leave rows used for day-by-day performance status.
            prisma.leave.findMany({
                where: {
                    userId,
                    status: { in: ["APPROVED", "PENDING"] },
                    startDate: { lte: periodEndUpToToday },
                    endDate: { gte: payrollStart },
                },
                select: { startDate: true, endDate: true, status: true },
            }),

            // 5. Leave counts this year
            prisma.leave.findMany({
                where: {
                    userId,
                    status: "APPROVED",
                    startDate: { gte: yearStart, lt: yearEndExclusive },
                },
                select: { type: true },
            }),

            // 6. Leave balance
            prisma.leaveBalance.findUnique({
                where: { userId_year: { userId, year: currentYear } },
            }),

            // 7. Advance summary this month
            prisma.advance.findMany({
                where: {
                    userId,
                    month: calDate.getMonth() + 1,
                    year: calDate.getFullYear(),
                },
                select: { amount: true, status: true },
            }),

            // 8. Announcements (latest 5, with read tracking)
            prisma.announcement.findMany({
                where: { isActive: true },
                include: {
                    author: { select: { id: true, name: true, nickName: true } },
                    _count: { select: { comments: true, reads: true } },
                    reads: {
                        where: { userId },
                        select: { id: true },
                        take: 1,
                    },
                },
                orderBy: [
                    { isPinned: "desc" },
                    { createdAt: "desc" },
                ],
                take: 5,
            }),

            // 9. Calendar attendance data for requested month
            prisma.attendance.findMany({
                where: {
                    userId,
                    date: { gte: monthStart, lt: monthEndExclusive },
                },
                select: {
                    date: true,
                    checkInTime: true,
                    checkOutTime: true,
                    status: true,
                    lateMinutes: true,
                },
            }),

            // 10. Count today's valid employee feedback server-side only.
            // The employee dashboard receives only a coarse status, never this exact count.
            isFrontYard
                ? prisma.customerFeedbackResponse.count({
                    where: {
                        kind: "STANDARD",
                        targetType: "EMPLOYEE",
                        employeeId: userId,
                        surveyVersion: { in: ["employee-v3", "employee-v4"] },
                        validity: "VALID",
                        submittedAt: { gte: feedbackDayBounds.from, lt: feedbackDayBounds.toExclusive },
                    },
                })
                : Promise.resolve(0),

            // 11. Customer rubric responses for the same payroll period as attendance.
            isFrontYard
                ? prisma.customerFeedbackResponse.findMany({
                    where: {
                        kind: "STANDARD",
                        targetType: "EMPLOYEE",
                        employeeId: userId,
                        surveyVersion: { in: ["employee-v3", "employee-v4"] },
                        validity: "VALID",
                        submittedAt: { gte: payrollStart, lt: feedbackPeriodEnd },
                    },
                    select: {
                        id: true,
                        answers: {
                            where: { questionKey: { in: [...EMPLOYEE_SCORE_QUESTION_KEYS] } },
                            select: { questionKey: true, choiceValues: true },
                        },
                    },
                })
                : Promise.resolve([]),
        ]);

        // ============================================================
        // Post-processing (CPU-only, no DB)
        // ============================================================

        const rubricResponses: EmployeeScoreResponseInput[] = customerPerformanceResponses.map((response) => ({
            responseId: response.id,
            answers: response.answers.flatMap((answer) => {
                const value = answer.choiceValues[0];
                return value === "YES" || value === "NO" || value === "UNSURE"
                    ? [{ questionKey: answer.questionKey, answer: value }]
                    : [];
            }),
        }));
        const customerRubric = summarizeEmployeeRubric(rubricResponses);
        const performance = calculateEmployeePerformance({
            assignments: shiftAssignments,
            attendances: thisMonthAttendance,
            leaves: performanceLeaves,
            customer: {
                applicable: isFrontYard,
                score64: customerRubric.score64,
                responseCount: customerRubric.responseCount,
                minimumSample: customerRubric.minimumSample,
                meetsMinimumSample: customerRubric.meetsMinimumSample,
            },
            stationCode: currentUser?.station?.code,
            referenceTime: now,
            attendanceGraceMinutes: DEFAULT_ATTENDANCE_GRACE_MINUTES,
        });

        const daysWorked = performance.counts.presentDays;
        const lateCount = performance.counts.lateDays;
        const earlyOutCount = performance.counts.earlyLeaveDays;

        // Break time
        let breakMinutesToday = 0;
        if (todayAttendance) {
            if (todayAttendance.breakDurationMin) {
                breakMinutesToday = todayAttendance.breakDurationMin;
            } else if (todayAttendance.breakStartTime) {
                const end = todayAttendance.breakEndTime || now;
                breakMinutesToday = Math.floor((end.getTime() - todayAttendance.breakStartTime.getTime()) / 60000);
            }
        }

        // Leave counts
        const leaveCount      = leaves.filter(l => l.type !== "OTHER").length;
        const permissionCount = leaves.filter(l => l.type === "OTHER").length;

        // Leave balance - create if not exists
        let finalLeaveBalance = leaveBalance;
        if (!finalLeaveBalance) {
            finalLeaveBalance = await prisma.leaveBalance.create({
                data: {
                    userId,
                    year: currentYear,
                    sickLeave: 30,
                    annualLeave: 6,
                    personalLeave: 3,
                },
            });
        }

        // Advance summary
        const advanceTotalAmount   = advances.reduce((s, a) => s + Number(a.amount), 0);
        const advancePendingAmount = advances
            .filter(a => a.status === "PENDING")
            .reduce((s, a) => s + Number(a.amount), 0);

        // Announcements - filter by department targeting
        const filteredAnnouncements = announcements
            .filter(a => {
                if (!a.targetDepartmentIds) return true;
                try {
                    const targetDepts: string[] = JSON.parse(a.targetDepartmentIds);
                    if (targetDepts.length === 0) return true;
                    return currentUser?.departmentId
                        ? targetDepts.includes(currentUser.departmentId)
                        : true;
                } catch {
                    return true;
                }
            })
            .map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                isPinned: a.isPinned,
                createdAt: a.createdAt.toISOString(),
                author: { name: a.author.name, nickName: a.author.nickName },
                _count: a._count,
                reads: a.reads,
            }));

        // Calendar days
        const calendarDays = calAttendance.map(r => ({
            date: r.date.toISOString(),
            checkedIn: !!r.checkInTime,
            checkedOut: !!r.checkOutTime,
            isLate: (r.lateMinutes || 0) > 0,
            status: r.status,
        }));

        const response = NextResponse.json({
            daysWorked,
            lateCount,
            earlyOutCount,
            breakMinutesToday,
            performanceScore: performance.score,
            performance: {
                score: performance.score,
                isProvisional: performance.isProvisional,
                workPoints: performance.workPoints,
                workPointsMax: performance.workPointsMax,
                customerPoints: performance.customerPoints,
                customerPointsMax: performance.customerPointsMax,
                customerScore64: performance.customerIncluded ? performance.customerScore64 : null,
                customerIncluded: performance.customerIncluded,
                customerMinimumSample: performance.customerMinimumSample,
                components: performance.components,
                counts: performance.counts,
            },
            customerEvaluationStatus: isFrontYard ? getEmployeeDailyEvaluationStatus(customerEvaluationCount) : null,
            leaveCount,
            permissionCount,
            leaveBalance: {
                sickLeave: finalLeaveBalance.sickLeave,
                usedSick: finalLeaveBalance.usedSick,
                annualLeave: finalLeaveBalance.annualLeave,
                usedAnnual: finalLeaveBalance.usedAnnual,
                personalLeave: finalLeaveBalance.personalLeave,
                usedPersonal: finalLeaveBalance.usedPersonal,
            },
            advanceSummary: {
                totalAmount: advanceTotalAmount,
                pendingAmount: advancePendingAmount,
            },
            announcements: filteredAnnouncements,
            calendarDays,
        });

        // Cache for 30s, serve stale for 60s while revalidating
        response.headers.set("Cache-Control", "private, s-maxage=30, stale-while-revalidate=60");
        return response;
    } catch (error) {
        console.error("Employee dashboard error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
