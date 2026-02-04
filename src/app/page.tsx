"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, User } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import {
  ClockCard,
  BreakStatusAlert,
  ShiftInfoCard,
  AttendanceStatusCard,
  CheckInOutButtons,
  BreakButtons,
  QuickActionCards,
  MenuList,
  OfflineIndicator,
} from "@/components/dashboard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function EmployeeDashboard() {
  const { data: session, status } = useSession();

  const {
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
  } = useAttendance(session?.user?.id);

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

  return (

    <div className="min-h-screen bg-[#1a1412] pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#241705] to-[#3a2510] border-b border-orange-900/20 px-4 py-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/profile" className="flex items-center gap-3 hover:opacity-80 transition group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F09410] to-[#BC430D] p-[2px] shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all">
                <div className="w-full h-full rounded-full bg-[#241705] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#F09410]" />
                </div>
              </div>
              <div>
                <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FEEAF0] to-[#F0D0C7] text-lg">
                  {todayData?.user?.name || session.user.name}
                </h1>
                <p className="text-xs text-slate-400">
                  {todayData?.user?.station || "ไม่ระบุสถานี"} • {todayData?.user?.department || "ไม่ระบุแผนก"}
                </p>
              </div>
            </a>
          </div>
          <div className="flex gap-2 items-center">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Real-time Clock */}
        <ClockCard currentTime={currentTime} />

        {/* Break Status Alert */}
        {isOnBreak && (
          <BreakStatusAlert breakStartTime={todayData?.attendance?.breakStartTime || null} />
        )}

        {/* Today's Shift Info */}
        <ShiftInfoCard
          shift={todayData?.shift || null}
          hourlyRate={todayData?.user?.hourlyRate || 0}
        />

        {/* Attendance Status */}
        <AttendanceStatusCard attendance={todayData?.attendance || null} />

        {/* Check-in/out Buttons */}
        <CheckInOutButtons
          hasCheckedIn={hasCheckedIn}
          hasCheckedOut={hasCheckedOut}
          hasShift={!!todayData?.shift}
          isChecking={isChecking}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />

        {/* Break Buttons */}
        <BreakButtons
          hasCheckedIn={hasCheckedIn}
          hasCheckedOut={hasCheckedOut}
          isOnBreak={isOnBreak}
          hasTakenBreak={hasTakenBreak}
          isChecking={isChecking}
          onStartBreak={handleStartBreak}
        />

        {/* Quick Actions */}
        <QuickActionCards />

        {/* Menu List */}
        <MenuList userRole={session?.user?.role} />
      </main>

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
