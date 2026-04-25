"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Loader2,
    Send,
    MessageSquare,
    Pin,
    Eye,
    Building2,
    Trash2,
    Pencil,
    Megaphone,
    PlusCircle,
    CheckCircle2,
    ArrowUpRight,
} from "lucide-react";
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
        id: string;
        name: string;
        nickName: string | null;
        image?: string | null;
        photoUrl?: string | null;
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
    const router = useRouter();
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

    const canManagePost = (post: Announcement) =>
        Boolean(isAdminOrManager || session?.user?.id === post.author.id);

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

    const handleTogglePin = async (postId: string, currentPinned: boolean) => {
        try {
            const res = await fetch(`/api/announcements/${postId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPinned: !currentPinned }),
            });

            if (res.ok) {
                toast.success(currentPinned ? "ยกเลิกปักหมุดแล้ว" : "ปักหมุดแล้ว");
                fetchPosts();
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const handleDelete = async (postId: string) => {
        if (!confirm("คุณต้องการลบประกาศนี้ใช่หรือไม่?")) return;

        try {
            const res = await fetch(`/api/announcements/${postId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("ลบประกาศเรียบร้อยแล้ว");
                fetchPosts();
            } else {
                toast.error("เกิดข้อผิดพลาดในการลบประกาศ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการลบประกาศ");
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

    const pinnedCount = posts.filter((post) => post.isPinned).length;
    const unreadCount = posts.filter((post) => !post.isRead).length;
    const totalReadCount = posts.reduce(
        (total, post) => total + (post.readCount || post._count.reads || 0),
        0,
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-slate-50 to-white pb-24">
            <div className="border-b bg-white/85 backdrop-blur">
                <div className="max-w-6xl mx-auto px-4 py-4 space-y-5">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">หน้าหลัก</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>ประกาศ</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                <Megaphone className="w-3.5 h-3.5" />
                                ศูนย์ประกาศและการรับทราบ
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                                    ประกาศบริษัท
                                </h1>
                                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                                    สร้างประกาศ ส่งแจ้งเตือนให้พนักงาน อ่านรายละเอียดเต็ม และติดตามการรับทราบได้จากหน้าเดียว
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {isAdminOrManager && (
                                <Button
                                    variant="outline"
                                    className="gap-2 bg-white"
                                    onClick={() => router.push("/")}
                                >
                                    กลับหน้าแอดมิน
                                </Button>
                            )}
                            <Button
                                className="gap-2"
                                onClick={() => document.getElementById("announcement-composer")?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                })}
                            >
                                <PlusCircle className="w-4 h-4" />
                                สร้างประกาศ
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4">
                <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-2xl border bg-white p-3 shadow-sm">
                                <p className="text-[11px] font-semibold text-slate-500">ทั้งหมด</p>
                                <p className="mt-1 text-2xl font-black text-slate-950">{posts.length}</p>
                            </div>
                            <div className="rounded-2xl border bg-white p-3 shadow-sm">
                                <p className="text-[11px] font-semibold text-slate-500">ปักหมุด</p>
                                <p className="mt-1 text-2xl font-black text-amber-600">{pinnedCount}</p>
                            </div>
                            <div className="rounded-2xl border bg-white p-3 shadow-sm">
                                <p className="text-[11px] font-semibold text-slate-500">ยังไม่อ่าน</p>
                                <p className="mt-1 text-2xl font-black text-blue-600">{unreadCount}</p>
                            </div>
                        </div>

                        <Card id="announcement-composer" className="border-none shadow-lg shadow-amber-100/70">
                            <CardHeader className="space-y-2 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                                        <Megaphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-slate-950">
                                            {isAdminOrManager ? "สร้างประกาศใหม่" : "โพสต์ข้อความถึงทีม"}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {isAdminOrManager
                                                ? "ประกาศใหม่จะส่งเข้าเมนูแจ้งเตือนของพนักงานตามกลุ่มเป้าหมาย"
                                                : "แชร์ข้อความหรือพูดคุยกับทีม"}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                            <Input
                                placeholder="หัวข้อประกาศ"
                                value={newPostTitle}
                                onChange={(e) => setNewPostTitle(e.target.value)}
                                className="h-11 rounded-xl font-medium"
                            />
                            <Textarea
                                placeholder="พิมพ์รายละเอียดประกาศ..."
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                className="min-h-[140px] resize-none rounded-xl"
                            />

                            {/* Admin/Manager controls */}
                            {isAdminOrManager && (
                                <div className="space-y-3 rounded-2xl border bg-slate-50 p-3">
                                    {/* Pin toggle */}
                                    <label className="flex items-center gap-2 cursor-pointer rounded-xl bg-white p-3 text-sm font-medium text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={isPinned}
                                            onChange={(e) => setIsPinned(e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <Pin className="w-4 h-4 text-orange-500" />
                                        ปักหมุดบนหน้าหลัก
                                    </label>

                                    {/* Department targeting */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-700">
                                            <Building2 className="w-4 h-4 text-slate-500" />
                                            กลุ่มเป้าหมาย
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {departments.map((dept) => (
                                                <button
                                                    key={dept.id}
                                                    onClick={() => toggleDepartment(dept.id)}
                                                    type="button"
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedDeptIds.includes(dept.id)
                                                        ? "bg-blue-600 text-white shadow-sm"
                                                        : "bg-white text-slate-600 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    {dept.name}
                                                </button>
                                            ))}
                                            {departments.length === 0 && (
                                                <p className="text-xs text-slate-400">
                                                    ไม่เลือกแผนก = ส่งถึงพนักงานทุกคน
                                                </p>
                                            )}
                                        </div>
                                        {departments.length > 0 && selectedDeptIds.length === 0 && (
                                            <p className="mt-2 text-[11px] text-slate-400">
                                                ไม่เลือกแผนก = ส่งถึงพนักงานทุกคน
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] text-slate-500">
                                    {newPostContent.trim().length} ตัวอักษร
                                </p>
                                <Button
                                    onClick={handlePost}
                                    disabled={!newPostContent.trim() || isPosting}
                                    className="gap-2"
                                >
                                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    เผยแพร่
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    </aside>

                    <section className="space-y-4">
                        <div className="flex flex-col gap-3 rounded-3xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-950">ประกาศล่าสุด</h2>
                                <p className="text-sm text-slate-500">
                                    กดการ์ดเพื่ออ่านเต็ม หรือใช้ปุ่มด้านขวาเพื่อแก้ไขและจัดการ
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="w-4 h-4" />
                                การอ่านรวม {totalReadCount} ครั้ง
                            </div>
                        </div>

                        {/* Feed */}
                        {isLoading ? (
                            <div className="flex justify-center rounded-3xl border bg-white py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="rounded-3xl border border-dashed bg-white p-10 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                                    <Megaphone className="w-6 h-6" />
                                </div>
                                <p className="font-bold text-slate-900">ยังไม่มีประกาศ</p>
                                <p className="mt-1 text-sm text-slate-500">เริ่มสร้างประกาศแรกให้ทีมได้จากกล่องด้านซ้าย</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {posts.map((post) => {
                                    const deptNames = getDeptNames(post.targetDepartmentIds);
                                    return (
                                        <Card
                                            key={post.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => router.push(`/announcements/${post.id}`)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    router.push(`/announcements/${post.id}`);
                                                }
                                            }}
                                            className="group border-none bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                        >
                                            <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                                                <Avatar className="h-11 w-11">
                                                    <AvatarImage src={post.author.image || post.author.photoUrl || ""} />
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-700">
                                                        {post.author.nickName?.charAt(0) || post.author.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-900">
                                                                {post.author.nickName || post.author.name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {formatThaiDate(new Date(post.createdAt), "d MMM HH:mm")}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 gap-1.5 bg-white text-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/announcements/${post.id}`);
                                                                }}
                                                            >
                                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                                                ดู
                                                            </Button>
                                                            {isAdminOrManager && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleTogglePin(post.id, post.isPinned);
                                                                    }}
                                                                    className={post.isPinned
                                                                        ? "text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                                                        : "text-slate-400 hover:text-orange-500 hover:bg-orange-50"
                                                                    }
                                                                    title={post.isPinned ? "ยกเลิกปักหมุด" : "ปักหมุด"}
                                                                >
                                                                    <Pin className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            {canManagePost(post) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/announcements/${post.id}?edit=true`);
                                                                    }}
                                                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                                    title="แก้ไขประกาศ"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            {canManagePost(post) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(post.id);
                                                                    }}
                                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                                    title="ลบประกาศ"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {post.isPinned && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                                                                <Pin className="w-3 h-3" />
                                                                ปักหมุด
                                                            </span>
                                                        )}
                                                        {deptNames.length > 0 && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                                                                <Building2 className="w-3 h-3" />
                                                                {deptNames.join(", ")}
                                                            </span>
                                                        )}
                                                        {!post.isRead && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                                                ใหม่
                                                            </span>
                                                        )}
                                                    </div>
                                                    {post.title !== "ข้อความ" && (
                                                        <h3 className="truncate text-lg font-black text-slate-900">
                                                            {post.title}
                                                        </h3>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pb-4">
                                                <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {post.content}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="flex flex-col gap-3 border-t bg-slate-50/70 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-slate-600 hover:text-slate-950"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/announcements/${post.id}`);
                                                    }}
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    อ่านเต็ม / {post._count.comments} ความคิดเห็น
                                                </Button>
                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Eye className="w-3 h-3" />
                                                    อ่านแล้ว {post.readCount || post._count.reads || 0} คน
                                                </span>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
