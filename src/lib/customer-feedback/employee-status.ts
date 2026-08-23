import { prisma } from "@/lib/prisma";

/**
 * Helper กลางสำหรับเปลี่ยนสถานะพนักงาน — ทุก route ที่หยุดงานพนักงาน
 * (รายคน, DELETE แบบกลุ่ม, bulk change-status) ต้องเรียกผ่านที่นี่เพื่อให้
 * EMPLOYEE QR ปิดใน transaction เดียวกัน (§12.2)
 */

export const INACTIVE_EMPLOYEE_STATUSES = new Set(["RESIGNED", "SUSPENDED"]);

export interface DeactivateEmployeeResult {
    userId: string;
    isActive: boolean;
    employeeStatus: string;
    closedQrCount: number;
}

export async function setEmployeeInactive(
    userId: string,
    options: { isActive?: boolean; employeeStatus?: string } = {}
): Promise<DeactivateEmployeeResult> {
    const isActive = options.isActive ?? false;
    const employeeStatus = options.employeeStatus ?? (isActive ? "ACTIVE" : "RESIGNED");

    return prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { isActive, employeeStatus: employeeStatus as never },
        });
        // ปิดเฉพาะ QR ที่ยัง active — QR เก่าที่ปิดแล้วไม่แตะ
        const closed = await tx.customerFeedbackQr.updateMany({
            where: { employeeId: userId, targetType: "EMPLOYEE", isActive: true },
            data: { isActive: false, revokedAt: new Date() },
        });
        return { userId, isActive, employeeStatus, closedQrCount: closed.count };
    });
}

/** ใช้เมื่อพบสถานะพนักงานเปลี่ยนจากภายนอก — route ปิดพนักงานควรเรียก setEmployeeInactive แทน */
export function shouldCloseEmployeeQr(isActive: boolean, employeeStatus: string): boolean {
    return !isActive || INACTIVE_EMPLOYEE_STATUSES.has(employeeStatus);
}
