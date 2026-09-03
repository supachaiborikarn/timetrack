"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Eye, CheckCircle2, Clock, Pencil, Trash2, Save } from "lucide-react";
import { formatThaiDate } from "@/lib/date-utils";
import { toast } from "sonner";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";

interface ReadInfo {
    userId: string;
    name: string;
    nickName: string | null;
    readAt: string;
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: {
        id?: string;
        name: string;
        nickName: string | null;
        image?: string | null;
        photoUrl?: string | null;
    };
}

interface Announcement {
    id: string;
    title: string;
    content: string;
    authorId: string;
    imageUrl: string | null;
    createdAt: string;
    totalReads: number;
    reads: ReadInfo[];
    author: {
        id?: string;
        name: string;
        nickName: string | null;
        image?: string | null;
        photoUrl?: string | null;
    };
    comments: Comment[];
}

export default function AnnouncementDetailPage() {
    const { data: session } = useSession();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [post, setPost] = useState<Announcement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [showReads, setShowReads] = useState(false);
    const [isAcknowledging, setIsAcknowledging] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isAdminOrManager = session?.user?.role &&
        ["ADMIN", "HR", "MANAGER"].includes(session.user.role as string);
    const rawAnnouncementId = params.id;
    const announcementId = Array.isArray(rawAnnouncementId) ? rawAnnouncementId[0] : rawAnnouncementId;
    const shouldOpenEdit = searchParams.get("edit") === "true";
    const shouldHighlightAck = searchParams.get("ack") === "true";

    const canEdit = Boolean(post && session?.user?.id &&
        (post.authorId === session.user.id || isAdminOrManager));
    const hasAcknowledged = Boolean(
        post?.reads?.some((reader) => reader.userId === session?.user?.id),
    );

    const fetchPost = useCallback(async () => {
        if (!announcementId) return;

        try {
            const res = await fetch(`/api/announcements/${announcementId}`);
            if (res.ok) {
                const data = await res.json();
                setPost(data.announcement);
            } else {
                toast.error("ไม่พบประกาศ");
                router.push("/announcements");
            }
        } catch (error) {
            console.error(error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsLoading(false);
        }
    }, [announcementId, router]);

    const handleAcknowledge = async () => {
        if (!announcementId) return;

        setIsAcknowledging(true);
        try {
            const res = await fetch(`/api/announcements/${announcementId}/read`, {
                method: "POST",
            });
            if (res.ok) {
                toast.success("ลงชื่อรับทราบแล้ว");
                await fetchPost();
                if (shouldHighlightAck) {
                    router.replace(`/announcements/${announcementId}`);
                }
            } else {
                toast.error("ไม่สามารถลงชื่อรับทราบได้");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsAcknowledging(false);
        }
    };

    useEffect(() => {
        if (announcementId) {
            fetchPost();
        }
    }, [announcementId, fetchPost]);

    const startEditing = () => {
        if (!post) return;
        setEditTitle(post.title === "ข้อความ" ? "" : post.title);
        setEditContent(post.content);
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditTitle("");
        setEditContent("");
        if (shouldOpenEdit && announcementId) {
            router.replace(`/announcements/${announcementId}`);
        }
    };

    useEffect(() => {
        if (!shouldOpenEdit || !canEdit || !post || isEditing) return;

        setEditTitle(post.title === "ข้อความ" ? "" : post.title);
        setEditContent(post.content);
        setIsEditing(true);
    }, [shouldOpenEdit, canEdit, post, isEditing]);

    const handleSave = async () => {
        if (!announcementId) return;

        if (!editContent.trim()) {
            toast.error("กรุณากรอกเนื้อหา");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`/api/announcements/${announcementId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: editTitle.trim() || "ข้อความ",
                    content: editContent.trim(),
                }),
            });

            if (res.ok) {
                toast.success("แก้ไขเรียบร้อย");
                setIsEditing(false);
                fetchPost();
                if (shouldOpenEdit) {
                    router.replace(`/announcements/${announcementId}`);
                }
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!announcementId) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/announcements/${announcementId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("ลบประกาศเรียบร้อย");
                router.push("/announcements");
            } else {
                const data = await res.json();
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleComment = async () => {
        if (!announcementId) return;

        if (!newComment.trim()) return;

        setIsPosting(true);
        try {
            const res = await fetch(`/api/announcements/${announcementId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment }),
            });

            if (res.ok) {
                setNewComment("");
                toast.success("แสดงความคิดเห็นเรียบร้อย");
                fetchPost();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsPosting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!post) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="ANNOUNCEMENT"
                title="รายละเอียดประกาศ"
                subtitle="อ่านประกาศและร่วมแสดงความคิดเห็น"
                backHref="/announcements"
                right={canEdit && !isEditing ? (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={startEditing}
                            className="tt-retro-control w-9 h-9 rounded-full border border-black/20 bg-white/60 dark:bg-zinc-800 flex items-center justify-center active:scale-95 text-zinc-800 dark:text-zinc-200"
                            title="แก้ไขประกาศ"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="tt-retro-control w-9 h-9 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center active:scale-95 text-red-600 dark:text-red-400"
                            title="ลบประกาศ"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ) : null}
            />

            {/* Delete confirmation */}
            {showDeleteConfirm && (
                <div className="bg-red-500/15 border-b border-red-500/30 p-4">
                    <div className="max-w-[480px] mx-auto flex items-center justify-between">
                        <p className="text-xs font-black text-red-700 dark:text-red-400">ต้องการลบประกาศนี้?</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="tt-retro-control px-3 h-8 rounded-lg border border-zinc-700/20 text-xs font-bold text-zinc-600 dark:text-zinc-300"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="tt-retro-control px-3 h-8 rounded-lg bg-red-600 text-white text-xs font-black flex items-center gap-1 shadow-sm"
                            >
                                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {/* Main Post */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.06)] space-y-3">
                    <div className="flex items-start gap-3 border-b border-zinc-700/15 dark:border-white/10 pb-3">
                        <Avatar className="h-10 w-10 border border-black/15">
                            <AvatarImage src={post.author.image || post.author.photoUrl || ""} />
                            <AvatarFallback className="bg-[#fbbf24] text-zinc-950 font-black text-xs">
                                {post.author.nickName?.charAt(0) || post.author.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-0.5 min-w-0">
                            <div className="flex items-center justify-between">
                                <p className="font-black text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                    {post.author.nickName || post.author.name}
                                </p>
                                <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                    {formatThaiDate(new Date(post.createdAt), "d MMM HH:mm")}
                                </span>
                            </div>
                            {!isEditing && post.title !== "ข้อความ" && (
                                <h2 className="font-black text-base text-zinc-900 dark:text-zinc-100 pt-0.5 leading-tight">{post.title}</h2>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="space-y-3 pt-1">
                            <Input
                                placeholder="หัวข้อ (ไม่บังคับ)"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-11 rounded-xl font-bold bg-white dark:bg-zinc-900 border-zinc-700/30 text-xs"
                            />
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[120px] rounded-xl font-medium bg-white dark:bg-zinc-900 border-zinc-700/30 text-xs resize-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={cancelEditing}
                                    disabled={isSaving}
                                    className="tt-retro-control px-3 h-9 rounded-xl border border-zinc-700/20 text-xs font-bold"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!editContent.trim() || isSaving}
                                    className="tt-retro-control px-3.5 h-9 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-sm"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 pt-1">
                            <p className="text-xs leading-relaxed font-medium text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{post.content}</p>
                            {post.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element -- authenticated route
                                <img src={post.imageUrl} alt="" className="w-full rounded-xl border border-zinc-700/20 object-contain shadow-sm" />
                            )}
                        </div>
                    )}
                </section>

                {/* Acknowledgment */}
                <section
                    className={`tt-paper-card tt-instrument-frame rounded-[20px] border p-4 shadow-[0_2px_0_rgba(0,0,0,0.06)] ${
                        shouldHighlightAck && !hasAcknowledged
                            ? "border-amber-500 bg-amber-500/10 ring-2 ring-[#fbbf24]/50"
                            : "border-zinc-700/30 dark:border-white/15"
                    }`}
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 rounded-xl p-2 border ${
                                hasAcknowledged
                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                                    : "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300"
                            }`}>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                                    {hasAcknowledged ? "ลงชื่อรับทราบเรียบร้อยแล้ว" : "รอการลงชื่อรับทราบ"}
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                    หลังอ่านประกาศนี้ กรุณากดรับทราบและตอบกลับในความคิดเห็นด้านล่าง
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleAcknowledge}
                            disabled={hasAcknowledged || isAcknowledging}
                            className={`tt-retro-control h-10 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shrink-0 shadow-sm transition-all ${
                                hasAcknowledged
                                    ? "border border-zinc-700/20 bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 opacity-80"
                                    : "bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 border border-black/20"
                            }`}
                        >
                            {isAcknowledging ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            {hasAcknowledged ? "รับทราบแล้ว" : "ลงชื่อรับทราบ"}
                        </button>
                    </div>
                </section>

                {/* Read Status - visible to admin/manager */}
                {isAdminOrManager && (
                    <section className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 dark:border-white/15 p-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                        <button
                            onClick={() => setShowReads(!showReads)}
                            className="w-full flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-zinc-400" />
                                <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                                    อ่านแล้ว {post.totalReads || 0} คน
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline">
                                {showReads ? "ซ่อนรายชื่อ" : "ดูรายชื่อ"}
                            </span>
                        </button>

                        {showReads && post.reads && post.reads.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-700/15 dark:border-white/10 space-y-1.5">
                                {post.reads.map((reader) => (
                                    <div key={reader.userId} className="flex items-center justify-between text-xs font-bold">
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-zinc-800 dark:text-zinc-200">
                                                {reader.nickName || reader.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatThaiDate(new Date(reader.readAt), "d MMM HH:mm")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showReads && (!post.reads || post.reads.length === 0) && (
                            <p className="mt-3 pt-3 border-t border-zinc-700/15 text-center text-xs text-zinc-400">
                                ยังไม่มีพนักงานอ่าน
                            </p>
                        )}
                    </section>
                )}

                {/* Comment Input */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/35 dark:border-white/15 p-3.5 shadow-[0_2px_0_rgba(0,0,0,0.06)] space-y-2.5">
                    <Textarea
                        placeholder="ตอบกลับหรือแจ้งรับทราบเพิ่มเติม..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[75px] rounded-xl border-zinc-700/30 bg-white dark:bg-zinc-900 text-xs font-bold resize-none placeholder:text-zinc-400 focus-visible:ring-[#fbbf24]"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleComment}
                            disabled={!newComment.trim() || isPosting}
                            className="tt-retro-control h-9 px-4 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-sm border border-black/15 disabled:opacity-50"
                        >
                            {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            ส่งความคิดเห็น
                        </button>
                    </div>
                </section>

                {/* Comments List */}
                <div className="space-y-2.5 pt-1">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 px-1">
                        ความคิดเห็น ({post.comments.length})
                    </h3>
                    {post.comments.length === 0 ? (
                        <p className="text-center text-xs font-bold text-zinc-400 py-6">ยังไม่มีความคิดเห็นในประกาศนี้</p>
                    ) : (
                        post.comments.map((comment) => (
                            <div key={comment.id} className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/30 dark:border-white/15 p-3 shadow-[0_2px_0_rgba(0,0,0,0.04)]">
                                <div className="flex items-start gap-2.5">
                                    <Avatar className="w-7 h-7 border border-black/10">
                                        <AvatarImage src={comment.author.image || comment.author.photoUrl || ""} />
                                        <AvatarFallback className="bg-black/10 text-zinc-700 text-[10px] font-black">
                                            {comment.author.nickName?.charAt(0) || comment.author.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">
                                                {comment.author.nickName || comment.author.name}
                                            </p>
                                            <span className="text-[9px] font-mono text-zinc-400">
                                                {formatThaiDate(new Date(comment.createdAt), "d MMM HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1 whitespace-pre-wrap">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
