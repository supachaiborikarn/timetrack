"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Check,
    X,
    Clock,
    Users,
    Building2,
} from "lucide-react";

interface Employee {
    id: string;
    name: string;
    employeeId: string;
    department: { name: string } | null;
    station: { name: string } | null;
    availability: Record<string, string>;
    stats: { available: number; unavailable: number; preferredOff: number };
}

interface Station {
    id: string;
    name: string;
}

export default function AdminAvailabilityPage() {
    const { data: session, status } = useSession();
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
        "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
        "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    useEffect(() => {
        fetchData();
    }, [currentMonth, currentYear, selectedStation]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const url = `/api/admin/availability?month=${currentMonth}&year=${currentYear}${selectedStation ? `&stationId=${selectedStation}` : ""}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.employees || []);
                setStations(data.stations || []);
            }
        } catch (error) {
            console.error("Error fetching availability:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const prevMonth = () => {
        if (currentMonth === 1) {
            setCurrentMonth(12);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 12) {
            setCurrentMonth(1);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const getDaysInMonth = () => {
        return new Date(currentYear, currentMonth, 0).getDate();
    };

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case "AVAILABLE":
                return "bg-green-500/30 border-green-500";
            case "UNAVAILABLE":
                return "bg-red-500/30 border-red-500";
            case "PREFERRED_OFF":
                return "bg-yellow-500/30 border-yellow-500";
            default:
                return "bg-slate-700/30 border-slate-600";
        }
    };

    const getStatusIcon = (status: string | undefined) => {
        switch (status) {
            case "AVAILABLE":
                return <Check className="w-3 h-3 text-green-400" />;
            case "UNAVAILABLE":
                return <X className="w-3 h-3 text-red-400" />;
            case "PREFERRED_OFF":
                return <Clock className="w-3 h-3 text-yellow-400" />;
            default:
                return null;
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/login");
    }

    const daysInMonth = getDaysInMonth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Breadcrumb */}
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/admin" className="text-slate-400 hover:text-white">Admin</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage className="text-white">Availability</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-slate-400" asChild>
                        <a href="/admin">
                            <ChevronLeft className="w-5 h-5" />
                        </a>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-white">ดู Availability พนักงาน</h1>
                        <p className="text-sm text-slate-400">ภาพรวมวันว่าง/ไม่ว่างของทีม</p>
                    </div>
                </div>

                {/* Station Filter */}
                <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <select
                        value={selectedStation}
                        onChange={(e) => setSelectedStation(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">ทุกสถานี</option>
                        {stations.map((station) => (
                            <option key={station.id} value={station.id}>
                                {station.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Legend */}
            <Card className="bg-slate-800/50 border-slate-700 mb-4">
                <CardContent className="py-3">
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-green-500/30 border border-green-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-green-400" />
                            </span>
                            <span className="text-slate-300">ว่าง</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-yellow-500/30 border border-yellow-500 flex items-center justify-center">
                                <Clock className="w-3 h-3 text-yellow-400" />
                            </span>
                            <span className="text-slate-300">อยากหยุด</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-red-500/30 border border-red-500 flex items-center justify-center">
                                <X className="w-3 h-3 text-red-400" />
                            </span>
                            <span className="text-slate-300">ไม่ว่าง</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-slate-700/30 border border-slate-600"></span>
                            <span className="text-slate-300">ยังไม่แจ้ง</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Calendar View */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={prevMonth}
                            className="text-slate-400"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <CardTitle className="text-white">
                            {months[currentMonth - 1]} {currentYear + 543}
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={nextMonth}
                            className="text-slate-400"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>ไม่พบพนักงาน</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 px-2 text-slate-400 sticky left-0 bg-slate-800 min-w-[150px]">
                                        พนักงาน
                                    </th>
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const date = new Date(currentYear, currentMonth - 1, day);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        return (
                                            <th
                                                key={day}
                                                className={`text-center py-2 px-1 min-w-[28px] ${isWeekend ? "text-red-400" : "text-slate-400"
                                                    }`}
                                            >
                                                {day}
                                            </th>
                                        );
                                    })}
                                    <th className="text-center py-2 px-2 text-slate-400">สรุป</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="py-2 px-2 sticky left-0 bg-slate-800">
                                            <div>
                                                <p className="text-white font-medium">{emp.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {emp.department?.name || "-"}
                                                </p>
                                            </div>
                                        </td>
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const dateStr = `${currentYear}-${currentMonth
                                                .toString()
                                                .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                                            const status = emp.availability[dateStr];

                                            return (
                                                <td key={day} className="text-center py-1 px-0.5">
                                                    <div
                                                        className={`w-6 h-6 rounded mx-auto flex items-center justify-center border ${getStatusColor(
                                                            status
                                                        )}`}
                                                    >
                                                        {getStatusIcon(status)}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="text-center py-2 px-2">
                                            <div className="flex gap-1 justify-center">
                                                <Badge className="bg-green-500/20 text-green-400 text-xs">
                                                    {emp.stats.available}
                                                </Badge>
                                                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                                                    {emp.stats.preferredOff}
                                                </Badge>
                                                <Badge className="bg-red-500/20 text-red-400 text-xs">
                                                    {emp.stats.unavailable}
                                                </Badge>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
