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
            case "SWAP_REQUEST": return <Badge className="bg-blue-500/20 text-blue-400">แลกกะ</Badge>;
            case "APPROVAL": return <Badge className="bg-green-500/20 text-green-400">อนุมัติ</Badge>;
            case "ANNOUNCEMENT": return <Badge className="bg-purple-500/20 text-purple-400">ประกาศ</Badge>;
            case "SHIFT_REMINDER": return <Badge className="bg-orange-500/20 text-orange-400">กะ</Badge>;
            default: return <Badge className="bg-slate-500/20 text-slate-400">ทั่วไป</Badge>;
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                        <a href="/">
                            <ChevronLeft className="w-5 h-5" />
                        </a>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            การแจ้งเตือน
                            {unreadCount > 0 && (
                                <Badge className="bg-red-500">{unreadCount}</Badge>
                            )}
                        </h1>
                        <p className="text-sm text-slate-400">แจ้งเตือนทั้งหมด</p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                        <Check className="w-4 h-4 mr-1" />
                        อ่านทั้งหมด
                    </Button>
                )}
            </div>

            {/* Notifications List */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : notifications.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                        <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">ไม่มีการแจ้งเตือน</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={`border-slate-700 cursor-pointer transition-all hover:bg-slate-700/50 ${!notification.isRead
                                    ? "bg-blue-900/20 border-l-4 border-l-blue-500"
                                    : "bg-slate-800/50"
                                }`}
                            onClick={() => {
                                if (notification.link) {
                                    window.location.href = notification.link;
                                }
                            }}
                        >
                            <CardContent className="py-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{getTypeIcon(notification.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className={`font-medium text-white ${!notification.isRead ? "font-semibold" : ""}`}>
                                                {notification.title}
                                            </p>
                                            {getTypeBadge(notification.type)}
                                        </div>
                                        <p className="text-sm text-slate-400">{notification.message}</p>
                                        <p className="text-xs text-slate-500 mt-2">
                                            {formatDistanceToNow(new Date(notification.createdAt), {
                                                addSuffix: true,
                                                locale: th,
                                            })}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-slate-500 hover:text-red-400"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
