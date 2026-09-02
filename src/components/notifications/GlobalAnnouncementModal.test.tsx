import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const navigation = vi.hoisted(() => ({ pathname: "/", push: vi.fn() }));
const session = vi.hoisted(() => ({ user: { id: "employee-1" } }));

vi.mock("next-auth/react", () => ({
    useSession: () => ({ data: session, status: "authenticated" }),
}));

vi.mock("next/navigation", () => ({
    usePathname: () => navigation.pathname,
    useRouter: () => ({ push: navigation.push }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { GlobalAnnouncementModal } from "./GlobalAnnouncementModal";

describe("GlobalAnnouncementModal dashboard refresh", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        navigation.pathname = "/";
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ announcement: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })));
    });

    it("checks immediately on dashboard even when an empty-result TTL is still fresh", async () => {
        sessionStorage.setItem("timetrack.lastEmptyMandatoryAnnouncementCheck", String(Date.now()));

        render(<GlobalAnnouncementModal />);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledTimes(1);
        });
        expect(fetch).toHaveBeenCalledWith("/api/announcements/unread-mandatory", { cache: "no-store" });
    });

    it("keeps the free-tier TTL away from dashboard pages", async () => {
        navigation.pathname = "/profile";
        sessionStorage.setItem("timetrack.lastEmptyMandatoryAnnouncementCheck", String(Date.now()));

        render(<GlobalAnnouncementModal />);

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(fetch).not.toHaveBeenCalled();
    });
});
