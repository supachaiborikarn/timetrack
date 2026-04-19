"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Bell,
    ChevronLeft,
    Check,
    Loader2,
    Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { CurvedHeader } from "@/components/layout/CurvedHeader";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsPage() {
    const { data: session, status } = useSession();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            fetchNotifications();
        }
    }, [session?.user?.id]);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/notifications?limit=50");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ all: true }),
            });
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            toast.success("อ่านทั้งหมดแล้ว");
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
            setNotifications(notifications.filter(n => n.id !== id));
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
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

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "SWAP_REQUEST": return <Badge className="bg-blue-100 text-blue-700 border-none">แลกกะ</Badge>;
            case "APPROVAL": return <Badge className="bg-green-100 text-green-700 border-none">อนุมัติ</Badge>;
            case "ANNOUNCEMENT": return <Badge className="bg-purple-100 text-purple-700 border-none">ประกาศ</Badge>;
            case "SHIFT_REMINDER": return <Badge className="bg-orange-100 text-orange-700 border-none">กะ</Badge>;
            default: return <Badge className="bg-slate-100 text-slate-700 border-none">ทั่วไป</Badge>;
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <CurvedHeader>
                <div className="flex items-center justify-between pt-4 pb-2 shadow-none">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-black/10 rounded-full" asChild>
                            <a href="/">
                                <ChevronLeft className="w-6 h-6" />
                            </a>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-primary-foreground flex items-center gap-2">
                                แจ้งเตือน
                                {unreadCount > 0 && (
                                    <Badge className="bg-red-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">{unreadCount}</Badge>
                                )}
                            </h1>
                            <p className="text-sm text-primary-foreground/80">อัปเดตล่าสุดทั้งหมด</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    {unreadCount > 0 && (
                        <Button variant="secondary" size="sm" onClick={markAllAsRead} className="rounded-full bg-white/20 hover:bg-white/30 text-white border-none shadow-none backdrop-blur-md">
                            <Check className="w-4 h-4 mr-1" />
                            อ่านทั้งหมด
                        </Button>
                    )}
                </div>
            </CurvedHeader>

            <div className="px-4 -mt-4 relative z-10">
                {/* Notifications List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-card rounded-3xl border border-border shadow-sm p-12 text-center mt-4">
                        <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">ไม่มีการแจ้งเตือนใหม่</p>
                    </div>
                ) : (
                    <div className="space-y-4 pt-2">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`rounded-3xl p-5 shadow-sm border transition-all active:scale-[0.98] cursor-pointer ${!notification.isRead
                                        ? "bg-primary/5 border-primary/20"
                                        : "bg-card border-border"
                                    }`}
                                onClick={() => {
                                    if (notification.link) {
                                        window.location.href = notification.link;
                                    }
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-2xl flex-shrink-0 ${!notification.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                                        <span className="text-xl leading-none">{getTypeIcon(notification.type)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className={`text-sm ${!notification.isRead ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                                                {notification.title}
                                            </p>
                                            {getTypeBadge(notification.type)}
                                        </div>
                                        <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{notification.message}</p>
                                        
                                        <div className="flex items-center justify-between mt-3">
                                            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                                                {formatDistanceToNow(new Date(notification.createdAt), {
                                                    addSuffix: true,
                                                    locale: th,
                                                })}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
