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
        <Card className="bg-primary text-primary-foreground border-none shadow-md animate-pulse">
            <CardContent className="py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0">
                            <Timer className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-lg leading-tight">กำลังพักเบรก</h3>
                            <p className="text-sm opacity-80">
                                เริ่มพัก: {breakStartTime
                                    ? formatTime(new Date(breakStartTime))
                                    : "-"}
                            </p>
                        </div>
                    </div>
                    <Button
                        asChild
                        className="bg-background text-foreground hover:bg-background/90 font-bold shadow-md border-none"
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
