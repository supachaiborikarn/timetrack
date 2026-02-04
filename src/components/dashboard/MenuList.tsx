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
    ClipboardCheck,
    ShieldCheck
} from "lucide-react";

interface MenuListProps {
    userRole?: string;
}

export function MenuList({ userRole }: MenuListProps) {
    const showAdminLink = userRole && ["ADMIN", "HR", "MANAGER", "CASHIER"].includes(userRole);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Admin Dashboard Link - Full Width */}
            {showAdminLink && (
                <a href="/admin" className="col-span-full block group">
                    <Card className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 border-0 shadow-lg shadow-blue-900/20 hover:shadow-blue-600/30 hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                        <CardContent className="p-4 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <Settings className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg leading-tight">Admin Dashboard</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className="bg-black/20 text-white hover:bg-black/30 border-0 backdrop-blur-md">
                                            {userRole}
                                        </Badge>
                                        <span className="text-blue-100 text-xs text-opacity-80">จัดการระบบ</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                                <ChevronRight className="w-5 h-5 text-white" />
                            </div>
                        </CardContent>
                    </Card>
                </a>
            )}

            {/* Schedule */}
            <a href="/schedule" className="block group">
                <Card className="h-full bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                            <Calendar className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-slate-100 font-semibold group-hover:text-blue-400 transition-colors">ตารางกะ</h3>
                            <p className="text-slate-400 text-xs mt-0.5">ดูเวลางานของคุณ</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Shift Pool */}
            <a href="/shift-pool" className="block group">
                <Card className="h-full bg-slate-800/50 border-emerald-500/30 hover:bg-emerald-950/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -mr-8 -mt-8" />
                    <CardContent className="p-4 flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                            <svg className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-slate-100 font-semibold group-hover:text-emerald-400 transition-colors">กะว่าง / สลับกะ</h3>
                                <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0 h-4 border-0">NEW</Badge>
                            </div>
                            <p className="text-slate-400 text-xs mt-0.5">หาคนแทน / รับงานเพิ่ม</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Availability */}
            <a href="/availability" className="block group">
                <Card className="h-full bg-slate-800/50 border-purple-500/30 hover:bg-purple-950/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl -mr-8 -mt-8" />
                    <CardContent className="p-4 flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                            <svg className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-slate-100 font-semibold group-hover:text-purple-400 transition-colors">แจ้งวันว่าง</h3>
                                <Badge className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0 h-4 border-0">NEW</Badge>
                            </div>
                            <p className="text-slate-400 text-xs mt-0.5">ระบุวันว่างทำงาน</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* History */}
            <a href="/history" className="block group">
                <Card className="h-full bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                            <History className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-slate-100 font-semibold group-hover:text-green-400 transition-colors">ประวัติลงเวลา</h3>
                            <p className="text-slate-400 text-xs mt-0.5">ตรวจสอบการเข้า-ออก</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Requests */}
            <a href="/requests" className="block group">
                <Card className="h-full bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                            <FileEdit className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-slate-100 font-semibold group-hover:text-yellow-400 transition-colors">คำขอทั้งหมด</h3>
                            <p className="text-slate-400 text-xs mt-0.5">ลากิจ / ลาป่วย / อื่นๆ</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Chat */}
            <a href="/announcements" className="col-span-full block group">
                <Card className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 border-indigo-500/30 hover:from-indigo-900/60 hover:to-blue-900/60 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                                <MessageCircle className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-slate-100 font-semibold group-hover:text-indigo-400 transition-colors">Team Chat & ประกาศ</h3>
                                    <Badge className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0 h-4 border-0">NEW</Badge>
                                </div>
                                <p className="text-slate-400 text-xs mt-0.5">ข่าวสารและการสื่อสารในทีม</p>
                            </div>
                        </div>
                        <div className="p-2 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                            <ChevronRight className="w-5 h-5 text-indigo-400" />
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Admin Security */}
            <a href="/admin/security" className="block group">
                <Card className="h-full bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                            <ShieldCheck className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-slate-100 font-semibold group-hover:text-red-400 transition-colors">Security</h3>
                            <p className="text-slate-400 text-xs mt-0.5">Audit & Logs</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Profile */}
            <a href="/profile" className="block group">
                <Card className="h-full bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors">
                            <UserCog className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-slate-100 font-semibold group-hover:text-pink-400 transition-colors">โปรไฟล์</h3>
                            <p className="text-slate-400 text-xs mt-0.5">ตั้งค่าส่วนตัว</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
        </div>
    );
}
