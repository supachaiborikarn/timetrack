"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Contact,
  CreditCard,
  DollarSign,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  House,
  Key,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  User,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";
import { PasskeyButton } from "@/components/auth/PasskeyButton";
import { AssetPhotoField } from "@/components/media/asset-fields";
import { useLanguage } from "@/lib/language-context";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";

interface Profile {
  id: string;
  employeeId: string;
  name: string;
  nickName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  photoUrl: string | null;
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
  housingStatus: "UNKNOWN" | "COMPANY_DORM" | "OWN_HOUSING";
  housingUpdatedAt: string | null;
  dormitory: Dormitory | null;
  createdAt: string;
}

interface Dormitory {
  id: string;
  name: string;
  isActive: boolean;
  station: { id: string; name: string; code: string } | null;
}

interface EditRequest {
  id: string;
  fieldName: string;
  fieldLabel: string;
  newValue: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface ProfilePayslip {
  id: string;
  netPay: number;
  period?: { name?: string | null } | null;
}

type ProfileSection = "personal" | "contact" | "housing" | "financial" | "security";

const roleLabels: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  HR: "ฝ่ายบุคคล",
  MANAGER: "ผู้จัดการ",
  CASHIER: "เสมียน",
  EMPLOYEE: "พนักงาน",
};

function maskSensitiveValue(value: string | null | undefined) {
  if (!value) return "-";
  const compact = value.replace(/\s/g, "");
  if (compact.length <= 4) return "••••";
  return `${"•".repeat(Math.min(10, Math.max(4, compact.length - 4)))}${compact.slice(-4)}`;
}

interface EditableFieldProps {
  label: string;
  value: string | null | undefined;
  fieldName: string;
  icon: LucideIcon;
  pendingRequest?: EditRequest;
  onRequestEdit: (fieldName: string, newValue: string) => Promise<void>;
  placeholder?: string;
  mask?: boolean;
}

const EditableField = ({
  label,
  value,
  fieldName,
  icon: Icon,
  pendingRequest,
  onRequestEdit,
  placeholder = "-",
  mask = false,
}: EditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTempValue(value || "");
  }, [value]);

  const handleSave = async () => {
    if (tempValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onRequestEdit(fieldName, tempValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const displayValue = value
    ? mask && !isRevealed
      ? maskSensitiveValue(value)
      : value
    : placeholder;

  return (
    <div className="tt-paper-card rounded-[16px] border border-zinc-700/30 p-3.5 dark:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-zinc-700/25 bg-[#f4e5c8] dark:bg-zinc-800">
            <Icon className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            {!isEditing ? (
              <p className="mt-1 break-words text-[13px] font-black text-zinc-900 dark:text-zinc-100">{displayValue}</p>
            ) : (
              <Input
                value={tempValue}
                onChange={(event) => setTempValue(event.target.value)}
                className="mt-1 h-10 rounded-xl bg-white/70 text-sm dark:bg-zinc-900"
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {pendingRequest ? (
            <Badge className="border border-amber-700/20 bg-amber-100 text-[9px] font-black text-amber-800 dark:bg-amber-950/35 dark:text-amber-300">
              <Clock className="mr-1 h-3 w-3" /> รออนุมัติ
            </Badge>
          ) : isEditing ? (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-500"
                onClick={() => {
                  setIsEditing(false);
                  setTempValue(value || "");
                }}
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              {mask && value && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  onClick={() => setIsRevealed((current) => !current)}
                  aria-label={isRevealed ? "ซ่อนข้อมูล" : "แสดงข้อมูล"}
                >
                  {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                onClick={() => setIsEditing(true)}
                aria-label={`แก้ไข${label}`}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function ReadOnlyField({
  label,
  value,
  icon: Icon,
  mask = false,
}: {
  label: string;
  value: string | null | undefined;
  icon: LucideIcon;
  mask?: boolean;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const displayValue = value ? (mask && !isRevealed ? maskSensitiveValue(value) : value) : "-";

  return (
    <div className="tt-paper-card flex items-center gap-3 rounded-[16px] border border-zinc-700/30 p-3.5 dark:border-white/15">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-zinc-700/25 bg-[#f4e5c8] dark:bg-zinc-800">
        <Icon className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</p>
        <p className="mt-1 break-words text-[13px] font-black">{displayValue}</p>
      </div>
      {mask && value && (
        <button
          type="button"
          onClick={() => setIsRevealed((current) => !current)}
          className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-200"
          aria-label={isRevealed ? "ซ่อนข้อมูล" : "แสดงข้อมูล"}
        >
          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [payslips, setPayslips] = useState<ProfilePayslip[]>([]);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [housingSelection, setHousingSelection] = useState("");
  const [isSavingHousing, setIsSavingHousing] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection | null>(null);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showPinSection, setShowPinSection] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setDormitories(data.dormitories || []);
      setHousingSelection(
        data.profile.housingStatus === "COMPANY_DORM" && data.profile.dormitory?.id
          ? `dorm:${data.profile.dormitory.id}`
          : data.profile.housingStatus === "OWN_HOUSING"
            ? "OWN_HOUSING"
            : "",
      );
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/profile/edit-request");
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests || []);
    }
  }, []);

  const fetchPayslips = useCallback(async () => {
    const res = await fetch("/api/payslip");
    if (res.ok) {
      const data = await res.json();
      setPayslips(data.payslips || []);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      setIsLoading(true);
      Promise.all([fetchProfile(), fetchRequests(), fetchPayslips()]).finally(() => setIsLoading(false));
    }
  }, [fetchPayslips, fetchProfile, fetchRequests, session?.user?.id]);

  useEffect(() => {
    const handleHousingUpdated = () => {
      void fetchProfile();
    };
    window.addEventListener("timetrack:housing-updated", handleHousingUpdated);
    return () => window.removeEventListener("timetrack:housing-updated", handleHousingUpdated);
  }, [fetchProfile]);

  const handlePhotoUploaded = () => {
    void fetchProfile();
    toast.success("อัปเดตรูปโปรไฟล์แล้ว");
  };

  const handlePhotoRemoved = async () => {
    if (!profile?.id) return;
    const res = await fetch(`/api/employees/${profile.id}/photo`, { method: "DELETE" });
    if (res.ok) {
      toast.success("ลบรูปโปรไฟล์แล้ว");
      void fetchProfile();
    } else {
      toast.error("ลบรูปไม่สำเร็จ");
    }
  };

  const handleRequestEdit = async (fieldName: string, newValue: string) => {
    const res = await fetch("/api/profile/edit-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldName, newValue }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(data.message || "ส่งคำขอแก้ไขเรียบร้อย");
      void fetchRequests();
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success("เปลี่ยนรหัสผ่านเรียบร้อย");
        setShowPasswordSection(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin !== confirmPin) {
      toast.error("PIN ไม่ตรงกัน");
      return;
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      toast.error("PIN ต้องเป็นตัวเลข 4-6 หลัก");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin }),
      });
      if (res.ok) {
        toast.success("เปลี่ยน PIN เรียบร้อย");
        setShowPinSection(false);
        setNewPin("");
        setConfirmPin("");
      } else {
        const data = await res.json();
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveHousing = async () => {
    if (!housingSelection) {
      toast.error("กรุณาเลือกที่พักปัจจุบัน");
      return;
    }

    const isDormitory = housingSelection.startsWith("dorm:");
    setIsSavingHousing(true);
    try {
      const res = await fetch("/api/profile/housing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          housingStatus: isDormitory ? "COMPANY_DORM" : "OWN_HOUSING",
          dormitoryId: isDormitory ? housingSelection.slice(5) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "บันทึกข้อมูลที่พักไม่สำเร็จ");
        return;
      }
      toast.success(data.message || "บันทึกข้อมูลที่พักแล้ว");
      await fetchProfile();
    } catch {
      toast.error("บันทึกข้อมูลที่พักไม่สำเร็จ");
    } finally {
      setIsSavingHousing(false);
    }
  };

  const getPendingRequest = (fieldName: string) =>
    requests.find((request) => request.fieldName === fieldName && request.status === "PENDING");

  const formatMoney = (amount: number) => new Intl.NumberFormat("th-TH").format(amount);
  const pendingCount = requests.filter((request) => request.status === "PENDING").length;
  const tenureMonths = profile?.startDate
    ? Math.max(0, Math.floor((Date.now() - new Date(profile.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : null;
  const housingLabel = profile?.housingStatus === "COMPANY_DORM"
    ? profile.dormitory?.name || "หอพักบริษัท"
    : profile?.housingStatus === "OWN_HOUSING"
      ? "ที่พักของตัวเอง"
      : "ยังไม่ระบุ";

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#fbbf24]" />
      </div>
    );
  }

  if (!session) redirect("/login");

  const menuItems: Array<{
    key: ProfileSection;
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    summary: string;
  }> = [
    { key: "personal", eyebrow: "PERSONAL", title: "ข้อมูลส่วนตัว", description: "ข้อมูลพนักงานและวันเริ่มงาน", icon: User, summary: profile?.department?.name || "ข้อมูลพนักงาน" },
    { key: "contact", eyebrow: "CONTACT", title: "ช่องทางติดต่อ", description: "โทรศัพท์ ที่อยู่ และผู้ติดต่อฉุกเฉิน", icon: Phone, summary: profile?.phone || "ยังไม่ระบุเบอร์" },
    { key: "housing", eyebrow: "HOUSING", title: "ที่พักของฉัน", description: "ใช้ตรวจสิทธิ์ค่าที่พัก", icon: House, summary: housingLabel },
    { key: "financial", eyebrow: "PAY & BANK", title: "การเงินและบัญชี", description: "ค่าจ้าง บัญชีธนาคาร และสลิป", icon: Wallet, summary: profile?.bankName || "ข้อมูลการเงิน" },
    { key: "security", eyebrow: "SECURITY", title: "ความปลอดภัย", description: "รหัสผ่าน PIN และ Passkey", icon: ShieldCheck, summary: "จัดการการเข้าใช้งาน" },
  ];

  const sectionTitle = menuItems.find((item) => item.key === activeSection);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eee8db] pb-28 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <EmployeePageHeader eyebrow="EMPLOYEE PROFILE" title="โปรไฟล์ส่วนตัว" subtitle="ข้อมูลพนักงานและการตั้งค่า" />

      <main className="mx-auto max-w-[470px] space-y-3 px-3 pb-8 pt-3">
        <section className="tt-retro-enter overflow-hidden rounded-[20px] border-2 border-zinc-800/80 bg-zinc-950 text-white shadow-[0_4px_0_rgba(0,0,0,0.16)] dark:border-white/20">
          <div className="px-4 pb-4 pt-3.5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] font-black tracking-[0.2em] text-[#fbbf24]">EMPLOYEE PASS</p>
              <span className={`rounded-full border px-2 py-1 font-mono text-[8px] font-black tracking-[0.1em] ${profile?.employeeStatus === "ACTIVE" ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-400" : "border-zinc-500/40 bg-zinc-800 text-zinc-300"}`}>
                ● {profile?.employeeStatus || "UNKNOWN"}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="rounded-[18px] border border-white/20 bg-white/5 p-1">
                <AssetPhotoField
                  photoUrl={profile?.photoUrl ?? null}
                  onUploaded={handlePhotoUploaded}
                  onRemoved={handlePhotoRemoved}
                  fallback={<User className="h-9 w-9 text-[#fbbf24] opacity-80" />}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[21px] font-black tracking-[-0.04em]">{profile?.name || "-"}</h2>
                {profile?.nickName && <p className="mt-0.5 text-[11px] font-bold text-zinc-400">ชื่อเล่น {profile.nickName}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[9px] font-black text-amber-300">
                    {roleLabels[profile?.role || ""] || profile?.role || "-"}
                  </span>
                  {profile?.station && (
                    <span className="max-w-[180px] truncate rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-black text-zinc-300">
                      {profile.station.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-3">
              <div className="px-2 text-center">
                <p className="truncate text-[11px] font-black text-white">{profile?.department?.name || "-"}</p>
                <p className="mt-1 font-mono text-[7px] font-black tracking-[0.12em] text-zinc-500">DEPARTMENT</p>
              </div>
              <div className="px-2 text-center">
                <p className="text-[11px] font-black text-white">{tenureMonths !== null ? `${tenureMonths} เดือน` : "-"}</p>
                <p className="mt-1 font-mono text-[7px] font-black tracking-[0.12em] text-zinc-500">TENURE</p>
              </div>
              <div className="px-2 text-center">
                <p className="font-mono text-[11px] font-black text-[#fbbf24]">{profile?.employeeId || "-"}</p>
                <p className="mt-1 font-mono text-[7px] font-black tracking-[0.12em] text-zinc-500">EMPLOYEE ID</p>
              </div>
            </div>
          </div>
          <div className="h-2 bg-[#fbbf24]" />
        </section>

        <section className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => pendingCount > 0 && setActiveSection("personal")}
            className="tt-retro-control tt-paper-card min-h-[78px] rounded-[16px] border border-zinc-700/30 p-2.5 text-left dark:border-white/15"
          >
            <BadgeCheck className={`h-4 w-4 ${pendingCount > 0 ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-400"}`} />
            <p className="mt-2 text-[13px] font-black">{pendingCount}</p>
            <p className="text-[8px] font-black text-zinc-500">คำขอรออนุมัติ</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("housing")}
            className="tt-retro-control tt-paper-card min-h-[78px] rounded-[16px] border border-zinc-700/30 p-2.5 text-left dark:border-white/15"
          >
            <House className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
            <p className="mt-2 truncate text-[11px] font-black">{housingLabel}</p>
            <p className="text-[8px] font-black text-zinc-500">ที่พักปัจจุบัน</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("security")}
            className="tt-retro-control tt-paper-card min-h-[78px] rounded-[16px] border border-zinc-700/30 p-2.5 text-left dark:border-white/15"
          >
            <ShieldCheck className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
            <p className="mt-2 text-[11px] font-black">PIN / Passkey</p>
            <p className="text-[8px] font-black text-zinc-500">ความปลอดภัย</p>
          </button>
        </section>

        {!activeSection ? (
          <>
            <div className="px-1 pt-1">
              <p className="font-mono text-[9px] font-black tracking-[0.18em] text-zinc-500">SELF SERVICE</p>
              <h2 className="text-[15px] font-black">จัดการข้อมูลของฉัน</h2>
            </div>

            <section className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveSection(item.key)}
                    className="tt-retro-control tt-paper-card tt-instrument-frame flex w-full items-center gap-3 rounded-[18px] border border-zinc-700/35 px-3.5 py-3.5 text-left dark:border-white/15"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-700/30 bg-[#fbbf24]/20">
                      <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[7px] font-black tracking-[0.16em] text-zinc-500">{item.eyebrow}</p>
                      <p className="mt-0.5 text-[13px] font-black">{item.title}</p>
                      <p className="mt-0.5 truncate text-[9px] font-bold text-zinc-500">{item.description} · {item.summary}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
                  </button>
                );
              })}

              <Link
                href="/profile/documents"
                className="tt-retro-control tt-paper-card tt-instrument-frame flex w-full items-center gap-3 rounded-[18px] border border-zinc-700/35 px-3.5 py-3.5 text-left dark:border-white/15"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-700/30 bg-[#fbbf24]/20">
                  <ReceiptText className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[7px] font-black tracking-[0.16em] text-zinc-500">DOCUMENTS</p>
                  <p className="mt-0.5 text-[13px] font-black">เอกสารพนักงาน</p>
                  <p className="mt-0.5 text-[9px] font-bold text-zinc-500">เอกสารและข้อมูลที่เกี่ยวข้องกับการทำงาน</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
              </Link>
            </section>
          </>
        ) : (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="tt-retro-control flex items-center gap-1.5 px-1 py-1 text-[11px] font-black text-zinc-600 dark:text-zinc-300"
            >
              <span className="text-lg leading-none">‹</span> กลับเมนูโปรไฟล์
            </button>

            <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/35 px-4 py-3 dark:border-white/15">
              <p className="font-mono text-[8px] font-black tracking-[0.18em] text-zinc-500">{sectionTitle?.eyebrow}</p>
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-black">{sectionTitle?.title}</h2>
                {activeSection === "personal" && pendingCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[8px] font-black text-amber-800 dark:bg-amber-950/35 dark:text-amber-300">{pendingCount} คำขอรออนุมัติ</span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] font-bold text-zinc-500">{sectionTitle?.description}</p>
            </div>

            {activeSection === "personal" && (
              <div className="space-y-2.5">
                <EditableField label={t("profile.nickname")} value={profile?.nickName} fieldName="nickName" icon={User} pendingRequest={getPendingRequest("nickName")} onRequestEdit={handleRequestEdit} />
                <ReadOnlyField label={t("profile.station")} value={profile?.station?.name} icon={Building2} />
                <ReadOnlyField label={t("profile.department")} value={profile?.department?.name} icon={Briefcase} />
                <ReadOnlyField label={t("profile.citizenId")} value={profile?.citizenId} icon={FileText} mask />
                <ReadOnlyField label={t("profile.birthDate")} value={profile?.birthDate ? formatThaiDate(new Date(profile.birthDate), "d MMMM yyyy") : null} icon={Calendar} />
                <ReadOnlyField label={t("profile.startDate")} value={profile?.startDate ? formatThaiDate(new Date(profile.startDate), "d MMMM yyyy") : null} icon={Clock} />
              </div>
            )}

            {activeSection === "contact" && (
              <div className="space-y-2.5">
                <EditableField label={t("profile.phone")} value={profile?.phone} fieldName="phone" icon={Phone} pendingRequest={getPendingRequest("phone")} onRequestEdit={handleRequestEdit} />
                <EditableField label={t("profile.email")} value={profile?.email} fieldName="email" icon={Mail} pendingRequest={getPendingRequest("email")} onRequestEdit={handleRequestEdit} />
                <EditableField label={t("profile.address")} value={profile?.address} fieldName="address" icon={MapPin} pendingRequest={getPendingRequest("address")} onRequestEdit={handleRequestEdit} />

                <div className="px-1 pt-2">
                  <p className="font-mono text-[8px] font-black tracking-[0.16em] text-zinc-500">EMERGENCY CONTACT</p>
                  <p className="text-[12px] font-black">ผู้ติดต่อฉุกเฉิน</p>
                </div>
                <EditableField label={t("profile.emergencyName")} value={profile?.emergencyContactName} fieldName="emergencyContactName" icon={User} pendingRequest={getPendingRequest("emergencyContactName")} onRequestEdit={handleRequestEdit} />
                <EditableField label={t("profile.emergencyRelation")} value={profile?.emergencyContactRelation} fieldName="emergencyContactRelation" icon={Contact} pendingRequest={getPendingRequest("emergencyContactRelation")} onRequestEdit={handleRequestEdit} />
                <EditableField label={t("profile.emergencyPhone")} value={profile?.emergencyContactPhone} fieldName="emergencyContactPhone" icon={Phone} pendingRequest={getPendingRequest("emergencyContactPhone")} onRequestEdit={handleRequestEdit} />
              </div>
            )}

            {activeSection === "housing" && (
              <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/35 p-4 dark:border-white/15">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-700/30 bg-[#fbbf24]/20">
                    <House className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-black">ที่พักปัจจุบัน</p>
                    <p className="mt-0.5 text-[10px] font-bold text-zinc-500">เลือกปั๊มที่พักอยู่ หรือเลือกที่พักของตัวเอง</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <Select value={housingSelection} onValueChange={setHousingSelection}>
                    <SelectTrigger className="h-11 w-full rounded-xl bg-white/65 dark:bg-zinc-900">
                      <SelectValue placeholder="เลือกที่พักปัจจุบัน" />
                    </SelectTrigger>
                    <SelectContent>
                      {dormitories.map((dormitory) => (
                        <SelectItem key={dormitory.id} value={`dorm:${dormitory.id}`} disabled={!dormitory.isActive}>
                          {dormitory.station?.name ? `${dormitory.station.name} — ${dormitory.name}` : dormitory.name}
                          {!dormitory.isActive ? " (ปิดใช้งาน)" : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="OWN_HOUSING">พักบ้านหรือห้องเช่าของตัวเอง</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={() => void handleSaveHousing()} disabled={isSavingHousing || !housingSelection} className="h-11 w-full rounded-xl bg-[#fbbf24] font-black text-black hover:bg-[#f2b613]">
                    {isSavingHousing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    บันทึกข้อมูลที่พัก
                  </Button>
                  <p className="text-center text-[9px] font-bold text-zinc-500">ข้อมูลนี้ใช้ตรวจสิทธิ์ค่าที่พัก กรุณาเลือกตามที่พักปัจจุบัน</p>
                </div>
              </div>
            )}

            {activeSection === "financial" && (
              <div className="space-y-2.5">
                {(profile?.dailyRate && Number(profile.dailyRate) > 0) || (profile?.baseSalary && Number(profile.baseSalary) > 0) ? (
                  <div className="grid grid-cols-2 gap-2">
                    {profile?.dailyRate && Number(profile.dailyRate) > 0 && (
                      <div className="rounded-[16px] border border-emerald-700/20 bg-emerald-100/70 p-3 dark:bg-emerald-950/30">
                        <DollarSign className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        <p className="mt-2 text-[9px] font-black text-emerald-800 dark:text-emerald-300">{t("profile.dailyWage")}</p>
                        <p className="mt-0.5 text-[19px] font-black text-emerald-700 dark:text-emerald-400">฿{formatMoney(Number(profile.dailyRate))}</p>
                      </div>
                    )}
                    {profile?.baseSalary && Number(profile.baseSalary) > 0 && (
                      <div className="rounded-[16px] border border-blue-700/20 bg-blue-100/70 p-3 dark:bg-blue-950/30">
                        <Banknote className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                        <p className="mt-2 text-[9px] font-black text-blue-800 dark:text-blue-300">{t("profile.salary")}</p>
                        <p className="mt-0.5 text-[19px] font-black text-blue-700 dark:text-blue-400">฿{formatMoney(Number(profile.baseSalary))}</p>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="px-1 pt-2">
                  <p className="font-mono text-[8px] font-black tracking-[0.16em] text-zinc-500">BANK ACCOUNT</p>
                  <p className="text-[12px] font-black">บัญชีรับเงิน</p>
                </div>
                <EditableField label={t("profile.bankName")} value={profile?.bankName} fieldName="bankName" icon={Building2} pendingRequest={getPendingRequest("bankName")} onRequestEdit={handleRequestEdit} />
                <EditableField label={t("profile.accountNumber")} value={profile?.bankAccountNumber} fieldName="bankAccountNumber" icon={CreditCard} pendingRequest={getPendingRequest("bankAccountNumber")} onRequestEdit={handleRequestEdit} mask />

                {payslips.length > 0 && (
                  <>
                    <div className="px-1 pt-2">
                      <p className="font-mono text-[8px] font-black tracking-[0.16em] text-zinc-500">PAY HISTORY</p>
                      <p className="text-[12px] font-black">ประวัติเงินเดือน</p>
                    </div>
                    {payslips.map((slip) => (
                      <div key={slip.id} className="tt-paper-card flex items-center justify-between rounded-[16px] border border-zinc-700/30 p-3.5 dark:border-white/15">
                        <div>
                          <p className="text-[12px] font-black">{slip.period?.name || "ไม่ระบุรอบ"}</p>
                          <p className="mt-0.5 text-[10px] font-bold text-zinc-500">สุทธิ <span className="font-black text-emerald-600 dark:text-emerald-400">฿{formatMoney(Number(slip.netPay))}</span></p>
                        </div>
                        <FileText className="h-4 w-4 text-zinc-400" />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {activeSection === "security" && (
              <div className="space-y-2.5">
                <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/35 p-4 dark:border-white/15">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-700/30 bg-[#fbbf24]/20"><Lock className="h-4 w-4" /></div>
                    <div>
                      <p className="text-[13px] font-black">เปลี่ยนรหัสผ่าน</p>
                      <p className="text-[9px] font-bold text-zinc-500">ใช้สำหรับเข้าสู่ระบบด้วยรหัสผ่าน</p>
                    </div>
                  </div>

                  {!showPasswordSection ? (
                    <Button variant="outline" onClick={() => setShowPasswordSection(true)} className="mt-3 h-11 w-full justify-between rounded-xl bg-white/50 font-black dark:bg-zinc-900">
                      <span className="flex items-center gap-2"><Key className="h-4 w-4" /> {t("profile.changePassword")}</span>
                      <Edit2 className="h-3.5 w-3.5 opacity-40" />
                    </Button>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-wide text-zinc-500">{t("profile.currentPassword")}</Label>
                        <div className="relative">
                          <Input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-11 rounded-xl pr-10" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowCurrentPassword((value) => !value)}>
                            {showCurrentPassword ? <EyeOff className="h-4 w-4 text-zinc-400" /> : <Eye className="h-4 w-4 text-zinc-400" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-wide text-zinc-500">{t("profile.newPassword")}</Label>
                        <div className="relative">
                          <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-11 rounded-xl pr-10" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNewPassword((value) => !value)}>
                            {showNewPassword ? <EyeOff className="h-4 w-4 text-zinc-400" /> : <Eye className="h-4 w-4 text-zinc-400" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-wide text-zinc-500">{t("profile.confirmPassword")}</Label>
                        <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 rounded-xl" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setShowPasswordSection(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="h-11 flex-1 rounded-xl font-black">{t("profile.cancel")}</Button>
                        <Button onClick={() => void handleChangePassword()} disabled={isSaving || !currentPassword || !newPassword} className="h-11 flex-1 rounded-xl bg-[#fbbf24] font-black text-black hover:bg-[#f2b613]">
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("profile.save")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/35 p-4 dark:border-white/15">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-700/30 bg-[#fbbf24]/20"><Key className="h-4 w-4" /></div>
                    <div>
                      <p className="text-[13px] font-black">เปลี่ยน PIN</p>
                      <p className="text-[9px] font-bold text-zinc-500">PIN ตัวเลข 4–6 หลัก</p>
                    </div>
                  </div>

                  {!showPinSection ? (
                    <Button variant="outline" onClick={() => setShowPinSection(true)} className="mt-3 h-11 w-full justify-between rounded-xl bg-white/50 font-black dark:bg-zinc-900">
                      <span className="flex items-center gap-2"><Key className="h-4 w-4" /> {t("profile.changePin")}</span>
                      <Edit2 className="h-3.5 w-3.5 opacity-40" />
                    </Button>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-wide text-zinc-500">{t("profile.newPin")}</Label>
                        <Input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))} placeholder="••••" className="h-11 rounded-xl text-center text-lg font-black tracking-[0.5em]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-wide text-zinc-500">{t("profile.confirmPin")}</Label>
                        <Input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} placeholder="••••" className="h-11 rounded-xl text-center text-lg font-black tracking-[0.5em]" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setShowPinSection(false); setNewPin(""); setConfirmPin(""); }} className="h-11 flex-1 rounded-xl font-black">{t("profile.cancel")}</Button>
                        <Button onClick={() => void handleChangePin()} disabled={isSaving || !newPin || !confirmPin} className="h-11 flex-1 rounded-xl bg-[#fbbf24] font-black text-black hover:bg-[#f2b613]">
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("profile.save")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="tt-paper-card tt-instrument-frame rounded-[18px] border border-zinc-700/35 p-4 dark:border-white/15">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-700/30 bg-[#fbbf24]/20"><Fingerprint className="h-4 w-4" /></div>
                    <div>
                      <p className="text-[13px] font-black">{t("profile.biometric")}</p>
                      <p className="text-[9px] font-bold text-zinc-500">{t("profile.biometricDesc")}</p>
                    </div>
                  </div>
                  <div className="mt-3"><PasskeyButton /></div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
