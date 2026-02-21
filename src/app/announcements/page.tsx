"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, MessageSquare, Pin, Eye, Building2 } from "lucide-react";
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
    isPinned: boolean;
    isRead: boolean;
    readCount: number;
    targetDepartmentIds: string | null;
    createdAt: string;
    author: {
        name: string;
        nickName: string | null;
        image: string | null;
    };
    _count: {
        comments: number;
        reads: number;
    };
}

interface Department {
    id: string;
    name: string;
    code: string;
}

export default function AnnouncementsPage() {
    const { data: session } = useSession();
    const [posts, setPosts] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostTitle, setNewPostTitle] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    const isAdminOrManager = session?.user?.role &&
        ["ADMIN", "HR", "MANAGER"].includes(session.user.role as string);

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

    const fetchDepartments = async () => {
        try {
            const res = await fetch("/api/admin/departments");
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments || data || []);
            }
        } catch (error) {
            console.error("Failed to fetch departments:", error);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        if (isAdminOrManager) {
            fetchDepartments();
        }
    }, [isAdminOrManager]);

    const handlePost = async () => {
        if (!newPostContent.trim()) return;

        setIsPosting(true);
        try {
            const res = await fetch("/api/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newPostTitle,
                    content: newPostContent,
                    isPinned,
                    targetDepartmentIds: selectedDeptIds.length > 0 ? selectedDeptIds : undefined,
                }),
            });

            if (res.ok) {
                setNewPostContent("");
                setNewPostTitle("");
                setIsPinned(false);
                setSelectedDeptIds([]);
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

    const toggleDepartment = (deptId: string) => {
        setSelectedDeptIds((prev) =>
            prev.includes(deptId)
                ? prev.filter((id) => id !== deptId)
                : [...prev, deptId]
        );
    };

    const getDeptNames = (targetDeptIds: string | null): string[] => {
        if (!targetDeptIds) return [];
        try {
            const ids: string[] = JSON.parse(targetDeptIds);
            return ids.map((id) => {
                const dept = departments.find((d) => d.id === id);
                return dept?.name || id;
            });
        } catch {
            return [];
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

                            {/* Admin/Manager controls */}
                            {isAdminOrManager && (
                                <div className="space-y-3 pt-2 border-t">
                                    {/* Pin toggle */}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isPinned}
                                            onChange={(e) => setIsPinned(e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <Pin className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm text-slate-700">
                                            ปักหมุด (แสดงบนหน้าหลัก)
                                        </span>
                                    </label>

                                    {/* Department targeting */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Building2 className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm text-slate-700">
                                                เลือกแผนก (ว่างเปล่า = ทุกแผนก)
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {departments.map((dept) => (
                                                <button
                                                    key={dept.id}
                                                    onClick={() => toggleDepartment(dept.id)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedDeptIds.includes(dept.id)
                                                        ? "bg-blue-500 text-white"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                        }`}
                                                >
                                                    {dept.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

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
                            {posts.map((post) => {
                                const deptNames = getDeptNames(post.targetDepartmentIds);
                                return (
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
                                                {/* Badges */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {post.isPinned && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                                            <Pin className="w-3 h-3" />
                                                            ปักหมุด
                                                        </span>
                                                    )}
                                                    {deptNames.length > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                            <Building2 className="w-3 h-3" />
                                                            {deptNames.join(", ")}
                                                        </span>
                                                    )}
                                                </div>
                                                {post.title !== "ข้อความ" && (
                                                    <h3 className="font-medium text-slate-800">{post.title}</h3>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pb-3 text-slate-700 whitespace-pre-wrap">
                                            {post.content}
                                        </CardContent>
                                        <CardFooter className="pt-0 pb-3 border-t bg-slate-50/50 flex items-center justify-between">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-2 text-slate-500 mt-2 hover:text-slate-900"
                                                onClick={() => window.location.href = `/announcements/${post.id}`}
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                {post._count.comments} ความคิดเห็น
                                            </Button>
                                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                                                <Eye className="w-3 h-3" />
                                                อ่านแล้ว {post.readCount || post._count.reads || 0} คน
                                            </span>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
