import { prisma } from "@/lib/prisma";
import { deleteAsset } from "@/lib/assets";

/**
 * Removing an employee account entirely is only safe when the account has never been used for
 * anything. Several relations (attendance, leave, advances, …) cascade on delete, so a careless
 * hard delete would silently destroy real records rather than failing loudly. Everything counted
 * here therefore blocks a hard delete; the caller falls back to deactivating the account instead.
 *
 * Deliberately NOT counted: notifications, push subscriptions and passkeys. Those are account
 * plumbing with no value once the account is gone, and they cascade cleanly.
 */
export type EmployeeActivity = { label: string; count: number };

export async function findEmployeeActivity(userId: string): Promise<EmployeeActivity[]> {
    const [
        attendance, payrollRecords, advances, shiftAssignments, leaves, specialIncomes,
        timeCorrections, overtimeRequests, dailyPayrollOverrides, reviewSubmissions,
        announcements, comments, swapsRequested, swapsTargeted, profileEditRequests,
        oneOnOneAsUser, oneOnOneAsSupervisor, happinessLogs, stationTransfers,
        approvedAttendances, approvedLeaves, jobOpeningsCreated, applicationsReviewed, auditLogs,
        feedbackResponses, openFeedbackReviewRequests,
    ] = await Promise.all([
        prisma.attendance.count({ where: { userId } }),
        prisma.payrollRecord.count({ where: { userId } }),
        prisma.advance.count({ where: { userId } }),
        prisma.shiftAssignment.count({ where: { userId } }),
        prisma.leave.count({ where: { userId } }),
        prisma.specialIncome.count({ where: { userId } }),
        prisma.timeCorrection.count({ where: { userId } }),
        prisma.overtimeRequest.count({ where: { userId } }),
        prisma.dailyPayrollOverride.count({ where: { userId } }),
        prisma.reviewSubmission.count({ where: { employeeId: userId } }),
        prisma.announcement.count({ where: { authorId: userId } }),
        prisma.comment.count({ where: { authorId: userId } }),
        prisma.shiftSwap.count({ where: { requesterId: userId } }),
        prisma.shiftSwap.count({ where: { targetId: userId } }),
        prisma.profileEditRequest.count({ where: { userId } }),
        prisma.oneOnOneLog.count({ where: { userId } }),
        prisma.oneOnOneLog.count({ where: { supervisorId: userId } }),
        prisma.happinessLog.count({ where: { userId } }),
        prisma.stationTransfer.count({ where: { userId } }),
        prisma.attendance.count({ where: { approvedBy: userId } }),
        prisma.leave.count({ where: { approvedBy: userId } }),
        prisma.jobOpening.count({ where: { createdById: userId } }),
        prisma.jobApplication.count({ where: { reviewedById: userId } }),
        prisma.auditLog.count({ where: { userId } }),
        prisma.customerFeedbackResponse.count({ where: { employeeId: userId } }),
        prisma.customerFeedbackReviewRequest.count({
            where: { employeeId: userId, status: { in: ["OPEN", "IN_REVIEW"] } },
        }),
    ]);

    return [
        { label: "การลงเวลา", count: attendance },
        { label: "คำตอบประเมินจากลูกค้า", count: feedbackResponses },
        { label: "คำขอทบทวนเสียงลูกค้าที่ยังไม่ปิด", count: openFeedbackReviewRequests },
        { label: "เงินเดือน", count: payrollRecords },
        { label: "การเบิกค่าแรง", count: advances },
        { label: "ตารางกะ", count: shiftAssignments },
        { label: "การลา", count: leaves },
        { label: "รายได้พิเศษ", count: specialIncomes },
        { label: "คำขอแก้เวลา", count: timeCorrections },
        { label: "คำขอ OT", count: overtimeRequests },
        { label: "การปรับค่าแรงรายวัน", count: dailyPayrollOverrides },
        { label: "แบบประเมิน", count: reviewSubmissions },
        { label: "ประกาศที่เขียน", count: announcements },
        { label: "ความคิดเห็น", count: comments },
        { label: "คำขอแลกกะ", count: swapsRequested + swapsTargeted },
        { label: "คำขอแก้ข้อมูล", count: profileEditRequests },
        { label: "บันทึก One-on-One", count: oneOnOneAsUser + oneOnOneAsSupervisor },
        { label: "บันทึกความสุข", count: happinessLogs },
        { label: "การย้ายสาขา", count: stationTransfers },
        { label: "รายการที่อนุมัติไว้", count: approvedAttendances + approvedLeaves },
        { label: "ประกาศรับสมัครที่สร้าง", count: jobOpeningsCreated },
        { label: "ใบสมัครที่พิจารณา", count: applicationsReviewed },
        { label: "ประวัติการใช้งานระบบ", count: auditLogs },
    ].filter((item) => item.count > 0);
}

/**
 * Removes a hired employee's account. Hard-deletes only when the account has no activity at all;
 * otherwise deactivates it the same way the employee list does, so nothing real is ever lost.
 */
export async function removeEmployeeAccount(userId: string): Promise<{ deleted: boolean; activity: EmployeeActivity[] }> {
    const activity = await findEmployeeActivity(userId);

    if (activity.length > 0) {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: false, employeeStatus: "RESIGNED" },
        });
        return { deleted: false, activity };
    }

    // StoredAsset rows cascade with the user, but the bytes live in Cloudinary and
    // would be left behind paying for storage nobody can reach — delete them first.
    const assets = await prisma.storedAsset.findMany({
        where: { ownerUserId: userId },
        select: { id: true, mimeType: true, sizeBytes: true, storageDriver: true, storageKey: true },
    });
    for (const asset of assets) await deleteAsset(asset);

    await prisma.user.delete({ where: { id: userId } });
    return { deleted: true, activity };
}
