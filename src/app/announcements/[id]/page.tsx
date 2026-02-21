"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, ArrowLeft, Eye, CheckCircle2, Clock } from "lucide-react";
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

    const isAdminOrManager = session?.user?.role &&
        ["ADMIN", "HR", "MANAGER"].includes(session.user.role as string);

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
            <div className="p-4 border-b bg-white flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push("/announcements")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-semibold">ประกาศ</h1>
            </div>

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
                            {post.title !== "ข้อความ" && (
                                <h3 className="font-medium text-slate-800 text-lg">{post.title}</h3>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pb-4 text-slate-700 whitespace-pre-wrap">
                        {post.content}
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
