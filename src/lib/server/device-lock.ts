import { type NextRequest } from "next/server";
import {
    verifyDeviceLock,
    type DeviceLockResult,
    type DeviceLockStore,
    type DeviceLockUser,
    type SubmittedDeviceIds,
} from "@/lib/device-lock";
import { prisma } from "@/lib/prisma";

const prismaDeviceLockStore: DeviceLockStore = {
    async findOwnerByDeviceId(deviceId, currentUserId) {
        return prisma.user.findFirst({
            where: {
                id: { not: currentUserId },
                isActive: true,
                deviceId,
            },
            select: {
                id: true,
                employeeId: true,
                name: true,
                nickName: true,
            },
        });
    },
    async setUserDeviceId(userId, deviceId) {
        await prisma.user.update({
            where: { id: userId },
            data: { deviceId },
        });
    },
};

export function verifyAndSyncUserDevice(user: DeviceLockUser, submitted: SubmittedDeviceIds) {
    return verifyDeviceLock(user, submitted, prismaDeviceLockStore);
}

function readHeaderIp(request: NextRequest): string | null {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null;

    return request.headers.get("x-real-ip");
}

function readSubmittedDeviceId(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function recordDeviceLockAudit(params: {
    request: NextRequest;
    user: DeviceLockUser;
    submitted: SubmittedDeviceIds;
    result: DeviceLockResult;
    flow: "CHECK_IN" | "CHECK_OUT";
}) {
    const shouldLog = !params.result.ok || params.result.migratedFromLegacy;
    if (!shouldLog) return;

    await prisma.auditLog.create({
        data: {
            action: params.result.ok ? "DEVICE_LOCK_MIGRATED" : `DEVICE_LOCK_${params.result.code}`,
            entity: "DeviceLock",
            entityId: params.user.id,
            userId: params.user.id,
            ipAddress: readHeaderIp(params.request),
            userAgent: params.request.headers.get("user-agent"),
            details: JSON.stringify({
                flow: params.flow,
                currentDeviceId: params.user.deviceId,
                submittedDeviceId: readSubmittedDeviceId(params.submitted.deviceId),
                submittedLegacyDeviceId: readSubmittedDeviceId(params.submitted.legacyDeviceId),
                migratedFromLegacy: params.result.ok ? params.result.migratedFromLegacy : false,
                errorCode: params.result.ok ? null : params.result.code,
                error: params.result.ok ? null : params.result.error,
            }),
        },
    });
}
