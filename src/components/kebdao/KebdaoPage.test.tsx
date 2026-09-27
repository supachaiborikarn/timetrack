import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KebdaoPage } from "./KebdaoPage";
const base = { actorId: "self", registrations: [], outlets: [{ stationId: "a", outletCode: "0394", station: { name: "สาขาทดสอบ" } }], stations: [], unregistered: [] };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Kebdao screens", () => {
    it("uploads the card and submits exact codes without inventing signup totals", async () => {
        const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => base })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "photo" }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
            .mockResolvedValueOnce({ ok: true, json: async () => base });
        vi.stubGlobal("fetch", fetcher);
        render(<KebdaoPage />);
        expect((await screen.findAllByText("สาขาทดสอบ · ID 0394")).length).toBeGreaterThan(0);
        expect(screen.getByText(/ยังไม่มีข้อมูลจากบริษัท/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("CSR ID"), { target: { value: "039401" } });
        fireEvent.change(screen.getByLabelText(/รูปบัตร 1–2 รูป/), { target: { files: [new File(["image"], "card.jpg", { type: "image/jpeg" })] } });
        fireEvent.click(screen.getByRole("checkbox"));
        const fileInput = screen.getByLabelText(/รูปบัตร 1–2 รูป/) as HTMLInputElement;
        expect(fileInput.files?.length).toBe(1);
        // jsdom's synthetic files property does not populate the native file value.
        expect(fileInput.validity.valueMissing).toBe(true);
        fireEvent.submit(screen.getByRole("button", { name: "ส่งให้ตรวจสอบ" }).closest("form")!);
        await screen.findByText("บันทึกเรียบร้อยแล้ว");
        const submission = fetcher.mock.calls.find(call => call[1]?.method === "POST" && call[0] === "/api/kebdao");
        expect(JSON.parse(submission![1].body)).toMatchObject({ csrId: "039401", outletCode: "0394", assetIds: ["photo"], confirmed: true });
    });
    it("displays upload errors and does not submit incomplete evidence", async () => {
        const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => base })
            .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "รูปภาพเสียหาย" }) });
        vi.stubGlobal("fetch", fetcher); render(<KebdaoPage />);
        await screen.findByLabelText("CSR ID");
        fireEvent.change(screen.getByLabelText("CSR ID"), { target: { value: "039401" } });
        fireEvent.change(screen.getByLabelText(/รูปบัตร 1–2 รูป/), { target: { files: [new File(["broken"], "card.jpg", { type: "image/jpeg" })] } });
        fireEvent.click(screen.getByRole("checkbox"));
        const fileInput = screen.getByLabelText(/รูปบัตร 1–2 รูป/) as HTMLInputElement;
        expect(fileInput.files?.length).toBe(1);
        // jsdom's synthetic files property does not populate the native file value.
        expect(fileInput.validity.valueMissing).toBe(true);
        fireEvent.submit(screen.getByRole("button", { name: "ส่งให้ตรวจสอบ" }).closest("form")!);
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("รูปภาพเสียหาย"));
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});
