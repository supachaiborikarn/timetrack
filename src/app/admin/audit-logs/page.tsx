"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Loader2,
    Search,
    RefreshCw,
    FileText,
    ChevronLeft,
    ChevronRight,
    Eye,
    Shield,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, getBangkokNow } from "@/lib/date-utils";

interface AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    details: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string;
        nickName: string | null;
        employeeId: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface Filters {
    actions: string[];
    entities: string[];
    users: { id: string; name: string; employeeId: string }[];
}

export default function AuditLogsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState<Filters>({
        actions: [],
        entities: [],
        users: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    // Filter states
    const [startDate, setStartDate] = useState(
        format(subDays(getBangkokNow(), 7), "yyyy-MM-dd")
    );
    const [endDate, setEndDate] = useState(
        format(getBangkokNow(), "yyyy-MM-dd")
    );
    const [actionFilter, setActionFilter] = useState("all");
    const [entityFilter, setEntityFilter] = useState("all");
    const [userFilter, setUserFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Dialog state
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                startDate,
                endDate,
                action: actionFilter,
                entity: entityFilter,
                userId: userFilter,
            });

            const res = await fetch(`/api/admin/audit-logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setPagination(data.pagination);
                setFilters(data.filters);
            }
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
            toast.error("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, startDate, endDate, actionFilter, entityFilter, userFilter]);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.role === "ADMIN") {
            fetchLogs();
        } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
            router.push("/admin");
        }
    }, [status, session, fetchLogs, router]);

    const getActionBadge = (action: string) => {
        const styles: Record<string, string> = {
            CREATE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            LOGIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            EXPORT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[action] || "bg-gray-100 text-gray-700"}`}>
                {action}
            </span>
        );
    };

    const getEntityLabel = (entity: string) => {
        const labels: Record<string, string> = {
            Attendance: "ลงเวลา",
            DailyPayrollOverride: "ค่าแรงรายวัน",
            User: "พนักงาน",
            Shift: "กะการทำงาน",
            Leave: "การลา",
            Station: "สถานี",
            Department: "แผนก",
        };
        return labels[entity] || entity;
    };

    const filteredLogs = logs.filter((log) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            log.user.name.toLowerCase().includes(search) ||
            log.user.employeeId.toLowerCase().includes(search) ||
            log.entity.toLowerCase().includes(search) ||
            log.action.toLowerCase().includes(search) ||
            JSON.stringify(log.details).toLowerCase().includes(search)
        );
    });

    const handleViewDetail = (log: AuditLog) => {
        setSelectedLog(log);
        setIsDetailOpen(true);
    };

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.06)] text-zinc-950 dark:text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">COMPLIANCE & SYSTEM AUDIT</p>
                            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">ประวัติการแก้ไขข้อมูล (Audit Log)</h1>
                            <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5">บันทึกกิจกรรมการสร้าง, แก้ไข, ลบ และการกระทำสำคัญในระบบทั้งหมด</p>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={fetchLogs}
                        disabled={isLoading}
                        className="tt-retro-control bg-zinc-900/5 hover:bg-zinc-900/10 text-zinc-900 border-zinc-700/20 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20 rounded-xl font-bold h-10 transition-all text-xs self-start sm:self-auto"
                    >
                        <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                        รีเฟรช
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="tt-paper-card tt-instrument-frame rounded-2xl border border-zinc-700/30 dark:border-white/15 p-5 space-y-4 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b border-zinc-700/20 dark:border-white/10">
                    <Search className="w-4 h-4 text-[#fbbf24]" />
                    ค้นหาและกรองประวัติ
                </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">วันที่เริ่มต้น</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">วันที่สิ้นสุด</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">ประเภทการกระทำ</label>
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="ทั้งหมด" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทั้งหมด</SelectItem>
                                    {filters.actions.map((action) => (
                                        <SelectItem key={action} value={action}>
                                            {action}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">ข้อมูล</label>
                            <Select value={entityFilter} onValueChange={setEntityFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="ทั้งหมด" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทั้งหมด</SelectItem>
                                    {filters.entities.map((entity) => (
                                        <SelectItem key={entity} value={entity}>
                                            {getEntityLabel(entity)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">ผู้ดำเนินการ</label>
                            <Select value={userFilter} onValueChange={setUserFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="ทั้งหมด" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทั้งหมด</SelectItem>
                                    {filters.users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name} ({user.employeeId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 lg:col-span-2">
                            <label className="text-sm font-medium">ค้นหา</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="ค้นหาชื่อ, รหัส, รายละเอียด..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={fetchLogs} className="w-full">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                โหลดใหม่
                            </Button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            รายการ ({pagination.total} รายการ)
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>ไม่พบ Audit Log</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>วันที่/เวลา</TableHead>
                                        <TableHead>ผู้ดำเนินการ</TableHead>
                                        <TableHead>การกระทำ</TableHead>
                                        <TableHead>ข้อมูล</TableHead>
                                        <TableHead>รายละเอียด</TableHead>
                                        <TableHead className="text-center">ดู</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/50">
                                            <TableCell className="whitespace-nowrap">
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {format(new Date(log.createdAt), "dd/MM/yyyy")}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(log.createdAt), "HH:mm:ss")}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {log.user.nickName || log.user.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {log.user.employeeId}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getActionBadge(log.action)}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">
                                                    {getEntityLabel(log.entity)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                {log.details?.changes && Array.isArray(log.details.changes) ? (
                                                    <div className="text-xs space-y-1">
                                                        {(log.details.changes as string[]).slice(0, 2).map((change, i) => (
                                                            <p key={i} className="text-muted-foreground truncate">
                                                                {change}
                                                            </p>
                                                        ))}
                                                        {(log.details.changes as string[]).length > 2 && (
                                                            <p className="text-muted-foreground">
                                                                +{(log.details.changes as string[]).length - 2} อื่นๆ
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleViewDetail(log)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                หน้า {pagination.page} จาก {pagination.totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                    disabled={pagination.page === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>รายละเอียด Audit Log</DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">วันที่/เวลา</p>
                                    <p className="font-medium">
                                        {format(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss")}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">ผู้ดำเนินการ</p>
                                    <p className="font-medium">
                                        {selectedLog.user.name} ({selectedLog.user.employeeId})
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">การกระทำ</p>
                                    {getActionBadge(selectedLog.action)}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">ข้อมูล</p>
                                    <p className="font-medium">{getEntityLabel(selectedLog.entity)}</p>
                                </div>
                            </div>

                            {selectedLog.details && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">รายละเอียด</p>
                                    <div className="bg-muted rounded-lg p-4 space-y-2">
                                        {typeof selectedLog.details.employeeName === 'string' && (
                                            <p>
                                                <span className="text-muted-foreground">พนักงาน:</span>{" "}
                                                <span className="font-medium">{selectedLog.details.employeeName}</span>{" "}
                                                {typeof selectedLog.details.employeeId === 'string' && (
                                                    <span className="text-xs text-muted-foreground">
                                                        ({selectedLog.details.employeeId})
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                        {typeof selectedLog.details.date === 'string' && (
                                            <p>
                                                <span className="text-muted-foreground">วันที่ข้อมูล:</span>{" "}
                                                <span className="font-medium">{selectedLog.details.date}</span>
                                            </p>
                                        )}
                                        {Array.isArray(selectedLog.details.changes) && (
                                            <div>
                                                <p className="text-muted-foreground mb-1">การเปลี่ยนแปลง:</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {selectedLog.details.changes.map((change, i) => (
                                                        <li key={i} className="text-sm font-medium">{String(change)}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="text-xs text-muted-foreground">
                                <p>ID: {selectedLog.id}</p>
                                <p>Entity ID: {selectedLog.entityId || "-"}</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
