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
    ShieldCheck,
    UserPlus,
    Banknote,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface MenuListProps {
    userRole?: string;
}

export function MenuList({ userRole }: MenuListProps) {
    const { t } = useLanguage();
    const showAdminLink = userRole && ["ADMIN", "HR", "MANAGER"].includes(userRole);
    const isClerkOrCashier = userRole && ["CLERK", "CASHIER"].includes(userRole);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Admin Dashboard Link - Full Width (for non-CLERK roles) */}
            {showAdminLink && !isClerkOrCashier && (
                <a href="/admin" className="col-span-full block group">
                    <Card className="relative overflow-hidden bg-gradient-to-r from-[#F09410] to-[#BC430D] border-0 shadow-lg shadow-orange-900/20 hover:shadow-orange-600/30 hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
                        <CardContent className="p-4 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform duration-300">
                                    <Settings className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg leading-tight tracking-wide">{t("menu.adminSystem")}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className="bg-black/20 text-[#FEEAF0] hover:bg-black/30 border-0 backdrop-blur-md font-normal">
                                            {userRole}
                                        </Badge>
                                        <span className="text-[#F0D0C7] text-xs opacity-90">{t("menu.manageSystem")}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 rounded-full bg-black/10 group-hover:bg-black/20 transition-colors backdrop-blur-sm">
                                <ChevronRight className="w-5 h-5 text-white/90" />
                            </div>
                        </CardContent>
                    </Card>
                </a>
            )}

            {/* CLERK Quick Check-in Link */}
            {isClerkOrCashier && (
                <a href="/admin/attendance" className="col-span-full block group">
                    <Card className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 border-0 shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/30 hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
                        <CardContent className="p-4 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform duration-300">
                                    <UserPlus className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg leading-tight tracking-wide">{t("menu.manualCheckIn")}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className="bg-black/20 text-emerald-100 hover:bg-black/30 border-0 backdrop-blur-md font-normal">
                                            {userRole}
                                        </Badge>
                                        <span className="text-emerald-100 text-xs opacity-90">{t("menu.checkInForEmployee")}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 rounded-full bg-black/10 group-hover:bg-black/20 transition-colors backdrop-blur-sm">
                                <ChevronRight className="w-5 h-5 text-white/90" />
                            </div>
                        </CardContent>
                    </Card>
                </a>
            )}

            {/* Schedule */}
            <a href="/schedule" className="block group">
                <Card className="h-full bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-[#F09410]/50 hover:shadow-lg hover:shadow-orange-900/20 transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                            <Calendar className="w-6 h-6 text-[#F09410] group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-[#F0D0C7] font-semibold group-hover:text-[#F09410] transition-colors">{t("menu.schedule")}</h3>
                            <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.viewSchedule")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Shift Pool */}
            <a href="/shift-pool" className="block group">
                <Card className="h-full bg-[#2a2420] border-orange-900/30 hover:bg-gradient-to-br hover:from-[#2a2420] hover:to-[#241705] hover:border-[#BC430D]/50 hover:shadow-lg hover:shadow-orange-900/20 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#BC430D]/5 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-[#BC430D]/10 transition-all" />
                    <CardContent className="p-4 flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                            <svg className="w-6 h-6 text-[#BC430D] group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-[#F0D0C7] font-semibold group-hover:text-[#BC430D] transition-colors">{t("menu.shiftPool")}</h3>
                                <Badge className="bg-[#BC430D]/20 text-[#BC430D] text-[10px] px-1.5 py-0 h-4 border-0">NEW</Badge>
                            </div>
                            <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.findShifts")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Availability */}
            <a href="/availability" className="block group">
                <Card className="h-full bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-[#F09410]/50 hover:shadow-lg hover:shadow-orange-900/20 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                            <svg className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-[#F0D0C7] font-semibold group-hover:text-amber-500 transition-colors">{t("menu.availability")}</h3>
                                <Badge className="bg-amber-500/20 text-amber-500 text-[10px] px-1.5 py-0 h-4 border-0">NEW</Badge>
                            </div>
                            <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.setAvailability")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* History */}
            <a href="/history" className="block group">
                <Card className="h-full bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-900/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                            <History className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-[#F0D0C7] font-semibold group-hover:text-emerald-500 transition-colors">{t("menu.history")}</h3>
                            <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.viewHistory")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Requests */}
            <a href="/requests" className="block group">
                <Card className="h-full bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                            <FileEdit className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-[#F0D0C7] font-semibold group-hover:text-blue-400 transition-colors">{t("menu.requests")}</h3>
                            <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.requestsDesc")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Advance / เบิกค่าแรง */}
            <a href="/advances" className="block group">
                <Card className="h-full bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                            <Banknote className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-[#F0D0C7] font-semibold group-hover:text-green-400 transition-colors">{t("menu.salaryAdvance")}</h3>
                            <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.salaryAdvanceDesc")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Chat */}
            <a href="/announcements" className="col-span-full block group">
                <Card className="bg-gradient-to-r from-[#2a2420] to-[#241705] border-orange-900/30 hover:border-[#F09410]/50 hover:shadow-lg hover:shadow-orange-900/20 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-[#F09410]/10 group-hover:bg-[#F09410]/20 transition-colors">
                                <MessageCircle className="w-6 h-6 text-[#F09410] group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[#F0D0C7] font-semibold group-hover:text-[#F09410] transition-colors">{t("menu.chat")}</h3>
                                    <Badge className="bg-[#F09410]/20 text-[#F09410] text-[10px] px-1.5 py-0 h-4 border-0">NEW</Badge>
                                </div>
                                <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.chatDesc")}</p>
                            </div>
                        </div>
                        <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ChevronRight className="w-5 h-5 text-stone-500 group-hover:text-[#F09410]" />
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Admin Security */}
            <a href="/admin/security" className="block group">
                <Card className="h-full bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-red-500/50 hover:shadow-lg hover:shadow-red-900/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                            <ShieldCheck className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-[#F0D0C7] font-semibold group-hover:text-red-400 transition-colors">{t("menu.security")}</h3>
                            <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.securityDesc")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>

            {/* Profile */}
            <a href="/profile" className="block group">
                <Card className="h-full bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-[#FEEAF0]/30 hover:shadow-lg hover:shadow-orange-900/10 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#F0D0C7]/10 group-hover:bg-[#F0D0C7]/20 transition-colors">
                            <UserCog className="w-6 h-6 text-[#F0D0C7] group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-[#F0D0C7] font-semibold group-hover:text-[#FEEAF0] transition-colors">{t("menu.profile")}</h3>
                            <p className="text-stone-500 text-xs mt-0.5 group-hover:text-stone-400">{t("menu.profileDesc")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
        </div>
    );
}
