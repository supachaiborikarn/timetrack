"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, MessageSquare, MoreHorizontal } from "lucide-react";
import { formatThaiDate } from "@/lib/date-utils";
import { toast } from "sonner";
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    author: {
        name: string;
        nickName: string | null;
        image: string | null;
    };
    _count: {
        comments: number;
    };
}

export default function AnnouncementsPage() {
    const { data: session } = useSession();
    const [posts, setPosts] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostTitle, setNewPostTitle] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    const fetchPosts = async () => {
        try {
            const res = await fetch("/api/announcements");
            if (res.ok) {
                const data = await res.json();
                setPosts(data.announcements);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handlePost = async () => {
        if (!newPostContent.trim()) return;

        setIsPosting(true);
        try {
            const res = await fetch("/api/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newPostTitle,
                    content: newPostContent
                }),
            });

            if (res.ok) {
                setNewPostContent("");
                setNewPostTitle("");
                toast.success("โพสต์เรียบร้อยแล้ว");
                fetchPosts();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-24">
            <div className="p-4 border-b bg-white">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">หน้าหลัก</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Team Chat</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-xl mx-auto p-4 space-y-6">
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-slate-900">Team Chat & ประกาศ</h1>

                    {/* Post Box */}
                    <Card className="shadow-sm">
                        <CardContent className="pt-4 space-y-3">
                            <Input
                                placeholder="หัวข้อ (ไม่บังคับ)"
                                value={newPostTitle}
                                onChange={(e) => setNewPostTitle(e.target.value)}
                                className="font-medium"
                            />
                            <Textarea
                                placeholder="มีอะไรอยากแจ้งทีมไหม?"
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                className="min-h-[100px] resize-none"
                            />
                            <div className="flex justify-end">
                                <Button
                                    onClick={handlePost}
                                    disabled={!newPostContent.trim() || isPosting}
                                    className="gap-2"
                                >
                                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    โพสต์
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Feed */}
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            ยังไม่มีประกาศ
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <Card key={post.id} className="shadow-sm border-none bg-white">
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
                                                <h3 className="font-medium text-slate-800">{post.title}</h3>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-3 text-slate-700 whitespace-pre-wrap">
                                        {post.content}
                                    </CardContent>
                                    <CardFooter className="pt-0 pb-3 border-t bg-slate-50/50">
                                        <Button variant="ghost" size="sm" className="gap-2 text-slate-500 mt-2 hover:text-slate-900">
                                            <MessageSquare className="w-4 h-4" />
                                            {post._count.comments} ความคิดเห็น
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
