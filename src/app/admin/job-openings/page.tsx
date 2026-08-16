"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, ExternalLink, Copy, Users, QrCode, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { EMPLOYMENT_TYPE_LABELS, formatSalaryRange, isOpeningOpen } from "@/lib/job-opening";
import { generateQRCodeSVG, downloadQRCodeSVG, printJobPoster } from "@/lib/qr-code";

type Station = { id: string; name: string; departments: { id: string; name: string }[] };

type Opening = {
    id: string;
    slug: string;
    title: string;
    description: string;
    responsibilities: string | null;
    requirements: string | null;
    benefits: string | null;
    employmentType: string | null;
    stationId: string | null;
    departmentId: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryNote: string | null;
    positionsAvailable: number | null;
    isActive: boolean;
    closesAt: string | null;
    applicationCount: number;
    station: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
};

const emptyForm = {
    title: "",
    description: "",
    responsibilities: "",
    requirements: "",
    benefits: "",
    employmentType: "",
    stationId: "",
    departmentId: "",
    salaryMin: "",
    salaryMax: "",
    salaryNote: "",
    positionsAvailable: "",
    isActive: true,
    closesAt: "",
};

export default function AdminJobOpeningsPage() {
    const { data: session, status } = useSession();
    const [openings, setOpenings] = useState<Opening[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qrOpening, setQrOpening] = useState<Opening | null>(null);
    const [companyName, setCompanyName] = useState("");

    const fetchOpenings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/job-openings");
            if (res.ok) setOpenings((await res.json()).openings);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!session?.user?.id) return;
        void fetchOpenings();
        fetch("/api/admin/stations").then((r) => r.json()).then((d) => setStations(d.stations ?? [])).catch(() => {});
        fetch("/api/admin/settings/payroll-documents")
            .then((r) => r.json())
            .then((d) => setCompanyName(d.settings?.legalName || d.settings?.displayName || ""))
            .catch(() => {});
    }, [session?.user?.id, fetchOpenings]);

    function openCreate() {
        setEditingId(null);
        setForm(emptyForm);
        setError(null);
        setDialogOpen(true);
    }

    function openEdit(o: Opening) {
        setEditingId(o.id);
        setForm({
            title: o.title,
            description: o.description,
            responsibilities: o.responsibilities ?? "",
            requirements: o.requirements ?? "",
            benefits: o.benefits ?? "",
            employmentType: o.employmentType ?? "",
            stationId: o.stationId ?? "",
            departmentId: o.departmentId ?? "",
            salaryMin: o.salaryMin?.toString() ?? "",
            salaryMax: o.salaryMax?.toString() ?? "",
            salaryNote: o.salaryNote ?? "",
            positionsAvailable: o.positionsAvailable?.toString() ?? "",
            isActive: o.isActive,
            closesAt: o.closesAt ? o.closesAt.slice(0, 10) : "",
        });
        setError(null);
        setDialogOpen(true);
    }

    async function save() {
        if (!form.title.trim()) return setError("กรุณากรอกชื่อตำแหน่ง");
        if (!form.description.trim()) return setError("กรุณากรอกรายละเอียดงาน");

        setBusy(true);
        setError(null);
        try {
            const url = editingId ? `/api/admin/job-openings/${editingId}` : "/api/admin/job-openings";
            const res = await fetch(url, {
                method: editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    employmentType: form.employmentType || null,
                    stationId: form.stationId || null,
                    departmentId: form.departmentId || null,
                    closesAt: form.closesAt || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) return setError(json.error || "บันทึกไม่สำเร็จ");

            toast.success(editingId ? "แก้ไขประกาศแล้ว" : "สร้างประกาศแล้ว");
            setDialogOpen(false);
            await fetchOpenings();
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: string) {
        const res = await fetch(`/api/admin/job-openings/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) {
            toast.error(json.error || "ลบไม่สำเร็จ");
            return;
        }
        toast.success("ลบประกาศแล้ว");
        await fetchOpenings();
    }

    async function toggleActive(o: Opening) {
        await fetch(`/api/admin/job-openings/${o.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !o.isActive }),
        });
        await fetchOpenings();
    }

    // Thai slugs must be encoded so the scanned/copied URL is valid for every reader.
    function jobUrl(slug: string) {
        return `${window.location.origin}/jobs/${encodeURIComponent(slug)}`;
    }

    /** Same link, shown unencoded — percent-encoded Thai is unreadable on a printed poster. */
    function jobUrlForDisplay(slug: string) {
        return `${window.location.origin}/jobs/${slug}`;
    }

    function copyLink(slug: string) {
        navigator.clipboard.writeText(jobUrl(slug));
        toast.success("คัดลอกลิงก์แล้ว");
    }

    function printPoster(o: Opening) {
        const details = [
            o.station?.name ? `สาขา ${o.station.name}` : "รับทุกสาขา",
            o.employmentType ? EMPLOYMENT_TYPE_LABELS[o.employmentType] ?? o.employmentType : "",
            formatSalaryRange(o.salaryMin, o.salaryMax, o.salaryNote),
            o.positionsAvailable ? `รับ ${o.positionsAvailable} อัตรา` : "",
        ];
        const opened = printJobPoster({
            url: jobUrl(o.slug),
            displayUrl: jobUrlForDisplay(o.slug),
            companyName: companyName || "รับสมัครงาน",
            title: o.title,
            details,
            footerNote: o.closesAt
                ? `ปิดรับสมัคร ${new Date(o.closesAt).toLocaleDateString("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric" })}`
                : undefined,
        });
        if (!opened) toast.error("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต pop-up แล้วลองใหม่");
    }

    if (status === "loading") {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) redirect("/admin");

    const selectedStation = stations.find((s) => s.id === form.stationId);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-xl font-bold">ประกาศรับสมัครงาน</h1>
                    <p className="text-sm text-muted-foreground">ผู้สมัครอ่านรายละเอียดก่อนกดสมัคร ลดคนกรอกผิดตำแหน่ง</p>
                </div>
                <div className="flex gap-2">
                    <a href="/jobs" target="_blank" rel="noreferrer">
                        <Button variant="outline"><ExternalLink className="size-4" />ดูหน้าประกาศ</Button>
                    </a>
                    <Button onClick={openCreate}><Plus className="size-4" />สร้างประกาศ</Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ตำแหน่ง</TableHead>
                                <TableHead>สาขา</TableHead>
                                <TableHead>ค่าตอบแทน</TableHead>
                                <TableHead>ผู้สมัคร</TableHead>
                                <TableHead>เปิดรับ</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="size-5 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : openings.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ยังไม่มีประกาศ — กด &quot;สร้างประกาศ&quot; เพื่อเริ่ม</TableCell></TableRow>
                            ) : (
                                openings.map((o) => (
                                    <TableRow key={o.id}>
                                        <TableCell>
                                            <div className="font-medium">{o.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                /jobs/{o.slug}
                                                {o.employmentType && ` · ${EMPLOYMENT_TYPE_LABELS[o.employmentType] ?? o.employmentType}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>{o.station?.name ?? "ทุกสาขา"}</TableCell>
                                        <TableCell>{formatSalaryRange(o.salaryMin, o.salaryMax, o.salaryNote)}</TableCell>
                                        <TableCell>
                                            {o.applicationCount > 0 ? (
                                                <a href="/admin/applications" className="flex items-center gap-1 underline">
                                                    <Users className="size-3.5" />{o.applicationCount}
                                                </a>
                                            ) : "0"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={o.isActive} onCheckedChange={() => toggleActive(o)} />
                                                {!isOpeningOpen(o) && o.isActive && <Badge variant="secondary">หมดเขต</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon-sm" variant="ghost" onClick={() => setQrOpening(o)} title="QR Code / ใบประกาศ"><QrCode className="size-4" /></Button>
                                                <Button size="icon-sm" variant="ghost" onClick={() => copyLink(o.slug)} title="คัดลอกลิงก์"><Copy className="size-4" /></Button>
                                                <Button size="icon-sm" variant="ghost" onClick={() => openEdit(o)} title="แก้ไข"><Pencil className="size-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon-sm" variant="ghost" className="text-destructive" title="ลบ"><Trash2 className="size-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>ลบประกาศ &quot;{o.title}&quot;?</AlertDialogTitle>
                                                            <AlertDialogDescription>ลบแล้วกู้คืนไม่ได้ ถ้ามีผู้สมัครแล้วจะลบไม่ได้ ให้ปิดรับสมัครแทน</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => remove(o.id)}>ยืนยันลบ</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "แก้ไขประกาศ" : "สร้างประกาศรับสมัคร"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label>ชื่อตำแหน่ง *</Label>
                            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น พนักงานหน้าลานปั๊มน้ำมัน" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>รายละเอียดงาน *</Label>
                            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="อธิบายลักษณะงานโดยรวม เวลาทำงาน วันหยุด ฯลฯ" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>หน้าที่รับผิดชอบ</Label>
                            <Textarea rows={3} value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} placeholder="ขึ้นบรรทัดใหม่แยกเป็นข้อ ๆ ได้" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>คุณสมบัติผู้สมัคร</Label>
                            <Textarea rows={3} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="เช่น อายุ 18 ปีขึ้นไป ทำงานเป็นกะได้" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>สวัสดิการ</Label>
                            <Textarea rows={3} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder="เช่น ประกันสังคม ชุดฟอร์ม เบี้ยขยัน" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>ประเภทการจ้าง</Label>
                                <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v })}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="ไม่ระบุ" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FULL_TIME">เต็มเวลา</SelectItem>
                                        <SelectItem value="PART_TIME">พาร์ทไทม์</SelectItem>
                                        <SelectItem value="DAILY">รายวัน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>จำนวนที่รับ</Label>
                                <Input type="number" min={1} value={form.positionsAvailable} onChange={(e) => setForm({ ...form, positionsAvailable: e.target.value })} placeholder="ไม่ระบุ" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>สาขา</Label>
                                <Select value={form.stationId} onValueChange={(v) => setForm({ ...form, stationId: v, departmentId: "" })}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="ทุกสาขา" /></SelectTrigger>
                                    <SelectContent>
                                        {stations.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>แผนก</Label>
                                <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })} disabled={!selectedStation?.departments.length}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="ไม่ระบุ" /></SelectTrigger>
                                    <SelectContent>
                                        {selectedStation?.departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label>เงินเดือนต่ำสุด</Label>
                                <Input type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>สูงสุด</Label>
                                <Input type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>หรือระบุเป็นข้อความ</Label>
                                <Input value={form.salaryNote} onChange={(e) => setForm({ ...form, salaryNote: e.target.value })} placeholder="ตามตกลง" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 items-end">
                            <div className="space-y-1.5">
                                <Label>ปิดรับสมัครวันที่</Label>
                                <Input type="date" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
                            </div>
                            <label className="flex items-center gap-2 text-sm pb-2">
                                <Switch checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
                                เปิดรับสมัคร
                            </label>
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
                        <Button onClick={save} disabled={busy}>
                            {busy && <Loader2 className="size-4 animate-spin" />}
                            {editingId ? "บันทึก" : "สร้างประกาศ"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!qrOpening} onOpenChange={(open) => { if (!open) setQrOpening(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>QR Code — {qrOpening?.title}</DialogTitle>
                    </DialogHeader>
                    {qrOpening && (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <div
                                    className="bg-white p-4 rounded-lg border"
                                    // The QR is generated locally from our own URL, never from user-supplied HTML.
                                    dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(jobUrl(qrOpening.slug), 240) }}
                                />
                            </div>
                            <p className="text-xs text-center text-muted-foreground break-all">{jobUrlForDisplay(qrOpening.slug)}</p>
                            <p className="text-sm text-center text-muted-foreground">
                                ติดไว้หน้าปั๊มให้ผู้สนใจสแกน จะเข้าหน้ารายละเอียดตำแหน่งนี้โดยตรง
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={() => downloadQRCodeSVG(jobUrl(qrOpening.slug), `QR-${qrOpening.slug}`)}>
                                    <Download className="size-4" />ดาวน์โหลด QR
                                </Button>
                                <Button onClick={() => printPoster(qrOpening)}>
                                    <Printer className="size-4" />พิมพ์ใบประกาศ
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
