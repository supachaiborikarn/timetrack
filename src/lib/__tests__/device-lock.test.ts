import { describe, expect, it, vi } from "vitest";
import { verifyDeviceLock, type DeviceLockOwner, type DeviceLockStore } from "../device-lock";

function createStore(owner: DeviceLockOwner | null = null): DeviceLockStore & { setUserDeviceId: ReturnType<typeof vi.fn> } {
    return {
        findOwnerByDeviceId: vi.fn(async () => owner),
        setUserDeviceId: vi.fn(async () => undefined),
    };
}

describe("device-lock", () => {
    it("accepts the current registered device", async () => {
        const store = createStore();

        const result = await verifyDeviceLock(
            { id: "user-1", deviceId: "tt_current" },
            { deviceId: "tt_current" },
            store,
        );

        expect(result).toEqual({ ok: true, deviceId: "tt_current", migratedFromLegacy: false });
        expect(store.setUserDeviceId).not.toHaveBeenCalled();
    });

    it("migrates a legacy fingerprint to a stable device id", async () => {
        const store = createStore();

        const result = await verifyDeviceLock(
            { id: "user-1", deviceId: "legacy123" },
            { deviceId: "tt_new", legacyDeviceId: "legacy123" },
            store,
        );

        expect(result).toEqual({ ok: true, deviceId: "tt_new", migratedFromLegacy: true });
        expect(store.setUserDeviceId).toHaveBeenCalledWith("user-1", "tt_new");
    });

    it("blocks old clients that only submit legacy fingerprints", async () => {
        const store = createStore();

        const result = await verifyDeviceLock(
            { id: "user-1", deviceId: "legacy123" },
            { deviceId: "legacy123" },
            store,
        );

        expect(result.ok).toBe(false);
        expect(result).toMatchObject({ code: "CLIENT_UPDATE_REQUIRED" });
        expect(store.setUserDeviceId).not.toHaveBeenCalled();
    });

    it("blocks a different device when the legacy id does not match", async () => {
        const store = createStore();

        const result = await verifyDeviceLock(
            { id: "user-1", deviceId: "legacy123" },
            { deviceId: "tt_other", legacyDeviceId: "legacy999" },
            store,
        );

        expect(result.ok).toBe(false);
        expect(result).toMatchObject({ code: "DEVICE_MISMATCH" });
        expect(store.setUserDeviceId).not.toHaveBeenCalled();
    });

    it("blocks a device already owned by another active user", async () => {
        const store = createStore({
            id: "user-2",
            employeeId: "EMP002",
            name: "สมชาย",
            nickName: "ชาย",
        });

        const result = await verifyDeviceLock(
            { id: "user-1", deviceId: null },
            { deviceId: "tt_shared" },
            store,
        );

        expect(result.ok).toBe(false);
        expect(result).toMatchObject({ code: "DEVICE_ALREADY_USED" });
        expect(store.setUserDeviceId).not.toHaveBeenCalled();
    });
});
