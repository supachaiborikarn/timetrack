"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";
import { GlobalAnnouncementModal } from "@/components/notifications/GlobalAnnouncementModal";
import { HousingConfirmationModal } from "@/components/housing/HousingConfirmationModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAnnouncementBlocking, setIsAnnouncementBlocking] = useState(true);
  
  // Pages that should not display the app navigation shell
  const noShellPaths = ["/login", "/register", "/forgot-password"];
  // Public applicant-facing pages: standalone, with their own layout and bottom action bar.
  // They must never show the employee nav — a job applicant isn't an employee, and even when an
  // admin opens them to preview, the fixed nav would cover the form's own next/submit buttons.
  const noShellPrefixes = ["/apply", "/jobs", "/f", "/feedback"];
  const isNoShellPage = noShellPaths.includes(pathname)
    || noShellPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  // Admin pages use their own sidebar layout — no bottom nav, no extra padding
  const isAdminPage = pathname.startsWith("/admin");

  if (isNoShellPage) {
    return <main>{children}</main>;
  }

  return (
    <>
      <GlobalAnnouncementModal onBlockingChange={setIsAnnouncementBlocking} />
      <HousingConfirmationModal suspended={isAnnouncementBlocking} />
      {isAdminPage ? children : (
        <div className="min-h-screen bg-background relative pb-[100px]">
          <main className="w-full h-full relative">
            {children}
          </main>

          {/* Mobile Bottom Navigation — only for employee-facing pages */}
          <BottomNavigation />
        </div>
      )}
    </>
  );
}
