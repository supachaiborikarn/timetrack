"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MapPin,
  LogIn,
  LogOut,
  Calendar,
  History,
  QrCode,
  FileEdit,
  AlertCircle,
  Loader2,
  Building2,
  Timer,
  User,
  ChevronRight,
  Settings,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentPosition, getDeviceFingerprint } from "@/lib/geo";
import { formatThaiDate, formatTime, getBangkokNow } from "@/lib/date-utils";

interface TodayData {
  attendance: {
    checkInTime: string | null;
    checkOutTime: string | null;
    lateMinutes: number | null;
    status: string;
    // Break Info
    breakStartTime: string | null;
    breakEndTime: string | null;
    breakDurationMin: number | null;
    breakPenaltyAmount: number | null;
  } | null;
  shift: {
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
  } | null;
  user: {
    name: string;
    station: string;
    department: string;
    hourlyRate: number;
  };
}

export default function EmployeeDashboard() {
  const { data: session, status } = useSession();
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getBangkokNow());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTodayData();
    }
  }, [session?.user?.id, fetchTodayData]);

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

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const hasCheckedIn = !!todayData?.attendance?.checkInTime;
  const hasCheckedOut = !!todayData?.attendance?.checkOutTime;
  const isOnBreak = !!todayData?.attendance?.breakStartTime && !todayData?.attendance?.breakEndTime;
  const hasTakenBreak = !!todayData?.attendance?.breakEndTime;

  // Calculate expected work hours
  const getExpectedHours = () => {
    if (!todayData?.shift) return null;
    const [startH, startM] = todayData.shift.startTime.split(":").map(Number);
    const [endH, endM] = todayData.shift.endTime.split(":").map(Number);
    let hours = endH - startH + (endM - startM) / 60;
    if (hours < 0) hours += 24; // Night shift
    return hours - (todayData.shift.breakMinutes / 60);
  };

  const expectedHours = getExpectedHours();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/profile" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-white text-lg">
                  {todayData?.user?.name || session.user.name}
                </h1>
                <p className="text-xs text-slate-400">
                  {todayData?.user?.station || "ไม่ระบุสถานี"} • {todayData?.user?.department || "ไม่ระบุแผนก"}
                </p>
              </div>
            </a>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Real-time Clock */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
          <CardContent className="py-6 text-center">
            <p className="text-blue-200 text-sm mb-1">
              {formatThaiDate(currentTime, "EEEE d MMMM yyyy")}
            </p>
            <p className="text-5xl font-bold text-white tracking-wider font-mono">
              {formatTime(currentTime)}
            </p>
          </CardContent>
        </Card>

        {/* Break Status Alert */}
        {isOnBreak && (
          <Card className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 animate-pulse">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Timer className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">กำลังพักเบรก</h3>
                    <p className="text-orange-100 text-sm">
                      เริ่มพัก: {todayData?.attendance?.breakStartTime
                        ? formatTime(new Date(todayData.attendance.breakStartTime))
                        : "-"}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="bg-white text-orange-600 hover:bg-orange-50 font-semibold shadow-lg"
                >
                  <a href="/qr-scan">
                    <QrCode className="w-4 h-4 mr-2" />
                    สแกนจบพัก
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Shift Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-400">กะวันนี้</p>
                <p className="font-medium text-white">
                  {todayData?.shift?.name || "ไม่มีกะ"}
                </p>
              </div>
              {todayData?.shift && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {todayData.shift.startTime} - {todayData.shift.endTime}
                </Badge>
              )}
            </div>

            {todayData?.shift && (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {expectedHours?.toFixed(1) || "-"}
                  </p>
                  <p className="text-xs text-slate-400">ชม.ที่ต้องทำ</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {todayData.shift.breakMinutes}
                  </p>
                  <p className="text-xs text-slate-400">นาทีพัก</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    ฿{todayData?.user?.hourlyRate || 0}
                  </p>
                  <p className="text-xs text-slate-400">ต่อชม.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Status */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">สถานะการลงเวลา</span>
              {todayData?.attendance?.lateMinutes ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  สาย {todayData.attendance.lateMinutes} นาที
                </Badge>
              ) : hasCheckedIn ? (
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  ตรงเวลา
                </Badge>
              ) : null}
            </div>

            {/* Break Status */}
            {isOnBreak && (
              <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-orange-400" />
                  <span className="text-orange-200">คุณกำลังพักเบรก</span>
                </div>
                <span className="text-orange-400 font-mono">
                  {todayData?.attendance?.breakStartTime ? formatTime(new Date(todayData.attendance.breakStartTime)) : ""}
                </span>
              </div>
            )}

            {hasTakenBreak && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-between">
                <span className="text-green-200 text-sm">พักแล้ว {todayData?.attendance?.breakDurationMin} นาที</span>
                {todayData?.attendance?.breakPenaltyAmount && todayData.attendance.breakPenaltyAmount > 0 ? (
                  <Badge variant="destructive">โดนหัก -฿{todayData.attendance.breakPenaltyAmount}</Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-400">ปกติ</Badge>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasCheckedIn ? "bg-green-500" : "bg-slate-600"}`} />
                <div>
                  <p className="text-xs text-slate-400">เข้างาน</p>
                  <p className="text-lg font-semibold text-white">
                    {todayData?.attendance?.checkInTime
                      ? formatTime(new Date(todayData.attendance.checkInTime))
                      : "--:--"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasCheckedOut ? "bg-orange-500" : "bg-slate-600"}`} />
                <div>
                  <p className="text-xs text-slate-400">ออกงาน</p>
                  <p className="text-lg font-semibold text-white">
                    {todayData?.attendance?.checkOutTime
                      ? formatTime(new Date(todayData.attendance.checkOutTime))
                      : todayData?.attendance?.checkInTime
                        ? <span className="text-yellow-400 text-base">
                          {formatTime(new Date(new Date(todayData.attendance.checkInTime).getTime() + 12 * 60 * 60 * 1000))} (ครบ 12 ชม.)
                        </span>
                        : "--:--"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-in/out Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className={`h-16 text-lg font-semibold ${hasCheckedIn
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              }`}
            disabled={hasCheckedIn || isChecking || !todayData?.shift}
            onClick={handleCheckIn}
          >
            {isChecking ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5 mr-2" />
            )}
            เข้าเวร
          </Button>
          <Button
            className={`h-16 text-lg font-semibold ${!hasCheckedIn || hasCheckedOut
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              }`}
            disabled={!hasCheckedIn || hasCheckedOut || isChecking}
            onClick={handleCheckOut}
          >
            {isChecking ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5 mr-2" />
            )}
            เลิกเวร
          </Button>
        </div>

        {/* Break Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className={`h-12 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white ${!hasCheckedIn || hasCheckedOut || isOnBreak || hasTakenBreak ? "opacity-50 cursor-not-allowed" : ""
              }`}
            disabled={!hasCheckedIn || hasCheckedOut || isOnBreak || hasTakenBreak || isChecking}
            onClick={handleStartBreak}
          >
            <Timer className="w-4 h-4 mr-2" />
            เริ่มพัก (1.5 ชม.)
          </Button>
          <Button
            variant="outline"
            className={`h-12 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white ${!isOnBreak ? "opacity-50 cursor-not-allowed" : "bg-orange-500/20 text-orange-400 border-orange-500/50 hover:bg-orange-500/30"
              }`}
            disabled={!isOnBreak || isChecking}
            onClick={handleEndBreak}
          >
            <Timer className="w-4 h-4 mr-2" />
            จบพักเบรก
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/qr-scan">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-white">สแกน QR</p>
                  <p className="text-xs text-slate-400">เช็คอินด้วย QR</p>
                </div>
              </CardContent>
            </Card>
          </a>
          <a href="/requests/time-correction">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <FileEdit className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-white">ขอแก้เวลา</p>
                  <p className="text-xs text-slate-400">ลืมกดเข้า-ออก</p>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Menu List */}
        <div className="space-y-2">
          {/* Admin Dashboard Link - Only for ADMIN/HR/MANAGER */}
          {session?.user?.role && ["ADMIN", "HR", "MANAGER"].includes(session.user.role) && (
            <a href="/admin">
              <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 hover:from-blue-600/30 hover:to-purple-600/30 transition cursor-pointer">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Admin Dashboard</span>
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">{session.user.role}</Badge>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                </CardContent>
              </Card>
            </a>
          )}
          <a href="/schedule">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span className="text-white">ตารางกะ</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </CardContent>
            </Card>
          </a>
          <a href="/shift-pool">
            <Card className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-500/30 hover:from-emerald-900/40 hover:to-teal-900/40 transition cursor-pointer">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="text-white">กะว่าง / สลับกะ</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">NEW</Badge>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400" />
              </CardContent>
            </Card>
          </a>
          <a href="/availability">
            <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30 hover:from-purple-900/40 hover:to-pink-900/40 transition cursor-pointer">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-white">แจ้งวันว่าง</span>
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">NEW</Badge>
                </div>
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </CardContent>
            </Card>
          </a>
          <a href="/history">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-green-400" />
                  <span className="text-white">ประวัติการลงเวลา</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </CardContent>
            </Card>
          </a>
          <a href="/requests">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileEdit className="w-5 h-5 text-yellow-400" />
                  <span className="text-white">คำขอทั้งหมด</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </CardContent>
            </Card>
          </a>
          <a href="/profile">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition cursor-pointer">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCog className="w-5 h-5 text-pink-400" />
                  <span className="text-white">ข้อมูลส่วนตัว / เปลี่ยนรหัส</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </CardContent>
            </Card>
          </a>
        </div>
      </main >
    </div >
  );
}
