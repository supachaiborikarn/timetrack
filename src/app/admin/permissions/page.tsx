"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Shield,
    Save,
    AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Permission {
    id: string;
    code: string;
    name: string;
    group: string;
    sortOrder: number;
}

type RolePermissions = Record<string, string[]>;

const roleLabels: Record<string, string> = {
    ADMIN: "ผู้ดูแลระบบ",
    HR: "ฝ่ายบุคคล",
    MANAGER: "ผู้จัดการ",
    CASHIER: "แคชเชียร์",
    EMPLOYEE: "พนักงาน",
};

const roleColors: Record<string, string> = {
    ADMIN: "bg-red-500",
    HR: "bg-blue-500",
    MANAGER: "bg-green-500",
    CASHIER: "bg-purple-500",
    EMPLOYEE: "bg-gray-500",
};

export default function PermissionsPage() {
    const { data: session, status } = useSession();
    const [, setPermissions] = useState<Permission[]>([]);
    const [groups, setGroups] = useState<Record<string, Permission[]>>({});
    const [rolePermissions, setRolePermissions] = useState<RolePermissions>({});
    const [roles, setRoles] = useState<string[]>([]);
    const [canManage, setCanManage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (session?.user?.id) {
            fetchPermissions();
        }
    }, [session?.user?.id]);

    const fetchPermissions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/permissions");
            if (res.ok) {
                const data = await res.json();
                setPermissions(data.permissions || []);
                setGroups(data.groups || {});
                setRolePermissions(data.rolePermissions || {});
                setRoles(data.roles || []);
                setCanManage(data.canManage || false);
            }
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePermission = (role: string, permCode: string) => {
        if (!canManage || role === "ADMIN") return;

        setRolePermissions((prev) => {
            const current = prev[role] || [];
            const updated = current.includes(permCode)
                ? current.filter((p) => p !== permCode)
                : [...current, permCode];
            return { ...prev, [role]: updated };
        });
        setHasChanges((prev) => ({ ...prev, [role]: true }));
    };

    const saveRolePermissions = async (role: string) => {
        if (!canManage || role === "ADMIN") return;

        setIsSaving(role);
        try {
            const res = await fetch("/api/admin/permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role,
                    permissions: rolePermissions[role] || [],
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "บันทึกสำเร็จ");
                setHasChanges((prev) => ({ ...prev, [role]: false }));
            } else {
                toast.error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(null);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || session.user.role !== "ADMIN") {
        redirect("/admin");
    }

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 bg-zinc-950 text-white p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.2)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbf24]">RBAC & ACCESS CONTROL</p>
                            <h1 className="text-xl sm:text-2xl font-black text-white">จัดการสิทธิ์ & บทบาทระบบ</h1>
                            <p className="text-zinc-400 text-xs mt-0.5">กำหนดเมทริกซ์สิทธิ์การเข้าถึง (Permissions Matrix) สำหรับแต่ละ Role</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning */}
            {!canManage && (
                <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                    <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        คุณไม่มีสิทธิ์แก้ไขสิทธิ์การใช้งาน (โหมดดูอย่างเดียว)
                    </p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                {roles.map((role) => (
                    <div key={role} className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-4 flex items-center gap-3 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                        <div className={`w-10 h-10 rounded-xl ${roleColors[role]}/15 border border-${roleColors[role].replace("bg-", "")}/30 flex items-center justify-center font-black`}>
                            <span className={`text-base font-black ${roleColors[role].replace("bg-", "text-")}`}>
                                {role.charAt(0)}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                                {(rolePermissions[role] || []).length}
                            </p>
                            <p className="text-[11px] font-bold text-zinc-500">{roleLabels[role]}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Permissions Matrix */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groups).map(([groupName, groupPerms]) => (
                        <Card key={groupName}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">{groupName}</CardTitle>
                                <CardDescription>
                                    {groupPerms.length} สิทธิ์
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left py-2 px-4 font-medium text-muted-foreground">
                                                    สิทธิ์
                                                </th>
                                                {roles.filter(r => r !== "EMPLOYEE").map((role) => (
                                                    <th key={role} className="text-center py-2 px-2 w-24">
                                                        <Badge className={`${roleColors[role]} text-white`}>
                                                            {role}
                                                        </Badge>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupPerms.map((perm) => (
                                                <tr key={perm.id} className="border-b border-border/50 hover:bg-muted/30">
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="font-medium">{perm.name}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                {perm.code}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    {roles.filter(r => r !== "EMPLOYEE").map((role) => {
                                                        const isChecked = role === "ADMIN" || (rolePermissions[role] || []).includes(perm.code);
                                                        const isDisabled = !canManage || role === "ADMIN";

                                                        return (
                                                            <td key={role} className="text-center py-3 px-2">
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    onCheckedChange={() => togglePermission(role, perm.code)}
                                                                    disabled={isDisabled}
                                                                    className={role === "ADMIN" ? "cursor-not-allowed opacity-50" : ""}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Save Buttons */}
                    {canManage && (
                        <div className="flex flex-wrap gap-3 justify-end">
                            {roles.filter(r => r !== "ADMIN" && r !== "EMPLOYEE").map((role) => (
                                <Button
                                    key={role}
                                    onClick={() => saveRolePermissions(role)}
                                    disabled={isSaving !== null || !hasChanges[role]}
                                    variant={hasChanges[role] ? "default" : "outline"}
                                >
                                    {isSaving === role && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <Save className="w-4 h-4 mr-2" />
                                    บันทึก {roleLabels[role]}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
