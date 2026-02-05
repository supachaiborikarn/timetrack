"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "th" | "en" | "my";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    th: {
        // Dashboard
        "dashboard.title": "แดชบอร์ด",
        "dashboard.checkIn": "เข้าเวร",
        "dashboard.checkOut": "เลิกเวร",
        "dashboard.startBreak": "เริ่มพัก",
        "dashboard.endBreak": "จบพัก",
        "dashboard.scanEndBreak": "สแกนจบพัก",
        "dashboard.onTime": "ตรงเวลา",
        "dashboard.late": "สาย",
        "dashboard.minutes": "นาที",
        "dashboard.hours": "ชม.",
        "dashboard.attendanceStatus": "สถานะการลงเวลา",
        "dashboard.clockIn": "เข้างาน",
        "dashboard.clockOut": "ออกงาน",
        "dashboard.onBreak": "คุณกำลังพักเบรก",
        "dashboard.breakDone": "พักแล้ว",
        "dashboard.penaltyDeducted": "โดนหัก",
        "dashboard.normal": "ปกติ",

        // Shift
        "shift.today": "กะวันนี้",
        "shift.noShift": "ไม่มีกะ",
        "shift.hoursRequired": "ชม.ที่ต้องทำ",
        "shift.breakMinutes": "นาทีพัก",
        "shift.perHour": "ต่อชม.",

        // Menu
        "menu.schedule": "ตารางกะ",
        "menu.viewSchedule": "ดูเวลางานของคุณ",
        "menu.shiftPool": "กะว่าง / สลับกะ",
        "menu.findShifts": "หาคนแทน / รับงานเพิ่ม",
        "menu.availability": "แจ้งวันว่าง",
        "menu.setAvailability": "ระบุวันว่างทำงาน",
        "menu.history": "ประวัติลงเวลา",
        "menu.viewHistory": "ตรวจสอบการเข้า-ออก",
        "menu.requests": "คำขอทั้งหมด",
        "menu.requestsDesc": "ลากิจ / ลาป่วย / อื่นๆ",
        "menu.chat": "Team Chat & ประกาศ",
        "menu.chatDesc": "ข่าวสารและการสื่อสารในทีม",
        "menu.security": "Security",
        "menu.securityDesc": "Audit & Logs",
        "menu.profile": "โปรไฟล์",
        "menu.profileDesc": "ตั้งค่าส่วนตัว",
        "menu.adminSystem": "Admin System",
        "menu.manageSystem": "Manage & Configure",
        "menu.manualCheckIn": "+ เช็คอินแทน",
        "menu.checkInForEmployee": "ลงเวลาให้พนักงาน",
        "menu.qrCode": "สแกน QR",
        "menu.scanQR": "เช็คอินด้วย QR",
        "menu.timeEdit": "ขอแก้เวลา",
        "menu.requestEdit": "ลืมกดเข้า-ออก",

        // General
        "general.logout": "ออกจากระบบ",
        "general.loading": "กำลังโหลด...",
        "general.noStation": "ไม่ระบุสถานี",
        "general.noDepartment": "ไม่ระบุแผนก",
        "general.shift": "กะ",
        "general.hourlyRate": "รายชั่วโมง",
        "general.perHour": "บาท/ชม",
        "general.today": "วันนี้",
    },
    en: {
        // Dashboard
        "dashboard.title": "Dashboard",
        "dashboard.checkIn": "Check In",
        "dashboard.checkOut": "Check Out",
        "dashboard.startBreak": "Start Break",
        "dashboard.endBreak": "End Break",
        "dashboard.scanEndBreak": "Scan End Break",
        "dashboard.onTime": "On Time",
        "dashboard.late": "Late",
        "dashboard.minutes": "min",
        "dashboard.hours": "hr",
        "dashboard.attendanceStatus": "Attendance Status",
        "dashboard.clockIn": "Clock In",
        "dashboard.clockOut": "Clock Out",
        "dashboard.onBreak": "You are on break",
        "dashboard.breakDone": "Break taken",
        "dashboard.penaltyDeducted": "Deducted",
        "dashboard.normal": "Normal",

        // Shift
        "shift.today": "Today's Shift",
        "shift.noShift": "No Shift",
        "shift.hoursRequired": "Hours Required",
        "shift.breakMinutes": "Break (min)",
        "shift.perHour": "Per Hour",

        // Menu
        "menu.schedule": "Schedule",
        "menu.viewSchedule": "View your schedule",
        "menu.shiftPool": "Shift Pool",
        "menu.findShifts": "Find/swap shifts",
        "menu.availability": "Availability",
        "menu.setAvailability": "Set available days",
        "menu.history": "History",
        "menu.viewHistory": "Check attendance",
        "menu.requests": "All Requests",
        "menu.requestsDesc": "Leave / Sick / Other",
        "menu.chat": "Team Chat & Announcements",
        "menu.chatDesc": "Team news and communication",
        "menu.security": "Security",
        "menu.securityDesc": "Audit & Logs",
        "menu.profile": "Profile",
        "menu.profileDesc": "Personal settings",
        "menu.adminSystem": "Admin System",
        "menu.manageSystem": "Manage & Configure",
        "menu.manualCheckIn": "+ Manual Check-in",
        "menu.checkInForEmployee": "Check in for employee",
        "menu.qrCode": "Scan QR",
        "menu.scanQR": "Check in with QR",
        "menu.timeEdit": "Time Edit",
        "menu.requestEdit": "Forgot clock in/out",

        // General
        "general.logout": "Logout",
        "general.loading": "Loading...",
        "general.noStation": "No station",
        "general.noDepartment": "No department",
        "general.shift": "Shift",
        "general.hourlyRate": "Hourly Rate",
        "general.perHour": "THB/hr",
        "general.today": "Today",
    },
    my: {
        // Dashboard (Burmese/Myanmar)
        "dashboard.title": "ထိန်းချုပ်မှု",
        "dashboard.checkIn": "အဝင်",
        "dashboard.checkOut": "အထွက်",
        "dashboard.startBreak": "နားချိန်စတင်",
        "dashboard.endBreak": "နားချိန်ပြီး",
        "dashboard.scanEndBreak": "နားချိန်ပြီးစကန်",
        "dashboard.onTime": "အချိန်မှန်",
        "dashboard.late": "နောက်ကျ",
        "dashboard.minutes": "မိနစ်",
        "dashboard.hours": "နာရီ",
        "dashboard.attendanceStatus": "တက်ရောက်မှုအခြေအနေ",
        "dashboard.clockIn": "အဝင်အချိန်",
        "dashboard.clockOut": "အထွက်အချိန်",
        "dashboard.onBreak": "နားနေသည်",
        "dashboard.breakDone": "နားချိန်ပြီး",
        "dashboard.penaltyDeducted": "နုတ်ယူ",
        "dashboard.normal": "ပုံမှန်",

        // Shift
        "shift.today": "ယနေ့အလှည့်ကျ",
        "shift.noShift": "အလှည့်ကျမရှိ",
        "shift.hoursRequired": "လိုအပ်သောနာရီ",
        "shift.breakMinutes": "နားချိန်(မိနစ်)",
        "shift.perHour": "နာရီလျှင်",

        // Menu
        "menu.schedule": "အလုပ်ချိန်",
        "menu.viewSchedule": "အချိန်ဇယားကြည့်ရန်",
        "menu.shiftPool": "အလှည့်ကျပြောင်း",
        "menu.findShifts": "အလှည့်ကျရှာ/ပြောင်း",
        "menu.availability": "ရက်လွတ်",
        "menu.setAvailability": "ရက်လွတ်သတ်မှတ်",
        "menu.history": "မှတ်တမ်း",
        "menu.viewHistory": "တက်ရောက်မှုမှတ်တမ်း",
        "menu.requests": "တောင်းဆိုချက်များ",
        "menu.requestsDesc": "ခွင့် / နာမကျန်း / အခြား",
        "menu.chat": "အဖွဲ့ Chat & ကြေငြာချက်",
        "menu.chatDesc": "အဖွဲ့သတင်းနှင့်ဆက်သွယ်မှု",
        "menu.security": "လုံခြုံရေး",
        "menu.securityDesc": "Audit & Logs",
        "menu.profile": "ပရိုဖိုင်",
        "menu.profileDesc": "ကိုယ်ရေးဆိုင်ရာ",
        "menu.adminSystem": "စီမံခန့်ခွဲမှု",
        "menu.manageSystem": "စီမံခန့်ခွဲရန်",
        "menu.manualCheckIn": "+ ကိုယ်စားအဝင်",
        "menu.checkInForEmployee": "ဝန်ထမ်းအတွက်အဝင်မှတ်",
        "menu.qrCode": "QR စကန်",
        "menu.scanQR": "QR ဖြင့်အဝင်မှတ်",
        "menu.timeEdit": "အချိန်ပြင်ဆင်",
        "menu.requestEdit": "အချိန်မှတ်မေ့",

        // General
        "general.logout": "ထွက်ရန်",
        "general.loading": "ဖွင့်နေသည်...",
        "general.noStation": "ဘူတာမသတ်မှတ်",
        "general.noDepartment": "ဌာနမသတ်မှတ်",
        "general.shift": "အလှည့်ကျ",
        "general.hourlyRate": "နာရီခ",
        "general.perHour": "ဘတ်/နာရီ",
        "general.today": "ယနေ့",
    },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("th");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedLang = localStorage.getItem("language") as Language;
        if (savedLang && ["th", "en", "my"].includes(savedLang)) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
    };

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

// Language names for display
export const languageNames: Record<Language, string> = {
    th: "ไทย",
    en: "EN",
    my: "မြန်မာ",
};

// Language flags (emoji)
export const languageFlags: Record<Language, string> = {
    th: "🇹🇭",
    en: "🇬🇧",
    my: "🇲🇲",
};
