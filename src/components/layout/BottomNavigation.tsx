"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Bell, User, Plus } from "lucide-react";
import { useSession } from "next-auth/react";

export function BottomNavigation() {
  const pathname = usePathname();
  const router = require("next/navigation").useRouter();
  const { data: session, status } = useSession();

  // Hide on login page or when not authenticated
  if (status !== "authenticated" || pathname === "/login") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-[0_-4px_25px_rgba(0,0,0,0.05)] border-t border-border">
      <div className="relative flex justify-around items-center h-20 px-4">
        {/* Home */}
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-1 w-16 ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">หน้าแรก</span>
        </Link>

        {/* Logged/History */}
        <Link 
          href="/history" 
          className={`flex flex-col items-center gap-1 w-16 ${pathname.startsWith('/history') ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-medium">ประวัติ</span>
        </Link>

        {/* Center FAB (Floating Action Button) */}
        <div className="relative -top-8 w-16 flex justify-center">
          <button 
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-background focus:outline-none hover:scale-105 transition-transform"
            onClick={() => {
              const isAdmin = ["ADMIN", "HR", "MANAGER"].includes(session?.user?.role || "");
              if (isAdmin) {
                if (pathname === '/') {
                  document.dispatchEvent(new CustomEvent('open-present-modal'));
                } else {
                  router.push('/?openPresent=true');
                }
              } else {
                if (pathname === '/') {
                  document.dispatchEvent(new CustomEvent('open-clock-modal'));
                } else {
                  router.push('/?openModal=true');
                }
              }
            }}
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        {/* Notifications */}
        <Link 
          href="/notifications" 
          className={`flex flex-col items-center gap-1 w-16 ${pathname.startsWith('/notifications') ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Bell className="w-6 h-6" />
          <span className="text-[10px] font-medium">แจ้งเตือน</span>
        </Link>

        {/* Profile */}
        <Link 
          href="/profile" 
          className={`flex flex-col items-center gap-1 w-16 ${pathname.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">โปรไฟล์</span>
        </Link>
      </div>
    </div>
  );
}
