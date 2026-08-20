"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertTriangle,
    BedDouble,
    Coins,
    HelpCircle,
    Home,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import {
    HOUSING_ISSUE_LABELS,
    HOUSING_STATUS_LABELS,
    HOUSING_STATUS_ORDER,
    formatMonthLabel,
    type HousingIssue,
} from "@/lib/housing";

/**
 * The worker-housing survey: three dorms, who lives where, who lives at their own
 * place, and the monthly allowance that follows from it.
 */

interface Station { id: string; name: string; code: string }

interface Dormitory {
    id: string;
    name: string;
    code: string;
    address: string | null;
    note: string | null;
    capacity: number | null;
    isActive: boolean;
    station: { id: string; name: string; code: string } | null;
    residentCount: number;
}

interface HousingRow {
    id: string;
    employeeId: string;
    name: string;
    nickName: string | null;
    station: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
    housingStatus: string;
    dormitory: { id: string; name: string; code: string; station: { id: string; name: string } | null } | null;
    housingNote: string | null;
    housingUpdatedAt: string | null;
    selfReported: boolean;
    updatedByName: string | null;
    housingAllowance: number | null;
    effectiveAllowance: number;
    issues: HousingIssue[];
}

interface RosterSummary {
    total: number;
    unknown: number;
    companyDorm: number;
    ownHousing: number;
    withIssues: number;
    selfReported: number;
    monthlyAllowanceTotal: number;
}

interface AllowancePreview {
    monthLabel: string;
    effectiveDate: string;
    summary: { eligible: number; pending: number; alreadyIssued: number; pendingAmount: number; zeroAmount: number; selfReported: number };
}

const money = (n: number) => `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const STATUS_STYLES: Record<string, string> = {
    UNKNOWN: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    COMPANY_DORM: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    OWN_HOUSING: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function HousingPage() {
    const { data: session, status } = useSession();

    const [dormitories, setDormitories] = useState<Dormitory[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [rows, setRows] = useState<HousingRow[]>([]);
    const [summary, setSummary] = useState<RosterSummary | null>(null);
    const [companyDefault, setCompanyDefault] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Roster filters
    const [search, setSearch] = useState("");
    const [filterStation, setFilterStation] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [onlyIssues, setOnlyIssues] = useState(false);

    // Assignment dialog
    const [editingRow, setEditingRow] = useState<HousingRow | null>(null);
    const [assignForm, setAssignForm] = useState({ housingStatus: "UNKNOWN", dormitoryId: "", housingAllowance: "", housingNote: "" });

    // Dormitory dialog
    const [dormDialogOpen, setDormDialogOpen] = useState(false);
    const [editingDorm, setEditingDorm] = useState<Dormitory | null>(null);
    const [dormForm, setDormForm] = useState({ name: "", code: "", address: "", stationId: "none", capacity: "", note: "" });
    // Set when the dormitory dialog was opened from inside the assignment dialog, so
    // the user lands back on the employee they were editing instead of an empty page.
    const [resumeRow, setResumeRow] = useState<HousingRow | null>(null);

    // Allowance
    const now = new Date();
    const [allowanceMonth, setAllowanceMonth] = useState(now.getMonth() + 1);
    const [allowanceYear, setAllowanceYear] = useState(now.getFullYear());
    const [preview, setPreview] = useState<AllowancePreview | null>(null);
    const [rateInput, setRateInput] = useState("");

    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        try {
            const [dormRes, rosterRes, stationRes, settingsRes] = await Promise.all([
                fetch("/api/admin/housing/dormitories"),
                fetch("/api/admin/housing/employees"),
                fetch("/api/admin/stations"),
                fetch("/api/admin/housing/settings"),
            ]);

            if (dormRes.ok) setDormitories((await dormRes.json()).dormitories || []);
            if (rosterRes.ok) {
                const data = await rosterRes.json();
                setRows(data.employees || []);
                setSummary(data.summary || null);
                setCompanyDefault(data.companyDefault ?? 0);
            }
            if (stationRes.ok) setStations((await stationRes.json()).stations || []);
            if (settingsRes.ok) {
                const data = await settingsRes.json();
                setRateInput(String(data.monthlyAllowance ?? 0));
            }
        } catch (error) {
            console.error("Failed to load housing data:", error);
            toast.error("โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchPreview = useCallback(async () => {
        const res = await fetch(`/api/admin/housing/allowance?year=${allowanceYear}&month=${allowanceMonth}`);
        if (res.ok) setPreview(await res.json());
    }, [allowanceMonth, allowanceYear]);

    useEffect(() => { if (session?.user?.id) fetchAll(); }, [session?.user?.id, fetchAll]);
    useEffect(() => { if (session?.user?.id) fetchPreview(); }, [session?.user?.id, fetchPreview]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (filterStation !== "all" && r.station?.id !== filterStation) return false;
            if (filterStatus !== "all" && r.housingStatus !== filterStatus) return false;
            if (onlyIssues && r.issues.length === 0) return false;
            if (!term) return true;
            return [r.name, r.nickName, r.employeeId].some((v) => v?.toLowerCase().includes(term));
        });
    }, [rows, search, filterStation, filterStatus, onlyIssues]);

    function openAssignDialog(row: HousingRow) {
        setEditingRow(row);
        setAssignForm({
            housingStatus: row.housingStatus,
            dormitoryId: row.dormitory?.id || "",
            housingAllowance: row.housingAllowance == null ? "" : String(row.housingAllowance),
            housingNote: row.housingNote || "",
        });
    }

    async function saveAssignment() {
        if (!editingRow) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/housing/employees", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: editingRow.id,
                    housingStatus: assignForm.housingStatus,
                    dormitoryId: assignForm.dormitoryId || null,
                    housingAllowance: assignForm.housingAllowance === "" ? null : assignForm.housingAllowance,
                    housingNote: assignForm.housingNote,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`บันทึกข้อมูลที่พักของ ${editingRow.name} แล้ว`);
                setEditingRow(null);
                fetchAll();
                fetchPreview();
            } else {
                toast.error(data.error || "บันทึกไม่สำเร็จ");
            }
        } finally {
            setIsSaving(false);
        }
    }

    function openDormDialog(dorm?: Dormitory) {
        if (editingRow) {
            setResumeRow(editingRow);
            setEditingRow(null);
        }
        setEditingDorm(dorm || null);
        setDormForm({
            name: dorm?.name || "",
            code: dorm?.code || "",
            address: dorm?.address || "",
            stationId: dorm?.station?.id || "none",
            capacity: dorm?.capacity == null ? "" : String(dorm.capacity),
            note: dorm?.note || "",
        });
        setDormDialogOpen(true);
    }

    async function saveDormitory() {
        setIsSaving(true);
        try {
            const payload = {
                ...dormForm,
                stationId: dormForm.stationId === "none" ? null : dormForm.stationId,
                capacity: dormForm.capacity === "" ? null : Number(dormForm.capacity),
            };
            const res = await fetch(
                editingDorm ? `/api/admin/housing/dormitories/${editingDorm.id}` : "/api/admin/housing/dormitories",
                {
                    method: editingDorm ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );
            const data = await res.json();
            if (res.ok) {
                toast.success(editingDorm ? "แก้ไขที่พักแล้ว" : "เพิ่มที่พักแล้ว");
                setDormDialogOpen(false);
                await fetchAll();
                if (resumeRow) {
                    // Preselect the dormitory that was just created — it is almost
                    // always the one they interrupted themselves to add.
                    if (!editingDorm && data.dormitory?.id) {
                        setAssignForm((f) => ({ ...f, dormitoryId: data.dormitory.id }));
                    }
                    setEditingRow(resumeRow);
                    setResumeRow(null);
                }
            } else {
                toast.error(data.error || "บันทึกไม่สำเร็จ");
            }
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteDormitory(dorm: Dormitory) {
        const res = await fetch(`/api/admin/housing/dormitories/${dorm.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            toast.success("ลบที่พักแล้ว");
            fetchAll();
        } else {
            toast.error(data.error || "ลบไม่สำเร็จ");
        }
    }

    async function saveRate() {
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/housing/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ monthlyAllowance: Number(rateInput) }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("บันทึกค่าที่พักเริ่มต้นแล้ว");
                fetchAll();
                fetchPreview();
            } else {
                toast.error(data.error || "บันทึกไม่สำเร็จ");
            }
        } finally {
            setIsSaving(false);
        }
    }

    async function generateAllowance() {
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/housing/allowance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year: allowanceYear, month: allowanceMonth }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(
                    data.created > 0
                        ? `สร้างรายการค่าที่พัก ${data.created} รายการ รวม ${money(data.totalAmount || 0)}`
                        : data.message || "ไม่มีรายการใหม่ที่ต้องสร้าง"
                );
                fetchPreview();
            } else {
                toast.error(data.error || "สร้างรายการไม่สำเร็จ");
            }
        } finally {
            setIsSaving(false);
        }
    }

    if (status === "loading" || isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }
    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/");
    }

    const activeDormitories = dormitories.filter((d) => d.isActive);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">ที่พักคนงาน</h1>
                <p className="text-muted-foreground">บันทึกว่าใครอยู่บ้านพักหลังไหน ใครอยู่ที่พักตัวเอง และคิดค่าที่พักรายเดือนให้กลุ่มหลัง</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <StatCard icon={Users} tone="text-slate-500 bg-slate-500/10" value={summary?.total ?? 0} label="พนักงานทั้งหมด" />
                <StatCard icon={HelpCircle} tone="text-amber-500 bg-amber-500/10" value={summary?.unknown ?? 0} label="ยังไม่ระบุ" />
                <StatCard icon={BedDouble} tone="text-blue-500 bg-blue-500/10" value={summary?.companyDorm ?? 0} label="อยู่บ้านพักบริษัท" />
                <StatCard icon={Home} tone="text-emerald-500 bg-emerald-500/10" value={summary?.ownHousing ?? 0} label="อยู่ที่พักตัวเอง" />
                <StatCard icon={AlertTriangle} tone="text-red-500 bg-red-500/10" value={summary?.withIssues ?? 0} label="ข้อมูลต้องตรวจ" />
            </div>

            <Tabs defaultValue="roster" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="roster">ผังพนักงาน</TabsTrigger>
                    <TabsTrigger value="dormitories">ที่พัก ({activeDormitories.length})</TabsTrigger>
                    <TabsTrigger value="allowance">ค่าที่พัก</TabsTrigger>
                </TabsList>

                {/* ── Roster ─────────────────────────────────────────────── */}
                <TabsContent value="roster" className="space-y-4 pt-4">
                    {activeDormitories.length === 0 && (
                        <Card className="border-amber-500/30 bg-amber-500/5">
                            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                                    <div>
                                        <p className="text-sm font-medium">ยังไม่ได้เพิ่มบ้านพักเข้าระบบ</p>
                                        <p className="text-xs text-muted-foreground">
                                            จนกว่าจะเพิ่ม จะเลือก &ldquo;อยู่บ้านพักบริษัท&rdquo; ไม่ได้ ทั้งฝั่งนี้และฝั่งที่พนักงานกรอกเอง
                                        </p>
                                    </div>
                                </div>
                                <Button onClick={() => openDormDialog()} className="shrink-0">
                                    <Plus className="mr-2 h-4 w-4" /> เพิ่มบ้านพัก
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัสพนักงาน" className="pl-9" />
                            </div>
                            <Select value={filterStation} onValueChange={setFilterStation}>
                                <SelectTrigger className="md:w-48"><SelectValue placeholder="ทุกสาขา" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกสาขา</SelectItem>
                                    {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="md:w-52"><SelectValue placeholder="ทุกสถานะ" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกสถานะ</SelectItem>
                                    {HOUSING_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{HOUSING_STATUS_LABELS[s]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant={onlyIssues ? "default" : "outline"} onClick={() => setOnlyIssues((v) => !v)}>
                                <AlertTriangle className="mr-2 h-4 w-4" /> เฉพาะที่ต้องตรวจ
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>พนักงาน</TableHead>
                                        <TableHead className="hidden md:table-cell">สาขาที่ทำงาน</TableHead>
                                        <TableHead>ที่พัก</TableHead>
                                        <TableHead className="hidden lg:table-cell text-right">ค่าที่พัก/เดือน</TableHead>
                                        <TableHead className="text-right">แก้ไข</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">ไม่พบพนักงานตามเงื่อนไข</TableCell>
                                        </TableRow>
                                    ) : filteredRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <div className="font-medium">{row.name}{row.nickName ? ` (${row.nickName})` : ""}</div>
                                                <div className="text-xs text-muted-foreground">{row.employeeId}</div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                {row.station?.name || "-"}
                                                {row.department && <span className="block text-xs">{row.department.name}</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge variant="outline" className={STATUS_STYLES[row.housingStatus]}>
                                                        {HOUSING_STATUS_LABELS[row.housingStatus as keyof typeof HOUSING_STATUS_LABELS]}
                                                    </Badge>
                                                    {row.dormitory && <span className="text-sm">{row.dormitory.name}</span>}
                                                </div>
                                                {row.issues.map((issue) => (
                                                    <div key={issue} className="mt-1 flex items-center gap-1 text-xs text-red-500">
                                                        <AlertTriangle className="h-3 w-3" /> {HOUSING_ISSUE_LABELS[issue]}
                                                    </div>
                                                ))}
                                                {row.housingStatus !== "UNKNOWN" && (
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {row.selfReported
                                                            ? "พนักงานแจ้งเอง — ยังไม่ได้ตรวจสอบ"
                                                            : row.updatedByName
                                                                ? `บันทึกโดย ${row.updatedByName}`
                                                                : null}
                                                    </div>
                                                )}
                                                {row.housingNote && <div className="mt-1 text-xs text-muted-foreground">{row.housingNote}</div>}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-right">
                                                {row.effectiveAllowance > 0 ? (
                                                    <span className="font-medium text-emerald-600">
                                                        {money(row.effectiveAllowance)}
                                                        {row.housingAllowance != null && <span className="ml-1 text-[10px] text-muted-foreground">(เฉพาะคนนี้)</span>}
                                                    </span>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openAssignDialog(row)} title="แก้ไขข้อมูลที่พัก">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Dormitories ────────────────────────────────────────── */}
                <TabsContent value="dormitories" className="space-y-4 pt-4">
                    <div className="flex justify-end">
                        <Button onClick={() => openDormDialog()}><Plus className="mr-2 h-4 w-4" /> เพิ่มที่พัก</Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {dormitories.length === 0 && (
                            <Card className="md:col-span-2 lg:col-span-3">
                                <CardContent className="py-10 text-center text-muted-foreground">
                                    ยังไม่ได้เพิ่มที่พัก — กด &ldquo;เพิ่มที่พัก&rdquo; เพื่อใส่บ้านพักทั้ง 3 หลัง
                                </CardContent>
                            </Card>
                        )}
                        {dormitories.map((dorm) => {
                            const over = dorm.capacity != null && dorm.residentCount > dorm.capacity;
                            return (
                                <Card key={dorm.id} className={dorm.isActive ? "" : "opacity-60"}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <CardTitle className="text-base">{dorm.name}</CardTitle>
                                                <CardDescription>{dorm.code}{dorm.station ? ` · ${dorm.station.name}` : " · ไม่ผูกกับสาขา"}</CardDescription>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openDormDialog(dorm)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteDormitory(dorm)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className={over ? "font-semibold text-red-500" : ""}>
                                                {dorm.residentCount}{dorm.capacity != null ? ` / ${dorm.capacity}` : ""} คน
                                            </span>
                                            {over && <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-500">เกินจำนวน</Badge>}
                                            {!dorm.isActive && <Badge variant="outline">ปิดใช้งาน</Badge>}
                                        </div>
                                        {dorm.address && <p className="text-muted-foreground">{dorm.address}</p>}
                                        {dorm.note && <p className="text-xs text-muted-foreground">{dorm.note}</p>}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* ── Allowance ──────────────────────────────────────────── */}
                <TabsContent value="allowance" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">ค่าที่พักเริ่มต้นของบริษัท</CardTitle>
                            <CardDescription>ใช้กับทุกคนที่อยู่ที่พักของตัวเอง ยกเว้นคนที่ตั้งค่าเฉพาะตัวไว้</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">บาท / เดือน</Label>
                                <Input type="number" min={0} value={rateInput} onChange={(e) => setRateInput(e.target.value)} className="w-40" />
                            </div>
                            <Button onClick={saveRate} disabled={isSaving}>บันทึก</Button>
                            <p className="text-xs text-muted-foreground">ค่าปัจจุบัน {money(companyDefault)} / เดือน</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">สร้างรายการค่าที่พักประจำเดือน</CardTitle>
                            <CardDescription>
                                สร้างเป็นรายการ &ldquo;รายได้พิเศษ&rdquo; ให้คนที่อยู่ที่พักตัวเอง แล้วเงินเดือนจะดึงไปคิดให้เอง
                                — กดซ้ำได้ ระบบจะข้ามคนที่สร้างไปแล้วในเดือนนั้น
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">เดือน</Label>
                                    <Select value={String(allowanceMonth)} onValueChange={(v) => setAllowanceMonth(Number(v))}>
                                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                                <SelectItem key={m} value={String(m)}>{formatMonthLabel(allowanceYear, m)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">ปี (ค.ศ.)</Label>
                                    <Input type="number" value={allowanceYear} onChange={(e) => setAllowanceYear(Number(e.target.value))} className="w-28" />
                                </div>
                            </div>

                            {preview && (
                                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <p>มีสิทธิ์รับค่าที่พัก <strong>{preview.summary.eligible}</strong> คน</p>
                                        <p>สร้างไปแล้วในเดือนนี้ <strong>{preview.summary.alreadyIssued}</strong> คน</p>
                                        <p>จะสร้างใหม่ <strong className="text-emerald-600">{preview.summary.pending}</strong> คน</p>
                                        <p>รวมเป็นเงิน <strong className="text-emerald-600">{money(preview.summary.pendingAmount)}</strong></p>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">ลงวันที่ {preview.effectiveDate} (วันสุดท้ายของเดือน)</p>
                                    {preview.summary.selfReported > 0 && (
                                        <p className="mt-2 flex items-start gap-1 text-xs text-amber-600">
                                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                            <span>
                                                ในจำนวนนี้ {preview.summary.selfReported} คนเป็นข้อมูลที่พนักงานแจ้งเอง ยังไม่มีใครตรวจสอบ
                                                — ดูรายชื่อได้ที่แท็บผังพนักงาน
                                            </span>
                                        </p>
                                    )}
                                    {preview.summary.zeroAmount > 0 && (
                                        <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                                            <AlertTriangle className="h-3 w-3" />
                                            มี {preview.summary.zeroAmount} คนที่ค่าที่พักเป็น 0 บาท จะถูกข้าม — ตั้งค่าเริ่มต้นหรือค่าเฉพาะคนก่อน
                                        </p>
                                    )}
                                </div>
                            )}

                            <Button onClick={generateAllowance} disabled={isSaving || !preview || preview.summary.pending === 0}>
                                <Coins className="mr-2 h-4 w-4" />
                                สร้างรายการ {preview ? `${preview.summary.pending} รายการ` : ""}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Assignment dialog ──────────────────────────────────────── */}
            <Dialog open={Boolean(editingRow)} onOpenChange={(open) => { if (!open) setEditingRow(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ข้อมูลที่พัก</DialogTitle>
                        <DialogDescription>{editingRow ? `${editingRow.employeeId} · ${editingRow.name}` : ""}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>สถานะที่พัก</Label>
                            <Select
                                value={assignForm.housingStatus}
                                onValueChange={(v) => setAssignForm((f) => ({ ...f, housingStatus: v, dormitoryId: v === "COMPANY_DORM" ? f.dormitoryId : "" }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {HOUSING_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{HOUSING_STATUS_LABELS[s]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {assignForm.housingStatus === "COMPANY_DORM" && (
                            <div className="space-y-1.5">
                                <Label>อยู่บ้านพักหลังไหน</Label>
                                <Select
                                    value={assignForm.dormitoryId}
                                    onValueChange={(v) => setAssignForm((f) => ({ ...f, dormitoryId: v }))}
                                    disabled={activeDormitories.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={activeDormitories.length === 0 ? "ยังไม่มีบ้านพักในระบบ" : "เลือกที่พัก"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeDormitories.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.name}{d.station ? ` · ${d.station.name}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {activeDormitories.length === 0 && (
                                    <div className="rounded-lg border border-dashed p-3 text-center">
                                        <p className="text-xs text-muted-foreground">ยังไม่ได้เพิ่มบ้านพักเข้าระบบ จึงยังไม่มีให้เลือก</p>
                                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => openDormDialog()}>
                                            <Plus className="mr-2 h-4 w-4" /> เพิ่มบ้านพักตอนนี้
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {assignForm.housingStatus === "OWN_HOUSING" && (
                            <div className="space-y-1.5">
                                <Label>ค่าที่พักเฉพาะคนนี้ (บาท/เดือน)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={assignForm.housingAllowance}
                                    onChange={(e) => setAssignForm((f) => ({ ...f, housingAllowance: e.target.value }))}
                                    placeholder={`เว้นว่าง = ใช้ค่าเริ่มต้น ${money(companyDefault)}`}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label>หมายเหตุ</Label>
                            <Input value={assignForm.housingNote} onChange={(e) => setAssignForm((f) => ({ ...f, housingNote: e.target.value }))} placeholder="เช่น อยู่กับครอบครัว, เช่าห้องใกล้ปั๊ม" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingRow(null)}>ยกเลิก</Button>
                        <Button onClick={saveAssignment} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dormitory dialog ───────────────────────────────────────── */}
            <Dialog
                open={dormDialogOpen}
                onOpenChange={(open) => {
                    setDormDialogOpen(open);
                    if (!open && resumeRow) {
                        setEditingRow(resumeRow);
                        setResumeRow(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDorm ? "แก้ไขที่พัก" : "เพิ่มที่พัก"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>ชื่อที่พัก *</Label>
                                <Input value={dormForm.name} onChange={(e) => setDormForm((f) => ({ ...f, name: e.target.value }))} placeholder="เช่น บ้านพักหลังปั๊ม" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>รหัส *</Label>
                                <Input value={dormForm.code} onChange={(e) => setDormForm((f) => ({ ...f, code: e.target.value }))} placeholder="DORM1" />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>สาขาที่รองรับ</Label>
                                <Select value={dormForm.stationId} onValueChange={(v) => setDormForm((f) => ({ ...f, stationId: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">ไม่ผูกกับสาขา</SelectItem>
                                        {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">ใช้เตือนเมื่อพนักงานอยู่ที่พักคนละสาขากับที่ทำงาน</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label>รองรับได้กี่คน</Label>
                                <Input type="number" min={0} value={dormForm.capacity} onChange={(e) => setDormForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="เว้นว่างได้" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>ที่อยู่</Label>
                            <Input value={dormForm.address} onChange={(e) => setDormForm((f) => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>หมายเหตุ</Label>
                            <Input value={dormForm.note} onChange={(e) => setDormForm((f) => ({ ...f, note: e.target.value }))} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setDormDialogOpen(false); if (resumeRow) { setEditingRow(resumeRow); setResumeRow(null); } }}>ยกเลิก</Button>
                        <Button onClick={saveDormitory} disabled={isSaving || !dormForm.name.trim() || !dormForm.code.trim()}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatCard({ icon: Icon, tone, value, label }: { icon: React.ComponentType<{ className?: string }>; tone: string; value: number; label: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 py-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="truncate text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}
