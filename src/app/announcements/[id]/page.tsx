"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, ArrowLeft, Eye, CheckCircle2, Clock, Pencil, Trash2, X, Save } from "lucide-react";
import { formatThaiDate } from "@/lib/date-utils";
import { toast } from "sonner";

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
        name: string;
        nickName: string | null;
        image: string | null;
    };
}

interface Announcement {
    id: string;
    title: string;
    content: string;
    authorId: string;
    createdAt: string;
    totalReads: number;
    reads: ReadInfo[];
    author: {
        name: string;
        nickName: string | null;
        image: string | null;
    };
    comments: Comment[];
}

export default function AnnouncementDetailPage() {
    const { data: session } = useSession();
    const params = useParams();
    const router = useRouter();
    const [post, setPost] = useState<Announcement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [showReads, setShowReads] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isAdminOrManager = session?.user?.role &&
        ["ADMIN", "HR", "MANAGER"].includes(session.user.role as string);

    const canEdit = post && session?.user?.id &&
        (post.authorId === session.user.id || isAdminOrManager);

    const fetchPost = async () => {
        try {
            const res = await fetch(`/api/announcements/${params.id}`);
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
    };

    const markAsRead = async () => {
        try {
            await fetch(`/api/announcements/${params.id}/read`, {
                method: "POST",
            });
        } catch {
            // Silently fail
        }
    };

    useEffect(() => {
        if (params.id) {
            fetchPost();
            markAsRead();
        }
    }, [params.id]);

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
    };

    const handleSave = async () => {
        if (!editContent.trim()) {
            toast.error("กรุณากรอกเนื้อหา");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`/api/announcements/${params.id}`, {
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
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/announcements/${params.id}`, {
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
        if (!newComment.trim()) return;

        setIsPosting(true);
        try {
            const res = await fetch(`/api/announcements/${params.id}/comments`, {
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
        <div className="min-h-screen bg-slate-50/50 pb-24">
            <div className="p-4 border-b bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/announcements")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="font-semibold">ประกาศ</h1>
                </div>
                {/* Edit/Delete buttons */}
                {canEdit && !isEditing && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={startEditing}
                            className="text-slate-500 hover:text-blue-600"
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-slate-500 hover:text-red-600"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
                <div className="bg-red-50 border-b border-red-200 p-4">
                    <div className="max-w-xl mx-auto flex items-center justify-between">
                        <p className="text-sm text-red-700 font-medium">ต้องการลบประกาศนี้?</p>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="gap-1"
                            >
                                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                ลบ
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-xl mx-auto p-4 space-y-6">
                {/* Main Post */}
                <Card className="shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                        <Avatar>
                            <AvatarImage src={post.author.image || ""} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-700">
                                {post.author.nickName?.charAt(0) || post.author.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-slate-900">
                                    {post.author.nickName || post.author.name}
                                </p>
                                <span className="text-xs text-slate-500">
                                    {formatThaiDate(new Date(post.createdAt), "d MMM HH:mm")}
                                </span>
                            </div>
                            {!isEditing && post.title !== "ข้อความ" && (
                                <h3 className="font-medium text-slate-800 text-lg">{post.title}</h3>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                        {isEditing ? (
                            <div className="space-y-3">
                                <Input
                                    placeholder="หัวข้อ (ไม่บังคับ)"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="font-medium"
                                />
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[120px] resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelEditing}
                                        disabled={isSaving}
                                        className="gap-1"
                                    >
                                        <X className="w-4 h-4" />
                                        ยกเลิก
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={!editContent.trim() || isSaving}
                                        className="gap-1"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        บันทึก
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-700 whitespace-pre-wrap">{post.content}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Read Status - visible to admin/manager */}
                {isAdminOrManager && (
                    <Card className="shadow-sm">
                        <CardContent className="py-3">
                            <button
                                onClick={() => setShowReads(!showReads)}
                                className="w-full flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-medium text-slate-700">
                                        อ่านแล้ว {post.totalReads || 0} คน
                                    </span>
                                </div>
                                <span className="text-xs text-blue-500">
                                    {showReads ? "ซ่อน" : "ดูรายชื่อ"}
                                </span>
                            </button>

                            {showReads && post.reads && post.reads.length > 0 && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                    {post.reads.map((reader) => (
                                        <div key={reader.userId} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                <span className="text-slate-700">
                                                    {reader.nickName || reader.name}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatThaiDate(new Date(reader.readAt), "d MMM HH:mm")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showReads && (!post.reads || post.reads.length === 0) && (
                                <p className="mt-3 pt-3 border-t text-center text-sm text-slate-400">
                                    ยังไม่มีใครอ่าน
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Comment Input */}
                <Card className="shadow-sm">
                    <CardContent className="pt-4 space-y-3">
                        <Textarea
                            placeholder="แสดงความคิดเห็น..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[80px] resize-none"
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleComment}
                                disabled={!newComment.trim() || isPosting}
                                size="sm"
                                className="gap-2"
                            >
                                {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                ส่ง
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Comments */}
                <div className="space-y-3">
                    <h2 className="font-semibold text-slate-700">ความคิดเห็น ({post.comments.length})</h2>
                    {post.comments.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">ยังไม่มีความคิดเห็น</p>
                    ) : (
                        post.comments.map((comment) => (
                            <Card key={comment.id} className="shadow-sm border-none bg-white">
                                <CardContent className="py-3">
                                    <div className="flex items-start gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={comment.author.image || ""} />
                                            <AvatarFallback className="bg-slate-100 text-slate-700 text-sm">
                                                {comment.author.nickName?.charAt(0) || comment.author.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-slate-900">
                                                    {comment.author.nickName || comment.author.name}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {formatThaiDate(new Date(comment.createdAt), "d MMM HH:mm")}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 mt-1">{comment.content}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
