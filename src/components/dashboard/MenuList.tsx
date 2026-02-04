"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    History,
    FileEdit,
    UserCog,
    Settings,
    ChevronRight,
    MessageCircle,
    ClipboardCheck
} from "lucide-react";

interface MenuListProps {
    userRole?: string;
}

export function MenuList({ userRole }: MenuListProps) {
    const showAdminLink = userRole && ["ADMIN", "HR", "MANAGER", "CASHIER"].includes(userRole);

    return (
        <div className="space-y-2">
            {/* Admin Dashboard Link - Only for ADMIN/HR/MANAGER/CASHIER */}
            {showAdminLink && (
                <a href="/admin">
                    <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 hover:from-blue-600/30 hover:to-purple-600/30 transition cursor-pointer">
                        <CardContent className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings className="w-5 h-5 text-blue-400" />
                                <span className="text-white font-medium">Admin Dashboard</span>
                                <Badge className="bg-blue-500/20 text-blue-400 text-xs">{userRole}</Badge>
                            </div>
                            <ChevronRight className="w-5 h-5 text-blue-400" />
                        </CardContent>
                    </Card>
                </a>
            )}

            <a href="/schedule">
                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-blue-400" />
                            <span className="text-white">ตารางกะ</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                    </CardContent>
                </Card>
            </a>

            <a href="/shift-pool">
                <Card className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-500/30 hover:from-emerald-900/40 hover:to-teal-900/40 transition cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span className="text-white">กะว่าง / สลับกะ</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">NEW</Badge>
                        </div>
                        <ChevronRight className="w-5 h-5 text-emerald-400" />
                    </CardContent>
                </Card>
            </a>

            <a href="/availability">
                <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30 hover:from-purple-900/40 hover:to-pink-900/40 transition cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-white">แจ้งวันว่าง</span>
                            <Badge className="bg-purple-500/20 text-purple-400 text-xs">NEW</Badge>
                        </div>
                        <ChevronRight className="w-5 h-5 text-purple-400" />
                    </CardContent>
                </Card>
            </a>

            <a href="/history">
                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <History className="w-5 h-5 text-green-400" />
                            <span className="text-white">ประวัติการลงเวลา</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                    </CardContent>
                </Card>
            </a>

            <a href="/requests">
                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileEdit className="w-5 h-5 text-yellow-400" />
                            <span className="text-white">คำขอทั้งหมด</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                    </CardContent>
                </Card>
            </a>

            <a href="/announcements">
                <Card className="bg-gradient-to-r from-indigo-900/30 to-blue-900/30 border-indigo-500/30 hover:from-indigo-900/40 hover:to-blue-900/40 transition cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-5 h-5 text-indigo-400" />
                            <span className="text-white">Team Chat & ประกาศ</span>
                            <Badge className="bg-indigo-500/20 text-indigo-400 text-xs">NEW</Badge>
                        </div>
                        <ChevronRight className="w-5 h-5 text-indigo-400" />
                    </CardContent>
                </Card>
            </a>

            <a href="/profile">
                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <UserCog className="w-5 h-5 text-pink-400" />
                            <span className="text-white">ข้อมูลส่วนตัว / เปลี่ยนรหัส</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                    </CardContent>
                </Card>
            </a>
        </div>
    );
}
