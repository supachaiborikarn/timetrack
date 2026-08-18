"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import {
    Loader2,
    Search,
    Eye,
    EyeOff,
    Star,
    Trash2,
    UserPlus,
    UserMinus,
    FileText,
    Phone,
    Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

const STATUS_TABS = [
    { value: "ALL", label: "ทั้งหมด" },
    { value: "SUBMITTED", label: "ใหม่" },
    { value: "SCREENING", label: "คัดกรอง" },
    { value: "INTERVIEW", label: "สัมภาษณ์" },
    { value: "OFFERED", label: "เสนองาน" },
    { value: "HIRED", label: "จ้างแล้ว" },
    { value: "REJECTED", label: "ไม่ผ่าน" },
    { value: "WITHDRAWN", label: "ถอนแล้ว" },
];

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "ร่าง",
    SUBMITTED: "ใหม่",
    SCREENING: "คัดกรอง",
    INTERVIEW: "สัมภาษณ์",
    OFFERED: "เสนองาน",
    HIRED: "จ้างแล้ว",
    REJECTED: "ไม่ผ่าน",
    WITHDRAWN: "ถอนแล้ว",
};

type ApplicationRow = {
    id: string;
    refCode: string;
    status: string;
    positionTitle: string;
    name: string;
    nickName: string | null;
    phone: string;
    birthDate: string | null;
    createdAt: string;
    ratingScore: number | null;
    station: { id: string; name: string } | null;
    hasPhoto: boolean;
};

type ApplicationDetail = ApplicationRow & {
    prefix: string | null;
    lastName: string;
    firstName: string;
    gender: string | null;
    nationality: string | null;
    religion: string | null;
    maritalStatus: string | null;
    militaryStatus: string | null;
    citizenIdMasked: string | null;
    citizenIdFull: string | null;
    canViewSensitive: boolean;
    lineId: string | null;
    email: string | null;
    addressRegistered: string | null;
    addressCurrent: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    emergencyRelation: string | null;
    employmentType: string | null;
    expectedSalary: number | null;
    availableFrom: string | null;
    preferredShifts: string[];
    educations: { level: string; institute: string; major: string; graduationYear: string }[];
    workExperiences: { company: string; position: string; fromYear: string; toYear: string; leaveReason: string }[];
    hasDrivingLicense: boolean;
    licenseTypes: string | null;
    screeningAnswers: { workedAtGasStationBefore?: boolean; canWorkNightShift?: boolean; hasHealthCondition?: boolean; healthConditionDetail?: string } | null;
    applicantNote: string | null;
    interviewAt: string | null;
    interviewNote: string | null;
    rejectReason: string | null;
    department: { id: string; name: string } | null;
    jobOpening: { id: string; slug: string; title: string } | null;
    hiredUser: { id: string; name: string; employeeId: string } | null;
    files: { id: string; kind: string; mimeType: string; width: number | null; height: number | null }[];
};

type Station = { id: string; name: string; departments: { id: string; name: string }[] };

function calcAge(birthDate: string | null): number | null {
    if (!birthDate) return null;
    const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return Number.isFinite(age) ? age : null;
}

export default function AdminApplicationsPage() {
    const { data: session, status: sessionStatus } = useSession();
    const [rows, setRows] = useState<ApplicationRow[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [stationFilter, setStationFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [stations, setStations] = useState<Station[]>([]);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<ApplicationDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [interviewAt, setInterviewAt] = useState("");
    const [interviewNote, setInterviewNote] = useState("");
    const [hireOpen, setHireOpen] = useState(false);
    const [unhireReason, setUnhireReason] = useState("");

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "ALL") params.set("status", statusFilter);
            if (stationFilter !== "ALL") params.set("stationId", stationFilter);
            if (search.trim()) params.set("q", search.trim());
            const res = await fetch(`/api/admin/applications?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setRows(data.applications);
                setCounts(data.counts);
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter, stationFilter, search]);

    useEffect(() => {
        if (!session?.user?.id) return;
        void fetchList();
    }, [session?.user?.id, fetchList]);

    useEffect(() => {
        if (!session?.user?.id) return;
        fetch("/api/admin/stations").then((r) => r.json()).then((d) => setStations(d.stations ?? [])).catch(() => {});
        fetch("/api/user/permissions").then((r) => r.json()).then((d) => setPermissions(d.permissions ?? [])).catch(() => {});
    }, [session?.user?.id]);

    const openDetail = useCallback(async (id: string) => {
        setSelectedId(id);
        setDetail(null);
        setDetailLoading(true);
        setRejectReason("");
        try {
            const res = await fetch(`/api/admin/applications/${id}`);
            if (res.ok) {
                const data = await res.json();
                setDetail(data);
                setInterviewAt(data.interviewAt ? new Date(data.interviewAt).toISOString().slice(0, 16) : "");
                setInterviewNote(data.interviewNote ?? "");
                setRejectReason(data.rejectReason ?? "");
            } else {
                toast.error("โหลดข้อมูลไม่สำเร็จ");
            }
        } finally {
            setDetailLoading(false);
        }
    }, []);

    async function revealCitizenId() {
        if (!selectedId) return;
        const res = await fetch(`/api/admin/applications/${selectedId}?revealCitizenId=1`);
        if (res.ok) {
            const data = await res.json();
            setDetail((prev) => (prev ? { ...prev, citizenIdFull: data.citizenIdFull } : prev));
        } else {
            toast.error("ไม่มีสิทธิ์ดูข้อมูลนี้");
        }
    }

    async function updateStatus(newStatus: string, extra?: Record<string, unknown>) {
        if (!selectedId) return;
        setActionBusy(true);
        try {
            const res = await fetch(`/api/admin/applications/${selectedId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, ...extra }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || "อัปเดตไม่สำเร็จ");
                return;
            }
            toast.success("อัปเดตสถานะแล้ว");
            await openDetail(selectedId);
            await fetchList();
        } finally {
            setActionBusy(false);
        }
    }

    async function saveInterview() {
        if (!selectedId) return;
        setActionBusy(true);
        try {
            const res = await fetch(`/api/admin/applications/${selectedId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interviewAt: interviewAt || null, interviewNote }),
            });
            if (res.ok) {
                toast.success("บันทึกแล้ว");
                await fetchList();
            } else {
                toast.error("บันทึกไม่สำเร็จ");
            }
        } finally {
            setActionBusy(false);
        }
    }

    async function setRating(score: number) {
        if (!selectedId) return;
        await fetch(`/api/admin/applications/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ratingScore: score }),
        });
        setDetail((prev) => (prev ? { ...prev, ratingScore: score } : prev));
        await fetchList();
    }

    async function handleUnhire() {
        if (!selectedId || !unhireReason.trim()) return;
        setActionBusy(true);
        try {
            const res = await fetch(`/api/admin/applications/${selectedId}/unhire`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: unhireReason.trim() }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || "ยกเลิกการจ้างไม่สำเร็จ");
                return;
            }
            // Be explicit about what happened to the account — an employee with existing records
            // is deactivated rather than deleted, and HR needs to know which one they got.
            if (!json.hadAccount) {
                toast.success("ยกเลิกการจ้างแล้ว (ใบสมัครนี้ไม่มีบัญชีพนักงานผูกอยู่)");
            } else if (json.accountDeleted) {
                toast.success("ยกเลิกการจ้างและลบบัญชีพนักงานแล้ว");
            } else {
                toast.success(`ปิดใช้งานบัญชีพนักงานแทนการลบ เพราะมีข้อมูลอยู่: ${json.keptBecause.join(", ")}`, { duration: 8000 });
            }
            setUnhireReason("");
            await openDetail(selectedId);
            await fetchList();
        } finally {
            setActionBusy(false);
        }
    }

    async function handleDelete() {
        if (!selectedId) return;
        setActionBusy(true);
        try {
            const res = await fetch(`/api/admin/applications/${selectedId}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("ลบใบสมัครแล้ว");
                setSelectedId(null);
                setDetail(null);
                await fetchList();
            } else {
                const json = await res.json();
                toast.error(json.error || "ลบไม่สำเร็จ");
            }
        } finally {
            setActionBusy(false);
        }
    }

    if (sessionStatus === "loading") {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    if (!session?.user || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/admin");
    }

    const canReview = permissions.includes("application.review");
    const canHire = permissions.includes("application.hire");
    const canDelete = permissions.includes("application.delete");
    const canViewSensitive = permissions.includes("application.view_sensitive");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h1 className="text-xl font-bold">ใบสมัครงาน</h1>
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="flex-wrap h-auto">
                    {STATUS_TABS.map((t) => (
                        <TabsTrigger key={t.value} value={t.value}>
                            {t.label}
                            {t.value !== "ALL" && counts[t.value] ? (
                                <Badge variant="secondary" className="ml-1.5">{counts[t.value]}</Badge>
                            ) : null}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="flex gap-2 flex-wrap">
                <div className="relative w-56">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder="ค้นหาชื่อ/เบอร์/รหัสอ้างอิง" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={stationFilter} onValueChange={setStationFilter}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="ทุกสาขา" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">ทุกสาขา</SelectItem>
                        {stations.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ผู้สมัคร</TableHead>
                                <TableHead>ตำแหน่ง</TableHead>
                                <TableHead>สาขา</TableHead>
                                <TableHead>อายุ</TableHead>
                                <TableHead>เบอร์โทร</TableHead>
                                <TableHead>วันที่สมัคร</TableHead>
                                <TableHead>สถานะ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="size-5 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">ไม่พบใบสมัคร</TableCell></TableRow>
                            ) : (
                                rows.map((r) => (
                                    <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetail(r.id)}>
                                        <TableCell>
                                            <div className="font-medium">{r.name}</div>
                                            {r.nickName && <div className="text-xs text-muted-foreground">({r.nickName})</div>}
                                            <div className="text-xs text-muted-foreground font-mono">{r.refCode}</div>
                                        </TableCell>
                                        <TableCell>{r.positionTitle}</TableCell>
                                        <TableCell>{r.station?.name ?? "-"}</TableCell>
                                        <TableCell>{calcAge(r.birthDate) ?? "-"}</TableCell>
                                        <TableCell>{r.phone}</TableCell>
                                        <TableCell>{new Date(r.createdAt).toLocaleDateString("th-TH-u-ca-buddhist")}</TableCell>
                                        <TableCell><Badge variant="outline">{STATUS_LABELS[r.status] ?? r.status}</Badge></TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Sheet open={!!selectedId} onOpenChange={(open) => { if (!open) { setSelectedId(null); setDetail(null); } }}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{detail ? `${detail.name} — ${detail.refCode}` : "รายละเอียดใบสมัคร"}</SheetTitle>
                    </SheetHeader>

                    {detailLoading && <div className="p-6 text-center"><Loader2 className="size-6 animate-spin mx-auto" /></div>}

                    {detail && (
                        <div className="px-4 pb-6 space-y-4">
                            <div className="flex items-center gap-3">
                                {detail.files.some((f) => f.kind === "PROFILE_PHOTO") && (
                                    // eslint-disable-next-line @next/next/no-img-element -- served via our own permission-gated route, not a static asset
                                    <img
                                        src={`/api/admin/applications/${detail.id}/files/${detail.files.find((f) => f.kind === "PROFILE_PHOTO")?.id}`}
                                        alt={detail.name}
                                        className="w-20 h-[107px] object-cover rounded-md border"
                                    />
                                )}
                                <div>
                                    <Badge>{STATUS_LABELS[detail.status] ?? detail.status}</Badge>
                                    <div className="text-sm text-muted-foreground mt-1">{detail.positionTitle} — {detail.station?.name}{detail.department ? ` / ${detail.department.name}` : ""}</div>
                                    {detail.jobOpening && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            สมัครผ่านประกาศ: <a href={`/jobs/${detail.jobOpening.slug}`} target="_blank" rel="noreferrer" className="underline">{detail.jobOpening.title}</a>
                                        </div>
                                    )}
                                    {detail.hiredUser && <div className="text-xs text-green-600 mt-1">จ้างเป็นพนักงานแล้ว: {detail.hiredUser.name} ({detail.hiredUser.employeeId})</div>}
                                </div>
                            </div>

                            <section className="space-y-1 text-sm">
                                <Row label="ชื่อ-สกุล" value={`${detail.prefix ?? ""} ${detail.firstName} ${detail.lastName}`.trim()} />
                                <Row label="ชื่อเล่น" value={detail.nickName} />
                                <Row label="อายุ" value={calcAge(detail.birthDate) ? `${calcAge(detail.birthDate)} ปี` : null} />
                                <Row label="เพศ" value={detail.gender} />
                                <Row label="สัญชาติ" value={detail.nationality} />
                                <div className="flex justify-between gap-3 py-1">
                                    <span className="text-muted-foreground flex items-center gap-1"><Phone className="size-3.5" />เบอร์โทร</span>
                                    <span className="font-medium">{detail.phone}</span>
                                </div>
                                <Row label="LINE ID" value={detail.lineId} />
                                <Row label="อีเมล" value={detail.email} />
                                <Row label="ที่อยู่ปัจจุบัน" value={detail.addressCurrent || detail.addressRegistered} />
                                <Row label="ผู้ติดต่อฉุกเฉิน" value={detail.emergencyName ? `${detail.emergencyName} (${detail.emergencyRelation ?? "-"}) ${detail.emergencyPhone ?? ""}` : null} />

                                <div className="flex justify-between items-center gap-3 py-1">
                                    <span className="text-muted-foreground">เลขบัตรประชาชน</span>
                                    <span className="font-mono flex items-center gap-2">
                                        {detail.citizenIdFull ?? detail.citizenIdMasked ?? "-"}
                                        {canViewSensitive && !detail.citizenIdFull && (
                                            <Button size="icon-sm" variant="ghost" onClick={revealCitizenId}><Eye className="size-3.5" /></Button>
                                        )}
                                        {detail.citizenIdFull && (
                                            <Button size="icon-sm" variant="ghost" onClick={() => setDetail((p) => (p ? { ...p, citizenIdFull: null } : p))}><EyeOff className="size-3.5" /></Button>
                                        )}
                                    </span>
                                </div>
                            </section>

                            <section className="space-y-1 text-sm border-t pt-3">
                                <p className="font-medium">ไฟล์แนบ</p>
                                <div className="flex flex-wrap gap-2">
                                    {detail.files.map((f) => (
                                        <a key={f.id} href={`/api/admin/applications/${detail.id}/files/${f.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs border rounded-md px-2 py-1 hover:bg-muted">
                                            <FileText className="size-3.5" />
                                            {FILE_KIND_LABELS[f.kind] ?? f.kind}
                                        </a>
                                    ))}
                                </div>
                            </section>

                            {(detail.educations.length > 0 || detail.workExperiences.length > 0) && (
                                <section className="space-y-2 text-sm border-t pt-3">
                                    {detail.educations.map((e, i) => (
                                        <p key={i} className="text-muted-foreground">🎓 {e.level} {e.institute} {e.major} {e.graduationYear}</p>
                                    ))}
                                    {detail.workExperiences.map((w, i) => (
                                        <p key={i} className="text-muted-foreground">💼 {w.company} — {w.position} ({w.fromYear}-{w.toYear})</p>
                                    ))}
                                </section>
                            )}

                            {detail.screeningAnswers && (
                                <section className="space-y-1 text-sm border-t pt-3">
                                    <p className="font-medium">คำถามคัดกรอง</p>
                                    <p className="text-muted-foreground">เคยทำงานปั๊ม: {detail.screeningAnswers.workedAtGasStationBefore ? "ใช่" : "ไม่ใช่"}</p>
                                    <p className="text-muted-foreground">ทำกะดึกได้: {detail.screeningAnswers.canWorkNightShift ? "ใช่" : "ไม่ใช่"}</p>
                                    <p className="text-muted-foreground">มีโรคประจำตัว: {detail.screeningAnswers.hasHealthCondition ? `ใช่ (${detail.screeningAnswers.healthConditionDetail ?? "-"})` : "ไม่ใช่"}</p>
                                </section>
                            )}

                            <section className="space-y-2 border-t pt-3">
                                <p className="font-medium text-sm">คะแนนประเมิน</p>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button key={n} type="button" onClick={() => setRating(n)} disabled={!canReview}>
                                            <Star className={`size-5 ${(detail.ratingScore ?? 0) >= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {canReview && detail.status !== "HIRED" && detail.status !== "WITHDRAWN" && (
                                <section className="space-y-2 border-t pt-3">
                                    <p className="font-medium text-sm flex items-center gap-1"><Calendar className="size-4" />นัดสัมภาษณ์</p>
                                    <Input type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} />
                                    <Textarea placeholder="บันทึกการสัมภาษณ์" rows={2} value={interviewNote} onChange={(e) => setInterviewNote(e.target.value)} />
                                    <Button size="sm" variant="outline" onClick={saveInterview} disabled={actionBusy}>บันทึก</Button>
                                </section>
                            )}

                            {canReview && detail.status !== "HIRED" && detail.status !== "WITHDRAWN" && (
                                <section className="space-y-2 border-t pt-3">
                                    <p className="font-medium text-sm">การพิจารณา</p>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.status === "SUBMITTED" && (
                                            <Button size="sm" onClick={() => updateStatus("SCREENING")} disabled={actionBusy}>เริ่มคัดกรอง</Button>
                                        )}
                                        {(detail.status === "SUBMITTED" || detail.status === "SCREENING") && (
                                            <Button size="sm" onClick={() => updateStatus("INTERVIEW")} disabled={actionBusy}>นัดสัมภาษณ์</Button>
                                        )}
                                        {detail.status === "INTERVIEW" && (
                                            <Button size="sm" onClick={() => updateStatus("OFFERED")} disabled={actionBusy}>เสนองาน</Button>
                                        )}
                                        {canHire && (
                                            <Dialog open={hireOpen} onOpenChange={setHireOpen}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="default"><UserPlus className="size-4" />จ้างเป็นพนักงาน</Button>
                                                </DialogTrigger>
                                                <HireDialogContent
                                                    application={detail}
                                                    stations={stations}
                                                    onClose={() => setHireOpen(false)}
                                                    onHired={async () => {
                                                        setHireOpen(false);
                                                        await openDetail(detail.id);
                                                        await fetchList();
                                                    }}
                                                />
                                            </Dialog>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <Textarea placeholder="เหตุผลที่ปฏิเสธ (จำเป็นถ้าจะปฏิเสธ)" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                                        <Button size="sm" variant="destructive" onClick={() => updateStatus("REJECTED", { rejectReason })} disabled={actionBusy || !rejectReason.trim()}>
                                            ปฏิเสธใบสมัคร
                                        </Button>
                                    </div>
                                </section>
                            )}

                            {detail.rejectReason && detail.status === "REJECTED" && (
                                <p className="text-sm text-destructive border-t pt-3">เหตุผลที่ปฏิเสธ: {detail.rejectReason}</p>
                            )}

                            {/* A hired application can't be edited or deleted while an employee account
                                hangs off it. Undoing the hire deals with the account first, then returns
                                the application to a normal state. */}
                            {canHire && detail.status === "HIRED" && (
                                <section className="space-y-2 border-t pt-3">
                                    <p className="font-medium text-sm">ยกเลิกการจ้าง</p>
                                    <p className="text-xs text-muted-foreground">
                                        ใช้กรณีรับเข้าทำงานแล้วแต่ไม่มาจริง — บัญชีพนักงานจะถูกลบถ้ายังไม่เคยใช้งาน
                                        (ถ้าเคยลงเวลาหรือมีข้อมูลแล้วจะปิดใช้งานแทน) และใบสมัครจะกลับเป็น &quot;ไม่ผ่าน&quot; ให้ลบได้
                                    </p>
                                    <Textarea
                                        rows={2}
                                        placeholder="เหตุผล เช่น เรียกมาทำงานแล้วไม่มา"
                                        value={unhireReason}
                                        onChange={(e) => setUnhireReason(e.target.value)}
                                    />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive" disabled={actionBusy || !unhireReason.trim()}>
                                                <UserMinus className="size-4" />ยกเลิกการจ้าง
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>ยืนยันยกเลิกการจ้าง</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {detail.hiredUser
                                                        ? `บัญชีพนักงาน ${detail.hiredUser.name} (${detail.hiredUser.employeeId}) จะถูกลบหรือปิดใช้งาน และจะเข้าสู่ระบบไม่ได้อีก`
                                                        : "ใบสมัครนี้ไม่มีบัญชีพนักงานผูกอยู่ จะเปลี่ยนสถานะกลับเป็น \"ไม่ผ่าน\" เท่านั้น"}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleUnhire}>ยืนยัน</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </section>
                            )}

                            {canDelete && (
                                <section className="border-t pt-3">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="size-4" />ลบใบสมัครถาวร</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>ยืนยันการลบถาวร</AlertDialogTitle>
                                                <AlertDialogDescription>ข้อมูลและไฟล์แนบทั้งหมดจะถูกลบและกู้คืนไม่ได้</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete}>ยืนยันลบ</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </section>
                            )}
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

/** Standard probation term for a new hire. */
const PROBATION_MONTHS = 3;

/**
 * Adds whole months to a yyyy-mm-dd date key. Clamps to the last day of the target month so
 * e.g. 31 Jan + 3 months lands on 30 Apr rather than rolling over into May.
 */
function addMonths(dateKey: string, months: number): string {
    if (!dateKey) return "";
    const [year, month, day] = dateKey.split("-").map(Number);
    if (!year || !month || !day) return "";
    const targetMonthIndex = month - 1 + months;
    const lastDayOfTargetMonth = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate();
    const result = new Date(Date.UTC(year, targetMonthIndex, Math.min(day, lastDayOfTargetMonth)));
    return result.toISOString().slice(0, 10);
}

const FILE_KIND_LABELS: Record<string, string> = {
    PROFILE_PHOTO: "รูปถ่าย",
    CITIZEN_ID: "สำเนาบัตรประชาชน",
    EDUCATION_CERT: "วุฒิการศึกษา",
    RESUME: "Resume",
    HOUSE_REGISTRATION: "ทะเบียนบ้าน",
    OTHER: "อื่นๆ",
};

function Row({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex justify-between gap-3 py-1">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
        </div>
    );
}

function HireDialogContent({
    application,
    stations,
    onClose,
    onHired,
}: {
    application: ApplicationDetail;
    stations: Station[];
    onClose: () => void;
    onHired: () => void;
}) {
    const [employeeId, setEmployeeId] = useState("");
    const [role, setRole] = useState("EMPLOYEE");
    const [stationId, setStationId] = useState(application.station?.id ?? "");
    const [departmentId, setDepartmentId] = useState(application.department?.id ?? "");
    const [hourlyRate, setHourlyRate] = useState("0");
    const [dailyRate, setDailyRate] = useState("0");
    const [baseSalary, setBaseSalary] = useState("0");
    const [otRateMultiplier, setOtRateMultiplier] = useState("1.5");
    const initialStartDate = new Date().toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(initialStartDate);
    const [probationEndDate, setProbationEndDate] = useState(() => addMonths(initialStartDate, PROBATION_MONTHS));
    const [probationDailyRate, setProbationDailyRate] = useState("");
    const [pin, setPin] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Every new hire starts on probation, so the end date follows the start date automatically.
    // It stays editable for the cases that don't fit the standard term.
    function handleStartDateChange(value: string) {
        setStartDate(value);
        setProbationEndDate(addMonths(value, PROBATION_MONTHS));
    }

    const selectedStation = stations.find((s) => s.id === stationId);

    async function submit() {
        if (!employeeId.trim() || !pin.trim()) {
            setError("กรุณากรอกรหัสพนักงานและ PIN");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/applications/${application.id}/hire`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: employeeId.trim(),
                    role,
                    stationId: stationId || undefined,
                    departmentId: departmentId || undefined,
                    hourlyRate: Number(hourlyRate),
                    dailyRate: Number(dailyRate),
                    baseSalary: Number(baseSalary),
                    otRateMultiplier: Number(otRateMultiplier),
                    startDate,
                    probationEndDate: probationEndDate || undefined,
                    probationDailyRate: probationDailyRate.trim() ? Number(probationDailyRate) : undefined,
                    pin: pin.trim(),
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setError(json.error || "จ้างงานไม่สำเร็จ");
                return;
            }
            toast.success("จ้างงานสำเร็จ");
            onHired();
        } finally {
            setBusy(false);
        }
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>จ้าง {application.name} เป็นพนักงาน</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label>รหัสพนักงาน *</Label>
                        <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>PIN *</Label>
                        <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={6} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label>ตำแหน่งระดับ</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EMPLOYEE">พนักงาน</SelectItem>
                                <SelectItem value="CASHIER">เสมียน</SelectItem>
                                <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>วันที่เริ่มงาน</Label>
                        <Input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label>สาขา</Label>
                        <Select value={stationId} onValueChange={(v) => { setStationId(v); setDepartmentId(""); }}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {stations.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>แผนก</Label>
                        <Select value={departmentId} onValueChange={setDepartmentId} disabled={!selectedStation?.departments.length}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {selectedStation?.departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label>ค่าแรง/ชม.</Label>
                        <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>ค่าแรง/วัน</Label>
                        <Input type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>เงินเดือน</Label>
                        <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>อัตรา OT (เท่า)</Label>
                        <Input type="number" step="0.1" value={otRateMultiplier} onChange={(e) => setOtRateMultiplier(e.target.value)} />
                    </div>
                </div>
                <div className="rounded-lg border p-3 space-y-3">
                    <p className="text-sm font-medium">ช่วงทดลองงาน</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>วันสิ้นสุดทดลองงาน</Label>
                            <Input type="date" value={probationEndDate} onChange={(e) => setProbationEndDate(e.target.value)} />
                            <p className="text-xs text-muted-foreground">ตั้งอัตโนมัติ {PROBATION_MONTHS} เดือนจากวันเริ่มงาน แก้ไขได้</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>ค่าแรง/วัน ช่วงทดลองงาน</Label>
                            <Input
                                type="number"
                                placeholder="เว้นว่าง = ใช้เรทปกติ"
                                value={probationDailyRate}
                                onChange={(e) => setProbationDailyRate(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">ถึงวันสิ้นสุดใช้เรทนี้ หลังจากนั้นใช้เรทปกติอัตโนมัติ</p>
                        </div>
                    </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
                <Button type="button" onClick={submit} disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    ยืนยันจ้างงาน
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
