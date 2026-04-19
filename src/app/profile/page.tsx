"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2, User, Phone, Mail, Building2, Briefcase,
    Key, Lock, Eye, EyeOff, Wallet, DollarSign,
    MapPin, Calendar, Contact, Check, X,
    Clock, FileText, CreditCard, Fingerprint,
    ChevronLeft, Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";
import { PasskeyButton } from "@/components/auth/PasskeyButton";
import { useLanguage } from "@/lib/language-context";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
    id: string;
    employeeId: string;
    name: string;
    nickName: string | null;
    email: string | null;
    phone: string | null;
    role: string;
    station: { id: string; name: string; code: string } | null;
    department: { id: string; name: string; code: string } | null;
    hourlyRate: number;
    dailyRate: number | null;
    baseSalary: number | null;
    bankAccountNumber: string | null;
    bankName: string | null;
    address: string | null;
    birthDate: string | null;
    gender: string | null;
    citizenId: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelation: string | null;
    startDate: string | null;
    employeeStatus: string;
    createdAt: string;
}

interface EditRequest {
    id: string;
    fieldName: string;
    fieldLabel: string;
    newValue: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
}

const roleLabels: Record<string, string> = {
    ADMIN: "ผู้ดูแลระบบ",
    HR: "ฝ่ายบุคคล",
    MANAGER: "ผู้จัดการ",
    CASHIER: "เสมียน",
    EMPLOYEE: "พนักงาน",
};

// ─── EditableField Component ──────────────────────────────────────────────────
interface EditableFieldProps {
    label: string;
    value: string | null | undefined;
    fieldName: string;
    icon: any;
    pendingRequest?: EditRequest;
    onRequestEdit: (fieldName: string, newValue: string) => Promise<void>;
    placeholder?: string;
}

const EditableField = ({
    label, value, fieldName, icon: Icon,
    pendingRequest, onRequestEdit, placeholder = "-",
}: EditableFieldProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || "");
    const [isSaving, setIsSaving] = useState(false);
    const { t } = useLanguage();

    useEffect(() => { setTempValue(value || ""); }, [value]);

    const handleSave = async () => {
        if (tempValue === value) { setIsEditing(false); return; }
        setIsSaving(true);
        try {
            await onRequestEdit(fieldName, tempValue);
            setIsEditing(false);
        } catch { /* handled by parent */ } finally { setIsSaving(false); }
    };

    return (
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{label}</p>
                        {!isEditing ? (
                            <p className="text-sm font-bold text-foreground break-words">{value || placeholder}</p>
                        ) : (
                            <Input
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className="h-9 text-sm rounded-xl"
                                autoFocus
                            />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {pendingRequest ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                            <Clock className="w-3 h-3 mr-1" /> รอการอนุมัติ
                        </Badge>
                    ) : isEditing ? (
                        <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setIsEditing(false); setTempValue(value || ""); }} disabled={isSaving}>
                                <X className="w-4 h-4" />
                            </Button>
                        </>
                    ) : (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-full" onClick={() => setIsEditing(true)}>
                            <Edit2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { t } = useLanguage();
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [requests, setRequests] = useState<EditRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [payslips, setPayslips] = useState<any[]>([]);

    // Password
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // PIN
    const [showPinSection, setShowPinSection] = useState(false);
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");

    const fetchProfile = async () => {
        const res = await fetch("/api/profile");
        if (res.ok) { const d = await res.json(); setProfile(d.profile); }
    };
    const fetchRequests = async () => {
        const res = await fetch("/api/profile/edit-request");
        if (res.ok) { const d = await res.json(); setRequests(d.requests || []); }
    };
    const fetchPayslips = async () => {
        const res = await fetch("/api/payslip");
        if (res.ok) { const d = await res.json(); setPayslips(d.payslips || []); }
    };

    useEffect(() => {
        if (session?.user?.id) {
            setIsLoading(true);
            Promise.all([fetchProfile(), fetchRequests(), fetchPayslips()]).finally(() => setIsLoading(false));
        }
    }, [session?.user?.id]);

    const handleRequestEdit = async (fieldName: string, newValue: string) => {
        const res = await fetch("/api/profile/edit-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fieldName, newValue }),
        });
        const data = await res.json();
        if (res.ok) { toast.success(data.message || "ส่งคำขอแก้ไขเรียบร้อย"); fetchRequests(); }
        else { toast.error(data.error || "เกิดข้อผิดพลาด"); }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) { toast.error("รหัสผ่านไม่ตรงกัน"); return; }
        if (newPassword.length < 4) { toast.error("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"); return; }
        setIsSaving(true);
        try {
            const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
            if (res.ok) { toast.success("เปลี่ยนรหัสผ่านเรียบร้อย"); setShowPasswordSection(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
            else { const d = await res.json(); toast.error(d.error || "เกิดข้อผิดพลาด"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setIsSaving(false); }
    };

    const handleChangePin = async () => {
        if (newPin !== confirmPin) { toast.error("PIN ไม่ตรงกัน"); return; }
        if (!/^\d{4,6}$/.test(newPin)) { toast.error("PIN ต้องเป็นตัวเลข 4-6 หลัก"); return; }
        setIsSaving(true);
        try {
            const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPin }) });
            if (res.ok) { toast.success("เปลี่ยน PIN เรียบร้อย"); setShowPinSection(false); setNewPin(""); setConfirmPin(""); }
            else { const d = await res.json(); toast.error(d.error || "เกิดข้อผิดพลาด"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setIsSaving(false); }
    };

    const getPendingRequest = (fieldName: string) =>
        requests.find(r => r.fieldName === fieldName && r.status === "PENDING");

    const formatMoney = (n: number) => new Intl.NumberFormat("th-TH").format(n);

    if (status === "loading" || isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }
    if (!session) { redirect("/login"); }

    return (
        <div className="min-h-screen bg-background pb-28">
            {/* Header bar */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border px-5 pt-6 pb-3 flex items-center justify-between">
                <Button variant="ghost" size="icon" className="-ml-2" asChild>
                    <a href="/"><ChevronLeft className="w-6 h-6" /></a>
                </Button>
                <h1 className="text-base font-black text-foreground">โปรไฟล์ส่วนตัว</h1>
                <div className="w-9" />
            </div>

            <div className="px-4 max-w-lg mx-auto pt-4 space-y-4">
                {/* ── Profile summary card ── */}
                <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                <User className="w-9 h-9 text-primary opacity-60" />
                            </div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                                <Edit2 className="w-3 h-3 text-primary-foreground" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-black text-foreground">{profile?.name || "-"}</h2>
                            <p className="text-sm text-muted-foreground">{profile?.employeeId || "-"}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-[11px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                                    {roleLabels[profile?.role || ""] || profile?.role || "-"}
                                </span>
                                {profile?.station && (
                                    <span className="text-[11px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                                        {profile.station.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* 3-col stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        {[
                            { label: "ตำแหน่ง", value: roleLabels[profile?.role || ""] || "-" },
                            { label: "แผนก",    value: profile?.department?.name || "-" },
                            { label: "อายุงาน", value: profile?.startDate ? `${Math.floor((Date.now() - new Date(profile.startDate).getTime()) / (1000*60*60*24*30))} เดือน` : "-" },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-muted/60 rounded-2xl p-3 text-center">
                                <p className="text-xs font-black text-foreground leading-tight line-clamp-2">{value}</p>
                                <p className="text-[9px] font-bold text-primary mt-1 uppercase tracking-wide">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Tabs ── */}
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 p-1 bg-muted rounded-2xl">
                        <TabsTrigger value="personal"  className="text-[10px] rounded-xl font-bold">ข้อมูล</TabsTrigger>
                        <TabsTrigger value="contact"   className="text-[10px] rounded-xl font-bold">ติดต่อ</TabsTrigger>
                        <TabsTrigger value="financial" className="text-[10px] rounded-xl font-bold">การเงิน</TabsTrigger>
                        <TabsTrigger value="security"  className="text-[10px] rounded-xl font-bold">ความปลอดภัย</TabsTrigger>
                    </TabsList>

                    {/* Personal */}
                    <TabsContent value="personal" className="space-y-3 mt-4">
                        <EditableField label={t("profile.nickname")} value={profile?.nickName} fieldName="nickName" icon={User} pendingRequest={getPendingRequest("nickName")} onRequestEdit={handleRequestEdit} />
                        {([
                            { label: t("profile.station"),    value: profile?.station?.name,    icon: Building2 },
                            { label: t("profile.department"), value: profile?.department?.name,  icon: Briefcase  },
                            { label: t("profile.citizenId"),  value: profile?.citizenId,          icon: FileText   },
                            { label: t("profile.birthDate"),  value: profile?.birthDate  ? formatThaiDate(new Date(profile.birthDate),  "d MMMM yyyy") : null, icon: Calendar },
                            { label: t("profile.startDate"),  value: profile?.startDate  ? formatThaiDate(new Date(profile.startDate),  "d MMMM yyyy") : null, icon: Clock    },
                        ] as const).map(({ label, value, icon: Icon }) => (
                            <div key={label} className="p-4 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-muted shrink-0"><Icon className="w-4 h-4 text-foreground" /></div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
                                    <p className="text-sm font-bold text-foreground mt-0.5">{value || "-"}</p>
                                </div>
                            </div>
                        ))}
                    </TabsContent>

                    {/* Contact */}
                    <TabsContent value="contact" className="space-y-3 mt-4">
                        <EditableField label={t("profile.phone")}   value={profile?.phone}   fieldName="phone"   icon={Phone}  pendingRequest={getPendingRequest("phone")}   onRequestEdit={handleRequestEdit} />
                        <EditableField label={t("profile.email")}   value={profile?.email}   fieldName="email"   icon={Mail}   pendingRequest={getPendingRequest("email")}   onRequestEdit={handleRequestEdit} />
                        <EditableField label={t("profile.address")} value={profile?.address} fieldName="address" icon={MapPin} pendingRequest={getPendingRequest("address")} onRequestEdit={handleRequestEdit} />
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-wider pt-2 ml-1">ผู้ติดต่อฉุกเฉิน</p>
                        <EditableField label={t("profile.emergencyName")}     value={profile?.emergencyContactName}     fieldName="emergencyContactName"     icon={User}    pendingRequest={getPendingRequest("emergencyContactName")}     onRequestEdit={handleRequestEdit} />
                        <EditableField label={t("profile.emergencyRelation")} value={profile?.emergencyContactRelation} fieldName="emergencyContactRelation" icon={Contact} pendingRequest={getPendingRequest("emergencyContactRelation")} onRequestEdit={handleRequestEdit} />
                        <EditableField label={t("profile.emergencyPhone")}    value={profile?.emergencyContactPhone}    fieldName="emergencyContactPhone"    icon={Phone}   pendingRequest={getPendingRequest("emergencyContactPhone")}    onRequestEdit={handleRequestEdit} />
                    </TabsContent>

                    {/* Financial */}
                    <TabsContent value="financial" className="space-y-3 mt-4">
                        {profile?.dailyRate && Number(profile.dailyRate) > 0 && (
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-xl"><DollarSign className="w-4 h-4 text-emerald-500" /></div>
                                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{t("profile.dailyWage")}</span>
                                </div>
                                <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">฿{formatMoney(Number(profile.dailyRate))}</span>
                            </div>
                        )}
                        {profile?.baseSalary && Number(profile.baseSalary) > 0 && (
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-xl"><DollarSign className="w-4 h-4 text-blue-500" /></div>
                                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{t("profile.salary")}</span>
                                </div>
                                <span className="font-black text-xl text-blue-600 dark:text-blue-400">฿{formatMoney(Number(profile.baseSalary))}</span>
                            </div>
                        )}
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1 pt-2">
                            <Wallet className="w-3 h-3" /> {t("profile.bankAccount")}
                        </p>
                        <EditableField label={t("profile.bankName")}      value={profile?.bankName}          fieldName="bankName"          icon={Building2} pendingRequest={getPendingRequest("bankName")}          onRequestEdit={handleRequestEdit} />
                        <EditableField label={t("profile.accountNumber")} value={profile?.bankAccountNumber} fieldName="bankAccountNumber" icon={CreditCard} pendingRequest={getPendingRequest("bankAccountNumber")} onRequestEdit={handleRequestEdit} />
                        {payslips.length > 0 && (
                            <>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1 pt-2">
                                    <FileText className="w-3 h-3" /> {t("profile.payHistory")}
                                </p>
                                {payslips.map((slip) => (
                                    <div key={slip.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm">
                                        <div>
                                            <p className="font-bold text-foreground text-sm">{slip.period?.name || "ไม่ระบุรอบ"}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">สุทธิ: <span className="text-emerald-500 font-black">฿{formatMoney(Number(slip.netPay))}</span></p>
                                        </div>
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                ))}
                            </>
                        )}
                    </TabsContent>

                    {/* Security */}
                    <TabsContent value="security" className="space-y-4 mt-4">
                        {/* Change Password */}
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-primary/10 rounded-xl"><Lock className="w-4 h-4 text-primary" /></div>
                                <h3 className="text-sm font-black text-foreground">เปลี่ยนรหัสผ่าน</h3>
                            </div>
                            {!showPasswordSection ? (
                                <Button variant="outline" onClick={() => setShowPasswordSection(true)} className="w-full h-11 rounded-xl font-bold justify-between">
                                    <span className="flex items-center gap-2"><Key className="w-4 h-4" /> {t("profile.changePassword")}</span>
                                    <Edit2 className="w-3.5 h-3.5 opacity-40" />
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("profile.currentPassword")}</Label>
                                        <div className="relative">
                                            <Input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-11 rounded-xl pr-10" />
                                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                                {showCurrentPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("profile.newPassword")}</Label>
                                        <div className="relative">
                                            <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11 rounded-xl pr-10" />
                                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNewPassword(!showNewPassword)}>
                                                {showNewPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("profile.confirmPassword")}</Label>
                                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 rounded-xl" />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button variant="outline" onClick={() => { setShowPasswordSection(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="flex-1 h-11 rounded-xl font-bold">{t("profile.cancel")}</Button>
                                        <Button onClick={handleChangePassword} disabled={isSaving || !currentPassword || !newPassword} className="flex-1 h-11 rounded-xl font-bold">
                                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t("profile.save")}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Change PIN */}
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-primary/10 rounded-xl"><Key className="w-4 h-4 text-primary" /></div>
                                <h3 className="text-sm font-black text-foreground">เปลี่ยน PIN</h3>
                            </div>
                            {!showPinSection ? (
                                <Button variant="outline" onClick={() => setShowPinSection(true)} className="w-full h-11 rounded-xl font-bold justify-between">
                                    <span className="flex items-center gap-2"><Key className="w-4 h-4" /> {t("profile.changePin")}</span>
                                    <Edit2 className="w-3.5 h-3.5 opacity-40" />
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("profile.newPin")}</Label>
                                        <Input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" className="h-11 rounded-xl tracking-[0.5em] text-center font-black text-lg" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("profile.confirmPin")}</Label>
                                        <Input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" className="h-11 rounded-xl tracking-[0.5em] text-center font-black text-lg" />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button variant="outline" onClick={() => { setShowPinSection(false); setNewPin(""); setConfirmPin(""); }} className="flex-1 h-11 rounded-xl font-bold">{t("profile.cancel")}</Button>
                                        <Button onClick={handleChangePin} disabled={isSaving || !newPin || !confirmPin} className="flex-1 h-11 rounded-xl font-bold">
                                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t("profile.save")}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Biometric */}
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-primary/10 rounded-xl"><Fingerprint className="w-4 h-4 text-primary" /></div>
                                <div>
                                    <h3 className="text-sm font-black text-foreground">{t("profile.biometric")}</h3>
                                    <p className="text-[11px] text-muted-foreground">{t("profile.biometricDesc")}</p>
                                </div>
                            </div>
                            <PasskeyButton />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
