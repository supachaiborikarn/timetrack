import { prisma } from "@/lib/prisma";

/**
 * Alert log กันส่งซ้ำ (§12.9) — กฎทุกข้อต้องมี minimum sample และ cooldown
 * MVP ใช้ Notification ภายในระบบเท่านั้น
 */

export async function tryRecordAlert(params: {
    ruleCode: string;
    ruleVersion?: number;
    targetType: "EMPLOYEE" | "STATION" | "UNKNOWN";
    targetId: string; // กฎระดับทั้งระบบใช้ "GLOBAL"
    windowStart: Date;
    windowEnd: Date;
    details?: Record<string, unknown>;
}): Promise<boolean> {
    try {
        await prisma.customerFeedbackAlertLog.create({
            data: {
                ruleCode: params.ruleCode,
                ruleVersion: params.ruleVersion ?? 1,
                targetType: params.targetType,
                targetId: params.targetId,
                windowStart: params.windowStart,
                windowEnd: params.windowEnd,
                details: (params.details ?? undefined) as never,
            },
        });
        return true;
    } catch {
        // unique conflict = ส่งไปแล้วใน window นี้
        return false;
    }
}
