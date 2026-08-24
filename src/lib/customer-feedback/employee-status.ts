import { Prisma, type EmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Helper กลางสำหรับเปลี่ยนสถานะพนักงาน — ทุก route ที่หยุดงานพนักงาน
 * (รายคน, DELETE แบบกลุ่ม, bulk change-status) ต้องเรียกผ่านที่นี่เพื่อให้
 * EMPLOYEE QR ปิดใน transaction เดียวกัน (§12.2)
 */

export const INACTIVE_EMPLOYEE_STATUSES = new Set<EmployeeStatus>(["RESIGNED", "SUSPENDED"]);

export interface DeactivateEmployeeResult {
    userId: string;
    isActive: boolean;
    employeeStatus: string;
    closedQrCount: number;
}

/**
 * ล็อกและอัปเดต User ก่อนปิด QR เพื่อใช้ลำดับเดียวกับ feedback submit
 * ผู้เรียกที่ต้องแก้ข้อมูลพนักงานหลายช่องส่งงานอัปเดต User ผ่าน callback นี้ได้
 */
export async function updateEmployeeAndCloseQr<T>(
    userId: string,
    updateUser: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<{ employee: T; closedQrCount: number }> {
    return prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
        const employee = await updateUser(tx);
        const closed = await tx.customerFeedbackQr.updateMany({
            where: { employeeId: userId, targetType: "EMPLOYEE", isActive: true },
            data: { isActive: false, revokedAt: new Date() },
        });
        return { employee, closedQrCount: closed.count };
    });
}

export async function setEmployeeInactive(
    userId: string,
    options: { isActive?: boolean; employeeStatus?: EmployeeStatus } = {}
): Promise<DeactivateEmployeeResult> {
    const isActive = options.isActive ?? false;
    const employeeStatus = options.employeeStatus ?? (isActive ? "ACTIVE" : "RESIGNED");

    const result = await updateEmployeeAndCloseQr(userId, (tx) =>
        tx.user.update({
            where: { id: userId },
            data: { isActive, employeeStatus },
        })
    );
    return { userId, isActive, employeeStatus, closedQrCount: result.closedQrCount };
}

/** ใช้เมื่อพบสถานะพนักงานเปลี่ยนจากภายนอก — route ปิดพนักงานควรเรียก setEmployeeInactive แทน */
export function shouldCloseEmployeeQr(isActive: boolean, employeeStatus: EmployeeStatus): boolean {
    return !isActive || INACTIVE_EMPLOYEE_STATUSES.has(employeeStatus);
}
