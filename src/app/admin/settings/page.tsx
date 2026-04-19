"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Loader2,
    Clock,
    MapPin,
    Bell,
    Shield,
    Save,
} from "lucide-react";
import { toast } from "sonner";
import {
    DEFAULT_TIME_TRACK_SETTINGS,
    normalizeTimeTrackSettings,
    type TimeTrackSettings,
} from "@/lib/system-settings";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const [settings, setSettings] = useState<TimeTrackSettings>(DEFAULT_TIME_TRACK_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/admin/settings");
            if (!response.ok) {
                throw new Error("ไม่สามารถโหลดการตั้งค่าได้");
            }

            const data = await response.json();
            setSettings(normalizeTimeTrackSettings(data.settings ?? {}));
        } catch (error) {
            console.error("Failed to load settings:", error);
            toast.error("โหลดการตั้งค่าไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.id && session.user.role === "ADMIN") {
            void loadSettings();
        }
    }, [loadSettings, session?.user?.id, session?.user?.role]);

    const updateNumberSetting = (key: keyof TimeTrackSettings, value: string) => {
        setSettings((previous) => normalizeTimeTrackSettings({
            ...previous,
            [key]: Number(value),
        }));
    };

    const updateBooleanSetting = (key: keyof TimeTrackSettings, value: boolean) => {
        setSettings((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            if (!response.ok) {
                throw new Error("บันทึกไม่สำเร็จ");
            }

            const data = await response.json();
            setSettings(normalizeTimeTrackSettings(data.settings ?? settings));
            toast.success("บันทึกการตั้งค่าแล้ว");
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("เกิดข้อผิดพลาดขณะบันทึก");
        } finally {
            setIsSaving(false);
        }
    };

    if (status === "loading" || (session?.user?.role === "ADMIN" && isLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || session.user.role !== "ADMIN") {
        redirect("/");
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">ตั้งค่า</h1>
                    <p className="text-muted-foreground">ปรับเกณฑ์การลงเวลา การแจ้งเตือน และความปลอดภัยของระบบ</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving || isLoading}>
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    บันทึก
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-blue-500" />
                        การลงเวลา
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="late-threshold">ถือว่าสายหลัง (นาที)</Label>
                        <Input
                            id="late-threshold"
                            type="number"
                            min={0}
                            value={settings.lateThresholdMinutes}
                            onChange={(event) => updateNumberSetting("lateThresholdMinutes", event.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="early-check-in">เข้างานก่อนได้ (นาที)</Label>
                        <Input
                            id="early-check-in"
                            type="number"
                            min={0}
                            value={settings.earlyCheckInMinutes}
                            onChange={(event) => updateNumberSetting("earlyCheckInMinutes", event.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="auto-check-out">Auto check-out หลังทำงานเกิน (ชั่วโมง)</Label>
                        <Input
                            id="auto-check-out"
                            type="number"
                            min={1}
                            value={settings.autoCheckOutHours}
                            onChange={(event) => updateNumberSetting("autoCheckOutHours", event.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="w-5 h-5 text-emerald-500" />
                        GPS และพื้นที่ลงเวลา
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium">เปิดใช้ Geo Fence</p>
                            <p className="text-sm text-muted-foreground">บังคับตรวจสอบตำแหน่งก่อนเช็คอินและเช็คเอาต์</p>
                        </div>
                        <Switch
                            checked={settings.geoFenceEnabled}
                            onCheckedChange={(checked) => updateBooleanSetting("geoFenceEnabled", checked)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="geo-radius">รัศมีตรวจสอบ (เมตร)</Label>
                        <Input
                            id="geo-radius"
                            type="number"
                            min={0}
                            value={settings.geoFenceRadius}
                            onChange={(event) => updateNumberSetting("geoFenceRadius", event.target.value)}
                            disabled={!settings.geoFenceEnabled}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bell className="w-5 h-5 text-amber-500" />
                        การแจ้งเตือน
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">ส่งแจ้งเตือนผ่านแอป</p>
                        </div>
                        <Switch
                            checked={settings.enablePushNotifications}
                            onCheckedChange={(checked) => updateBooleanSetting("enablePushNotifications", checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-muted-foreground">ส่งแจ้งเตือนผ่านอีเมล</p>
                        </div>
                        <Switch
                            checked={settings.enableEmailNotifications}
                            onCheckedChange={(checked) => updateBooleanSetting("enableEmailNotifications", checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium">แจ้งหัวหน้าเมื่อพนักงานมาสาย</p>
                            <p className="text-sm text-muted-foreground">ใช้กับ flow monitor/notification ภายในระบบ</p>
                        </div>
                        <Switch
                            checked={settings.notifyManagerOnLate}
                            onCheckedChange={(checked) => updateBooleanSetting("notifyManagerOnLate", checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="w-5 h-5 text-red-500" />
                        ความปลอดภัย
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium">ถ่ายรูปเมื่อลงเวลา</p>
                            <p className="text-sm text-muted-foreground">เก็บค่าไว้พร้อมสำหรับ flow ยืนยันตัวตน</p>
                        </div>
                        <Switch
                            checked={settings.requirePhotoOnCheckIn}
                            onCheckedChange={(checked) => updateBooleanSetting("requirePhotoOnCheckIn", checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">ใช้กับการบังคับ 2FA สำหรับผู้ดูแลระบบ</p>
                        </div>
                        <Switch
                            checked={settings.require2FA}
                            onCheckedChange={(checked) => updateBooleanSetting("require2FA", checked)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
