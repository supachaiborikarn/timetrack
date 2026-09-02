"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Clock3, Home, List, Plus, User } from "lucide-react";
import { useSession } from "next-auth/react";

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const isAdmin = ["ADMIN", "HR", "MANAGER"].includes(session?.user?.role || "");

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    let cancelled = false;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setUnreadCount(data.unreadCount ?? 0);
      } catch (error) {
        console.error("Failed to fetch notification count:", error);
      }
    };

    const handleNotificationUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === "number") {
        setUnreadCount(Math.max(0, detail.unreadCount));
      } else {
        void fetchUnreadCount();
      }
    };

    void fetchUnreadCount();
    window.addEventListener("timetrack:notifications-updated", handleNotificationUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("timetrack:notifications-updated", handleNotificationUpdate);
    };
  }, [pathname, session?.user?.id, status]);

  // Hide on login page or when not authenticated
  if (status !== "authenticated" || pathname === "/login") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 tt-paper-card rounded-t-[26px] shadow-[0_-4px_25px_rgba(0,0,0,0.08)] border-t border-zinc-700/20 dark:border-white/10">
      <div className="relative flex justify-around items-center h-[86px] px-3">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 w-16 ${pathname === "/" ? "text-primary" : "text-muted-foreground"}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">หน้าแรก</span>
        </Link>

        <Link
          href="/history"
          className={`flex flex-col items-center gap-1 w-16 ${pathname.startsWith("/history") ? "text-primary" : "text-muted-foreground"}`}
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-medium">ประวัติ</span>
        </Link>

        <div className="relative -top-7 w-20 flex flex-col items-center justify-center">
          <button
            className="tt-retro-control w-[70px] h-[70px] rounded-full bg-[#fbbf24] text-zinc-900 flex items-center justify-center shadow-[0_5px_14px_rgba(0,0,0,0.18),inset_0_0_0_2px_rgba(255,255,255,0.34)] border-[5px] border-[#f6f0e5] dark:border-zinc-900 outline outline-1 outline-zinc-700/25 focus:outline-none"
            onClick={() => {
              if (isAdmin) {
                if (pathname === "/") {
                  document.dispatchEvent(new CustomEvent("open-present-modal"));
                } else {
                  router.push("/?openPresent=true");
                }
              } else {
                if (pathname === "/") {
                  document.dispatchEvent(new CustomEvent("open-clock-modal"));
                } else {
                  router.push("/?openModal=true");
                }
              }
            }}
          >
            {isAdmin ? <Plus className="w-8 h-8" /> : <Clock3 className="w-9 h-9" strokeWidth={2.2} />}
          </button>
          {!isAdmin && (
            <span className="absolute top-[73px] whitespace-nowrap text-[9px] font-black text-zinc-700 dark:text-zinc-200">เข้า/ออกงาน</span>
          )}
        </div>

        <Link
          href="/notifications"
          className={`relative flex flex-col items-center gap-1 w-16 ${pathname.startsWith("/notifications") ? "text-primary" : "text-muted-foreground"}`}
        >
          <span className="relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -right-2.5 -top-2 grid min-h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-[#f6f0e5] bg-red-500 px-1 text-[8px] font-black leading-none text-white dark:border-zinc-900">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium">แจ้งเตือน</span>
        </Link>

        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 w-16 ${pathname.startsWith("/profile") ? "text-primary" : "text-muted-foreground"}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">โปรไฟล์</span>
        </Link>
      </div>
    </div>
  );
}
