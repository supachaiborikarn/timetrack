"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    Loader2,
    Download,
    Printer,
    RefreshCw,
    QrCode,
    Building2,
    Copy,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import QRCodeGenerator from "qrcode-generator";

interface Station {
    id: string;
    name: string;
    code: string | null;
    qrCode: string | null;
    address: string | null;
}

export default function AdminQRCodesPage() {
    const { data: session, status } = useSession();
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchStations();
    }, []);

    const fetchStations = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/qr-codes");
            if (res.ok) {
                const data = await res.json();
                setStations(data.stations || []);
                if (data.stations?.length > 0 && !selectedStation) {
                    setSelectedStation(data.stations[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching stations:", error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsLoading(false);
        }
    };

    const generateQRCodeSVG = (text: string, size: number = 200) => {
        const qr = QRCodeGenerator(0, "M");
        qr.addData(text);
        qr.make();

        const modules = qr.getModuleCount();
        const cellSize = size / modules;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
        svg += `<rect width="${size}" height="${size}" fill="white"/>`;

        for (let row = 0; row < modules; row++) {
            for (let col = 0; col < modules; col++) {
                if (qr.isDark(row, col)) {
                    svg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
                }
            }
        }

        svg += "</svg>";
        return svg;
    };

    const regenerateQRCode = async (stationId: string) => {
        setRegenerating(stationId);
        try {
            const res = await fetch("/api/admin/qr-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stationId }),
            });

            if (res.ok) {
                const data = await res.json();
                setStations((prev) =>
                    prev.map((s) =>
                        s.id === stationId ? { ...s, qrCode: data.qrCode } : s
                    )
                );
                if (selectedStation?.id === stationId) {
                    setSelectedStation({ ...selectedStation, qrCode: data.qrCode });
                }
                toast.success("สร้าง QR Code ใหม่เรียบร้อย");
            } else {
                toast.error("ไม่สามารถสร้าง QR Code ได้");
            }
        } catch (error) {
            console.error("Error regenerating QR code:", error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setRegenerating(null);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
            toast.success("คัดลอกแล้ว");
        } catch {
            toast.error("ไม่สามารถคัดลอกได้");
        }
    };

    const downloadQRCode = (station: Station) => {
        if (!station.qrCode) return;

        const svg = generateQRCodeSVG(station.qrCode, 400);
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `QR-${station.name.replace(/\s+/g, "-")}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("ดาวน์โหลด QR Code แล้ว");
    };

    const printQRCode = () => {
        if (!selectedStation?.qrCode) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("ไม่สามารถเปิดหน้าต่างพิมพ์ได้");
            return;
        }

        const svg = generateQRCodeSVG(selectedStation.qrCode, 300);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code - ${selectedStation.name}</title>
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    .container {
                        text-align: center;
                        padding: 40px;
                        border: 3px solid #000;
                        border-radius: 20px;
                    }
                    h1 {
                        font-size: 28px;
                        margin: 0 0 10px 0;
                    }
                    h2 {
                        font-size: 18px;
                        color: #666;
                        margin: 0 0 30px 0;
                        font-weight: normal;
                    }
                    .qr-code {
                        margin: 20px 0;
                    }
                    .code {
                        font-size: 24px;
                        font-weight: bold;
                        margin-top: 20px;
                        padding: 10px 20px;
                        background: #f0f0f0;
                        border-radius: 10px;
                        letter-spacing: 2px;
                    }
                    .instructions {
                        margin-top: 20px;
                        font-size: 14px;
                        color: #666;
                    }
                    @media print {
                        body { padding: 0; }
                        .container { border-width: 2px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📍 ${selectedStation.name}</h1>
                    <h2>Supachai TimeTrack - QR Check-in</h2>
                    <div class="qr-code">${svg}</div>
                    <div class="code">${selectedStation.qrCode}</div>
                    <p class="instructions">สแกน QR Code นี้เพื่อลงเวลาเข้า-ออกงาน</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                    <a href="/admin">
                        <ChevronLeft className="w-5 h-5" />
                    </a>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-white">จัดการ QR Code</h1>
                    <p className="text-sm text-slate-400">สร้างและพิมพ์ QR Code สำหรับสถานี</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Station List */}
                <div className="lg:col-span-1">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-400" />
                                สถานี
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {stations.map((station) => (
                                        <div
                                            key={station.id}
                                            onClick={() => setSelectedStation(station)}
                                            className={`p-3 rounded-lg cursor-pointer transition ${selectedStation?.id === station.id
                                                    ? "bg-blue-500/20 border border-blue-500/50"
                                                    : "bg-slate-700/50 hover:bg-slate-700"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white font-medium">{station.name}</p>
                                                    <p className="text-xs text-slate-400 font-mono">
                                                        {station.qrCode || "ยังไม่มี QR"}
                                                    </p>
                                                </div>
                                                {station.qrCode && (
                                                    <QrCode className="w-5 h-5 text-green-400" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* QR Code Preview */}
                <div className="lg:col-span-2">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-cyan-400" />
                                QR Code Preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedStation ? (
                                <div className="text-center">
                                    {/* Station Info */}
                                    <h2 className="text-2xl font-bold text-white mb-1">
                                        {selectedStation.name}
                                    </h2>
                                    {selectedStation.address && (
                                        <p className="text-sm text-slate-400 mb-4">
                                            {selectedStation.address}
                                        </p>
                                    )}

                                    {/* QR Code */}
                                    {selectedStation.qrCode ? (
                                        <div className="flex flex-col items-center">
                                            <div
                                                ref={printRef}
                                                className="bg-white p-6 rounded-2xl inline-block mb-4"
                                                dangerouslySetInnerHTML={{
                                                    __html: generateQRCodeSVG(selectedStation.qrCode, 200),
                                                }}
                                            />

                                            {/* QR Code String */}
                                            <div className="flex items-center gap-2 mb-6">
                                                <Badge className="bg-slate-700 text-white text-lg font-mono px-4 py-2">
                                                    {selectedStation.qrCode}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            selectedStation.qrCode!,
                                                            selectedStation.id
                                                        )
                                                    }
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    {copiedId === selectedStation.id ? (
                                                        <Check className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-3 justify-center">
                                                <Button
                                                    onClick={printQRCode}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    <Printer className="w-4 h-4 mr-2" />
                                                    พิมพ์ QR Code
                                                </Button>
                                                <Button
                                                    onClick={() => downloadQRCode(selectedStation)}
                                                    variant="outline"
                                                    className="border-slate-600 text-white hover:bg-slate-700"
                                                >
                                                    <Download className="w-4 h-4 mr-2" />
                                                    ดาวน์โหลด SVG
                                                </Button>
                                                <Button
                                                    onClick={() => regenerateQRCode(selectedStation.id)}
                                                    variant="outline"
                                                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                                                    disabled={regenerating === selectedStation.id}
                                                >
                                                    {regenerating === selectedStation.id ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                    )}
                                                    สร้างใหม่
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-8">
                                            <QrCode className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                            <p className="text-slate-400 mb-4">สถานีนี้ยังไม่มี QR Code</p>
                                            <Button
                                                onClick={() => regenerateQRCode(selectedStation.id)}
                                                className="bg-green-600 hover:bg-green-700"
                                                disabled={regenerating === selectedStation.id}
                                            >
                                                {regenerating === selectedStation.id ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <QrCode className="w-4 h-4 mr-2" />
                                                )}
                                                สร้าง QR Code
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>เลือกสถานีเพื่อดู QR Code</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <Card className="bg-slate-800/50 border-slate-700 mt-4">
                        <CardContent className="py-4">
                            <h3 className="text-white font-medium mb-2">📌 วิธีใช้งาน</h3>
                            <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                                <li>เลือกสถานีจากรายการด้านซ้าย</li>
                                <li>กด **พิมพ์ QR Code** เพื่อพิมพ์และติดที่สถานี</li>
                                <li>พนักงานสแกน QR Code ด้วยมือถือเพื่อลงเวลา</li>
                                <li>หากต้องการเปลี่ยน QR Code (เพื่อความปลอดภัย) กด **สร้างใหม่**</li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
