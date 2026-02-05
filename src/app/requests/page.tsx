"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    RefreshCw,
    FileEdit,
    Loader2,
} from "lucide-react";

export default function RequestsPage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const menuItems = [
        {
            href: "/requests/overtime",
            icon: Clock,
            iconColor: "text-orange-400",
            bgColor: "bg-orange-500/20",
            title: "ขอทำโอที",
            description: "ขออนุมัติทำงานล่วงเวลา",
        },
        {
            href: "/requests/time-correction",
            icon: Clock,
            iconColor: "text-yellow-400",
            bgColor: "bg-yellow-500/20",
            title: "ขอแก้ไขเวลา",
            description: "ลืมกดเข้า-ออกเวร",
        },
        {
            href: "/requests/shift-swap",
            icon: RefreshCw,
            iconColor: "text-blue-400",
            bgColor: "bg-blue-500/20",
            title: "ขอแลกกะ",
            description: "แลกกะกับเพื่อนร่วมงาน",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                    <a href="/">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">คำขอต่างๆ</h1>
                    <p className="text-sm text-slate-400">ส่งคำขอและติดตามสถานะ</p>
                </div>
            </div>

            {/* Menu */}
            <div className="space-y-3">
                {menuItems.map((item) => (
                    <a key={item.href} href={item.href}>
                        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer mb-3">
                            <CardContent className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                                        <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{item.title}</p>
                                        <p className="text-sm text-slate-400">{item.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                            </CardContent>
                        </Card>
                    </a>
                ))}
            </div>
        </div>
    );
}
