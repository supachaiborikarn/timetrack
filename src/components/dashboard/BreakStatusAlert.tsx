"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, QrCode } from "lucide-react";
import { formatTime } from "@/lib/date-utils";

interface BreakStatusAlertProps {
    breakStartTime: string | null;
}

export function BreakStatusAlert({ breakStartTime }: BreakStatusAlertProps) {
    return (
        <Card className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 animate-pulse">
            <CardContent className="py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                            <Timer className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">กำลังพักเบรก</h3>
                            <p className="text-orange-100 text-sm">
                                เริ่มพัก: {breakStartTime
                                    ? formatTime(new Date(breakStartTime))
                                    : "-"}
                            </p>
                        </div>
                    </div>
                    <Button
                        asChild
                        className="bg-white text-orange-600 hover:bg-orange-50 font-semibold shadow-lg"
                    >
                        <a href="/qr-scan">
                            <QrCode className="w-4 h-4 mr-2" />
                            สแกนจบพัก
                        </a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
