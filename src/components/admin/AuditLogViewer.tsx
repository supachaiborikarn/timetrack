"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter } from "lucide-react";
import { formatThaiDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
    id: string;
    action: string;
    entity: string;
    details: string;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
    user: {
        name: string;
        nickName: string | null;
        employeeId: string | null;
    };
}

export function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState("ALL");

    // Pagination
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            let url = `/api/admin/audit-logs?limit=${limit}&offset=${page * limit}`;
            if (actionFilter && actionFilter !== "ALL") {
                url += `&action=${actionFilter}`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter]);

    const getActionColor = (action: string) => {
        switch (action) {
            case "CREATE": return "text-green-600 bg-green-50 border-green-200";
            case "UPDATE": return "text-blue-600 bg-blue-50 border-blue-200";
            case "DELETE": return "text-red-600 bg-red-50 border-red-200";
            case "LOGIN": return "text-purple-600 bg-purple-50 border-purple-200";
            case "EXPORT": return "text-amber-600 bg-amber-50 border-amber-200";
            default: return "text-slate-600 bg-slate-50 border-slate-200";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPage(0); }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">ทุกการกระทำ (All)</SelectItem>
                            <SelectItem value="LOGIN">เข้าสู่ระบบ (Login)</SelectItem>
                            <SelectItem value="CREATE">สร้างข้อมูล (Create)</SelectItem>
                            <SelectItem value="UPDATE">แก้ไขข้อมูล (Update)</SelectItem>
                            <SelectItem value="DELETE">ลบข้อมูล (Delete)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-slate-500">
                    Total IDs: {total}
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>เวลา</TableHead>
                            <TableHead>ผู้ใช้งาน</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>รายละเอียด</TableHead>
                            <TableHead>IP Address</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    ไม่พบข้อมูล
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                                        {formatThaiDate(new Date(log.createdAt), "d MMM HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-sm">{log.user.nickName || log.user.name}</div>
                                        <div className="text-xs text-slate-500">{log.user.employeeId}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${getActionColor(log.action)}`}>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-slate-700">
                                        {log.entity}
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-xs text-slate-500" title={log.details}>
                                        {log.details}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-400">
                                        {log.ipAddress}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                >
                    ก่อนหน้า
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={logs.length < limit || isLoading}
                >
                    ถัดไป
                </Button>
            </div>
        </div>
    );
}
