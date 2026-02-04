"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

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
    workHours: null;
    // Bank info
    bankAccountNumber: string | null;
    bankName: string | null;
    // Social security

    createdAt: string;
}

const roleLabels: Record<string, string> = {
    ADMIN: "ผู้ดูแลระบบ",
    HR: "ฝ่ายบุคคล",
    MANAGER: "ผู้จัดการ",
    CASHIER: "เสมียน",
    EMPLOYEE: "พนักงาน",
};

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // Password change
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // PIN change
    const [showPinSection, setShowPinSection] = useState(false);
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");

    useEffect(() => {
        if (session?.user?.id) {
            fetchProfile();
        }
    }, [session?.user?.id]);

    const fetchProfile = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/profile");
            if (res.ok) {
                const data = await res.json();
                setProfile(data.profile);
                setPhone(data.profile.phone || "");
                setEmail(data.profile.email || "");
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveBasicInfo = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, email }),
            });

            if (res.ok) {
                toast.success("บันทึกข้อมูลเรียบร้อย");
                fetchProfile();
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

    // Format currency
    const formatMoney = (amount: number | null | undefined) => {
        if (!amount) return "-";
        return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 pb-24">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <div className="text-center pt-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                        {profile?.nickName?.charAt(0) || profile?.name?.charAt(0) || "?"}
                    </div>
                    <h1 className="text-xl font-bold text-foreground mt-4">
                        {profile?.nickName ? `${profile.nickName}` : profile?.name}
                    </h1>
                    <p className="text-muted-foreground text-sm">{profile?.employeeId}</p>
                    <Badge className="mt-2 text-xs">{roleLabels[profile?.role || "EMPLOYEE"]}</Badge>

                </div>

                {/* Tabs */}
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="personal" className="text-xs px-2">
                            <User className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">ส่วนตัว</span>
                        </TabsTrigger>
                        <TabsTrigger value="financial" className="text-xs px-2">
                            <Wallet className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">การเงิน</span>
                        </TabsTrigger>
                        <TabsTrigger value="social" className="text-xs px-2">
                            <Shield className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">ประกัน</span>
                        </TabsTrigger>
                        <TabsTrigger value="security" className="text-xs px-2">
                            <Lock className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">รหัส</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Personal Info */}
                    <TabsContent value="personal" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    ข้อมูลส่วนตัว
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {profile?.station && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <Building2 className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">สถานี</p>
                                            <p className="font-medium">{profile.station.name}</p>
                                        </div>
                                    </div>
                                )}

                                {profile?.department && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <Briefcase className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">แผนก</p>
                                            <p className="font-medium">{profile.department.name}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Contact Info - Editable */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Phone className="w-5 h-5" />
                                    ข้อมูลติดต่อ
                                </CardTitle>
                                <CardDescription>แก้ไขได้</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        เบอร์โทร
                                    </Label>
                                    <Input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="08X-XXX-XXXX"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        Email
                                    </Label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="example@email.com"
                                    />
                                </div>

                                <Button
                                    onClick={handleSaveBasicInfo}
                                    disabled={isSaving}
                                    className="w-full"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    บันทึกข้อมูลติดต่อ
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 2: Financial Info */}
                    <TabsContent value="financial" className="space-y-4 mt-4">
                        {/* Wage Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    ข้อมูลค่าแรง
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {profile?.dailyRate && Number(profile.dailyRate) > 0 ? (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                                        <span className="text-muted-foreground">ค่าแรงรายวัน</span>
                                        <span className="font-bold text-green-600">฿{formatMoney(Number(profile.dailyRate))}</span>
                                    </div>
                                ) : profile?.baseSalary && Number(profile.baseSalary) > 0 ? (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                                        <span className="text-muted-foreground">เงินเดือน</span>
                                        <span className="font-bold text-blue-600">฿{formatMoney(Number(profile.baseSalary))}</span>
                                    </div>
                                ) : null}



                            </CardContent>
                        </Card>

                        {/* Bank Account */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Wallet className="w-5 h-5" />
                                    บัญชีธนาคาร
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {profile?.bankAccountNumber ? (
                                    <>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <span className="text-muted-foreground">ธนาคาร</span>
                                            <span className="font-medium">{profile.bankName || "-"}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <span className="text-muted-foreground">เลขบัญชี</span>
                                            <span className="font-medium font-mono">{profile.bankAccountNumber}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>ยังไม่มีข้อมูลบัญชีธนาคาร</p>
                                        <p className="text-xs">กรุณาติดต่อ HR เพื่อเพิ่มข้อมูล</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 3: Social Security */}
                    <TabsContent value="social" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    ประกันสังคม
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-center py-4 text-muted-foreground">
                                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>ยังไม่มีข้อมูลประกันสังคม</p>
                                    <p className="text-xs">กรุณาติดต่อ HR เพื่อเพิ่มข้อมูล</p>
                                </div>


                            </CardContent>
                        </Card>

                        {/* Emergency Contact - Placeholder */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Phone className="w-5 h-5" />
                                    ผู้ติดต่อฉุกเฉิน
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-4 text-muted-foreground">
                                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>ยังไม่มีข้อมูลผู้ติดต่อฉุกเฉิน</p>
                                    <p className="text-xs">กรุณาติดต่อ HR เพื่อเพิ่มข้อมูล</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 4: Security (Password & PIN) */}
                    <TabsContent value="security" className="space-y-4 mt-4">
                        {/* Change Password */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Lock className="w-5 h-5" />
                                    เปลี่ยนรหัสผ่าน
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!showPasswordSection ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowPasswordSection(true)}
                                        className="w-full"
                                    >
                                        <Key className="w-4 h-4 mr-2" />
                                        เปลี่ยนรหัสผ่าน
                                    </Button>
                                ) : (
                                    <div className="space-y-4">
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

                        {/* Change PIN */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Key className="w-5 h-5" />
                                    เปลี่ยน PIN
                                </CardTitle>
                                <CardDescription>PIN สำหรับลงเวลาผ่าน QR</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!showPinSection ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowPinSection(true)}
                                        className="w-full"
                                    >
                                        <Key className="w-4 h-4 mr-2" />
                                        เปลี่ยน PIN
                                    </Button>
                                ) : (
                                    <div className="space-y-4">
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
