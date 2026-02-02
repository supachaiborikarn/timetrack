"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, QrCode, Camera, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getCurrentPosition, getDeviceFingerprint } from "@/lib/geo";
import { formatTime } from "@/lib/date-utils";

export default function QRScanPage() {
    const { data: session, status } = useSession();
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        return () => {
            // Cleanup camera on unmount
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startScanning = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsScanning(true);
            }
        } catch (error) {
            toast.error("ไม่สามารถเปิดกล้องได้", {
                description: "กรุณาอนุญาตการเข้าถึงกล้อง"
            });
        }
    };

    const stopScanning = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    };

    const handleManualQRInput = async (qrCode: string) => {
        if (!qrCode || isProcessing) return;

        setIsProcessing(true);
        stopScanning();

        try {
            // Get GPS location
            const position = await getCurrentPosition();
            const deviceId = getDeviceFingerprint();

            const res = await fetch("/api/attendance/check-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    deviceId,
                    method: "QR",
                    qrCode,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setScanResult(qrCode);
                toast.success("เช็คอินสำเร็จ!", {
                    description: `เวลา ${formatTime(new Date())}`,
                });
            } else {
                toast.error("เช็คอินไม่สำเร็จ", {
                    description: data.error || "กรุณาลองใหม่",
                });
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด", {
                description: error instanceof Error ? error.message : "ไม่สามารถระบุตำแหน่งได้",
            });
        } finally {
            setIsProcessing(false);
        }
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
                <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                    <a href="/">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">สแกน QR Code</h1>
                    <p className="text-sm text-slate-400">เช็คอินด้วยการสแกน QR</p>
                </div>
            </div>

            {scanResult ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">เช็คอินสำเร็จ!</h2>
                        <p className="text-slate-400 mb-6">สแกน QR Code เรียบร้อยแล้ว</p>
                        <Button asChild className="bg-blue-600">
                            <a href="/">กลับหน้าหลัก</a>
                        </Button>
                    </CardContent>
                </Card>
            ) : isProcessing ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                        <p className="text-white">กำลังเช็คอิน...</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Camera View */}
                    <Card className="bg-slate-800/50 border-slate-700 mb-6 overflow-hidden">
                        <CardContent className="p-0 aspect-square relative">
                            {isScanning ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-cover"
                                        playsInline
                                        muted
                                    />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-56 h-56 border-2 border-green-400 rounded-xl">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
                                    <QrCode className="w-16 h-16 text-slate-600 mb-4" />
                                    <p className="text-slate-400">กดปุ่มด้านล่างเพื่อเริ่มสแกน</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Controls */}
                    <div className="space-y-3">
                        {isScanning ? (
                            <Button
                                onClick={stopScanning}
                                className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg"
                            >
                                หยุดสแกน
                            </Button>
                        ) : (
                            <Button
                                onClick={startScanning}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 h-14 text-lg"
                            >
                                <Camera className="w-5 h-5 mr-2" />
                                เริ่มสแกน QR Code
                            </Button>
                        )}
                    </div>

                    {/* Demo QR codes for testing */}
                    <Card className="bg-slate-800/50 border-slate-700 mt-6">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-400">ทดสอบ (Demo QR Codes)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full border-slate-600 text-slate-300"
                                onClick={() => handleManualQRInput("SUPACHAI-GS01-2026")}
                            >
                                ปั๊ม สุภชัย 1
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-slate-600 text-slate-300"
                                onClick={() => handleManualQRInput("SUPACHAI-GS02-2026")}
                            >
                                ปั๊ม สุภชัย 2
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-slate-600 text-slate-300"
                                onClick={() => handleManualQRInput("SUPACHAI-CF01-2026")}
                            >
                                ร้านกาแฟ สุภชัย 1
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
