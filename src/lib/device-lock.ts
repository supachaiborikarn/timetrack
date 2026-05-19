export interface DeviceLockUser {
    id: string;
    deviceId: string | null;
    deviceFingerprint: string | null;
}

export interface DeviceLockOwner {
    id: string;
    employeeId: string;
    name: string;
    nickName: string | null;
}

export interface DeviceLockStore {
    findOwnerByDeviceId(deviceId: string, currentUserId: string): Promise<DeviceLockOwner | null>;
    setUserDeviceLock(userId: string, deviceId: string, deviceFingerprint?: string): Promise<void>;
}

export interface SubmittedDeviceIds {
    deviceId?: unknown;
    legacyDeviceId?: unknown;
}

export type DeviceLockResult =
    | {
        ok: true;
        deviceId: string;
        migratedFromLegacy: boolean;
        rotatedFromFingerprint: boolean;
        syncedFingerprint: boolean;
    }
    | {
        ok: false;
        error: string;
        code: "DEVICE_ID_REQUIRED" | "CLIENT_UPDATE_REQUIRED" | "DEVICE_ALREADY_USED" | "DEVICE_MISMATCH";
    };

function readDeviceId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function getOwnerName(owner: DeviceLockOwner): string {
    return owner.nickName || owner.name || owner.employeeId;
}

function isStableDeviceId(deviceId: string): boolean {
    return deviceId.startsWith("tt_");
}

export async function verifyDeviceLock(
    user: DeviceLockUser,
    submitted: SubmittedDeviceIds,
    store: DeviceLockStore,
): Promise<DeviceLockResult> {
    const deviceId = readDeviceId(submitted.deviceId);
    const legacyDeviceId = readDeviceId(submitted.legacyDeviceId);

    if (!deviceId) {
        return {
            ok: false,
            error: "ไม่พบรหัสอุปกรณ์ กรุณาเปิดหน้านี้ใหม่แล้วลองอีกครั้ง",
            code: "DEVICE_ID_REQUIRED",
        };
    }

    if (!isStableDeviceId(deviceId)) {
        return {
            ok: false,
            error: "แอปในเครื่องยังเป็นเวอร์ชันเก่า กรุณาปิดหน้าเว็บแล้วเปิดใหม่ก่อนลงเวลา",
            code: "CLIENT_UPDATE_REQUIRED",
        };
    }

    if (user.deviceId === deviceId) {
        const shouldSyncFingerprint = Boolean(legacyDeviceId && !user.deviceFingerprint);
        if (shouldSyncFingerprint) {
            await store.setUserDeviceLock(user.id, deviceId, legacyDeviceId);
        }

        return {
            ok: true,
            deviceId,
            migratedFromLegacy: false,
            rotatedFromFingerprint: false,
            syncedFingerprint: shouldSyncFingerprint,
        };
    }

    const canMigrateLegacyDevice = Boolean(user.deviceId && legacyDeviceId && user.deviceId === legacyDeviceId);
    const canRotateStableDevice = Boolean(
        user.deviceId &&
        user.deviceFingerprint &&
        legacyDeviceId &&
        user.deviceFingerprint === legacyDeviceId,
    );

    if (user.deviceId && !canMigrateLegacyDevice && !canRotateStableDevice) {
        return {
            ok: false,
            error: "กรุณาใช้อุปกรณ์ที่ลงทะเบียนไว้เท่านั้น หากเปลี่ยนเครื่องให้แอดมินกดปลดล็อกอุปกรณ์ก่อน",
            code: "DEVICE_MISMATCH",
        };
    }

    const existingOwner = await store.findOwnerByDeviceId(deviceId, user.id);
    if (existingOwner) {
        return {
            ok: false,
            error: `อุปกรณ์นี้ถูกผูกกับ ${getOwnerName(existingOwner)} แล้ว กรุณาใช้เครื่องของตัวเองหรือให้แอดมินปลดล็อกก่อน`,
            code: "DEVICE_ALREADY_USED",
        };
    }

    await store.setUserDeviceLock(user.id, deviceId, legacyDeviceId || undefined);

    return {
        ok: true,
        deviceId,
        migratedFromLegacy: canMigrateLegacyDevice,
        rotatedFromFingerprint: canRotateStableDevice,
        syncedFingerprint: Boolean(legacyDeviceId),
    };
}
