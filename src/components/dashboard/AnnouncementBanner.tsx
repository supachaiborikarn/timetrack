"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, ChevronRight, Eye, X } from "lucide-react";

interface PinnedAnnouncement {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    isRead: boolean;
    readCount: number;
    createdAt: string;
    author: {
        name: string;
        nickName: string | null;
    };
}

export function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState<PinnedAnnouncement[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const markedReadRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        fetchPinnedAnnouncements();
    }, []);

    const fetchPinnedAnnouncements = async () => {
        try {
            const res = await fetch("/api/announcements?pinned=true&limit=5");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data.announcements || []);

                // Auto-mark unread ones as read
                for (const a of data.announcements || []) {
                    if (!a.isRead && !markedReadRef.current.has(a.id)) {
                        markedReadRef.current.add(a.id);
                        markAsRead(a.id);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch pinned announcements:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (announcementId: string) => {
        try {
            await fetch(`/api/announcements/${announcementId}/read`, {
                method: "POST",
            });
        } catch {
            // Silently fail - not critical
        }
    };

    const handleDismiss = (id: string) => {
        setDismissedIds((prev) => new Set(prev).add(id));
    };

    if (isLoading) return null;

    const visibleAnnouncements = announcements.filter(
        (a) => !dismissedIds.has(a.id)
    );

    if (visibleAnnouncements.length === 0) return null;

    return (
        <div className="space-y-3">
            {visibleAnnouncements.map((announcement) => (
                <Card
                    key={announcement.id}
                    className="relative overflow-hidden border-0 shadow-lg"
                    style={{
                        background: "linear-gradient(135deg, #422006 0%, #7c2d12 50%, #9a3412 100%)",
                    }}
                >
                    {/* Decorative glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 mt-0.5">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                    <Megaphone className="w-4 h-4 text-white" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                        📢 ประกาศ
                                    </span>
                                    <span className="text-[10px] text-orange-300/60 flex items-center gap-1">
                                        <Eye className="w-3 h-3" />
                                        {announcement.readCount} คนอ่านแล้ว
                                    </span>
                                </div>

                                {announcement.title !== "ข้อความ" && (
                                    <h3 className="font-bold text-orange-50 text-sm mb-1 leading-snug">
                                        {announcement.title}
                                    </h3>
                                )}

                                <p className="text-orange-200/80 text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                    {announcement.content}
                                </p>

                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-[10px] text-orange-300/50">
                                        โดย {announcement.author.nickName || announcement.author.name}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-3 text-xs text-amber-300 hover:text-amber-200 hover:bg-white/10 gap-1"
                                        onClick={() => window.location.href = `/announcements/${announcement.id}`}
                                    >
                                        อ่านเพิ่มเติม
                                        <ChevronRight className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Dismiss button */}
                            <button
                                onClick={() => handleDismiss(announcement.id)}
                                className="flex-shrink-0 text-orange-300/40 hover:text-orange-200 transition-colors p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
