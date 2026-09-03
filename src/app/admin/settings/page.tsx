"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Loader2,
    Clock,
    MapPin,
    Bell,
    Shield,
    Save,
    Building2,
    Image as ImageIcon,
    FileSignature,
} from "lucide-react";
import { toast } from "sonner";
import {
    DEFAULT_TIME_TRACK_SETTINGS,
    normalizeTimeTrackSettings,
    type TimeTrackSettings,
} from "@/lib/system-settings";
import {
    DEFAULT_PAYROLL_DOCUMENT_SETTINGS,
    hasCompletePayrollCompanyInfo,
    normalizePayrollDocumentSettings,
    type PayrollDocumentSettings,
} from "@/lib/payroll-document-settings";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const [settings, setSettings] = useState<TimeTrackSettings>(DEFAULT_TIME_TRACK_SETTINGS);
    const [documentSettings, setDocumentSettings] = useState<PayrollDocumentSettings>(
        DEFAULT_PAYROLL_DOCUMENT_SETTINGS,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const [response, documentResponse] = await Promise.all([
                fetch("/api/admin/settings"),
                fetch("/api/admin/settings/payroll-documents"),
            ]);
            if (!response.ok || !documentResponse.ok) {
                throw new Error("ไม่สามารถโหลดการตั้งค่าได้");
            }

            const [data, documentData] = await Promise.all([
                response.json(),
                documentResponse.json(),
            ]);
            setSettings(normalizeTimeTrackSettings(data.settings ?? {}));
            setDocumentSettings(normalizePayrollDocumentSettings(documentData.settings ?? {}));
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

    const updateDocumentSetting = (key: keyof PayrollDocumentSettings, value: string) => {
        setDocumentSettings((previous) => ({ ...previous, [key]: value }));
    };

    const handleLogoUpload = (file?: File) => {
        if (!file) return;
        if (!file.type.match(/^image\/(png|jpeg)$/)) {
            toast.error("รองรับไฟล์ PNG และ JPG เท่านั้น");
            return;
        }
        if (file.size > 500_000) {
            toast.error("ไฟล์โลโก้ต้องมีขนาดไม่เกิน 500 KB");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => updateDocumentSetting("logoDataUrl", String(reader.result ?? ""));
        reader.onerror = () => toast.error("อ่านไฟล์โลโก้ไม่สำเร็จ");
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const [response, documentResponse] = await Promise.all([
                fetch("/api/admin/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(settings),
                }),
                fetch("/api/admin/settings/payroll-documents", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(documentSettings),
                }),
            ]);

            if (!response.ok || !documentResponse.ok) {
                throw new Error("บันทึกไม่สำเร็จ");
            }

            const [data, documentData] = await Promise.all([
                response.json(),
                documentResponse.json(),
            ]);
            setSettings(normalizeTimeTrackSettings(data.settings ?? settings));
            setDocumentSettings(normalizePayrollDocumentSettings(documentData.settings ?? documentSettings));
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
        <div className="space-y-6 max-w-4xl font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 bg-zinc-950 text-white p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.2)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbf24]">SYSTEM CONFIGURATION</p>
                            <h1 className="text-xl sm:text-2xl font-black text-white">ตั้งค่าระบบ & เอกสาร</h1>
                            <p className="text-zinc-400 text-xs mt-0.5">ปรับเกณฑ์การลงเวลา การแจ้งเตือน และข้อมูลนิติบุคคลในเอกสารเงินเดือน</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl border border-black/30 h-10 px-5 text-xs shadow-sm self-start sm:self-auto"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-1.5" />
                        )}
                        บันทึกการตั้งค่า
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="w-5 h-5 text-indigo-500" />
                        ข้อมูลบริษัทในเอกสารเงินเดือน
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {!hasCompletePayrollCompanyInfo(documentSettings) && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                            กรุณากรอกชื่อบริษัทตามกฎหมาย ที่อยู่ และเลขประจำตัวผู้เสียภาษีให้ครบก่อนออกเอกสารจริง
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="company-display-name">ชื่อที่แสดงบนเอกสาร</Label>
                            <Input
                                id="company-display-name"
                                value={documentSettings.displayName}
                                onChange={(event) => updateDocumentSetting("displayName", event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company-legal-name">ชื่อบริษัทตามกฎหมาย</Label>
                            <Input
                                id="company-legal-name"
                                value={documentSettings.legalName}
                                onChange={(event) => updateDocumentSetting("legalName", event.target.value)}
                                placeholder="บริษัท ... จำกัด"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="company-address">ที่อยู่บริษัท</Label>
                            <Textarea
                                id="company-address"
                                rows={3}
                                value={documentSettings.address}
                                onChange={(event) => updateDocumentSetting("address", event.target.value)}
                                placeholder="ที่อยู่ที่ใช้ในเอกสารบริษัท"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company-tax-id">เลขประจำตัวผู้เสียภาษี</Label>
                            <Input
                                id="company-tax-id"
                                value={documentSettings.taxId}
                                onChange={(event) => updateDocumentSetting("taxId", event.target.value)}
                                inputMode="numeric"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company-branch">สาขา</Label>
                            <Input
                                id="company-branch"
                                value={documentSettings.branch}
                                onChange={(event) => updateDocumentSetting("branch", event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company-phone">โทรศัพท์</Label>
                            <Input
                                id="company-phone"
                                value={documentSettings.phone}
                                onChange={(event) => updateDocumentSetting("phone", event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company-email">อีเมล</Label>
                            <Input
                                id="company-email"
                                type="email"
                                value={documentSettings.email}
                                onChange={(event) => updateDocumentSetting("email", event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t pt-5 md:grid-cols-2">
                        <div className="space-y-3">
                            <Label htmlFor="company-logo" className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" /> โลโก้บริษัท
                            </Label>
                            <Input
                                id="company-logo"
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                            />
                            <p className="text-xs text-muted-foreground">PNG หรือ JPG ขนาดไม่เกิน 500 KB</p>
                            {documentSettings.logoDataUrl && (
                                <div className="flex items-center gap-3 rounded-lg border p-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={documentSettings.logoDataUrl}
                                        alt="ตัวอย่างโลโก้บริษัท"
                                        className="h-14 w-14 rounded-md object-contain"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateDocumentSetting("logoDataUrl", "")}
                                    >
                                        ลบโลโก้
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="authorized-signer" className="flex items-center gap-2">
                                    <FileSignature className="h-4 w-4" /> ชื่อผู้อนุมัติ
                                </Label>
                                <Input
                                    id="authorized-signer"
                                    value={documentSettings.authorizedSigner}
                                    onChange={(event) => updateDocumentSetting("authorizedSigner", event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="authorized-title">ตำแหน่งผู้อนุมัติ</Label>
                                <Input
                                    id="authorized-title"
                                    value={documentSettings.authorizedTitle}
                                    onChange={(event) => updateDocumentSetting("authorizedTitle", event.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="payslip-prefix">รหัสสลิป</Label>
                                    <Input
                                        id="payslip-prefix"
                                        value={documentSettings.payslipPrefix}
                                        onChange={(event) => updateDocumentSetting("payslipPrefix", event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="receipt-prefix">รหัสใบรับเงิน</Label>
                                    <Input
                                        id="receipt-prefix"
                                        value={documentSettings.receiptPrefix}
                                        onChange={(event) => updateDocumentSetting("receiptPrefix", event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
