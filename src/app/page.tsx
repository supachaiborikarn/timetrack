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
} from "@/components/dashboard";

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
    </div>
  );
}
