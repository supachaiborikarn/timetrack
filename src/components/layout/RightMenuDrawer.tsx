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
        className={`fixed top-0 right-0 bottom-0 z-[110] w-80 bg-background border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto pb-24">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-bold">เมนูพนักงาน</h2>
            <button onClick={onClose} className="p-2 bg-muted rounded-full">
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {/* Admin Section (If applicable) */}
            {hasAdminAccess && (
              <div className="mb-6">
                <Link 
                  href="/admin" 
                  onClick={onClose}
                  className="w-full relative overflow-hidden group flex items-center p-4 bg-gradient-to-r from-primary to-[#F59E0B] rounded-2xl shadow-md text-primary-foreground transform active:scale-[0.98] transition-transform"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
                  <LayoutDashboard className="w-6 h-6 mr-3 z-10" />
                  <div className="flex-1 z-10">
                    <h3 className="font-bold text-sm">ระบบแอดมิน (Admin)</h3>
                    <p className="text-[10px] opacity-90 leading-tight mt-0.5">เข้าไปจัดการพนักงานและระบบ</p>
                  </div>
                  <ChevronRight className="w-5 h-5 z-10 opacity-70" />
                </Link>
              </div>
            )}

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">งานและตารางเวลา</h3>
            
            <Link href="/schedule" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">ตารางกะ (Schedule)</p>
                <p className="text-[10px] text-muted-foreground">ตรวจสอบเวลางานของคุณ</p>
              </div>
            </Link>

            <Link href="/shift-pool" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Shuffle className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">สลับกะ (Shift Pool)</p>
                <p className="text-[10px] text-muted-foreground">ลงกะว่างและหาคนแทน</p>
              </div>
            </Link>

            <Link href="/availability" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <CalendarClock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">แจ้งวันว่าง (Availability)</p>
                <p className="text-[10px] text-muted-foreground">ระบุวันที่พร้อมหรือไม่พร้อมทำงาน</p>
              </div>
            </Link>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6 px-2">ระบบบุคลากร</h3>

            <Link href="/requests" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">คำขอลางาน (Leave Requests)</p>
                <p className="text-[10px] text-muted-foreground">ประวัติเบิกวันลา / คำร้องต่างๆ</p>
              </div>
            </Link>

            <Link href="/advances" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">เบิกค่าแรง (Salary Advance)</p>
                <p className="text-[10px] text-muted-foreground">ขอเบิกเงินล่วงหน้า</p>
              </div>
            </Link>

            <Link href="/wallet" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">กระเป๋าเงิน (Wallet)</p>
                <p className="text-[10px] text-muted-foreground">ดูยอดคงเหลือและรายการเงินเดือน</p>
              </div>
            </Link>

            <Link href="/performance" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">ผลงานของฉัน (Performance)</p>
                <p className="text-[10px] text-muted-foreground">ติดตามคะแนนและพัฒนาการทำงาน</p>
              </div>
            </Link>

            <Link href="/announcements" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">ประกาศและแชต</p>
                <p className="text-[10px] text-muted-foreground">ติดตามประกาศสำคัญจากทีมและสาขา</p>
              </div>
            </Link>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6 px-2">อื่นๆ</h3>

            <Link href="/profile" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">โปรไฟล์ส่วนตัว</p>
                <p className="text-[10px] text-muted-foreground">จัดการข้อมูลรหัสผ่าน สลิปเงินเดือน</p>
              </div>
            </Link>

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
