"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { freeTierIntervals } from "@/lib/free-tier";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

export function NotificationBell() {
    const { data: session } = useSession();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const lastFetchAtRef = useRef(0);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications?limit=5");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
                lastFetchAtRef.current = Date.now();
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.id) {
            const refreshIfStaleAndVisible = () => {
                const isStale = Date.now() - lastFetchAtRef.current > freeTierIntervals.notificationPoll;
                if (document.visibilityState === "visible" && isStale) {
                    void fetchNotifications();
                }
            };

            const initialTimeout = setTimeout(refreshIfStaleAndVisible, 1500);
            const interval = setInterval(refreshIfStaleAndVisible, freeTierIntervals.notificationPoll);
            document.addEventListener("visibilitychange", refreshIfStaleAndVisible);

            return () => {
                clearTimeout(initialTimeout);
                clearInterval(interval);
                document.removeEventListener("visibilitychange", refreshIfStaleAndVisible);
            };
        }
    }, [fetchNotifications, session?.user?.id]);

    const markAsRead = async (ids?: string[]) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ids ? { ids } : { all: true }),
            });
            void fetchNotifications();
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && session?.user?.id) {
            window.setTimeout(() => {
                void fetchNotifications();
            }, 0);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead([notification.id]);
        }
        if (notification.link) {
            router.push(notification.link);
        }
        setIsOpen(false);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "SWAP_REQUEST": return "🔄";
            case "APPROVAL": return "✅";
            case "ANNOUNCEMENT": return "📢";
            case "SHIFT_REMINDER": return "⏰";
            default: return "🔔";
        }
    };

    if (!session) return null;

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>การแจ้งเตือน</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-1"
                            onClick={() => markAsRead()}
                        >
                            <Check className="w-3 h-3 mr-1" />
                            อ่านทั้งหมด
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">ไม่มีการแจ้งเตือน</p>
                    </div>
                ) : (
                    <>
                        {notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex items-start gap-3 p-3 cursor-pointer ${!notification.isRead ? "bg-blue-500/10" : ""
                                    }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <span className="text-xl">{getTypeIcon(notification.type)}</span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notification.isRead ? "font-medium" : ""}`}>
                                        {notification.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.createdAt), {
                                            addSuffix: true,
                                            locale: th,
                                        })}
                                    </p>
                                </div>
                                {!notification.isRead && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-center text-sm text-blue-500 justify-center"
                            onClick={() => {
                                router.push("/notifications");
                                setIsOpen(false);
                            }}
                        >
                            ดูทั้งหมด
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
