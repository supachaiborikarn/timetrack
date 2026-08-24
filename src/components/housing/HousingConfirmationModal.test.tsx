import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useSessionMock, toastSuccessMock, toastErrorMock, fetchMock } = vi.hoisted(() => ({
    useSessionMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    fetchMock: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ useSession: useSessionMock }));
vi.mock("sonner", () => ({
    toast: { success: toastSuccessMock, error: toastErrorMock },
}));
vi.mock("@/components/ui/dialog", () => ({
    Dialog: ({ open, children }: { open?: boolean; children: ReactNode }) => open ? <>{children}</> : null,
    DialogContent: ({ children, showCloseButton, onInteractOutside, onEscapeKeyDown, ...props }: HTMLAttributes<HTMLDivElement> & {
        showCloseButton?: boolean;
        onInteractOutside?: unknown;
        onEscapeKeyDown?: unknown;
    }) => {
        void showCloseButton;
        void onInteractOutside;
        void onEscapeKeyDown;
        return <div {...props}>{children}</div>;
    },
    DialogDescription: ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => <p {...props}>{children}</p>,
    DialogFooter: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    DialogHeader: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    DialogTitle: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => <h2 {...props}>{children}</h2>,
}));
vi.mock("@/components/ui/button", () => ({
    Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

import { HousingConfirmationModal } from "./HousingConfirmationModal";

const pendingResponse = {
    confirmationRequired: true,
    currentHousing: { housingStatus: "COMPANY_DORM", dormitoryId: "dorm-1" },
    dormitories: [
        {
            id: "dorm-1",
            name: "บ้านพักหลังปั๊ม",
            station: { id: "station-1", name: "ปั๊มวัดโคก", code: "WKO" },
        },
    ],
};

describe("HousingConfirmationModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("fetch", fetchMock);
        useSessionMock.mockReturnValue({
            data: { user: { id: "employee-1", role: "EMPLOYEE" } },
            status: "authenticated",
        });
        fetchMock.mockResolvedValue(new Response(JSON.stringify(pendingResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }));
    });

    it("requires a fresh choice and closes only after a successful save", async () => {
        fetchMock
            .mockResolvedValueOnce(new Response(JSON.stringify(pendingResponse), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }));

        render(<HousingConfirmationModal />);

        expect(await screen.findByText("กรุณายืนยันที่พักปัจจุบัน")).toBeTruthy();
        const submit = screen.getByRole("button", { name: "ยืนยันข้อมูลที่พัก" }) as HTMLButtonElement;
        expect(submit.disabled).toBe(true);

        fireEvent.click(screen.getByRole("radio", { name: /ปั๊มวัดโคก/ }));
        expect(submit.disabled).toBe(false);
        fireEvent.click(submit);

        await waitFor(() => expect(screen.queryByText("กรุณายืนยันที่พักปัจจุบัน")).toBeNull());
        expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/profile/housing", expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ housingStatus: "COMPANY_DORM", dormitoryId: "dorm-1" }),
        }));
        expect(toastSuccessMock).toHaveBeenCalledWith("ยืนยันข้อมูลที่พักแล้ว");
    });

    it("waits while another mandatory popup is blocking", async () => {
        const view = render(<HousingConfirmationModal suspended />);

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        expect(screen.queryByText("กรุณายืนยันที่พักปัจจุบัน")).toBeNull();

        view.rerender(<HousingConfirmationModal suspended={false} />);
        expect(await screen.findByText("กรุณายืนยันที่พักปัจจุบัน")).toBeTruthy();
    });

    it("keeps the popup open when saving fails", async () => {
        fetchMock
            .mockResolvedValueOnce(new Response(JSON.stringify(pendingResponse), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ error: "บันทึกไม่ได้" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }));

        render(<HousingConfirmationModal />);
        fireEvent.click(await screen.findByRole("radio", { name: /ไม่ได้อยู่บ้านพักบริษัท/ }));
        fireEvent.click(screen.getByRole("button", { name: "ยืนยันข้อมูลที่พัก" }));

        await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("บันทึกไม่ได้"));
        expect(screen.getByText("กรุณายืนยันที่พักปัจจุบัน")).toBeTruthy();
    });
});
