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

        // Profile
        "profile.title": "โปรไฟล์",
        "profile.generalInfo": "ข้อมูลทั่วไป",
        "profile.nickname": "ชื่อเล่น",
        "profile.station": "สถานี",
        "profile.department": "แผนก",
        "profile.citizenId": "เลขบัตรประชาชน",
        "profile.birthDate": "วันเกิด",
        "profile.startDate": "วันที่เริ่มงาน",
        "profile.contact": "ติดต่อ",
        "profile.phone": "เบอร์โทรศัพท์",
        "profile.email": "อีเมล",
        "profile.address": "ที่อยู่",
        "profile.financial": "การเงิน",
        "profile.dailyWage": "ค่าแรงรายวัน",
        "profile.salary": "เงินเดือน",
        "profile.bankAccount": "บัญชีธนาคาร",
        "profile.bankName": "ชื่อธนาคาร",
        "profile.accountNumber": "เลขบัญชี",
        "profile.payHistory": "ประวัติเงินเดือน",
        "profile.noPayHistory": "ยังไม่มีประวัติเงินเดือน",
        "profile.emergency": "ผู้ติดต่อฉุกเฉิน",
        "profile.emergencyName": "ชื่อผู้ติดต่อ",
        "profile.emergencyRelation": "ความสัมพันธ์",
        "profile.emergencyPhone": "เบอร์โทรศัพท์",
        "profile.insurance": "ประกัน",
        "profile.security": "รหัส",
        "profile.password": "รหัสผ่านเข้าสู่ระบบ",
        "profile.changePassword": "เปลี่ยนรหัสผ่าน",
        "profile.currentPassword": "รหัสผ่านปัจจุบัน",
        "profile.newPassword": "รหัสผ่านใหม่",
        "profile.confirmPassword": "ยืนยันรหัสผ่านใหม่",
        "profile.pin": "PIN (สำหรับลงเวลา)",
        "profile.changePin": "เปลี่ยน PIN",
        "profile.newPin": "PIN ใหม่ (4-6 หลัก)",
        "profile.confirmPin": "ยืนยัน PIN ใหม่",
        "profile.pendingApproval": "รออนุมัติ",
        "profile.changeTo": "เป็น",
        "profile.editByRequest": "แก้ไขได้โดยการส่งคำขอ",
        "profile.save": "บันทึก",
        "profile.cancel": "ยกเลิก",
        "profile.biometric": "Biometric Authentication",
        "profile.biometricDesc": "เข้าสู่ระบบด้วย Face ID / Touch ID",
        "profile.tabs.personal": "ข้อมูล",
        "profile.tabs.contact": "ติดต่อ",
        "profile.tabs.financial": "การเงิน",
        "profile.tabs.insurance": "ประกัน",
        "profile.tabs.security": "รหัส",

        // General
        "general.logout": "ออกจากระบบ",
        "general.loading": "กำลังโหลด...",
        "general.noStation": "ไม่ระบุสถานี",
        "general.noDepartment": "ไม่ระบุแผนก",
        "general.shift": "กะ",
        "general.hourlyRate": "รายชั่วโมง",
        "general.perHour": "บาท/ชม",
        "general.today": "วันนี้",

        // Roles
        "role.admin": "ผู้ดูแลระบบ",
        "role.hr": "ฝ่ายบุคคล",
        "role.manager": "ผู้จัดการ",
        "role.cashier": "เสมียน",
        "role.employee": "พนักงาน",
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

        // Profile
        "profile.title": "Profile",
        "profile.generalInfo": "General Information",
        "profile.nickname": "Nickname",
        "profile.station": "Station",
        "profile.department": "Department",
        "profile.citizenId": "Citizen ID",
        "profile.birthDate": "Birth Date",
        "profile.startDate": "Start Date",
        "profile.contact": "Contact",
        "profile.phone": "Phone",
        "profile.email": "Email",
        "profile.address": "Address",
        "profile.financial": "Financial",
        "profile.dailyWage": "Daily Wage",
        "profile.salary": "Salary",
        "profile.bankAccount": "Bank Account",
        "profile.bankName": "Bank Name",
        "profile.accountNumber": "Account Number",
        "profile.payHistory": "Pay History",
        "profile.noPayHistory": "No pay history",
        "profile.emergency": "Emergency Contact",
        "profile.emergencyName": "Contact Name",
        "profile.emergencyRelation": "Relationship",
        "profile.emergencyPhone": "Phone",
        "profile.insurance": "Insurance",
        "profile.security": "Security",
        "profile.password": "Login Password",
        "profile.changePassword": "Change Password",
        "profile.currentPassword": "Current Password",
        "profile.newPassword": "New Password",
        "profile.confirmPassword": "Confirm New Password",
        "profile.pin": "PIN (for attendance)",
        "profile.changePin": "Change PIN",
        "profile.newPin": "New PIN (4-6 digits)",
        "profile.confirmPin": "Confirm New PIN",
        "profile.pendingApproval": "Pending",
        "profile.changeTo": "to",
        "profile.editByRequest": "Edit by request",
        "profile.save": "Save",
        "profile.cancel": "Cancel",
        "profile.biometric": "Biometric Authentication",
        "profile.biometricDesc": "Login with Face ID / Touch ID",
        "profile.tabs.personal": "Info",
        "profile.tabs.contact": "Contact",
        "profile.tabs.financial": "Finance",
        "profile.tabs.insurance": "Insurance",
        "profile.tabs.security": "Security",

        // General
        "general.logout": "Logout",
        "general.loading": "Loading...",
        "general.noStation": "No station",
        "general.noDepartment": "No department",
        "general.shift": "Shift",
        "general.hourlyRate": "Hourly Rate",
        "general.perHour": "THB/hr",
        "general.today": "Today",

        // Roles
        "role.admin": "Administrator",
        "role.hr": "HR",
        "role.manager": "Manager",
        "role.cashier": "Cashier",
        "role.employee": "Employee",
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

        // Profile (Burmese/Myanmar)
        "profile.title": "ပရိုဖိုင်",
        "profile.generalInfo": "အထွေထွေအချက်အလက်",
        "profile.nickname": "အမည်ပြောင်",
        "profile.station": "ဘူတာ",
        "profile.department": "ဌာန",
        "profile.citizenId": "မှတ်ပုံတင်နံပါတ်",
        "profile.birthDate": "မွေးနေ့",
        "profile.startDate": "အလုပ်စဝင်ရက်",
        "profile.contact": "ဆက်သွယ်ရန်",
        "profile.phone": "ဖုန်းနံပါတ်",
        "profile.email": "အီးမေးလ်",
        "profile.address": "လိပ်စာ",
        "profile.financial": "ငွေကြေးအချက်အလက်",
        "profile.dailyWage": "နေ့တွက်လုပ်ခ",
        "profile.salary": "လစာ",
        "profile.bankAccount": "ဘဏ်အကောင့်",
        "profile.bankName": "ဘဏ်အမည်",
        "profile.accountNumber": "အကောင့်နံပါတ်",
        "profile.payHistory": "လစာမှတ်တမ်း",
        "profile.noPayHistory": "လစာမှတ်တမ်းမရှိသေးပါ",
        "profile.emergency": "အရေးပေါ်ဆက်သွယ်ရန်",
        "profile.emergencyName": "ဆက်သွယ်ရန်အမည်",
        "profile.emergencyRelation": "ဆက်နွယ်မှု",
        "profile.emergencyPhone": "ဖုန်းနံပါတ်",
        "profile.insurance": "အာမခံ",
        "profile.security": "လျှို့ဝှက်နံပါတ်",
        "profile.password": "ဝင်ရောက်ရန်စကားဝှက်",
        "profile.changePassword": "စကားဝှက်ပြောင်းရန်",
        "profile.currentPassword": "လက်ရှိစကားဝှက်",
        "profile.newPassword": "စကားဝှက်အသစ်",
        "profile.confirmPassword": "စကားဝှက်အသစ်အတည်ပြုရန်",
        "profile.pin": "PIN (တက်ရောက်မှုမှတ်ရန်)",
        "profile.changePin": "PIN ပြောင်းရန်",
        "profile.newPin": "PIN အသစ် (ဂဏန်း ၄-၆ လုံး)",
        "profile.confirmPin": "PIN အသစ်အတည်ပြုရန်",
        "profile.pendingApproval": "စောင့်ဆိုင်းဆဲ",
        "profile.changeTo": "သို့",
        "profile.editByRequest": "တောင်းဆိုမှုဖြင့်ပြင်ဆင်ရန်",
        "profile.save": "သိမ်းဆည်းရန်",
        "profile.cancel": "ပယ်ဖျက်ရန်",
        "profile.biometric": "လက်ဗွေ/မျက်နှာဖြင့်ဝင်ရောက်ခြင်း",
        "profile.biometricDesc": "Face ID / Touch ID ဖြင့်ဝင်ရောက်ရန်",
        "profile.tabs.personal": "အချက်အလက်",
        "profile.tabs.contact": "ဆက်သွယ်ရန်",
        "profile.tabs.financial": "ငွေကြေး",
        "profile.tabs.insurance": "အာမခံ",
        "profile.tabs.security": "လျှို့ဝှက်",

        // General
        "general.logout": "ထွက်ရန်",
        "general.loading": "ဖွင့်နေသည်...",
        "general.noStation": "ဘူတာမသတ်မှတ်",
        "general.noDepartment": "ဌာနမသတ်မှတ်",
        "general.shift": "အလှည့်ကျ",
        "general.hourlyRate": "နာရီခ",
        "general.perHour": "ဘတ်/နာရီ",
        "general.today": "ယနေ့",

        // Roles
        "role.admin": "စီမံခန့်ခွဲသူ",
        "role.hr": "ဝန်ထမ်းရေးရာ",
        "role.manager": "မန်နေဂျာ",
        "role.cashier": "ငွေကိုင်",
        "role.employee": "ဝန်ထမ်း",
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
