"use client";

import { Button } from "@/components/ui/button";
import { Timer, QrCode } from "lucide-react";

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
    return (
        <div className="grid grid-cols-2 gap-3">
            <Button
                variant="outline"
                className={`h-12 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white ${!hasCheckedIn || hasCheckedOut || isOnBreak || hasTakenBreak ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                disabled={!hasCheckedIn || hasCheckedOut || isOnBreak || hasTakenBreak || isChecking}
                onClick={onStartBreak}
            >
                <Timer className="w-4 h-4 mr-2" />
                เริ่มพัก (1.5 ชม.)
            </Button>
            <Button
                variant="outline"
                className={`h-12 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white ${!isOnBreak ? "opacity-50 cursor-not-allowed" : "bg-orange-500/20 text-orange-400 border-orange-500/50 hover:bg-orange-500/30"
                    }`}
                disabled={!isOnBreak}
                asChild={isOnBreak}
            >
                {isOnBreak ? (
                    <a href="/qr-scan">
                        <QrCode className="w-4 h-4 mr-2" />
                        สแกนจบพัก
                    </a>
                ) : (
                    <span>
                        <Timer className="w-4 h-4 mr-2" />
                        จบพักเบรก
                    </span>
                )}
            </Button>
        </div>
    );
}
