"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Smartphone, Mail, Loader2 } from "lucide-react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"pin" | "email">("pin");

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
                setError("ข้อมูลไม่ถูกต้อง หากชื่อซ้ำ กรุณาใช้เบอร์โทรหรือ username แทน");
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
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex bg-gray-50 p-1.5 mx-5 mt-5 rounded-2xl">
                <button
                    onClick={() => { setActiveTab("pin"); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === "pin"
                            ? "bg-[#fbbf24] text-black shadow-md shadow-yellow-500/20"
                            : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                    <Smartphone className="w-4 h-4" />
                    พนักงาน
                </button>
                <button
                    onClick={() => { setActiveTab("email"); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === "email"
                            ? "bg-[#fbbf24] text-black shadow-md shadow-yellow-500/20"
                            : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                    <Mail className="w-4 h-4" />
                    ผู้จัดการ
                </button>
            </div>

            <div className="px-5 pb-6 pt-4">
                {/* PIN Login */}
                {activeTab === "pin" && (
                    <form onSubmit={handlePinLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                                เบอร์โทรศัพท์ หรือ ชื่อพนักงาน
                            </Label>
                            <Input
                                id="phone"
                                type="text"
                                placeholder="0812345678 หรือ สมชาย"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="bg-gray-50 border-gray-200 text-black placeholder:text-gray-300 text-base h-14 rounded-2xl px-4 focus-visible:ring-[#fbbf24] focus-visible:border-[#fbbf24]"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="pin" className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                                PIN 6 หลัก
                            </Label>
                            <Input
                                id="pin"
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                placeholder="••••••"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                className="bg-gray-50 border-gray-200 text-black placeholder:text-gray-300 text-2xl h-14 rounded-2xl tracking-[0.3em] text-center font-bold focus-visible:ring-[#fbbf24] focus-visible:border-[#fbbf24] pb-1"
                                required
                            />
                        </div>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                                <p className="text-red-500 text-sm font-medium">{error}</p>
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black h-14 text-lg font-black rounded-2xl shadow-lg shadow-yellow-500/20 transition-transform active:scale-[0.98] mt-1"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : "เข้าสู่ระบบ"}
                        </Button>
                    </form>
                )}

                {/* Email Login */}
                {activeTab === "email" && (
                    <form onSubmit={handleEmailLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                                อีเมล หรือ ชื่อผู้ใช้
                            </Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="admin@example.com หรือ สมชาย"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-gray-50 border-gray-200 text-black placeholder:text-gray-300 text-base h-14 rounded-2xl px-4 focus-visible:ring-[#fbbf24] focus-visible:border-[#fbbf24]"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">
                                รหัสผ่าน
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-gray-50 border-gray-200 text-black placeholder:text-gray-300 text-base h-14 rounded-2xl px-4 focus-visible:ring-[#fbbf24] focus-visible:border-[#fbbf24]"
                                required
                            />
                        </div>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                                <p className="text-red-500 text-sm font-medium">{error}</p>
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black h-14 text-lg font-black rounded-2xl shadow-lg shadow-yellow-500/20 transition-transform active:scale-[0.98] mt-1"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : "เข้าสู่ระบบ"}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}

function LoginFallback() {
    return (
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="py-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#fbbf24]" />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
             style={{ background: "linear-gradient(180deg, #fbbf24 0%, #fbbf24 35%, #f8f9fa 35%, #f8f9fa 100%)" }}
        >
            {/* Yellow top pattern decoration */}
            <div className="absolute top-0 left-0 right-0 h-[40%] overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10" />
                <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 100 20" className="w-full block" preserveAspectRatio="none" style={{ height: '40px' }}>
                        <path d="M0,0 Q50,25 100,0 Z" fill="#f8f9fa" />
                    </svg>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-md flex flex-col items-center">
                {/* Logo & Title */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-black/5 blur-xl rounded-full scale-150" />
                        <div className="w-20 h-20 rounded-[24px] bg-black flex items-center justify-center shadow-xl shadow-black/20 relative border-4 border-white/30">
                            <Clock className="w-10 h-10 text-[#fbbf24]" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-black tracking-tight">TimeTrack</h1>
                        <p className="font-bold text-black/50 tracking-wide uppercase text-sm mt-0.5">Supachai Group</p>
                    </div>
                </div>

                <Suspense fallback={<LoginFallback />}>
                    <LoginForm />
                </Suspense>

                <p className="mt-8 text-sm font-bold text-gray-400">
                    © 2026 Supachai Group
                </p>
            </div>
        </div>
    );
}
