"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Smartphone, Mail, Loader2 } from "lucide-react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // PIN login state
    const [phone, setPhone] = useState("");
    const [pin, setPin] = useState("");

    // Email login state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handlePinLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn("pin", {
                phone,
                pin,
                redirect: false,
            });

            if (result?.error) {
                setError("เบอร์โทรหรือ PIN ไม่ถูกต้อง");
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn("password", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("อีเมล, ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง");
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-xl text-white">เข้าสู่ระบบ</CardTitle>
                <CardDescription className="text-slate-400">
                    ลงเวลาเข้างาน–ออกงาน
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
                        <TabsTrigger value="pin" className="flex items-center gap-2 data-[state=active]:bg-blue-600">
                            <Smartphone className="w-4 h-4" />
                            พนักงาน
                        </TabsTrigger>
                        <TabsTrigger value="email" className="flex items-center gap-2 data-[state=active]:bg-blue-600">
                            <Mail className="w-4 h-4" />
                            ผู้จัดการ
                        </TabsTrigger>
                    </TabsList>

                    {/* PIN Login */}
                    <TabsContent value="pin">
                        <form onSubmit={handlePinLogin} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-slate-300">เบอร์โทรศัพท์</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="0812345678"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 text-lg"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pin" className="text-slate-300">PIN 6 หลัก</Label>
                                <Input
                                    id="pin"
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    placeholder="••••••"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 text-lg tracking-widest text-center"
                                    required
                                />
                            </div>
                            {error && (
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12 text-lg"
                                disabled={isLoading}
                            >
                                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                            </Button>
                        </form>
                    </TabsContent>

                    {/* Email Login */}
                    <TabsContent value="email">
                        <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">อีเมล หรือ ชื่อผู้ใช้</Label>
                                <Input
                                    id="email"
                                    type="text"
                                    placeholder="admin@example.com หรือ สมชาย"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">รหัสผ่าน</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                    required
                                />
                            </div>
                            {error && (
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12"
                                disabled={isLoading}
                            >
                                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function LoginFallback() {
    return (
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">TimeTrack</h1>
                    <p className="text-sm text-slate-400">Supachai Group</p>
                </div>
            </div>

            <Suspense fallback={<LoginFallback />}>
                <LoginForm />
            </Suspense>

            <p className="mt-6 text-sm text-slate-500">
                © 2026 Supachai Group. All rights reserved.
            </p>
        </div>
    );
}
