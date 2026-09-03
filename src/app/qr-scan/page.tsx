"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    Camera,
    X,
    QrCode,
    ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";
import { getCurrentPosition, getDeviceFingerprint, getLegacyDeviceFingerprint } from "@/lib/geo";
import { formatTime } from "@/lib/date-utils";

function QRScanPageInner() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const actionFromUrl = searchParams.get("action"); // "checkout" | null
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [scanAction, setScanAction] = useState<"checkin" | "checkout" | "break_end" | "transfer">("checkin");
    const [scanDetail, setScanDetail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
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
            const legacyDeviceId = getLegacyDeviceFingerprint();

            const todayRes = await fetch(`/api/attendance/today?t=${Date.now()}`, {
                cache: "no-store",
                headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" }
            });
            const todayData = await todayRes.json();

            const attendance = todayData?.data?.attendance;
            const isOnBreak = attendance?.breakStartTime && !attendance?.breakEndTime;
            const isCheckedIn = !!attendance?.checkInTime;
            const hasCheckedOut = !!attendance?.checkOutTime;

            if (actionFromUrl === "checkout" && isCheckedIn && !hasCheckedOut) {
                const res = await fetch("/api/attendance/check-out", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        deviceId,
                        legacyDeviceId,
                        method: "QR",
                        qrCode: decodedText,
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    setScanAction("checkout");
                    setScanDetail(`ทำงาน ${data.data?.totalHours?.toFixed(1) ?? '-'} ชม.`);
                    setScanResult(decodedText);
                    toast.success("เช็คเอาต์สำเร็จ!", {
                        description: `ทำงาน ${data.data?.totalHours?.toFixed(1) ?? '-'} ชั่วโมง`,
                    });
                } else {
                    toast.error("เช็คเอาต์ไม่สำเร็จ", {
                        description: data.error || "กรุณาลองใหม่",
                    });
                    setError(data.error || "เช็คเอาต์ไม่สำเร็จ");
                }
            } else if (isOnBreak) {
                const res = await fetch("/api/attendance/break-end", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        deviceId,
                        legacyDeviceId,
                        method: "QR",
                        qrCode: decodedText,
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    setScanAction("break_end");
                    setScanDetail(data.penaltyAmount > 0 ? `เกินเวลาเบิกหัก ฿${data.penaltyAmount}` : `พัก ${data.durationMin} นาที`);
                    setScanResult(decodedText);
                    if (data.penaltyAmount > 0) {
                        toast.warning("จบพักเบรก - กลับมาสาย!", {
                            description: `หักเงิน ฿${data.penaltyAmount}`,
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
                const res = await fetch("/api/attendance/check-in", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        deviceId,
                        legacyDeviceId,
                        method: "QR",
                        qrCode: decodedText,
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    setScanAction("checkin");
                    setScanDetail(`เวลา ${formatTime(new Date())} น.`);
                    setScanResult(decodedText);
                    toast.success("เช็คอินสำเร็จ!", {
                        description: `เวลา ${formatTime(new Date())} น.`,
                    });
                } else {
                    if (data.errorCode === "INVALID_LOCATION" && data.distance && data.allowedRadius) {
                        const dist = Math.round(data.distance);
                        const radius = data.allowedRadius;
                        const msg = `คุณอยู่ห่าง ${dist} ม. (ต้องไม่เกิน ${radius} ม.)`;

                        toast.error("อยู่นอกพื้นที่เช็คอิน", {
                            description: msg,
                            duration: 5000,
                        });
                        setError(`อยู่นอกพื้นที่: ห่าง ${dist}ม. (อนุญาต ${radius}ม.)`);
                    } else {
                        toast.error("เช็คอินไม่สำเร็จ", {
                            description: data.error || "กรุณาลองใหม่อีกครั้ง",
                        });
                        setError(data.error || "เช็คอินไม่สำเร็จ");
                    }
                }
            } else {
                const res = await fetch("/api/attendance/station-transfer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        qrCode: decodedText,
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    setScanAction("transfer");
                    setScanDetail(`${data.data?.from} → ${data.data?.to}`);
                    setScanResult(decodedText);
                    toast.success("ย้ายสาขาสำเร็จ!", {
                        description: `${data.data?.from} → ${data.data?.to}`,
                    });
                } else {
                    if (data.errorCode === "SAME_STATION") {
                        toast.info("คุณอยู่ที่สาขานี้อยู่แล้ว", {
                            description: "หากต้องการพักเบรก กรุณากดปุ่มพักเบรกในหน้าหลัก",
                        });
                    } else {
                        toast.error("ย้ายสาขาไม่สำเร็จ", {
                            description: data.error || "กรุณาลองใหม่",
                        });
                    }
                    setError(data.error || "ย้ายสาขาไม่สำเร็จ");
                }
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : "ไม่สามารถระบุตำแหน่งได้";
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

            await new Promise((resolve) => setTimeout(resolve, 120));

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                handleScanSuccess,
                () => {}
            );
        } catch (err) {
            console.error("Camera start error:", err);
            const errorMsg = err instanceof Error ? err.message : "ไม่สามารถเปิดกล้องได้";
            setError(`ไม่สามารถเปิดกล้องได้: ${errorMsg}`);
            setIsScanning(false);

            toast.error("ไม่สามารถเปิดกล้องได้", {
                description: "กรุณาตรวจสอบการอนุญาตเข้าถึงกล้องในเบราว์เซอร์",
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
            <div className="min-h-screen flex items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    const titleText = actionFromUrl === "checkout" ? "สแกนเช็คเอาต์" : "สแกน QR Code";
    const subtitleText = actionFromUrl === "checkout"
        ? "สแกน QR สาขาเพื่อบันทึกเวลาออกงาน"
        : "สแกน QR สาขาเพื่อบันทึกเวลาเข้างานหรือย้ายสาขา";

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden">
            <EmployeePageHeader
                eyebrow="QR SCANNER"
                title={titleText}
                subtitle={subtitleText}
                backHref="/"
            />

            <main className="max-w-[480px] mx-auto p-4 space-y-4">
                {scanResult ? (
                    <section className="tt-paper-card tt-instrument-frame rounded-[24px] border-2 border-zinc-800/70 p-6 text-center dark:border-white/20 shadow-[0_4px_0_rgba(0,0,0,0.08)]">
                        <div
                            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${
                                scanAction === "transfer"
                                    ? "bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                                    : scanAction === "checkout"
                                        ? "bg-red-100 border-red-500 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                        : scanAction === "break_end"
                                            ? "bg-amber-100 border-amber-500 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                            : "bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }`}
                        >
                            <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-1">
                            {scanAction === "transfer"
                                ? "ย้ายสาขาสำเร็จ!"
                                : scanAction === "checkout"
                                    ? "เช็คเอาต์สำเร็จ!"
                                    : scanAction === "break_end"
                                        ? "จบพักเบรกแล้ว!"
                                        : "เช็คอินสำเร็จ!"}
                        </h2>

                        <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-3">
                            {scanAction === "transfer"
                                ? "บันทึกการย้ายสาขาเรียบร้อยแล้ว"
                                : scanAction === "checkout"
                                    ? "บันทึกเวลาออกงานเรียบร้อยแล้ว"
                                    : scanAction === "break_end"
                                        ? "บันทึกเวลากลับจากพักเรียบร้อยแล้ว"
                                        : "บันทึกเวลาเข้างานเรียบร้อยแล้ว"}
                        </p>

                        {scanDetail && (
                            <div className="rounded-xl border border-zinc-700/20 bg-black/[0.04] dark:bg-white/[0.04] p-3 mb-6">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                                    รายละเอียด
                                </span>
                                <span className="font-mono font-black text-base text-zinc-900 dark:text-zinc-100">
                                    {scanDetail}
                                </span>
                            </div>
                        )}

                        <Link
                            href="/"
                            className="tt-retro-control w-full h-12 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_3px_10px_rgba(251,191,36,0.25)] border border-black/20 active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าแรก
                        </Link>
                    </section>
                ) : isProcessing ? (
                    <section className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 p-12 text-center dark:border-white/15 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                        <div className="relative mx-auto w-16 h-16 mb-4">
                            <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-[#fbbf24] rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-1">
                            กำลังตรวจสอบข้อมูล...
                        </h3>
                        <p className="text-xs font-bold text-zinc-500">
                            ระบบกำลังตรวจสอบพิกัดและบันทึกเวลา กรุณารอสักครู่
                        </p>
                    </section>
                ) : (
                    <div className="space-y-4">
                        <div className="tt-paper-card tt-instrument-frame rounded-[26px] border-2 border-zinc-800/70 dark:border-white/20 overflow-hidden relative shadow-[0_4px_0_rgba(0,0,0,0.08)] bg-zinc-950">
                            <div
                                id="reader"
                                className={`w-full overflow-hidden ${!isScanning ? "hidden" : ""}`}
                                style={{ minHeight: "320px" }}
                            />

                            {!isScanning && (
                                <div className="w-full aspect-square flex flex-col items-center justify-center p-6 text-center relative bg-[#24211e]">
                                    <div className="w-48 h-48 border border-zinc-700/50 rounded-2xl relative flex items-center justify-center mb-4">
                                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-[#fbbf24]" />
                                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-[#fbbf24]" />
                                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-[#fbbf24]" />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-[#fbbf24]" />

                                        <div className="w-16 h-16 rounded-2xl bg-[#ffc62c]/15 border border-[#ffc62c]/30 flex items-center justify-center">
                                            <QrCode className="w-8 h-8 text-[#fbbf24]" />
                                        </div>
                                    </div>

                                    <p className="text-sm font-black text-zinc-100">
                                        พร้อมเริ่มสแกน QR Code
                                    </p>
                                    <p className="text-[11px] font-bold text-zinc-400 mt-1 max-w-[240px]">
                                        ส่องกล้องให้อยู่ในกรอบเพื่อบันทึกเวลาทันที
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 p-6 z-10 text-center">
                                    <div className="max-w-xs space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
                                            <AlertCircle className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs font-black text-red-400 leading-snug">{error}</p>
                                        <button
                                            onClick={() => setError(null)}
                                            className="tt-retro-control px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/20 active:scale-95"
                                        >
                                            ปิดการแจ้งเตือน
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            {isScanning ? (
                                <button
                                    onClick={stopScanning}
                                    className="tt-retro-control w-full h-12 rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 font-black text-xs flex items-center justify-center gap-2 border border-zinc-700 active:scale-[0.98] transition-all"
                                >
                                    <X className="w-4 h-4" />
                                    ปิดกล้อง / ยกเลิก
                                </button>
                            ) : (
                                <button
                                    onClick={startScanning}
                                    className="tt-retro-control w-full h-13 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_3px_10px_rgba(251,191,36,0.25)] border border-black/20 active:scale-[0.98] transition-all"
                                >
                                    <Camera className="w-4 h-4" />
                                    เปิดกล้องสแกน QR Code
                                </button>
                            )}
                        </div>

                        {!isScanning && (
                            <p className="text-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                ระบบจะขออนุญาตใช้กล้องเมื่อกดปุ่มเปิดกล้อง
                            </p>
                        )}
                    </div>
                )}
            </main>

            <style jsx global>{`
                #reader {
                    border: none !important;
                }
                #reader video {
                    object-fit: cover;
                    border-radius: 1.25rem;
                }
            `}</style>
        </div>
    );
}

export default function QRScanPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                    <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
                </div>
            }
        >
            <QRScanPageInner />
        </Suspense>
    );
}
