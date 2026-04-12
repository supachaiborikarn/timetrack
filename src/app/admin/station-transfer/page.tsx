"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeftRight,
    MapPin,
    Clock,
    Users,
    Plus,
    Loader2,
    RefreshCw,
    Building2,
    ChevronRight,
    Timer,
} from "lucide-react";
import { toast } from "sonner";
import { format, getBangkokNow } from "@/lib/date-utils";

interface Station {
    id: string;
    name: string;
    code?: string;
}

interface Employee {
    id: string;
    name: string;
    employeeId: string;
    nickName?: string;
}

interface EmployeeLocation {
    userId: string;
    name: string;
    nickName: string | null;
    employeeId: string;
    department: string;
    isFrontYard: boolean;
    homeStation: Station | null;
    checkInStation: Station | null;
    currentStation: Station | null;
    isAtHomeStation: boolean;
    hasTransferred: boolean;
    checkedIn: boolean;
    checkedOut: boolean;
    checkInTime: string;
    checkOutTime: string | null;
}

interface StationMapEntry {
    id: string;
    name: string;
    code: string;
    employees: EmployeeLocation[];
}

interface Transfer {
    id: string;
    transferTime: string;
    reason: string | null;
    method: string;
    user: {
        name: string;
        employeeId: string;
        nickName: string | null;
    };
    fromStation: Station;
    toStation: Station;
}

interface StationHourEntry {
    stationId: string;
    stationName: string;
    startTime: string;
    endTime: string | null;
    hours: number;
}

export default function StationTransferPage() {
    const { data: session, status } = useSession();

    const [stationMap, setStationMap] = useState<StationMapEntry[]>([]);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Transfer dialog
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedStationId, setSelectedStationId] = useState("");
    const [transferReason, setTransferReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Hours dialog
    const [isHoursOpen, setIsHoursOpen] = useState(false);
    const [hoursUserId, setHoursUserId] = useState("");
    const [hoursUserName, setHoursUserName] = useState("");
    const [stationHours, setStationHours] = useState<StationHourEntry[]>([]);
    const [totalHours, setTotalHours] = useState(0);
    const [isLoadingHours, setIsLoadingHours] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [currentRes, transferRes] = await Promise.all([
                fetch("/api/admin/station-transfer/current"),
                fetch("/api/admin/station-transfer"),
            ]);

            if (currentRes.ok) {
                const data = await currentRes.json();
                setStationMap(data.data?.stationMap || []);
            }

            if (transferRes.ok) {
                const data = await transferRes.json();
                setTransfers(data.data?.transfers || []);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchStationsAndEmployees = async () => {
        try {
            const [stationRes, empRes] = await Promise.all([
                fetch("/api/admin/stations"),
                fetch("/api/admin/employees"),
            ]);

            if (stationRes.ok) {
                const data = await stationRes.json();
                setStations(data.stations || []);
            }

            if (empRes.ok) {
                const data = await empRes.json();
                setEmployees(data.employees || []);
            }
        } catch (error) {
            console.error("Failed to fetch stations/employees:", error);
        }
    };

    useEffect(() => {
        if (session?.user?.id) {
            fetchData();
        }
    }, [session?.user?.id, fetchData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
        toast.success("รีเฟรชข้อมูลแล้ว");
    };

    const handleTransferSubmit = async () => {
        if (!selectedUserId || !selectedStationId) {
            toast.error("กรุณาเลือกพนักงานและสาขาปลายทาง");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/station-transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedUserId,
                    toStationId: selectedStationId,
                    reason: transferReason || undefined,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("ย้ายสาขาสำเร็จ!", {
                    description: `${data.data?.transfer?.from} → ${data.data?.transfer?.to}`,
                });
                setIsTransferOpen(false);
                setSelectedUserId("");
                setSelectedStationId("");
                setTransferReason("");
                fetchData();
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewHours = async (userId: string, userName: string) => {
        setHoursUserId(userId);
        setHoursUserName(userName);
        setIsHoursOpen(true);
        setIsLoadingHours(true);

        try {
            const today = format(getBangkokNow(), "yyyy-MM-dd");
            const res = await fetch(`/api/admin/station-transfer/hours?userId=${userId}&date=${today}`);

            if (res.ok) {
                const data = await res.json();
                setStationHours(data.data?.stationHours || []);
                setTotalHours(data.data?.totalHours || 0);
            }
        } catch {
            toast.error("ไม่สามารถโหลดข้อมูลเวลาได้");
        } finally {
            setIsLoadingHours(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !session.user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
        redirect("/");
    }

    const totalEmployeesOnSite = stationMap.reduce((sum, s) => sum + s.employees.length, 0);
    const transferredCount = stationMap.reduce(
        (sum, s) => sum + s.employees.filter((e) => e.hasTransferred).length,
        0
    );

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-6 sm:p-8 shadow-xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                                <ArrowLeftRight className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                    ย้ายสาขา / ตำแหน่งพนักงาน
                                </h1>
                                <p className="text-indigo-100/80 text-sm sm:text-base">
                                    ดูตำแหน่งพนักงานแต่ละสาขาและจัดการการย้ายสาขาระหว่างวัน
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                            รีเฟรช
                        </Button>
                        <Dialog
                            open={isTransferOpen}
                            onOpenChange={(open) => {
                                setIsTransferOpen(open);
                                if (open && stations.length === 0) fetchStationsAndEmployees();
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg">
                                    <Plus className="w-4 h-4 mr-2" />
                                    ย้ายสาขา
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-indigo-500/10">
                                            <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        ย้ายสาขาพนักงาน
                                    </DialogTitle>
                                    <DialogDescription>
                                        เลือกพนักงานที่ต้องการย้ายและสาขาปลายทาง
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>พนักงาน</Label>
                                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="เลือกพนักงาน" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map((emp) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        <span className="font-mono text-xs text-muted-foreground mr-2">
                                                            {emp.employeeId}
                                                        </span>
                                                        {emp.nickName || emp.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>สาขาปลายทาง</Label>
                                        <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="เลือกสาขา" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stations.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>เหตุผล (ถ้ามี)</Label>
                                        <Textarea
                                            value={transferReason}
                                            onChange={(e) => setTransferReason(e.target.value)}
                                            placeholder="เช่น ไปช่วยงานที่สาขา..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button variant="outline" onClick={() => setIsTransferOpen(false)}>
                                        ยกเลิก
                                    </Button>
                                    <Button onClick={handleTransferSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <ArrowLeftRight className="w-4 h-4 mr-2" />
                                                ย้ายสาขา
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 ring-4 ring-blue-500/5">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{totalEmployeesOnSite}</p>
                                <p className="text-sm text-muted-foreground">พนักงานหน้าลาน (วันนี้)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-500/10 ring-4 ring-purple-500/5">
                                <ArrowLeftRight className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{transferredCount}</p>
                                <p className="text-sm text-muted-foreground">ถูกย้ายวันนี้</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 ring-4 ring-emerald-500/5">
                                <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{stationMap.length}</p>
                                <p className="text-sm text-muted-foreground">สาขาทั้งหมด</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Station Map */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    ตำแหน่งพนักงาน ณ ปัจจุบัน
                </h2>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stationMap.map((station) => (
                            <Card
                                key={station.id}
                                className="border overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-primary" />
                                            {station.name}
                                        </span>
                                        <Badge
                                            variant={station.employees.length > 0 ? "default" : "secondary"}
                                            className={
                                                station.employees.length > 0
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                    : ""
                                            }
                                        >
                                            {station.employees.length} คน
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-3">
                                    {station.employees.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            ไม่มีพนักงานในสาขานี้
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {station.employees.map((emp) => (
                                                <div
                                                    key={emp.userId}
                                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                    onClick={() => handleViewHours(emp.userId, emp.nickName || emp.name)}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                            emp.hasTransferred
                                                                ? "bg-purple-500 animate-pulse"
                                                                : "bg-emerald-500"
                                                        }`} />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {emp.nickName || emp.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {emp.department}
                                                                {emp.hasTransferred && (
                                                                    <span className="ml-1 text-purple-500">
                                                                        (ย้ายมา)
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Transfer History */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    ประวัติการย้ายวันนี้
                </h2>

                {transfers.length === 0 ? (
                    <Card className="border-0 bg-slate-50 dark:bg-slate-900/50">
                        <CardContent className="py-8 text-center">
                            <ArrowLeftRight className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground">ยังไม่มีการย้ายสาขาวันนี้</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {transfers.map((t) => (
                            <Card key={t.id} className="border overflow-hidden">
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-purple-500/10">
                                                <ArrowLeftRight className="w-4 h-4 text-purple-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {t.user.nickName || t.user.name}
                                                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                                                        {t.user.employeeId}
                                                    </span>
                                                </p>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <span>{t.fromStation.name}</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                                                        {t.toStation.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    t.method === "SELF_QR"
                                                        ? "border-blue-500/30 text-blue-600 dark:text-blue-400"
                                                        : "border-orange-500/30 text-orange-600 dark:text-orange-400"
                                                }
                                            >
                                                {t.method === "SELF_QR" ? "สแกน QR" : "Manager"}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {format(new Date(t.transferTime), "HH:mm")}
                                            </span>
                                        </div>
                                    </div>
                                    {t.reason && (
                                        <p className="mt-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded">
                                            {t.reason}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Hours Dialog */}
            <Dialog open={isHoursOpen} onOpenChange={setIsHoursOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Timer className="w-5 h-5 text-emerald-500" />
                            </div>
                            เวลาทำงานแยกสาขา — {hoursUserName}
                        </DialogTitle>
                        <DialogDescription>
                            แสดงเวลาทำงานแยกตามสาขาในวันนี้
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingHours ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : stationHours.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">ไม่มีข้อมูล</p>
                    ) : (
                        <div className="space-y-3">
                            {stationHours.map((sh, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Building2 className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{sh.stationName}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {format(new Date(sh.startTime), "HH:mm")}
                                                {" — "}
                                                {sh.endTime ? format(new Date(sh.endTime), "HH:mm") : "ยังไม่ออก"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 font-mono">
                                        {sh.hours.toFixed(1)} ชม.
                                    </Badge>
                                </div>
                            ))}

                            <div className="border-t pt-3 flex items-center justify-between">
                                <span className="font-medium">รวมทั้งหมด</span>
                                <Badge className="text-lg font-mono">{totalHours.toFixed(1)} ชม.</Badge>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
