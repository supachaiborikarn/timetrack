"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Clock,
    RefreshCw,
    FileEdit,
    Banknote,
    Inbox,
    ChevronRight,
    Loader2,
} from "lucide-react";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";

export default function RequestsPage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const menuItems = [
        {
            href: "/requests/time-correction",
            icon: FileEdit,
            iconBg: "bg-[#ffc62c]/35 text-black dark:text-white",
            title: "ขอแก้ไขเวลา",
            description: "ลืมกดเข้า-ออกเวร หรือเวลาบันทึกไม่ถูกต้อง",
            badge: "แนะนำ",
        },
        {
            href: "/advances",
            icon: Banknote,
            iconBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
            title: "ขอเบิกค่าแรง",
            description: "ขอเบิกเงินค่าแรงล่วงหน้าและตรวจสอบสถานะการจ่าย",
        },
        {
            href: "/requests/overtime",
            icon: Clock,
            iconBg: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
            title: "ขอทำโอที (OT)",
            description: "ยื่นคำขออนุมัติทำงานล่วงเวลาล่วงหน้าหรือย้อนหลัง",
        },
        {
            href: "/requests/shift-swap",
            icon: RefreshCw,
            iconBg: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
            title: "ขอแลกกะทำงาน",
            description: "ส่งคำขอแลกเปลี่ยนกะทำงานกับเพื่อนร่วมงาน",
        },
        {
            href: "/requests/incoming",
            icon: Inbox,
            iconBg: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
            title: "คำขอที่ส่งถึงฉัน",
            description: "ตรวจสอบและตอบรับ/ปฏิเสธคำขอแลกกะจากเพื่อนร่วมงาน",
        },
    ];

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="SERVICE REQUESTS"
                title="ศูนย์คำขอต่างๆ"
                subtitle="ยื่นคำขอและติดตามสถานะการอนุมัติทั้งหมด"
                backHref="/"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-3">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        รายการคำขอที่เปิดใช้งาน
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">
                        {menuItems.length} หมวดหมู่
                    </span>
                </div>

                <div className="space-y-2.5">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="tt-paper-card tt-instrument-frame block rounded-[20px] border border-zinc-700/35 p-3.5 dark:border-white/15 shadow-[0_2px_0_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-2xl border border-black/15 flex items-center justify-center shrink-0 ${item.iconBg}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-[14px] font-black leading-tight text-zinc-900 dark:text-zinc-100">
                                                    {item.title}
                                                </h2>
                                                {item.badge && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#fbbf24] text-zinc-950 border border-black/20">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center shrink-0 text-zinc-400">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

