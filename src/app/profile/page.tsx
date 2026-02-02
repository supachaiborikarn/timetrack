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
} from "lucide-react";
import { toast } from "sonner";

interface Profile {
    id: string;
    employeeId: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    station: { id: string; name: string; code: string } | null;
    department: { id: string; name: string; code: string } | null;
    avatar: string | null;
    createdAt: string;
}

const roleLabels: Record<string, string> = {
    ADMIN: "ผู้ดูแลระบบ",
    HR: "ฝ่ายบุคคล",
    MANAGER: "ผู้จัดการ",
    CASHIER: "แคชเชียร์",
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

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "บันทึกสำเร็จ");
            } else {
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
            toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
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

            const data = await res.json();

            if (res.ok) {
                toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowPasswordSection(false);
            } else {
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
            toast.error("PIN ใหม่ไม่ตรงกัน");
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

            const data = await res.json();

            if (res.ok) {
                toast.success("เปลี่ยน PIN สำเร็จ");
                setNewPin("");
                setConfirmPin("");
                setShowPinSection(false);
            } else {
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 pb-24">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <div className="text-center pt-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                        {profile?.name?.charAt(0) || "?"}
                    </div>
                    <h1 className="text-xl font-bold text-foreground mt-4">{profile?.name}</h1>
                    <p className="text-muted-foreground text-sm">{profile?.employeeId}</p>
                    <Badge className="mt-2">{roleLabels[profile?.role || "EMPLOYEE"]}</Badge>
                </div>

                {/* Basic Info */}
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
            </div>
        </div>
    );
}
