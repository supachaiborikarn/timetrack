"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { formatThaiDate } from "@/lib/date-utils";
import { toast } from "sonner";

interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    author: {
        name: string;
        nickName: string | null;
        photoUrl: string | null;
    };
}

export function GlobalAnnouncementModal() {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAcknowledging, setIsAcknowledging] = useState(false);

    // Disable checking if user is on login/register pages
    const isAuthPage = ["/login", "/register", "/forgot-password"].includes(pathname);

    useEffect(() => {
        if (!session?.user?.id || isAuthPage) {
            setIsLoading(false);
            return;
        }

        fetchUnreadMandatory();
    }, [session?.user?.id, isAuthPage]);

    const fetchUnreadMandatory = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/announcements/unread-mandatory");
            if (res.ok) {
                const data = await res.json();
                setAnnouncement(data.announcement);
            }
        } catch (error) {
            console.error("Failed to fetch unread mandatory announcements:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcknowledge = async () => {
        if (!announcement) return;

        setIsAcknowledging(true);
        try {
            const res = await fetch(`/api/announcements/${announcement.id}/read`, {
                method: "POST",
            });
            if (res.ok) {
                toast.success("รับทราบประกาศเรียบร้อยแล้ว");
                // Fetch again to see if there are more
                await fetchUnreadMandatory();
            } else {
                toast.error("ไม่สามารถลงชื่อรับทราบได้");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsAcknowledging(false);
        }
    };

    const handleReadMore = () => {
        // Option to go to announcement page, but we must acknowledge first to unlock
        // So we can let them go to the detail page, but the modal will still appear there unless they acknowledge it there.
        // Wait, if they go to the detail page, the modal will still block them!
        // So they MUST acknowledge it in the modal.
        router.push(`/announcements/${announcement?.id}`);
    };

    if (isLoading || !announcement) return null;

    return (
        <Dialog 
            open={!!announcement} 
            onOpenChange={(open) => {
                // Prevent closing by clicking outside or pressing Escape
                if (!open) return;
            }}
        >
            <DialogContent 
                className="sm:max-w-[500px] border-amber-200 shadow-xl overflow-hidden"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                {/* Header background glow */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
                
                <DialogHeader className="pt-4 pb-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                        <Megaphone className="w-6 h-6 text-orange-600" />
                    </div>
                    <DialogTitle className="text-center text-xl text-slate-800">
                        มีประกาศใหม่!
                    </DialogTitle>
                    <DialogDescription className="text-center text-slate-500">
                        กรุณาอ่านและลงชื่อรับทราบก่อนเข้าใช้งานระบบ
                    </DialogDescription>
                </DialogHeader>

                <div className="my-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-slate-900">
                            {announcement.title !== "ข้อความ" ? announcement.title : "ประกาศ"}
                        </p>
                        <span className="text-xs text-slate-500">
                            {formatThaiDate(new Date(announcement.createdAt), "d MMM HH:mm")}
                        </span>
                    </div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                        {announcement.content}
                    </div>
                    <div className="mt-4 pt-3 border-t text-xs text-slate-500">
                        ประกาศโดย {announcement.author.nickName || announcement.author.name}
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                    <Button
                        variant="outline"
                        onClick={handleReadMore}
                        className="w-full sm:w-auto"
                    >
                        เปิดดูในหน้ารายละเอียด
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                        onClick={handleAcknowledge}
                        disabled={isAcknowledging}
                        className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white gap-2"
                    >
                        {isAcknowledging ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        รับทราบ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
