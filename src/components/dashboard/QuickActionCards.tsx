"use client";

import { Card, CardContent } from "@/components/ui/card";
import { QrCode, FileEdit } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function QuickActionCards() {
    const { t } = useLanguage();

    return (
        <div className="grid grid-cols-2 gap-3">
            <a href="/qr-scan">
                <Card className="bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-[#F09410]/50 transition cursor-pointer group">
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F09410]/10 group-hover:bg-[#F09410]/20 flex items-center justify-center transition-colors">
                            <QrCode className="w-5 h-5 text-[#F09410]" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-[#F0D0C7] group-hover:text-[#F09410] transition-colors">{t("menu.qrCode")}</p>
                            <p className="text-xs text-stone-500">{t("menu.scanQR")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
            <a href="/requests/time-correction">
                <Card className="bg-[#2a2420] border-orange-900/30 hover:bg-[#342a25] hover:border-amber-500/50 transition cursor-pointer group">
                    <CardContent className="py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center transition-colors">
                            <FileEdit className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-[#F0D0C7] group-hover:text-amber-500 transition-colors">{t("menu.timeEdit")}</p>
                            <p className="text-xs text-stone-500">{t("menu.requestEdit")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
        </div>
    );
}
