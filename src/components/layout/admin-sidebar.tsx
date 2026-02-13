"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
    LayoutDashboard,
    Users,
    Clock,
    Calendar,
    FileText,
    Settings,
    QrCode,
    ClipboardCheck,
    CalendarDays,
    Shuffle,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Building2,
    Wallet,
    Bell,
    Shield,
    FolderKanban,
    Banknote,
    TrendingUp,
} from "lucide-react";

interface NavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    roles?: string[];
    requiredPermissions?: string[];
}

const navItems: NavItem[] = [
    {
        title: "แดชบอร์ด",
        href: "/admin",
        icon: LayoutDashboard,
    },
    {
        title: "จัดการพนักงาน",
        href: "/admin/employees",
        icon: Users,
        roles: ["ADMIN", "HR"],
    },
    {
        title: "สถานี",
        href: "/admin/stations",
        icon: Building2,
        roles: ["ADMIN", "HR"],
    },
    {
        title: "แผนก",
        href: "/admin/departments",
        icon: FolderKanban,
        roles: ["ADMIN", "HR"],
    },
    {
        title: "ลงเวลาทำงาน",
        href: "/admin/attendance",
        icon: Clock,
        roles: ["ADMIN", "HR", "MANAGER", "CASHIER"],
    },
    {
        title: "ตารางกะ",
        href: "/admin/shifts",
        icon: Calendar,
        roles: ["ADMIN", "HR", "MANAGER", "CASHIER"],
        requiredPermissions: ["shift.view", "shift.edit"],
    },
    {
        title: "ประเภทกะ",
        href: "/admin/shift-types",
        icon: Clock,
        roles: ["ADMIN", "HR"],
    },
    {
        title: "อนุมัติคำขอ",
        href: "/admin/approvals",
        icon: ClipboardCheck,
    },
    {
        title: "Shift Pool",
        href: "/admin/shift-pool",
        icon: Shuffle,
    },
    {
        title: "Availability",
        href: "/admin/availability",
        icon: CalendarDays,
    },
    {
        title: "เงินเดือน",
        href: "/admin/payroll",
        icon: Wallet,
        roles: ["ADMIN", "HR"],
    },
    {
        title: "รายได้พิเศษ",
        href: "/admin/special-income",
        icon: TrendingUp,
        roles: ["ADMIN", "HR", "MANAGER"],
    },
    {
        title: "เบิกค่าแรง",
        href: "/admin/advances",
        icon: Banknote,
        roles: ["ADMIN", "HR", "MANAGER", "CASHIER"],
    },
    {
        title: "รายงาน",
        href: "/admin/reports",
        icon: FileText,
        roles: ["ADMIN", "HR", "MANAGER"],
    },
    {
        title: "QR Codes",
        href: "/admin/qr-codes",
        icon: QrCode,
        roles: ["ADMIN", "HR"],
    },
    {
        title: "ตั้งค่า",
        href: "/admin/settings",
        icon: Settings,
        roles: ["ADMIN"],
    },
    {
        title: "จัดการสิทธิ์",
        href: "/admin/permissions",
        icon: Shield,
        roles: ["ADMIN"],
    },
    {
        title: "Audit Log",
        href: "/admin/audit-logs",
        icon: FileText,
        roles: ["ADMIN"],
    },
];

interface AdminSidebarProps {
    pendingCount?: number;
    userPermissions?: string[];
}

export function AdminSidebar({ pendingCount = 0, userPermissions = [] }: AdminSidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const userRole = session?.user?.role || "EMPLOYEE";

    // Filter nav items based on roles OR permissions
    const filteredNavItems = navItems.filter((item) => {
        // If no roles specified, check permissions
        if (!item.roles) {
            // For items without role restriction, check if user has any required permission
            if (item.requiredPermissions) {
                return item.requiredPermissions.some((perm: string) => userPermissions.includes(perm));
            }
            // Items available to all (like dashboard)
            return true;
        }
        // User has the required role
        if (item.roles.includes(userRole)) {
            return true;
        }
        // User doesn't have role but may have permission
        if (item.requiredPermissions) {
            return item.requiredPermissions.some((perm: string) => userPermissions.includes(perm));
        }
        return false;
    });

    const NavContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-5 border-b border-border",
                isCollapsed && "justify-center px-2"
            )}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <span className="font-bold text-foreground">TimeTrack</span>
                        <span className="text-xs text-muted-foreground">Admin Panel</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2">
                <ul className="space-y-1">
                    {filteredNavItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== "/admin" && pathname.startsWith(item.href));
                        const Icon = item.icon;
                        const showBadge = item.href === "/admin/approvals" && pendingCount > 0;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        isActive && "bg-primary/10 text-primary font-medium",
                                        isCollapsed && "justify-center px-2"
                                    )}
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1">{item.title}</span>
                                            {showBadge && (
                                                <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                                                    {pendingCount}
                                                </Badge>
                                            )}
                                        </>
                                    )}
                                    {isCollapsed && showBadge && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Section */}
            <div className={cn(
                "border-t border-border p-4",
                isCollapsed && "p-2"
            )}>
                {!isCollapsed && session?.user && (
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                                {session.user.name?.charAt(0) || "U"}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {session.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{userRole}</p>
                        </div>
                        <ThemeToggle />
                    </div>
                )}

                <div className={cn("flex gap-2", isCollapsed && "flex-col items-center")}>
                    {isCollapsed && <ThemeToggle />}
                    <Button
                        variant="ghost"
                        size={isCollapsed ? "icon" : "sm"}
                        className={cn(
                            "text-muted-foreground hover:text-foreground",
                            !isCollapsed && "w-full justify-start"
                        )}
                        onClick={() => signOut({ callbackUrl: "/" })}
                    >
                        <LogOut className="w-4 h-4" />
                        {!isCollapsed && <span className="ml-2">ออกจากระบบ</span>}
                    </Button>
                </div>
            </div>

            {/* Collapse Toggle - Desktop only */}
            <div className="hidden lg:block border-t border-border p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-muted-foreground"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            <span>ย่อเมนู</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-foreground">TimeTrack</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        {pendingCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </Button>
                    <ThemeToggle />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                    >
                        {isMobileOpen ? (
                            <X className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={cn(
                    "lg:hidden fixed top-14 right-0 bottom-0 z-40 w-72 bg-background border-l border-border transform transition-transform duration-200",
                    isMobileOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <NavContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-background border-r border-border transition-all duration-200",
                    isCollapsed ? "w-16" : "w-64"
                )}
            >
                <NavContent />
            </aside>
        </>
    );
}
