"use client";

import { useEffect, useState } from "react";
import { X, LogIn, Coffee, LogOut, QrCode, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface ClockInModalProps {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  isOnBreak: boolean;
  hasTakenBreak: boolean;
  isChecking: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onStartBreak: () => void;
  hasShift: boolean;
  shiftTime?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

export function ClockInModal({
  hasCheckedIn,
  hasCheckedOut,
  isOnBreak,
  hasTakenBreak,
  isChecking,
  onCheckIn,
  onCheckOut,
  onStartBreak,
  hasShift,
  shiftTime,
  checkInTime,
  checkOutTime,
}: ClockInModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    document.addEventListener('open-clock-modal', handleOpen);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      document.removeEventListener('open-clock-modal', handleOpen);
      clearInterval(timer);
    };
  }, []);

  if (!isOpen) return null;

  const shiftLabel = shiftTime || "No Shift";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Dimmed background */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Content overlay — positioned from top like reference */}
      <div className="relative z-10 flex flex-col h-full px-5 pt-24 pb-6 safe-area-bottom">

        {/* ── Clock In card ── */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-xl border border-gray-200/50 dark:border-zinc-700 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
            hasCheckedIn
              ? "bg-[#fbbf24] text-black"
              : "bg-zinc-900 dark:bg-zinc-700 text-white"
          }`}>
            CI
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-black dark:text-white text-[15px] leading-tight">
              {hasCheckedIn ? `เข้างาน — ${checkInTime ? format(new Date(checkInTime), "HH:mm น.", { locale: th }) : format(currentTime, "HH:mm น.", { locale: th })}` : "เวลาเข้างาน"}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              เวลากะทำงาน -  {hasCheckedIn ? "✔ เรียบร้อย" : `- ${shiftLabel}`}
            </p>
          </div>
          {hasCheckedIn && (
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <span className="text-emerald-500 text-xs font-bold">✓</span>
            </div>
          )}
        </div>

        {/* ── Break & Transfer Buttons ── */}
        <div className="flex gap-3 justify-center my-5 px-2">
          {hasCheckedIn && !hasCheckedOut ? (
            <>
              {isOnBreak ? (
                <a
                  href="/qr-scan"
                  className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24] font-bold text-sm active:scale-[0.97] transition-transform"
                >
                  <QrCode className="w-5 h-5" />
                  สแกนจบเบรก
                </a>
              ) : (
                <button
                  onClick={onStartBreak}
                  disabled={hasTakenBreak || isChecking}
                  className={`flex-1 flex justify-center items-center gap-2 px-2 py-3 rounded-xl border font-bold text-sm transition-all ${
                    hasTakenBreak
                      ? "border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "border-dashed border-[#fbbf24] text-black dark:text-white bg-[#fbbf24]/5 hover:bg-[#fbbf24]/10 active:scale-[0.97]"
                  }`}
                >
                  <Coffee className="w-4 h-4" />
                  {hasTakenBreak ? "พักเบรกแล้ว" : "พักเบรก"}
                </button>
              )}
              
              {/* Transfer Station Button */}
              {!isOnBreak && (
                <a
                  href="/qr-scan"
                  className="flex-1 flex justify-center items-center gap-2 px-2 py-3 rounded-xl border border-dashed border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 active:scale-[0.97] font-bold text-sm transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  ย้ายสาขา
                </a>
              )}
            </>
          ) : (
            <div className="h-11" /> /* spacer */
          )}
        </div>

        {/* ── Clock Out card ── */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-xl border border-gray-200/50 dark:border-zinc-700 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
            hasCheckedOut
              ? "bg-[#fbbf24] text-black"
              : "bg-zinc-900 dark:bg-zinc-700 text-white"
          }`}>
            CO
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-black dark:text-white text-[15px] leading-tight">
              {hasCheckedOut ? `ออกงาน — ${checkOutTime ? format(new Date(checkOutTime), "HH:mm น.", { locale: th }) : format(currentTime, "HH:mm น.", { locale: th })}` : "เวลาออกงาน"}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              เวลากะทำงาน -  {hasCheckedOut ? "✔ เรียบร้อย" : `- ${shiftLabel}`}
            </p>
          </div>
          {hasCheckedOut && (
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <span className="text-emerald-500 text-xs font-bold">✓</span>
            </div>
          )}
        </div>

        {/* Spacer to push action button to bottom */}
        <div className="flex-1" />

        {/* ── Dynamic action button — yellow theme ── */}
        <div className="mb-6">
          {!hasCheckedIn && (
            <a
              href="/qr-scan"
              className={`w-full font-bold text-lg py-5 rounded-2xl flex items-center justify-between px-6 transition-transform active:scale-[0.98] shadow-xl ${
                hasShift && !isChecking
                  ? "bg-[#fbbf24] text-black shadow-yellow-500/25"
                  : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
                  <LogIn className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block leading-tight text-base font-black">เช็คอิน (เข้างาน)</span>
                  <span className="text-xs font-bold opacity-70">{format(currentTime, "HH:mm น.", { locale: th })}</span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-60" />
            </a>
          )}

        {hasCheckedIn && !hasCheckedOut && (
            <button
              onClick={() => {
                setIsOpen(false);
                onCheckOut();
              }}
              disabled={isChecking}
              className="w-full bg-[#fbbf24] text-black font-bold text-lg py-5 rounded-2xl shadow-xl shadow-yellow-500/25 flex items-center justify-between px-6 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
                  {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <span className="block leading-tight text-base font-black">เช็คเอาต์ (เลิกงาน)</span>
                  <span className="text-xs font-bold opacity-70">{format(currentTime, "HH:mm น.", { locale: th })}</span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-60" />
            </button>
          )}

          {hasCheckedOut && (
            <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-base py-5 rounded-2xl flex items-center justify-center gap-3 text-center">
              <span>✓</span>
              <span>ลงเวลาเรียบร้อยแล้ว</span>
            </div>
          )}
        </div>

        {/* Close / X floating button */}
        <div className="flex justify-center mb-2">
          <button
            onClick={() => setIsOpen(false)}
            className="w-14 h-14 bg-[#fbbf24] text-black rounded-full flex items-center justify-center shadow-xl shadow-yellow-500/30 active:scale-90 transition-transform"
          >
            <X className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
