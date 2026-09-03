"use client";

import Link from "next/link";
import {
  X,
  CalendarDays,
  Shuffle,
  FileText,
  Banknote,
  User,
  LayoutDashboard,
  ChevronRight,
  CalendarClock,
  Wallet,
  Megaphone,
  Trophy,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface RightMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  hasAdminAccess: boolean;
}

export function RightMenuDrawer({ isOpen, onClose, hasAdminAccess }: RightMenuDrawerProps) {
  return (
    <>
      {/* Background Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel */}
      <div 
        className={`fixed top-0 right-0 bottom-0 z-[110] w-84 max-w-[85vw] bg-[#eee8db] dark:bg-zinc-950 border-l border-zinc-700/30 dark:border-white/15 shadow-2xl transform transition-transform duration-300 ease-in-out font-sans ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto pb-24">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/15 dark:border-white/10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">NAVIGATION</p>
              <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50">เมนูระบบ</h2>
            </div>
            <button
              onClick={onClose}
              className="tt-retro-control w-9 h-9 grid place-items-center rounded-xl border border-zinc-700/30 bg-[#f5ecdc] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 active:scale-95"
              aria-label="ปิดเมนู"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {/* Admin Section (If applicable) */}
            {hasAdminAccess && (
              <div className="mb-4">
                <Link 
                  href="/admin" 
                  onClick={onClose}
                  className="tt-retro-control w-full relative overflow-hidden group flex items-center p-3.5 bg-zinc-950 text-white rounded-2xl border-[1.5px] border-black/70 shadow-[0_3px_0_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#fbbf24] text-zinc-950 grid place-items-center mr-3 shrink-0 font-black shadow-inner">
                    <LayoutDashboard className="w-5 h-5 text-zinc-950" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm text-[#fbbf24] leading-tight">ระบบแอดมิน (Admin)</h3>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5 truncate">จัดการข้อมูลพนักงานและระบบหลังบ้าน</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
                </Link>
              </div>
            )}

            <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 px-1">งานและตารางเวลา</h3>
            
            <div className="space-y-2">
              <Link href="/schedule" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0 font-black">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">ตารางกะ (Schedule)</p>
                  <p className="text-[10px] text-zinc-500 truncate">ตรวจสอบเวลางานและรอบกะ</p>
                </div>
              </Link>

              <Link href="/shift-pool" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-400 shrink-0 font-black">
                  <Shuffle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">สลับกะ (Shift Pool)</p>
                  <p className="text-[10px] text-zinc-500 truncate">ลงกะว่างและหาคนแทน</p>
                </div>
              </Link>

              <Link href="/availability" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0 font-black">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">แจ้งวันว่าง (Availability)</p>
                  <p className="text-[10px] text-zinc-500 truncate">ระบุวันที่พร้อมหรือไม่พร้อมทำงาน</p>
                </div>
              </Link>
            </div>

            <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 mt-4 px-1">ระบบบุคลากร</h3>

            <div className="space-y-2">
              <Link href="/requests" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0 font-black">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">คำขอลางาน (Leave Requests)</p>
                  <p className="text-[10px] text-zinc-500 truncate">ประวัติเบิกวันลา / คำร้องต่างๆ</p>
                </div>
              </Link>

              <Link href="/advances" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-800 dark:text-emerald-300 shrink-0 font-black">
                  <Banknote className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">เบิกค่าแรง (Salary Advance)</p>
                  <p className="text-[10px] text-zinc-500 truncate">ขอเบิกเงินล่วงหน้า</p>
                </div>
              </Link>

              <Link href="/wallet" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-800 dark:text-emerald-300 shrink-0 font-black">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">กระเป๋าเงิน (Wallet)</p>
                  <p className="text-[10px] text-zinc-500 truncate">ดูยอดคงเหลือและรายการเงินเดือน</p>
                </div>
              </Link>

              <Link href="/performance" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-800 dark:text-sky-300 shrink-0 font-black">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">ผลงานของฉัน (Performance)</p>
                  <p className="text-[10px] text-zinc-500 truncate">ติดตามคะแนนและพัฒนาการทำงาน</p>
                </div>
              </Link>

              <Link href="/announcements" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-800 dark:text-rose-300 shrink-0 font-black">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">ประกาศและข่าวสาร</p>
                  <p className="text-[10px] text-zinc-500 truncate">ติดตามประกาศสำคัญจากทีม</p>
                </div>
              </Link>
            </div>

            <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 mt-4 px-1">อื่นๆ</h3>

            <div className="space-y-2">
              <Link href="/profile" onClick={onClose} className="tt-paper-card tt-instrument-frame flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-700/25 dark:border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-zinc-500/15 border border-zinc-500/30 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shrink-0 font-black">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">โปรไฟล์ส่วนตัว</p>
                  <p className="text-[10px] text-zinc-500 truncate">จัดการข้อมูลรหัสผ่าน สลิปเงินเดือน</p>
                </div>
              </Link>
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6 px-2">การแสดงผล</h3>
            <div className="px-2">
              <ThemeToggle variant="pill" className="w-full justify-center" />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
