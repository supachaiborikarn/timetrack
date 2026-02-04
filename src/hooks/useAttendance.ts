"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getCurrentPosition, getDeviceFingerprint } from "@/lib/geo";
import { getBangkokNow } from "@/lib/date-utils";

interface AttendanceData {
    checkInTime: string | null;
    checkOutTime: string | null;
    lateMinutes: number | null;
    status: string;
    breakStartTime: string | null;
    breakEndTime: string | null;
    breakDurationMin: number | null;
    breakPenaltyAmount: number | null;
}

interface ShiftData {
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
}

interface UserData {
    name: string;
    station: string;
    department: string;
    hourlyRate: number;
}

interface TodayData {
    attendance: AttendanceData | null;
    shift: ShiftData | null;
    user: UserData | null;
}

export function useAttendance(userId: string | undefined) {
    const [currentTime, setCurrentTime] = useState(getBangkokNow());
    const [todayData, setTodayData] = useState<TodayData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChecking, setIsChecking] = useState(false);

    const fetchTodayData = useCallback(async () => {
        try {
            const res = await fetch("/api/attendance/today");
            if (res.ok) {
                const data = await res.json();
                setTodayData(data);
            }
        } catch (error) {
            console.error("Failed to fetch today data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getBangkokNow());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch data when userId is available
    useEffect(() => {
        if (userId) {
            fetchTodayData();
        } else {
            setIsLoading(false);
        }
    }, [userId, fetchTodayData]);

    const handleCheckIn = async () => {
        setIsChecking(true);
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
                    method: "GPS",
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("เช็คอินสำเร็จ!", {
                    description: data.data?.lateMinutes > 0
                        ? `สาย ${data.data.lateMinutes} นาที`
                        : "ตรงเวลา",
                });
                fetchTodayData();
            } else {
                toast.error("เช็คอินไม่สำเร็จ", { description: data.error });
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด", {
                description: error instanceof Error ? error.message : "ไม่สามารถระบุตำแหน่งได้",
            });
        } finally {
            setIsChecking(false);
        }
    };

    const handleCheckOut = async () => {
        setIsChecking(true);
        try {
            const position = await getCurrentPosition();
            const deviceId = getDeviceFingerprint();

            const res = await fetch("/api/attendance/check-out", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    deviceId,
                    method: "GPS",
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("เช็คเอาต์สำเร็จ!", {
                    description: `ทำงาน ${data.data?.totalHours?.toFixed(1)} ชม.`,
                });
                fetchTodayData();
            } else {
                toast.error("เช็คเอาต์ไม่สำเร็จ", { description: data.error });
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด", {
                description: error instanceof Error ? error.message : "ไม่สามารถระบุตำแหน่งได้",
            });
        } finally {
            setIsChecking(false);
        }
    };

    const handleStartBreak = async () => {
        setIsChecking(true);
        try {
            const res = await fetch("/api/attendance/break-start", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast.success("เริ่มพักเบรก", { description: "พักได้ 1 ชม. 30 นาที" });
                fetchTodayData();
            } else {
                toast.error("ไม่สามารถเริ่มพักได้", { description: data.error });
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsChecking(false);
        }
    };

    const handleEndBreak = async () => {
        setIsChecking(true);
        try {
            const res = await fetch("/api/attendance/break-end", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                if (data.penaltyAmount > 0) {
                    toast.warning("กลับมาสายเกินกำหนด!", { description: `โดนหักเงิน ฿${data.penaltyAmount}` });
                } else {
                    toast.success("จบการพักเบรก");
                }
                fetchTodayData();
            } else {
                toast.error("ไม่สามารถจบการพักได้", { description: data.error });
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsChecking(false);
        }
    };

    // Computed states
    const hasCheckedIn = !!todayData?.attendance?.checkInTime;
    const hasCheckedOut = !!todayData?.attendance?.checkOutTime;
    const isOnBreak = !!todayData?.attendance?.breakStartTime && !todayData?.attendance?.breakEndTime;
    const hasTakenBreak = !!todayData?.attendance?.breakEndTime;

    return {
        currentTime,
        todayData,
        isLoading,
        isChecking,
        hasCheckedIn,
        hasCheckedOut,
        isOnBreak,
        hasTakenBreak,
        handleCheckIn,
        handleCheckOut,
        handleStartBreak,
        handleEndBreak,
    };
}
