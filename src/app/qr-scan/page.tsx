"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getCurrentPosition, getDeviceFingerprint } from "@/lib/geo";
import { formatTime } from "@/lib/date-utils";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanPage() {
    const { data: session, status } = useSession();
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(console.error);
                }
                scannerRef.current.clear();
            }
        };
    }, []);

    const handleScanSuccess = async (decodedText: string) => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            if (scannerRef.current && scannerRef.current.isScanning) {
                await scannerRef.current.stop();
                setIsScanning(false);
            }
        } catch (e) {
            console.error("Failed to stop scanner:", e);
        }

        try {
            const position = await getCurrentPosition();
            const deviceId = getDeviceFingerprint();

            // First, check if employee is on break
            // Add timestamp to prevent caching
            const todayRes = await fetch(`/api/attendance/today?t=${Date.now()}`, {
                cache: "no-store",
                headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" }
            });
            const todayData = await todayRes.json();

            // Debug logging
            console.log("[QR-SCAN] Today API Response:", JSON.stringify(todayData, null, 2));

            const attendance = todayData?.attendance;
            const isOnBreak = attendance?.breakStartTime && !attendance?.breakEndTime;
            const isCheckedIn = !!attendance?.checkInTime;

            console.log("[QR-SCAN] isOnBreak:", isOnBreak, "isCheckedIn:", isCheckedIn);
            console.log("[QR-SCAN] breakStartTime:", attendance?.breakStartTime, "breakEndTime:", attendance?.breakEndTime);

            if (isOnBreak) {
                // Employee is on break - call break-end API
                const res = await fetch("/api/attendance/break-end", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        deviceId,
                        method: "QR",
                        qrCode: decodedText,
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    setScanResult(decodedText);
                    if (data.penaltyAmount > 0) {
                        toast.warning("จบพักเบรก - กลับมาสาย!", {
                            description: `โดนหักเงิน ฿${data.penaltyAmount}`,
                        });
                    } else {
                        toast.success("จบพักเบรกเรียบร้อย!", {
                            description: `พัก ${data.durationMin} นาที`,
                        });
                    }
                } else {
                    toast.error("จบพักไม่สำเร็จ", {
                        description: data.error || "กรุณาลองใหม่",
                    });
                }
            } else if (!isCheckedIn) {
                // Normal check-in flow (Only if NOT checked in)
                const res = await fetch("/api/attendance/check-in", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        deviceId,
                        method: "QR",
                        qrCode: decodedText,
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    setScanResult(decodedText);
                    toast.success("เช็คอินสำเร็จ!", {
                        description: `เวลา ${formatTime(new Date())}`,
                    });
                } else {
                    toast.error("เช็คอินไม่สำเร็จ", {
                        description: data.error || "กรุณาลองใหม่",
                    });
                }
            } else {
                // Checked in, but NOT on break -> Maybe they want to start break? or Check out?
                // The QR Scan page currently only supports Check-in and End-break.
                // We should inform them instead of trying to check-in again.
                toast.warning("คุณเช็คอินไปแล้ว", {
                    description: "หากต้องการพักเบรก กรุณากดปุ่มพักเบรกในหน้าหลัก",
                });
                // Optional: Provide a way to Check Out if that's what they intended? 
                // But for now, just stopping the error is safer.
                setError("คุณเช็คอินไปแล้ววันนี้");
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : "ไม่สามารถระบุตำแหน่งได้";
            toast.error("เกิดข้อผิดพลาด", {
                description: errMsg,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const startScanning = async () => {
        try {
            setError(null);
            setIsScanning(true);
            setScanResult(null);

            // Give the DOM a moment to render the reader element
            await new Promise(resolve => setTimeout(resolve, 100));

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                handleScanSuccess,
                (errorMessage) => {
                    // QR Code no longer in front of camera, or other minor errors
                    // prevent console spam
                    // console.log(errorMessage);
                }
            );

        } catch (err) {
            console.error("Camera start error:", err);
            const errorMsg = err instanceof Error ? err.message : "ไม่สามารถเปิดกล้องได้";
            setError(`ไม่สามารถเปิดกล้องได้: ${errorMsg}`);
            setIsScanning(false);

            toast.error("ไม่สามารถเปิดกล้องได้", {
                description: "กรุณาตรวจสอบการอนุญาตเข้าถึงกล้อง"
            });
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) {
                console.error("Error stopping scanner:", e);
            }
        }
        setIsScanning(false);
    };

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" asChild>
                    <a href="/">
                        <ChevronLeft className="w-6 h-6" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">สแกน QR Code</h1>
                    <p className="text-sm text-slate-400">เช็คอินด้วยการสแกน QR</p>
                </div>
            </div>

            <div className="max-w-md mx-auto">
                {scanResult ? (
                    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                        <CardContent className="py-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-green-500/10">
                                <CheckCircle className="w-10 h-10 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">เช็คอินสำเร็จ!</h2>
                            <p className="text-slate-400 mb-8">บันทึกเวลาเข้างานเรียบร้อยแล้ว</p>
                            <Button asChild className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20">
                                <a href="/">กลับหน้าหลัก</a>
                            </Button>
                        </CardContent>
                    </Card>
                ) : isProcessing ? (
                    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                        <CardContent className="py-16 text-center">
                            <div className="relative mx-auto w-16 h-16 mb-6">
                                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">กำลังตรวจสอบ...</h3>
                            <p className="text-slate-400">กรุณารอสักครู่</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Camera Container */}
                        <Card className="bg-black border-slate-700 overflow-hidden shadow-2xl relative">
                            <CardContent className="p-0">
                                {/* The Reader Element */}
                                <div
                                    id="reader"
                                    className={`w-full overflow-hidden ${!isScanning ? 'hidden' : ''}`}
                                    style={{ minHeight: '300px' }}
                                />

                                {/* Placeholder when not scanning */}
                                {!isScanning && (
                                    <div className="w-full aspect-square flex flex-col items-center justify-center bg-slate-900 absolute inset-0">
                                        <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                                            <svg
                                                className="w-10 h-10 text-slate-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                            </svg>
                                        </div>
                                        <p className="text-slate-400 text-center px-4 font-medium">
                                            พร้อมสแกน QR Code
                                        </p>
                                    </div>
                                )}
                            </CardContent>

                            {/* Error Overlay */}
                            {error && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 p-6 z-10">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle className="w-8 h-8 text-red-500" />
                                        </div>
                                        <p className="text-red-400 mb-6 font-medium">{error}</p>
                                        <Button onClick={() => setError(null)} variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                                            ลองใหม่อีกครั้ง
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Controls */}
                        <div>
                            {isScanning ? (
                                <Button
                                    onClick={stopScanning}
                                    variant="destructive"
                                    className="w-full h-14 text-lg font-medium shadow-lg shadow-red-900/20"
                                >
                                    ยกเลิก
                                </Button>
                            ) : (
                                <Button
                                    onClick={startScanning}
                                    className="w-full h-14 text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20"
                                >
                                    เริ่มสแกน
                                </Button>
                            )}
                        </div>

                        {!isScanning && (
                            <div className="text-center">
                                <p className="text-xs text-slate-500">
                                    ระบบจะขออนุญาตใช้กล้องเมื่อกดปุ่มเริ่มสแกน
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Custom styles for html5-qrcode to handle dark mode blending */}
            <style jsx global>{`
                #reader {
                    border: none !important;
                }
                #reader video {
                    object-fit: cover;
                    border-radius: 0.5rem;
                }
                /* Hide the default scan region box if we want a custom one, 
                   but html5-qrcode usually handles it okay. 
                   We can customize more if needed. */
            `}</style>
        </div>
    );
}
