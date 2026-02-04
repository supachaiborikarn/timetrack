"use client";

import { Card, CardContent } from "@/components/ui/card";
import { QrCode, FileEdit } from "lucide-react";

export function QuickActionCards() {
    return (
        <div className="grid grid-cols-2 gap-3">
            <a href="/qr-scan">
                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-white">สแกน QR</p>
                            <p className="text-xs text-slate-400">เช็คอินด้วย QR</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
            <a href="/requests/time-correction">
                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                            <FileEdit className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-white">ขอแก้เวลา</p>
                            <p className="text-xs text-slate-400">ลืมกดเข้า-ออก</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
        </div>
    );
}
