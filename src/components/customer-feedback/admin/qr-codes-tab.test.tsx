import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QrCodesTab } from "./qr-codes-tab";

const { fetchMock, a4, small } = vi.hoisted(() => ({ fetchMock: vi.fn(), a4: vi.fn(() => "A4"), small: vi.fn(() => "SMALL") }));
vi.mock("@/lib/customer-feedback/print-poster", () => ({
    buildCustomerFeedbackA4PosterHtml: a4,
    buildCustomerFeedbackSmallLabelHtml: small,
    buildCustomerFeedbackSmallLabelA4SheetHtml: vi.fn(),
}));
vi.mock("./employee-picker-dialog", () => ({ EmployeePickerDialog: () => null }));
vi.mock("./station-picker-dialog", () => ({ StationPickerDialog: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const qr = {
    id: "restroom-test", targetType: "STATION", employee: null,
    station: { id: "station-1", name: "ปั๊มทดสอบ", isActive: true, publicEmergencyPhone: "191" },
    publicLabel: "ห้องน้ำ ปั๊มทดสอบ", publicPosition: null, publicProfileApprovedAt: null,
    placement: "RESTROOM", placementKey: "RESTROOM_MAIN", isPrimary: false,
    isActive: false, isTest: true, needsReprint: true, version: 2,
    tokenHint: "hint", manualCodeHint: "45", lastResolvedAt: null, lastPrintedAt: null,
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "open").mockReturnValue({
        document: { write: vi.fn(), close: vi.fn(), images: [], fonts: { ready: Promise.resolve() } },
        focus: vi.fn(), print: vi.fn(),
    } as unknown as Window);
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
        if (!init) return json({ qrCodes: [qr] });
        const { action } = JSON.parse(init.body as string);
        if (action === "promote-test") return json({ qrCode: { id: "restroom-live" }, version: 1, qrUrl: "https://example.com/f#t=live", manualCode: "ABCD2345", manualEntryUrl: "https://example.com/f" });
        return json({ message: "สำเร็จ" });
    });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("restroom QR admin workflow", () => {
    it("promotes a restroom QR using the same A4 artwork and marks the NEW row printed", async () => {
        render(<QrCodesTab />);
        fireEvent.click(await screen.findByRole("button", { name: "เปลี่ยนเป็นใช้งานจริง" }));
        await waitFor(() => expect(a4).toHaveBeenCalledWith(expect.objectContaining({ posterVariant: "RESTROOM", isTest: false, version: 1 })));
        expect(small).not.toHaveBeenCalled();
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/customer-feedback/qr-codes/restroom-live", expect.objectContaining({ body: JSON.stringify({ action: "MARK_PRINTED", expectedVersion: 1 }) })));
    });

    it("offers explicit print acknowledgement for live restroom QR and activates after recording it", async () => {
        fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
            if (!init) return json({ qrCodes: [{ ...qr, isTest: false }] });
            const { action } = JSON.parse(init.body as string);
            if (action === "MARK_PRINTED") return json({ message: "พิมพ์แล้ว", autoActivated: false });
            return json({ message: "สำเร็จ" });
        });
        render(<QrCodesTab />);
        fireEvent.click(await screen.findByRole("button", { name: "พิมพ์/เซฟแล้ว → เปิดใช้" }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/customer-feedback/qr-codes/restroom-test", expect.objectContaining({ body: JSON.stringify({ action: "activate", expectedVersion: 2 }) })));
        const actions = fetchMock.mock.calls.filter(([, init]) => init).map(([, init]) => JSON.parse(init.body).action);
        expect(actions).toEqual(["MARK_PRINTED", "activate"]);
    });

    it("does not activate when print acknowledgement is rejected", async () => {
        fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => init ? json({ error: "stale" }, 409) : json({ qrCodes: [{ ...qr, isTest: false }] }));
        render(<QrCodesTab />);
        fireEvent.click(await screen.findByRole("button", { name: "พิมพ์/เซฟแล้ว → เปิดใช้" }));
        await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init)).toHaveLength(1));
        expect(fetchMock.mock.calls.some(([, init]) => init && JSON.parse(init.body).action === "activate")).toBe(false);
    });
});
