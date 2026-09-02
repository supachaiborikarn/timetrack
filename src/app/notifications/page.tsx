"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  AlarmClock,
  AlertTriangle,
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  Gift,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Repeat2,
  Trash2,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

type NotificationGroup = "action" | "important" | "general";

interface NotificationMeta {
  label: string;
  icon: LucideIcon;
  group: NotificationGroup;
}

const NOTIFICATION_META: Record<string, NotificationMeta> = {
  SWAP_REQUEST: { label: "แลกกะ", icon: Repeat2, group: "action" },
  ATTENDANCE_ALERT: { label: "เวลางาน", icon: AlertTriangle, group: "action" },
  COMPETITION_REWARD: { label: "รางวัล", icon: Gift, group: "action" },
  APPROVAL: { label: "อนุมัติ", icon: BadgeCheck, group: "important" },
  ANNOUNCEMENT: { label: "ประกาศ", icon: Megaphone, group: "important" },
  SHIFT_REMINDER: { label: "กะงาน", icon: AlarmClock, group: "important" },
  COMPETITION_AWARD: { label: "แชมป์", icon: Trophy, group: "important" },
};

const GROUP_LABELS: Record<NotificationGroup, { eyebrow: string; title: string; hint: string }> = {
  action: { eyebrow: "ACTION REQUIRED", title: "ต้องดำเนินการ", hint: "ควรเปิดดูและจัดการก่อน" },
  important: { eyebrow: "IMPORTANT", title: "สำคัญ", hint: "ข้อมูลที่ควรรู้" },
  general: { eyebrow: "UPDATES", title: "ทั่วไป", hint: "อัปเดตอื่น ๆ" },
};

function getMeta(type: string): NotificationMeta {
  return NOTIFICATION_META[type] ?? { label: "ทั่วไป", icon: Bell, group: "general" };
}

function broadcastUnreadCount(count: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("timetrack:notifications-updated", { detail: { unreadCount: Math.max(0, count) } }));
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      void fetchNotifications();
    }
  }, [session?.user?.id]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const count = data.unreadCount ?? 0;
        setNotifications(data.notifications || []);
        setUnreadCount(count);
        broadcastUnreadCount(count);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error("mark-all failed");
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      broadcastUnreadCount(0);
      toast.success("อ่านทั้งหมดแล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const deleteNotification = async (notification: Notification) => {
    try {
      const res = await fetch(`/api/notifications?id=${notification.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      if (!notification.isRead) {
        const nextCount = Math.max(0, unreadCount - 1);
        setUnreadCount(nextCount);
        broadcastUnreadCount(nextCount);
      }
      setMenuId(null);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const openNotification = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notification.id] }),
        });
        if (res.ok) {
          setNotifications((current) =>
            current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item),
          );
          const nextCount = Math.max(0, unreadCount - 1);
          setUnreadCount(nextCount);
          broadcastUnreadCount(nextCount);
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const groupedNotifications = useMemo(() => {
    const grouped: Record<NotificationGroup, Notification[]> = {
      action: [],
      important: [],
      general: [],
    };

    for (const notification of notifications) {
      grouped[getMeta(notification.type).group].push(notification);
    }

    return grouped;
  }, [notifications]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#fbbf24]" />
      </div>
    );
  }

  if (!session) redirect("/login");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eee8db] pb-28 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <EmployeePageHeader
        eyebrow="INBOX"
        title="แจ้งเตือน"
        subtitle="สิ่งที่ต้องรู้และสิ่งที่ต้องทำ"
      />

      <main className="mx-auto max-w-[470px] space-y-3 px-3 pb-8 pt-3">
        <section className="tt-retro-enter overflow-hidden rounded-[20px] border-2 border-zinc-800/80 bg-zinc-950 text-white shadow-[0_4px_0_rgba(0,0,0,0.16)] dark:border-white/20">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4">
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-black tracking-[0.2em] text-[#fbbf24]">UNREAD STATUS</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-mono text-[38px] font-black leading-none text-white">{unreadCount}</span>
                <span className="pb-1 text-[12px] font-black text-zinc-400">รายการยังไม่ได้อ่าน</span>
              </div>
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="tt-retro-control flex h-11 items-center gap-1.5 rounded-xl border border-amber-300/60 bg-[#fbbf24] px-3 text-[11px] font-black text-black shadow-[0_2px_0_rgba(255,255,255,0.12)]"
              >
                <Check className="h-4 w-4" />
                อ่านทั้งหมด
              </button>
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
                <Check className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="border-t border-white/10 bg-emerald-950/35 px-4 py-2 text-[10px] font-black text-emerald-400">
            {unreadCount > 0 ? "● มีรายการใหม่ที่ควรตรวจสอบ" : "✓ อ่านครบแล้ว ไม่มีรายการค้าง"}
          </div>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-[#fbbf24]" />
          </div>
        ) : notifications.length === 0 ? (
          <section className="tt-paper-card rounded-[20px] border border-zinc-700/30 p-10 text-center dark:border-white/15">
            <Bell className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-3 text-sm font-black">ยังไม่มีการแจ้งเตือน</p>
            <p className="mt-1 text-xs text-zinc-500">เมื่อมีเรื่องสำคัญ ระบบจะแสดงที่หน้านี้</p>
          </section>
        ) : (
          (["action", "important", "general"] as NotificationGroup[]).map((group) => {
            const items = groupedNotifications[group];
            if (items.length === 0) return null;
            const groupLabel = GROUP_LABELS[group];

            return (
              <section key={group} className="space-y-2">
                <div className="flex items-end justify-between px-1 pt-1">
                  <div>
                    <p className={`font-mono text-[8px] font-black tracking-[0.18em] ${group === "action" ? "text-amber-700 dark:text-amber-300" : "text-zinc-500"}`}>
                      {groupLabel.eyebrow}
                    </p>
                    <h2 className="text-[15px] font-black">{groupLabel.title}</h2>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500">{groupLabel.hint}</span>
                </div>

                <div className="space-y-2">
                  {items.map((notification) => {
                    const meta = getMeta(notification.type);
                    const Icon = meta.icon;
                    const isMenuOpen = menuId === notification.id;

                    return (
                      <article
                        key={notification.id}
                        className={`tt-retro-enter tt-paper-card tt-instrument-frame relative overflow-hidden rounded-[18px] border dark:border-white/15 ${
                          !notification.isRead
                            ? "border-zinc-800/65 dark:border-amber-300/35"
                            : "border-zinc-700/30"
                        }`}
                      >
                        {!notification.isRead && <span className="absolute left-0 top-0 h-full w-1 bg-[#fbbf24]" aria-hidden="true" />}

                        <button
                          type="button"
                          onClick={() => void openNotification(notification)}
                          className="block w-full px-3.5 py-3.5 text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-700/35 ${!notification.isRead ? "bg-[#fbbf24] text-black" : "bg-[#eee2cd] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-zinc-600/20 bg-zinc-900 px-2 py-0.5 font-mono text-[7px] font-black tracking-[0.12em] text-[#fbbf24]">
                                  {meta.label}
                                </span>
                                {!notification.isRead && <span className="h-2 w-2 rounded-full bg-[#fbbf24] ring-2 ring-amber-500/20" />}
                              </div>
                              <p className={`mt-1.5 text-[13px] leading-snug ${!notification.isRead ? "font-black" : "font-bold text-zinc-700 dark:text-zinc-200"}`}>
                                {notification.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {notification.message}
                              </p>

                              <div className="mt-2.5 flex items-center justify-between gap-2">
                                <p className="font-mono text-[8px] font-black uppercase tracking-[0.08em] text-zinc-400">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: th })}
                                </p>
                                {notification.link && (
                                  <span className="flex items-center gap-0.5 text-[9px] font-black text-zinc-600 dark:text-zinc-300">
                                    เปิดดู <ChevronRight className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>

                        <div className="absolute right-2 top-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuId(isMenuOpen ? null : notification.id);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-zinc-900/5 hover:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                            aria-label="ตัวเลือกแจ้งเตือน"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {isMenuOpen && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void deleteNotification(notification);
                              }}
                              className="absolute right-0 top-9 z-10 flex w-28 items-center gap-2 rounded-xl border border-red-700/20 bg-[#fff8ed] px-3 py-2 text-[10px] font-black text-red-600 shadow-lg dark:bg-zinc-900 dark:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              ลบรายการ
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
