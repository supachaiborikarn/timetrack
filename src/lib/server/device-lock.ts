import { verifyDeviceLock, type DeviceLockStore, type DeviceLockUser, type SubmittedDeviceIds } from "@/lib/device-lock";
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
