"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2,
    Pencil,
    Building2,
    MapPin,
    Users,
    Navigation,
    Map,
    Plus,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Station {
    id: string;
    name: string;
    code: string;
    type: string;
    address: string;
    latitude: number;
    longitude: number;
    radius: number;
    qrCode: string | null;
    wifiSSID: string | null;
    publicEmergencyPhone: string | null;
    isActive: boolean;
    departments: { id: string; name: string; code: string }[];
    employeeCount: number;
}

export default function StationsPage() {
    const { data: session, status } = useSession();
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<Station | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        type: "GAS_STATION" as "GAS_STATION" | "COFFEE_SHOP",
        address: "",
        latitude: 0,
        longitude: 0,
        radius: 100,
        qrCode: "",
        wifiSSID: "",
        publicEmergencyPhone: "",
    });

    useEffect(() => {
        if (session?.user?.id) {
            fetchStations();
        }
    }, [session?.user?.id]);

    const fetchStations = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/stations");
            if (res.ok) {
                const data = await res.json();
                setStations(data.stations || []);
            }
        } catch (error) {
            console.error("Failed to fetch stations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openEditDialog = (station: Station) => {
        setEditingStation(station);
        setFormData({
            name: station.name,
            code: station.code,
            type: station.type as "GAS_STATION" | "COFFEE_SHOP",
            address: station.address,
            latitude: station.latitude,
            longitude: station.longitude,
            radius: station.radius,
            qrCode: station.qrCode || "",
            wifiSSID: station.wifiSSID || "",
            publicEmergencyPhone: station.publicEmergencyPhone || "",
        });
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        setEditingStation(null);
        setFormData({
            name: "",
            code: "",
            type: "GAS_STATION",
            address: "",
            latitude: 0,
            longitude: 0,
            radius: 100,
            qrCode: "",
            wifiSSID: "",
            publicEmergencyPhone: "",
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const isCreating = !editingStation;

        if (!formData.name || !formData.code) {
            toast.error("กรุณากรอกชื่อและรหัสสถานี");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/stations", {
                method: isCreating ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(editingStation && { id: editingStation.id }),
                    ...formData,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "บันทึกสำเร็จ");
                setDialogOpen(false);
                fetchStations();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Browser ไม่รองรับ GPS");
            return;
        }

        toast.loading("กำลังดึงพิกัด GPS...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData({
                    ...formData,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                toast.dismiss();
                toast.success("ดึงพิกัด GPS สำเร็จ!");
            },
            (error) => {
                toast.dismiss();
                toast.error("ไม่สามารถดึงพิกัด GPS ได้: " + error.message);
            },
            { enableHighAccuracy: true }
        );
    };

    const openGoogleMaps = () => {
        const { latitude, longitude } = formData;
        if (latitude && longitude) {
            window.open(
                `https://www.google.com/maps?q=${latitude},${longitude}`,
                "_blank"
            );
        } else {
            toast.error("กรุณาระบุพิกัดก่อน");
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.06)] text-zinc-950 dark:text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">BRANCH NETWORK & GEOLOCATION</p>
                            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">เครือข่ายสถานี & จุดบริการ</h1>
                            <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5">จัดการสาขา, รัศมีลงเวลา GPS, แผนกประจำสาขา และเบอร์ฉุกเฉิน</p>
                        </div>
                    </div>
                    <Button
                        onClick={openCreateDialog}
                        className="tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/30 h-10 px-4 text-xs shadow-sm self-start sm:self-auto"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        เพิ่มสถานี
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 flex items-center gap-3 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-400 grid place-items-center shrink-0 font-black">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">สถานีทั้งหมด</p>
                        <p className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">{stations.length}</p>
                    </div>
                </div>

                <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 flex items-center gap-3 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 grid place-items-center shrink-0 font-black">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">มีพิกัด GPS</p>
                        <p className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                            {stations.filter((s) => s.latitude && s.longitude).length}
                        </p>
                    </div>
                </div>

                <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 flex items-center gap-3 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-400 grid place-items-center shrink-0 font-black">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">พนักงานทั้งหมด</p>
                        <p className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                            {stations.reduce((sum, s) => sum + s.employeeCount, 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <CardHeader>
                    <CardTitle>รายการสถานี</CardTitle>
                </CardHeader>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">รหัส</TableHead>
                                <TableHead>ชื่อสถานี</TableHead>
                                <TableHead>ตำแหน่ง GPS</TableHead>
                                <TableHead className="text-center">รัศมี</TableHead>
                                <TableHead className="text-center">พนักงาน</TableHead>
                                <TableHead className="text-center">สถานะ</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                                        ยังไม่มีสถานี
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stations.map((station) => (
                                    <TableRow key={station.id}>
                                        <TableCell>
                                            <Badge className="bg-blue-500 text-white">{station.code}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{station.name}</p>
                                                <p className="text-xs text-muted-foreground">{station.address}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {station.latitude && station.longitude ? (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm font-mono">
                                                        {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">ยังไม่กำหนด</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">{station.radius} ม.</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">{station.employeeCount}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {station.isActive ? (
                                                <Badge className="bg-green-500/10 text-green-500">เปิดใช้งาน</Badge>
                                            ) : (
                                                <Badge className="bg-muted text-muted-foreground">ปิดใช้งาน</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditDialog(station)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingStation ? `แก้ไขสถานี: ${editingStation.name}` : "เพิ่มสถานีใหม่"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>รหัสสถานี</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ชื่อสถานี</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ประเภทสถานี</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: "GAS_STATION" | "COFFEE_SHOP") =>
                                        setFormData({ ...formData, type: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GAS_STATION">ปั๊มน้ำมัน</SelectItem>
                                        <SelectItem value="COFFEE_SHOP">ร้านกาแฟ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>ที่อยู่</Label>
                                <Input
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="border-t border-border pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    ตำแหน่ง GPS
                                </Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={getCurrentLocation}
                                    >
                                        <Navigation className="w-4 h-4 mr-1" />
                                        ดึงพิกัดปัจจุบัน
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={openGoogleMaps}
                                    >
                                        <Map className="w-4 h-4 mr-1" />
                                        ดูใน Maps
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Latitude (ละติจูด)</Label>
                                    <Input
                                        type="number"
                                        step="0.000001"
                                        value={formData.latitude}
                                        onChange={(e) =>
                                            setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Longitude (ลองจิจูด)</Label>
                                    <Input
                                        type="number"
                                        step="0.000001"
                                        value={formData.longitude}
                                        onChange={(e) =>
                                            setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <Label>รัศมี Geo-fence (เมตร)</Label>
                                <Input
                                    type="number"
                                    value={formData.radius}
                                    onChange={(e) =>
                                        setFormData({ ...formData, radius: parseInt(e.target.value) || 100 })
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    พนักงานต้องอยู่ในรัศมีนี้จึงจะลงเวลาได้
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>QR Code</Label>
                                <Input
                                    value={formData.qrCode}
                                    onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Wi-Fi SSID</Label>
                                <Input
                                    value={formData.wifiSSID}
                                    onChange={(e) => setFormData({ ...formData, wifiSSID: e.target.value })}
                                    placeholder="ชื่อ Wi-Fi"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>หมายเลขฉุกเฉินสาธารณะ (เสียงลูกค้า)</Label>
                                <Input
                                    value={formData.publicEmergencyPhone}
                                    onChange={(e) => setFormData({ ...formData, publicEmergencyPhone: e.target.value })}
                                    placeholder="เช่น 02xxx xxxx — ต้องมีก่อนเปิด QR ประเมินสถานี"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
