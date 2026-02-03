"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, QrCode, Camera, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getCurrentPosition, getDeviceFingerprint } from "@/lib/geo";
import { formatTime } from "@/lib/date-utils";

export default function QRScanPage() {
    const { data: session, status } = useSession();
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Store stream in state to trigger re-renders if needed, checking against ref for cleanup
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const stopScanning = useCallback(() => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
        setIsScanning(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopScanning();
        };
    }, [stopScanning]);

    // Effect to attach stream to video when isScanning becomes true
    useEffect(() => {
        if (isScanning && streamRef.current && videoRef.current) {
            const video = videoRef.current;
            video.srcObject = streamRef.current;
            video.setAttribute("playsinline", "true"); // iOS support

            video.play().then(() => {
                startQRDetection(video);
            }).catch(e => {
                console.error("Play error:", e);
                setError(`Camera play error: ${e.message}`);
            });
        }
    }, [isScanning]);

    const startQRDetection = async (video: HTMLVideoElement) => {
        try {
            const jsQR = (await import("jsqr")).default;

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            scanIntervalRef.current = setInterval(() => {
                if (!video || !ctx) return;

                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code && code.data) {
                        handleQRCode(code.data);
                    }
                }
            }, 200);
        } catch (e) {
            console.error(e);
        }
    };

    const handleQRCode = async (qrCode: string) => {
        if (!qrCode || isProcessing) return;

        setIsProcessing(true);
        stopScanning();

        try {
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

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Browser does not support camera access");
            }

            const constraints = {
                video: {
                    facingMode: "environment"
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            // Trigger UI update to show video element
            setIsScanning(true);

        } catch (err) {
            console.error("Camera error:", err);
            const errorMsg = err instanceof Error ? err.message : "ไม่สามารถเปิดกล้องได้";
            setError(errorMsg);

            toast.error("ไม่สามารถเปิดกล้องได้", {
                description: "กรุณาอนุญาตการเข้าถึงกล้อง"
            });
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
                        <CardContent className="p-0 relative" style={{ aspectRatio: "1/1" }}>
                            {isScanning ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        playsInline
                                        muted
                                        // On some browsers autoplay works better than manual play
                                        autoPlay
                                    />
                                    {/* Scan overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-56 h-56 border-2 border-green-400 rounded-xl relative">
                                            <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl" />
                                            <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl" />
                                            <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl" />
                                            <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl" />
                                        </div>
                                    </div>
                                    {/* Scanning indicator */}
                                    <div className="absolute bottom-4 left-0 right-0 text-center">
                                        <span className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                                            กำลังสแกน...
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 min-h-[300px]">
                                    <QrCode className="w-16 h-16 text-slate-600 mb-4" />
                                    <p className="text-slate-400 text-center px-4">
                                        {error ? (
                                            <span className="text-red-400">{error}</span>
                                        ) : (
                                            "กดปุ่มด้านล่างเพื่อเริ่มสแกน"
                                        )}
                                    </p>
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
                </>
            )}
        </div>
    );
}
