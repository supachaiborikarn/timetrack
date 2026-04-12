"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Loader2, ArrowLeftRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface CheckInOutButtonsProps {
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    hasShift: boolean;
    isChecking: boolean;
    onCheckIn: () => void;
    onCheckOut: () => void;
}

export function CheckInOutButtons({
    hasCheckedIn,
    hasCheckedOut,
    hasShift,
    isChecking,
    onCheckIn,
    onCheckOut,
}: CheckInOutButtonsProps) {
    const { t } = useLanguage();

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <Button
                    className={`h-16 text-lg font-semibold ${hasCheckedIn
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                        }`}
                    disabled={hasCheckedIn || isChecking || !hasShift}
                    asChild={!hasCheckedIn && !isChecking && hasShift}
                >
                    {!hasCheckedIn && !isChecking && hasShift ? (
                        <a href="/qr-scan">
                            <LogIn className="w-5 h-5 mr-2" />
                            {t("dashboard.checkIn")}
                        </a>
                    ) : (
                        <span>
                            {isChecking ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <LogIn className="w-5 h-5 mr-2" />
                            )}
                            {t("dashboard.checkIn")}
                        </span>
                    )}
                </Button>
                <Button
                    className={`h-16 text-lg font-semibold ${!hasCheckedIn || hasCheckedOut
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                        }`}
                    disabled={!hasCheckedIn || hasCheckedOut || isChecking}
                    onClick={onCheckOut}
                >
                    {isChecking ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                        <LogOut className="w-5 h-5 mr-2" />
                    )}
                    {t("dashboard.checkOut")}
                </Button>
            </div>

            {/* Station Transfer Button — visible only when checked in and not checked out */}
            {hasCheckedIn && !hasCheckedOut && (
                <Button
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-purple-500/80 to-indigo-500/80 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400/20 shadow-lg shadow-purple-500/10"
                    asChild
                >
                    <a href="/qr-scan">
                        <ArrowLeftRight className="w-5 h-5 mr-2" />
                        ย้ายปั๊ม — สแกน QR สาขาใหม่
                    </a>
                </Button>
            )}
        </div>
    );
}
