"use client";

import { Button } from "@/components/ui/button";
import { Timer, QrCode } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface BreakButtonsProps {
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    isOnBreak: boolean;
    hasTakenBreak: boolean;
    isChecking: boolean;
    onStartBreak: () => void;
}

export function BreakButtons({
    hasCheckedIn,
    hasCheckedOut,
    isOnBreak,
    hasTakenBreak,
    isChecking,
    onStartBreak,
}: BreakButtonsProps) {
    const { t } = useLanguage();

    return (
        <div className="grid grid-cols-2 gap-3">
            <Button
                variant="outline"
                className={`h-12 border-border text-foreground hover:bg-accent hover:text-accent-foreground font-semibold ${!hasCheckedIn || hasCheckedOut || isOnBreak || hasTakenBreak ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                disabled={!hasCheckedIn || hasCheckedOut || isOnBreak || hasTakenBreak || isChecking}
                onClick={onStartBreak}
            >
                <Timer className="w-4 h-4 mr-2" />
                {t("dashboard.startBreak")} (1.5 {t("dashboard.hours")})
            </Button>
            <Button
                variant="outline"
                className={`h-12 font-semibold border-border text-foreground hover:bg-accent hover:text-accent-foreground ${!isOnBreak ? "opacity-50 cursor-not-allowed" : "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20"
                    }`}
                disabled={!isOnBreak}
                asChild={isOnBreak}
            >
                {isOnBreak ? (
                    <a href="/qr-scan">
                        <QrCode className="w-4 h-4 mr-2" />
                        {t("dashboard.scanEndBreak")}
                    </a>
                ) : (
                    <span>
                        <Timer className="w-4 h-4 mr-2" />
                        {t("dashboard.endBreak")}
                    </span>
                )}
            </Button>
        </div>
    );
}
