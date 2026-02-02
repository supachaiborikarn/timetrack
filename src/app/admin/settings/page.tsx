"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Loader2,
    Settings,
    Clock,
    MapPin,
    Bell,
    Shield,
    Save,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const [isSaving, setIsSaving] = useState(false);

    // Settings state
    const [settings, setSettings] = useState({
        // Attendance
        lateThresholdMinutes: 15,
        earlyCheckInMinutes: 30,
        autoCheckOutHours: 12,

        // GPS
        geoFenceEnabled: true,
        geoFenceRadius: 100,

        // Notifications
        enablePushNotifications: true,
        enableEmailNotifications: false,
        notifyManagerOnLate: true,

        // Security
        requirePhotoOnCheckIn: false,
        require2FA: false,
    });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // TODO: Implement settings API
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("บันทึกการตั้งค่าแล้ว");
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !["ADMIN"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">ตั้งค่า</h1>
                    <p className="text-muted-foreground">ตั้งค่าระบบ TimeTrack</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    บันทึก
                </Button>
            </div>

            {/* Attendance Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-blue-500" />
                        การลงเวลา
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>ถือว่าสายหลัง (นาที)</Label>
                            <Input
                                type="number"
                                value={settings.lateThresholdMinutes}
                                onChange={(e) =>
                                    setSettings({ ...settings, lateThresholdMinutes: parseInt(e.target.value) || 0 })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>เข้างานก่อนได้ (นาที)</Label>
                            <Input
                                type="number"
                                value={settings.earlyCheckInMinutes}
                                onChange={(e) =>
                                    setSettings({ ...settings, earlyCheckInMinutes: parseInt(e.target.value) || 0 })
                                }
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Auto Check-out หลัง (ชั่วโมง)</Label>
                        <Input
                            type="number"
                            value={settings.autoCheckOutHours}
                            onChange={(e) =>
                                setSettings({ ...settings, autoCheckOutHours: parseInt(e.target.value) || 0 })
                            }
                            className="max-w-[200px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            ถ้าพนักงานลืม check-out ระบบจะ check-out อัตโนมัติ
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* GPS Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="w-5 h-5 text-green-500" />
                        ตำแหน่ง GPS
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">เปิดใช้ Geo-fence</p>
                            <p className="text-sm text-muted-foreground">
                                ต้องอยู่ในรัศมีที่กำหนดถึงจะลงเวลาได้
                            </p>
                        </div>
                        <Switch
                            checked={settings.geoFenceEnabled}
                            onCheckedChange={(checked) => setSettings({ ...settings, geoFenceEnabled: checked })}
                        />
                    </div>
                    {settings.geoFenceEnabled && (
                        <div className="space-y-2">
                            <Label>รัศมี (เมตร)</Label>
                            <Input
                                type="number"
                                value={settings.geoFenceRadius}
                                onChange={(e) =>
                                    setSettings({ ...settings, geoFenceRadius: parseInt(e.target.value) || 0 })
                                }
                                className="max-w-[200px]"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bell className="w-5 h-5 text-amber-500" />
                        การแจ้งเตือน
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">แจ้งเตือนผ่านแอป</p>
                        </div>
                        <Switch
                            checked={settings.enablePushNotifications}
                            onCheckedChange={(checked) =>
                                setSettings({ ...settings, enablePushNotifications: checked })
                            }
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-muted-foreground">แจ้งเตือนทางอีเมล</p>
                        </div>
                        <Switch
                            checked={settings.enableEmailNotifications}
                            onCheckedChange={(checked) =>
                                setSettings({ ...settings, enableEmailNotifications: checked })
                            }
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">แจ้งหัวหน้าเมื่อพนักงานมาสาย</p>
                            <p className="text-sm text-muted-foreground">ส่งแจ้งเตือนให้ผู้จัดการ</p>
                        </div>
                        <Switch
                            checked={settings.notifyManagerOnLate}
                            onCheckedChange={(checked) => setSettings({ ...settings, notifyManagerOnLate: checked })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="w-5 h-5 text-red-500" />
                        ความปลอดภัย
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">ถ่ายรูปเมื่อลงเวลา</p>
                            <p className="text-sm text-muted-foreground">บันทึกภาพเพื่อยืนยันตัวตน</p>
                        </div>
                        <Switch
                            checked={settings.requirePhotoOnCheckIn}
                            onCheckedChange={(checked) =>
                                setSettings({ ...settings, requirePhotoOnCheckIn: checked })
                            }
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">บังคับใช้ 2FA สำหรับ Admin</p>
                        </div>
                        <Switch
                            checked={settings.require2FA}
                            onCheckedChange={(checked) => setSettings({ ...settings, require2FA: checked })}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
