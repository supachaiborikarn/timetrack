"use client";

import { Card, CardContent } from "@/components/ui/card";
import { QrCode, FileEdit } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function QuickActionCards() {
    const { t } = useLanguage();

    return (
        <div className="grid grid-cols-2 gap-3">
            <a href="/qr-scan">
                <Card className="bg-card border-border/60 hover:bg-accent/40 hover:border-primary/40 transition cursor-pointer group shadow-sm">
                    <CardContent className="py-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
                            <QrCode className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <p className="font-bold text-foreground group-hover:text-primary transition-colors leading-tight mb-1">{t("menu.qrCode")}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{t("menu.scanQR")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
            <a href="/requests/time-correction">
                <Card className="bg-card border-border/60 hover:bg-accent/40 hover:border-blue-500/40 transition cursor-pointer group shadow-sm">
                    <CardContent className="py-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors shrink-0">
                            <FileEdit className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="flex flex-col">
                            <p className="font-bold text-foreground group-hover:text-blue-500 transition-colors leading-tight mb-1">{t("menu.timeEdit")}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{t("menu.requestEdit")}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
        </div>
    );
}
