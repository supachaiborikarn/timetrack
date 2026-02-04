"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Loader2,
    User,
    Phone,
    Mail,
    Building2,
    Briefcase,
    Key,
    Lock,
    Save,
    Eye,
    EyeOff,
    Wallet,
    Shield,
    DollarSign,
    AlertTriangle,
    MapPin,
    Calendar,
    Contact,
    Check,
    X,
    Edit2,
    Clock,
    FileText,
    CreditCard,
    Fingerprint
} from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";
import { PasskeyButton } from "@/components/auth/PasskeyButton";

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
    // Wage info
    hourlyRate: number;
    dailyRate: number | null;
    baseSalary: number | null;
    // Bank info
    bankAccountNumber: string | null;
    bankName: string | null;
    // Personal info
    address: string | null;
    birthDate: string | null;
    gender: string | null;
    citizenId: string | null;
    // Emergency contact
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelation: string | null;
    // Employment info
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

// Reusable Editable Field Component
interface EditableFieldProps {
    label: string;
    value: string | null | undefined;
    fieldName: string;
    icon: any;
    isEditable?: boolean;
    pendingRequest?: EditRequest;
    onRequestEdit: (fieldName: string, newValue: string) => Promise<void>;
    placeholder?: string;
}

const EditableField = ({
    label,
    value,
    fieldName,
    icon: Icon,
    isEditable = true,
    pendingRequest,
    onRequestEdit,
    placeholder = "-"
}: EditableFieldProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || "");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setTempValue(value || "");
    }, [value]);

    const handleSave = async () => {
        if (!tempValue.trim() && !value) return; // Don't save empty if it was empty
        if (tempValue === value) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await onRequestEdit(fieldName, tempValue);
            setIsEditing(false);
        } catch (error) {
            console.error("Save failed", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col space-y-2 p-3 rounded-lg border border-orange-900/10 bg-[#1a1412] shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-orange-500/10">
                        <Icon className="w-4 h-4 text-[#F09410]" />
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 font-medium">{label}</p>
                        {!isEditing ? (
                            <p className="text-sm font-medium mt-0.5 text-[#F0D0C7]">{value || placeholder}</p>
                        ) : (
                            <div className="mt-1">
                                <Input
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    className="h-8 text-sm bg-[#2a2420] border-orange-900/30 text-[#F0D0C7] focus-visible:ring-orange-500"
                                    placeholder={placeholder}
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {isEditable && (
                    <div className="flex items-center gap-1">
                        {pendingRequest ? (
                            <div className="flex flex-col items-end">
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] whitespace-nowrap">
                                    <Clock className="w-3 h-3 mr-1" />
                                    รออนุมัติ
                                </Badge>
                                <span className="text-[10px] text-stone-500 mt-1">
                                    เป็น: {pendingRequest.newValue}
                                </span>
                            </div>
                        ) : isEditing ? (
                            <div className="flex items-center gap-1">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setTempValue(value || "");
                                    }}
                                    disabled={isSaving}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-stone-500 hover:text-[#F09410] hover:bg-orange-500/10"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [requests, setRequests] = useState<EditRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [payslips, setPayslips] = useState<any[]>([]);

    // Password change state
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // PIN change state
    const [showPinSection, setShowPinSection] = useState(false);
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");

    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/profile");
            if (res.ok) {
                const data = await res.json();
                setProfile(data.profile);
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/profile/edit-request");
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        }
    };

    const fetchPayslips = async () => {
        try {
            const res = await fetch("/api/payslip");
            if (res.ok) {
                const data = await res.json();
                setPayslips(data.payslips || []);
            }
        } catch (error) {
            console.error("Failed to fetch payslips:", error);
        }
    };

    const initialize = async () => {
        setIsLoading(true);
        await Promise.all([fetchProfile(), fetchRequests(), fetchPayslips()]);
        setIsLoading(false);
    };

    useEffect(() => {
        if (session?.user?.id) {
            initialize();
        }
    }, [session?.user?.id]);

    const handleRequestEdit = async (fieldName: string, newValue: string) => {
        try {
            const res = await fetch("/api/profile/edit-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fieldName, newValue }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "ส่งคำขอแก้ไขเรียบร้อย");
                fetchRequests(); // Refresh requests
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการส่งคำขอ");
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

    // Helper to get pending request for a field
    const getPendingRequest = (fieldName: string) => {
        return requests.find(r => r.fieldName === fieldName && r.status === "PENDING");
    };

    // Format currency
    const formatMoney = (amount: number | null | undefined) => {
        if (!amount) return "-";
        return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(amount);
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        redirect("/login");
    }

    return (

        <div className="min-h-screen bg-[#1a1412] p-4 pb-24">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header Profile */}
                <div className="text-center pt-8 pb-4">
                    <div className="relative inline-block">
                        <div className="relative w-28 h-28 mx-auto rounded-full p-[3px] bg-gradient-to-br from-[#F09410] to-[#BC430D] shadow-xl shadow-orange-900/20">
                            <div className="w-full h-full rounded-full bg-[#2a2420] flex items-center justify-center text-4xl font-bold text-[#F09410] ring-4 ring-[#1a1412]">
                                {profile?.nickName?.charAt(0) || profile?.name?.charAt(0) || "?"}
                            </div>
                        </div>
                        <div className="absolute bottom-1 right-1 p-2 bg-[#2a2420] rounded-full ring-4 ring-[#1a1412]">
                            <Edit2 className="w-4 h-4 text-[#F09410]" />
                        </div>
                    </div>

                    <div className="mt-4 space-y-1">
                        <h1 className="text-2xl font-bold text-[#F0D0C7]">
                            {profile?.nickName ? `${profile.nickName}` : profile?.name}
                        </h1>
                        <p className="text-stone-400 font-medium">{profile?.name}</p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <Badge variant="outline" className="bg-[#2a2420] text-[#F0D0C7] border-orange-900/30">{profile?.employeeId}</Badge>
                            <Badge className="bg-gradient-to-r from-[#F09410] to-[#BC430D] text-white border-0 shadow-lg shadow-orange-900/20">{roleLabels[profile?.role || "EMPLOYEE"]}</Badge>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 p-1 bg-[#2a2420] border border-orange-900/20 rounded-xl">
                        <TabsTrigger value="personal" className="text-xs px-1 data-[state=active]:bg-[#F09410] data-[state=active]:text-white text-stone-400">ข้อมูล</TabsTrigger>
                        <TabsTrigger value="contact" className="text-xs px-1 data-[state=active]:bg-[#F09410] data-[state=active]:text-white text-stone-400">ติดต่อ</TabsTrigger>
                        <TabsTrigger value="financial" className="text-xs px-1 data-[state=active]:bg-[#F09410] data-[state=active]:text-white text-stone-400">การเงิน</TabsTrigger>
                        <TabsTrigger value="social" className="text-xs px-1 data-[state=active]:bg-[#F09410] data-[state=active]:text-white text-stone-400">ประกัน</TabsTrigger>
                        <TabsTrigger value="security" className="text-xs px-1 data-[state=active]:bg-[#F09410] data-[state=active]:text-white text-stone-400">รหัส</TabsTrigger>
                    </TabsList>

                    {/* Personal Info */}
                    <TabsContent value="personal" className="space-y-4 mt-4 animate-in fade-in-50 slide-in-from-bottom-2">
                        <Card className="border-orange-900/20 bg-[#2a2420] shadow-xl shadow-black/10">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-[#F0D0C7]">
                                    <User className="w-5 h-5 text-[#F09410]" />
                                    ข้อมูลทั่วไป
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <EditableField
                                    label="ชื่อเล่น"
                                    value={profile?.nickName}
                                    fieldName="nickName"
                                    icon={User}
                                    pendingRequest={getPendingRequest("nickName")}
                                    onRequestEdit={handleRequestEdit}
                                />
                                <div className="p-3 rounded-lg border border-orange-900/10 bg-[#1a1412]">
                                    <div className="flex items-center gap-3">
                                        <Building2 className="w-5 h-5 text-stone-500" />
                                        <div>
                                            <p className="text-xs text-stone-500">สถานี</p>
                                            <p className="font-medium text-[#F0D0C7]">{profile?.station?.name || "-"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg border border-orange-900/10 bg-[#1a1412]">
                                    <div className="flex items-center gap-3">
                                        <Briefcase className="w-5 h-5 text-stone-500" />
                                        <div>
                                            <p className="text-xs text-stone-500">แผนก</p>
                                            <p className="font-medium text-[#F0D0C7]">{profile?.department?.name || "-"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg border border-orange-900/10 bg-[#1a1412]">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-stone-500" />
                                        <div>
                                            <p className="text-xs text-stone-500">เลขบัตรประชาชน</p>
                                            <p className="font-medium text-[#F0D0C7]">{profile?.citizenId || "-"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg border border-orange-900/10 bg-[#1a1412]">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-stone-500" />
                                        <div>
                                            <p className="text-xs text-stone-500">วันเกิด</p>
                                            <p className="font-medium text-[#F0D0C7]">
                                                {profile?.birthDate ? formatThaiDate(new Date(profile.birthDate), "d MMMM yyyy") : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg border border-orange-900/10 bg-[#1a1412]">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-stone-500" />
                                        <div>
                                            <p className="text-xs text-stone-500">วันที่เริ่มงาน</p>
                                            <p className="font-medium text-[#F0D0C7]">
                                                {profile?.startDate ? formatThaiDate(new Date(profile.startDate), "d MMMM yyyy") : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Contact Info */}
                    <TabsContent value="contact" className="space-y-4 mt-4 animate-in fade-in-50 slide-in-from-bottom-2">
                        <Card className="border-orange-900/20 bg-[#2a2420] shadow-xl shadow-black/10">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-[#F0D0C7]">
                                    <Contact className="w-5 h-5 text-[#F09410]" />
                                    การติดต่อ
                                </CardTitle>
                                <CardDescription className="text-stone-500">แก้ไขได้โดยการส่งคำขอ</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <EditableField
                                    label="เบอร์โทรศัพท์"
                                    value={profile?.phone}
                                    fieldName="phone"
                                    icon={Phone}
                                    pendingRequest={getPendingRequest("phone")}
                                    onRequestEdit={handleRequestEdit}
                                />
                                <EditableField
                                    label="อีเมล"
                                    value={profile?.email}
                                    fieldName="email"
                                    icon={Mail}
                                    pendingRequest={getPendingRequest("email")}
                                    onRequestEdit={handleRequestEdit}
                                />
                                <EditableField
                                    label="ที่อยู่"
                                    value={profile?.address}
                                    fieldName="address"
                                    icon={MapPin}
                                    pendingRequest={getPendingRequest("address")}
                                    onRequestEdit={handleRequestEdit}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Financial Info */}
                    <TabsContent value="financial" className="space-y-4 mt-4 animate-in fade-in-50 slide-in-from-bottom-2">
                        <Card className="border-orange-900/20 bg-[#2a2420] shadow-xl shadow-black/10">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-[#F0D0C7]">
                                    <DollarSign className="w-5 h-5 text-[#F09410]" />
                                    ข้อมูลการเงิน
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {profile?.dailyRate && Number(profile.dailyRate) > 0 && (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/30">
                                        <span className="text-emerald-400/80 text-sm">ค่าแรงรายวัน</span>
                                        <span className="font-bold text-emerald-400">฿{formatMoney(Number(profile.dailyRate))}</span>
                                    </div>
                                )}
                                {profile?.baseSalary && Number(profile.baseSalary) > 0 && (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-950/30 border border-blue-900/30">
                                        <span className="text-blue-400/80 text-sm">เงินเดือน</span>
                                        <span className="font-bold text-blue-400">฿{formatMoney(Number(profile.baseSalary))}</span>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-orange-900/20">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#F0D0C7]">
                                        <Wallet className="w-4 h-4 text-[#F09410]" /> บัญชีธนาคาร
                                    </h3>
                                    <div className="space-y-3">
                                        <EditableField
                                            label="ชื่อธนาคาร"
                                            value={profile?.bankName}
                                            fieldName="bankName"
                                            icon={Building2}
                                            pendingRequest={getPendingRequest("bankName")}
                                            onRequestEdit={handleRequestEdit}
                                        />
                                        <EditableField
                                            label="เลขบัญชี"
                                            value={profile?.bankAccountNumber}
                                            fieldName="bankAccountNumber"
                                            icon={CreditCard}
                                            pendingRequest={getPendingRequest("bankAccountNumber")}
                                            onRequestEdit={handleRequestEdit}
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-orange-900/20">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#F0D0C7]">
                                        <FileText className="w-4 h-4 text-[#F09410]" /> ประวัติเงินเดือน
                                    </h3>
                                    {payslips.length > 0 ? (
                                        <div className="space-y-3">
                                            {payslips.map((slip) => (
                                                <div key={slip.id} className="flex items-center justify-between p-3 rounded-lg border border-orange-900/10 bg-[#1a1412]">
                                                    <div>
                                                        <p className="font-medium text-[#F0D0C7]">{slip.period?.name || "ไม่ระบุรอบ"}</p>
                                                        <p className="text-xs text-stone-500">
                                                            สุทธิ: <span className="text-emerald-400 font-bold">฿{formatMoney(Number(slip.netPay))}</span>
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled
                                                        className="h-8 text-xs text-stone-500 border-stone-800 bg-stone-900/50"
                                                    >
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        PDF เร็วๆ นี้
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-orange-900/20 rounded-lg bg-[#1a1412]">
                                            ยังไม่มีประวัติเงินเดือน
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Social Security & Emergency */}
                    <TabsContent value="social" className="space-y-4 mt-4 animate-in fade-in-50 slide-in-from-bottom-2">
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-indigo-600" />
                                    ผู้ติดต่อฉุกเฉิน
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <EditableField
                                    label="ชื่อผู้ติดต่อ"
                                    value={profile?.emergencyContactName}
                                    fieldName="emergencyContactName"
                                    icon={User}
                                    pendingRequest={getPendingRequest("emergencyContactName")}
                                    onRequestEdit={handleRequestEdit}
                                />
                                <EditableField
                                    label="ความสัมพันธ์"
                                    value={profile?.emergencyContactRelation}
                                    fieldName="emergencyContactRelation"
                                    icon={Contact}
                                    pendingRequest={getPendingRequest("emergencyContactRelation")}
                                    onRequestEdit={handleRequestEdit}
                                />
                                <EditableField
                                    label="เบอร์โทรศัพท์"
                                    value={profile?.emergencyContactPhone}
                                    fieldName="emergencyContactPhone"
                                    icon={Phone}
                                    pendingRequest={getPendingRequest("emergencyContactPhone")}
                                    onRequestEdit={handleRequestEdit}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Security */}
                    <TabsContent value="security" className="space-y-4 mt-4 animate-in fade-in-50 slide-in-from-bottom-2">
                        {/* Change Password */}
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-indigo-600" />
                                    รหัสผ่านเข้าสู่ระบบ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!showPasswordSection ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowPasswordSection(true)}
                                        className="w-full justify-between"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Key className="w-4 h-4" />
                                            เปลี่ยนรหัสผ่าน
                                        </span>
                                        <Edit2 className="w-3 h-3 opacity-50" />
                                    </Button>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 p-4 bg-slate-50 rounded-lg border">
                                        <div className="space-y-2">
                                            <Label>รหัสผ่านปัจจุบัน</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                >
                                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>รหัสผ่านใหม่</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                >
                                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>ยืนยันรหัสผ่านใหม่</Label>
                                            <Input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowPasswordSection(false);
                                                    setCurrentPassword("");
                                                    setNewPassword("");
                                                    setConfirmPassword("");
                                                }}
                                                className="flex-1"
                                            >
                                                ยกเลิก
                                            </Button>
                                            <Button
                                                onClick={handleChangePassword}
                                                disabled={isSaving || !currentPassword || !newPassword}
                                                className="flex-1"
                                            >
                                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                บันทึก
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Biometric Auth */}
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Fingerprint className="w-5 h-5 text-indigo-600" />
                                    Biometric Authentication
                                </CardTitle>
                                <CardDescription>เข้าสู่ระบบด้วย Face ID / Touch ID</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PasskeyButton />
                            </CardContent>
                        </Card>

                        {/* Change PIN */}
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Key className="w-5 h-5 text-indigo-600" />
                                    PIN (สำหรับลงเวลา)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!showPinSection ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowPinSection(true)}
                                        className="w-full justify-between"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Key className="w-4 h-4" />
                                            เปลี่ยน PIN
                                        </span>
                                        <Edit2 className="w-3 h-3 opacity-50" />
                                    </Button>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 p-4 bg-slate-50 rounded-lg border">
                                        <div className="space-y-2">
                                            <Label>PIN ใหม่ (4-6 หลัก)</Label>
                                            <Input
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={newPin}
                                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                                                placeholder="••••"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>ยืนยัน PIN ใหม่</Label>
                                            <Input
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={confirmPin}
                                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                                                placeholder="••••"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowPinSection(false);
                                                    setNewPin("");
                                                    setConfirmPin("");
                                                }}
                                                className="flex-1"
                                            >
                                                ยกเลิก
                                            </Button>
                                            <Button
                                                onClick={handleChangePin}
                                                disabled={isSaving || !newPin}
                                                className="flex-1"
                                            >
                                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                บันทึก
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
}
