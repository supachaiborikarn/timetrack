import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { stationFindMany } = vi.hoisted(() => ({ stationFindMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { station: { findMany: stationFindMany } } }));
vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: async () => ({ ok: true, ctx: { userId: "manager" } }),
    requireFeedbackPermission: async () => ({ ok: true }),
    getStationScope: async () => ({ ok: true, stationId: "station-1" }),
    parseOptionalFeedbackFilter: (raw: string | null, allowed: readonly string[]) =>
        !raw || allowed.includes(raw) ? { ok: true, value: raw || undefined } : { ok: false, message: "invalid" },
}));

import { GET } from "@/app/api/admin/customer-feedback/qr-codes/candidates/route";
import { StationPickerDialog } from "./station-picker-dialog";

const rows = {
    station: { id: "qr-station", targetType: "STATION", placement: "STATION_MAIN", placementKey: "MAIN", isPrimary: true, isActive: true, publicLabel: "ปั๊มทดสอบ" },
    restroom: { id: "qr-restroom", targetType: "STATION", placement: "RESTROOM", placementKey: "RESTROOM_MAIN", isPrimary: false, isActive: false, publicLabel: "ห้องน้ำ ปั๊มทดสอบ" },
};

function setup(existing: (keyof typeof rows)[]) {
    stationFindMany.mockImplementation(async ({ select }) => [{
        id: "station-1", name: "ปั๊มทดสอบ", isActive: true, publicEmergencyPhone: "191",
        feedbackQrs: existing.map(kind => rows[kind]).filter(row =>
            Object.entries(select.feedbackQrs.where).every(([key, value]) => row[key as keyof typeof row] === value)
        ),
    }]);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => GET(new NextRequest(`http://localhost${url}`))));
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("station QR picker with candidate API", () => {
    it.each([
        ["restroom", ["station"], false],
        ["station", ["restroom"], false],
        ["restroom", ["station", "restroom"], true],
        ["station", ["station", "restroom"], true],
    ] as const)("%s creation with existing %j is blocked=%s", async (kind, existing, blocked) => {
        setup([...existing]);
        const onSelect = vi.fn().mockResolvedValue(true);
        const onOpenChange = vi.fn();
        render(<StationPickerDialog open kind={kind} onSelect={onSelect} onOpenChange={onOpenChange} />);
        const button = await screen.findByRole("button", { name: /ปั๊มทดสอบ/ });
        expect((button as HTMLButtonElement).disabled).toBe(blocked);
        fireEvent.click(button);
        if (blocked) {
            expect(onSelect).not.toHaveBeenCalled();
        } else {
            await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
            expect(onSelect).toHaveBeenCalledWith("station-1");
        }
    });

    it("keeps the picker open when creation fails", async () => {
        setup(["station"]);
        const onOpenChange = vi.fn();
        const onSelect = vi.fn().mockResolvedValue(false);
        render(<StationPickerDialog open kind="restroom" onSelect={onSelect} onOpenChange={onOpenChange} />);
        fireEvent.click(await screen.findByRole("button", { name: /ปั๊มทดสอบ/ }));
        await waitFor(() => expect(onSelect).toHaveBeenCalledOnce());
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toBeTruthy();
    });
});
