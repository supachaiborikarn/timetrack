"use client";

import { usePathname } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Pages that should not display the app navigation shell
  const noShellPaths = ["/login", "/register", "/forgot-password"];
  const isNoShellPage = noShellPaths.includes(pathname);

  // Admin pages use their own sidebar layout — no bottom nav, no extra padding
  const isAdminPage = pathname.startsWith("/admin");

  if (isNoShellPage) {
    return <main>{children}</main>;
  }

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background relative pb-[100px]">
      <main className="w-full h-full relative">
        {children}
      </main>
      
      {/* Mobile Bottom Navigation — only for employee-facing pages */}
      <BottomNavigation />
    </div>
  );
}
