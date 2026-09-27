"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    BadgeCheck,
    Camera,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    Clock3,
    ExternalLink,
    FileImage,
    History,
    IdCard,
    Loader2,
    QrCode,
    RefreshCw,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Store,
    UserRound,
    Users,
    XCircle,
} from "lucide-react";

type Registration = {
    id: string;
    userId: string;
    csrId: string;
    outletCode: string;
    status: string;
    reason: string;
    reviewNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
    reviewedBy?: { name: string } | null;
    user: { name: string; employeeId: string };
    station: { name: string };
    assets: { id: string }[];
};

type Data = {
    actorId: string;
    registrations: Registration[];
    outlets: { stationId: string; outletCode: string; station: { name: string } }[];
    unregistered: { id: string; name: string; employeeId: string; station: { name: string } | null }[];
};

type StatusMeta = {
    label: string;
    icon: ComponentType<{ className?: string }>;
    className: string;
    dotClassName: string;
};

const STATUS: Record<string, StatusMeta> = {
    PENDING: {
        label: "รอตรวจสอบ",
        icon: Clock3,
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/45 dark:text-amber-200",
        dotClassName: "bg-amber-500",
    },
    ACTIVE: {
        label: "ยืนยันแล้ว",
        icon: BadgeCheck,
        className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-200",
        dotClassName: "bg-emerald-500",
    },
    REJECTED: {
        label: "ส่งกลับให้แก้ไข",
        icon: CircleAlert,
        className: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/45 dark:text-red-200",
        dotClassName: "bg-red-500",
    },
    WITHDRAWN: {
        label: "ยกเลิกคำขอ",
        icon: RotateCcw,
        className: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
        dotClassName: "bg-zinc-400",
    },
    REPLACED: {
        label: "เปลี่ยนรหัสแล้ว",
        icon: History,
        className: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/45 dark:text-sky-200",
        dotClassName: "bg-sky-500",
    },
};

const fieldClass =
    "mt-2 w-full rounded-2xl border border-zinc-300/80 bg-white/85 px-4 py-3.5 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-50 dark:focus:border-red-500";

const primaryButton =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white shadow-[0_3px_0_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100";

function statusMeta(status: string): StatusMeta {
    return STATUS[status] ?? {
        label: status,
        icon: CircleAlert,
        className: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
        dotClassName: "bg-zinc-400",
    };
}

function formatBangkok(value: string) {
    return new Date(value).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function StatusBadge({ status }: { status: string }) {
    const meta = statusMeta(status);
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} />
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
        </span>
    );
}

function Notice({
    kind,
    children,
}: {
    kind: "error" | "success";
    children: React.ReactNode;
}) {
    const isError = kind === "error";
    return (
        <div
            role={isError ? "alert" : "status"}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold shadow-sm ${
                isError
                    ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/45 dark:text-red-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/45 dark:text-emerald-100"
            }`}
        >
            {isError ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
            <span>{children}</span>
        </div>
    );
}

function EvidenceGrid({ assets }: { assets: { id: string }[] }) {
    if (!assets.length) return null;
    return (
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            {assets.map((asset, index) => (
                <a
                    key={asset.id}
                    href={`/api/assets/${asset.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                    <div
                        className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.03]"
                        style={{ backgroundImage: `url("/api/assets/${asset.id}")` }}
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/55 to-transparent px-3 pb-2.5 pt-8 text-white">
                        <span className="text-[11px] font-black">รูปบัตร {index + 1}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                </a>
            ))}
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
    tone: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.13em] text-zinc-400">{label}</p>
                    <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-zinc-950 dark:text-white">{value}</p>
                </div>
                <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

export function KebdaoPage({ review = false }: { review?: boolean }) {
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [csrId, setCsrId] = useState("");
    const [reason, setReason] = useState("ลงทะเบียนครั้งแรก");
    const [files, setFiles] = useState<File[]>([]);
    const [confirmed, setConfirmed] = useState(false);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [filter, setFilter] = useState("PENDING");
    const [fileInputKey, setFileInputKey] = useState(0);

    const load = useCallback(async () => {
        const response = await fetch(`/api/kebdao${review ? "?review=1" : ""}`, { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error);
        setData(json);
    }, [review]);

    useEffect(() => {
        load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ"));
    }, [load]);

    const pending = data?.registrations.some((registration) => registration.status === "PENDING") ?? false;
    const active = data?.registrations.find((registration) => registration.status === "ACTIVE");
    const outlet = data?.outlets[0];

    useEffect(() => {
        if (!review && data) {
            setReason(active ? "ขอเปลี่ยนรหัส" : "ลงทะเบียนครั้งแรก");
        }
    }, [active, data, review]);

    const filteredRegistrations = useMemo(
        () => data?.registrations.filter((registration) => !review || filter === "ALL" || registration.status === filter) ?? [],
        [data?.registrations, filter, review],
    );

    const pendingCount = data?.registrations.filter((registration) => registration.status === "PENDING").length ?? 0;
    const activeCount = data?.registrations.filter((registration) => registration.status === "ACTIVE").length ?? 0;

    async function run(work: () => Promise<void>) {
        setBusy(true);
        setError("");
        setMessage("");
        try {
            await work();
            await load();
            setMessage("บันทึกเรียบร้อยแล้ว");
        } catch (runError) {
            setError(runError instanceof Error ? runError.message : "ดำเนินการไม่สำเร็จ");
        } finally {
            setBusy(false);
        }
    }

    async function mutate(body: object, method = "PATCH") {
        const response = await fetch("/api/kebdao", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error);
    }

    const shellClass = review
        ? "mx-auto max-w-7xl space-y-5"
        : "min-h-screen bg-[#eee8db] px-3 pb-28 pt-3 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 sm:px-5";

    return (
        <main className={shellClass}>
            <div className={review ? "space-y-5" : "mx-auto max-w-3xl space-y-3"}>
                <Link
                    href={review ? "/admin" : "/"}
                    className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-black text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {review ? "กลับแดชบอร์ดแอดมิน" : "กลับหน้าหลัก"}
                </Link>

                {review ? (
                    <section className="relative overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
                        <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-red-500/10 blur-2xl" />
                        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl">
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-black tracking-[0.15em] text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    KEBDAO VERIFICATION
                                </div>
                                <h1 className="text-3xl font-black tracking-[-0.045em] sm:text-4xl">ตรวจสอบรหัส Kebdao</h1>
                                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    ตรวจเจ้าของบัตรจากรหัส CSR และหลักฐานก่อนยืนยัน โดย ID สถานีอ้างอิงรหัสเดียวกับ VGCloud อัตโนมัติ
                                </p>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
                                <Sparkles className="h-4 w-4 text-red-500" />
                                ยอดสมัครและเงินรางวัล: ยังไม่มีข้อมูลจากบริษัท
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#d51d2f] via-[#c51226] to-[#8d0816] p-5 text-white shadow-[0_12px_34px_rgba(131,8,22,0.28)] sm:p-7">
                        <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full border-[28px] border-white/5" />
                        <div className="absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-white/5" />
                        <div className="relative">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black tracking-[0.18em]">
                                        <QrCode className="h-3.5 w-3.5" />
                                        KEBDAO MEMBER CAMPAIGN
                                    </div>
                                    <h1 className="mt-4 text-3xl font-black tracking-[-0.055em] sm:text-4xl">รหัส Kebdao ของฉัน</h1>
                                    <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-white/75">
                                        กรอกรหัส CSR จากบัตรที่บริษัทแจก แนบรูปบัตร แล้วส่งให้ผู้ดูแลสาขาตรวจสอบ
                                    </p>
                                </div>
                                <div className="hidden h-16 w-16 shrink-0 place-items-center rounded-3xl border border-white/20 bg-white/10 shadow-inner sm:grid">
                                    <IdCard className="h-8 w-8" />
                                </div>
                            </div>

                            <div className="mt-6 grid gap-2 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[9px] font-black tracking-[0.16em] text-white/60">STATION / OUTLET ID</p>
                                    <p className="mt-1 text-sm font-black">
                                        {outlet ? `${outlet.station.name} · ID ${outlet.outletCode}` : "ยังไม่พบรหัส VGCloud"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[9px] font-black tracking-[0.16em] text-white/60">CURRENT CSR</p>
                                    <p className="mt-1 font-mono text-lg font-black tracking-[0.08em]">
                                        {active?.csrId ?? (pending ? "PENDING" : "—")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {error && <Notice kind="error">{error}</Notice>}
                {message && <Notice kind="success">{message}</Notice>}

                {!data && !error && (
                    <div className="flex min-h-40 items-center justify-center rounded-3xl border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-red-500" />
                        <span className="text-sm font-bold text-zinc-500">กำลังโหลดข้อมูล…</span>
                    </div>
                )}

                {data && review && (
                    <>
                        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                            <StatCard label="รอตรวจ" value={pendingCount} icon={Clock3} tone="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" />
                            <StatCard label="ยืนยันแล้ว" value={activeCount} icon={BadgeCheck} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" />
                            <StatCard label="ยังไม่มีรายการ" value={data.unregistered.length} icon={Users} tone="bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300" />
                            <StatCard label="สาขาที่รองรับ" value={data.outlets.length} icon={Store} tone="bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" />
                        </section>

                        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex items-start gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                                    <Store className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-black">ID สถานีใช้รหัสเดียวกับ VGCloud</p>
                                    <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500">
                                        ระบบดึงจากรหัสสถานีอัตโนมัติ ไม่ต้องตั้งค่าแยกใน Kebdao และเก็บเลข 0 ด้านหน้าไว้ตามบัตร
                                    </p>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {data.outlets.length ? data.outlets.map((mappedOutlet) => (
                                            <div key={mappedOutlet.stationId} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                                                <span className="truncate text-xs font-bold">{mappedOutlet.station.name}</span>
                                                <span className="font-mono text-sm font-black text-red-600 dark:text-red-300">{mappedOutlet.outletCode}</span>
                                            </div>
                                        )) : (
                                            <p className="text-xs font-medium text-zinc-500">ยังไม่พบสาขาที่รองรับ</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-black tracking-[0.15em] text-zinc-400">REVIEW QUEUE</p>
                                    <h2 className="mt-0.5 text-xl font-black">รายการลงทะเบียน</h2>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {["PENDING", "ACTIVE", "REJECTED", "REPLACED", "WITHDRAWN", "ALL"].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setFilter(status)}
                                            className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                                                filter === status
                                                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                                                    : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                                            }`}
                                        >
                                            {status === "ALL" ? "ทั้งหมด" : statusMeta(status).label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {filteredRegistrations.length === 0 ? (
                            <div className="grid min-h-44 place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white/70 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
                                <div>
                                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                                    <p className="mt-2 text-sm font-black">ไม่มีรายการในสถานะนี้</p>
                                    <p className="mt-1 text-xs text-zinc-500">คิวส่วนนี้เรียบร้อยแล้ว</p>
                                </div>
                            </div>
                        ) : (
                            <section className="space-y-3">
                                {filteredRegistrations.map((row) => (
                                    <article key={row.id} className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                                        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(210px,0.6fr)]">
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300">
                                                            <UserRound className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-base font-black">{row.user.name}</h3>
                                                            <p className="text-xs font-bold text-zinc-500">{row.user.employeeId} · {row.station.name}</p>
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={row.status} />
                                                </div>

                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                                                        <p className="text-[9px] font-black tracking-[0.14em] text-zinc-400">OUTLET ID</p>
                                                        <p className="mt-1 font-mono text-lg font-black tracking-[0.08em]">{row.outletCode}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-950/70 dark:bg-red-950/25">
                                                        <p className="text-[9px] font-black tracking-[0.14em] text-red-400">CSR ID</p>
                                                        <p className="mt-1 font-mono text-lg font-black tracking-[0.08em] text-red-700 dark:text-red-200">{row.csrId}</p>
                                                    </div>
                                                </div>

                                                <div className="text-xs font-medium leading-relaxed text-zinc-500">
                                                    <p><strong className="text-zinc-700 dark:text-zinc-300">ส่งเมื่อ:</strong> {formatBangkok(row.createdAt)}</p>
                                                    <p className="mt-1"><strong className="text-zinc-700 dark:text-zinc-300">เหตุผล:</strong> {row.reason}</p>
                                                    {row.reviewedAt && (
                                                        <p className="mt-1">
                                                            <strong className="text-zinc-700 dark:text-zinc-300">ตรวจโดย:</strong> {row.reviewedBy?.name ?? "ผู้ดูแล"} · {formatBangkok(row.reviewedAt)}
                                                        </p>
                                                    )}
                                                </div>

                                                {row.reviewNote && (
                                                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                                                        หมายเหตุ: {row.reviewNote}
                                                    </div>
                                                )}

                                                <EvidenceGrid assets={row.assets} />
                                            </div>

                                            {row.status === "PENDING" && (
                                                row.userId === data.actorId ? (
                                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-relaxed text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200">
                                                        <ShieldCheck className="mb-2 h-5 w-5" />
                                                        ต้องให้ผู้ตรวจสอบคนอื่นตรวจรายการของคุณ ระบบไม่อนุญาตให้อนุมัติรายการของตนเอง
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/55">
                                                        <p className="text-xs font-black">ผลการตรวจ</p>
                                                        <p className="mt-1 text-[11px] font-medium leading-relaxed text-zinc-500">เทียบ CSR ID กับรูปบัตรก่อนกดยืนยัน หากไม่ตรงให้ระบุเหตุผลแล้วส่งกลับ</p>
                                                        <label className="mt-4 block text-xs font-black text-zinc-600 dark:text-zinc-300">
                                                            หมายเหตุ / เหตุผลที่ส่งกลับ
                                                            <textarea
                                                                rows={3}
                                                                maxLength={500}
                                                                className={fieldClass}
                                                                value={notes[row.id] ?? ""}
                                                                onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })}
                                                                placeholder="เช่น รูปไม่ชัด / CSR ID ไม่ตรงกับบัตร"
                                                            />
                                                        </label>
                                                        <div className="mt-4 grid gap-2">
                                                            <button
                                                                disabled={busy}
                                                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                                                onClick={() => void run(() => mutate({ action: "approve", id: row.id, note: notes[row.id] }))}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                                ยืนยันเจ้าของบัตร
                                                            </button>
                                                            <button
                                                                disabled={busy || !notes[row.id]?.trim()}
                                                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-45 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
                                                                onClick={() => void run(() => mutate({ action: "reject", id: row.id, note: notes[row.id] }))}
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                                ส่งกลับให้แก้ไข
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </section>
                        )}

                        <details className="group rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/45 dark:text-sky-300">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-black">พนักงานที่ยังไม่มีรายการปัจจุบัน</p>
                                        <p className="text-xs text-zinc-500">{data.unregistered.length} คน</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-zinc-400 transition group-open:rotate-90" />
                            </summary>
                            <div className="mt-4 grid gap-2 border-t border-zinc-100 pt-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-zinc-800">
                                {data.unregistered.length ? data.unregistered.map((employee) => (
                                    <div key={employee.id} className="rounded-2xl border border-zinc-200 px-3.5 py-3 dark:border-zinc-800">
                                        <p className="text-sm font-black">{employee.name}</p>
                                        <p className="mt-0.5 text-[11px] font-bold text-zinc-500">{employee.employeeId} · {employee.station?.name ?? "ไม่มีสาขา"}</p>
                                    </div>
                                )) : (
                                    <p className="text-sm font-medium text-zinc-500">ทุกคนมีรายการปัจจุบันแล้ว</p>
                                )}
                            </div>
                        </details>
                    </>
                )}

                {data && !review && (
                    <>
                        <section className="grid grid-cols-3 gap-2 rounded-[22px] border border-zinc-700/20 bg-white/70 p-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/70">
                            {[
                                ["1", "กรอกรหัส", "CSR ID"],
                                ["2", "แนบรูป", "1–2 รูป"],
                                ["3", "รอตรวจ", "ก่อนใช้งาน"],
                            ].map(([step, title, detail]) => (
                                <div key={step} className="rounded-2xl px-2 py-2.5 text-center">
                                    <div className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-zinc-950 text-[10px] font-black text-white dark:bg-white dark:text-zinc-950">{step}</div>
                                    <p className="mt-1.5 text-[11px] font-black">{title}</p>
                                    <p className="text-[8px] font-bold text-zinc-400">{detail}</p>
                                </div>
                            ))}
                        </section>

                        {active && (
                            <section className="overflow-hidden rounded-[22px] border border-emerald-300/80 bg-emerald-50 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/35">
                                <div className="flex items-center gap-3 p-4">
                                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-inner">
                                        <BadgeCheck className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] font-black tracking-[0.14em] text-emerald-600 dark:text-emerald-300">APPROVED CSR</p>
                                        <p className="mt-0.5 font-mono text-xl font-black tracking-[0.09em] text-emerald-900 dark:text-emerald-100">{active.csrId}</p>
                                        <p className="mt-0.5 truncate text-[11px] font-bold text-emerald-700/70 dark:text-emerald-300/70">ID {active.outletCode} · {active.station.name}</p>
                                    </div>
                                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                                </div>
                            </section>
                        )}

                        {!outlet && (
                            <section className="rounded-[22px] border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
                                <div className="flex items-start gap-3">
                                    <Store className="mt-0.5 h-5 w-5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-black">ยังไม่พบรหัสสถานี VGCloud</p>
                                        <p className="mt-1 text-xs font-medium leading-relaxed opacity-75">สาขานี้ยังไม่มี mapping รหัสสถานีสำหรับ Kebdao กรุณาแจ้งผู้ดูแลระบบ</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {pending ? (
                            <section className="rounded-[22px] border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30">
                                <div className="flex items-start gap-3">
                                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white">
                                        <Clock3 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-amber-900 dark:text-amber-100">ส่งคำขอแล้ว · รอตรวจสอบ</p>
                                        <p className="mt-1 text-xs font-medium leading-relaxed text-amber-800/75 dark:text-amber-200/75">ระหว่างรอตรวจจะส่งซ้ำไม่ได้ หากกรอกผิดให้ยกเลิกคำขอจากประวัติด้านล่างแล้วส่งใหม่</p>
                                    </div>
                                </div>
                            </section>
                        ) : outlet && (
                            <form
                                className="overflow-hidden rounded-[26px] border border-zinc-700/25 bg-[#faf6ed] shadow-[0_4px_0_rgba(0,0,0,0.06)] dark:border-white/15 dark:bg-zinc-900"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void run(async () => {
                                        if (!files.length || files.length > 2) throw new Error("กรุณาแนบรูปบัตร 1–2 รูป");
                                        const assetIds: string[] = [];
                                        for (const file of files) {
                                            if (file.size > 5 * 1024 * 1024) throw new Error("รูปแต่ละใบต้องไม่เกิน 5 MB");
                                            const form = new FormData();
                                            form.set("kind", "KEBDAO_CARD");
                                            form.set("file", file);
                                            const response = await fetch("/api/assets", { method: "POST", body: form });
                                            const json = await response.json();
                                            if (!response.ok) throw new Error(json.error);
                                            assetIds.push(json.id);
                                        }
                                        await mutate({ csrId, outletCode: outlet.outletCode, reason, assetIds, confirmed }, "POST");
                                        setCsrId("");
                                        setFiles([]);
                                        setConfirmed(false);
                                        setFileInputKey((key) => key + 1);
                                    });
                                }}
                            >
                                <div className="border-b border-zinc-700/15 bg-white/45 px-4 py-4 dark:border-white/10 dark:bg-white/[0.02] sm:px-5">
                                    <div className="flex items-center gap-3">
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-600 text-white shadow-[0_3px_0_rgba(127,29,29,0.25)]">
                                            <IdCard className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black tracking-[0.15em] text-red-500">EMPLOYEE REGISTRATION</p>
                                            <h2 className="text-lg font-black">{active ? "ขอเปลี่ยนรหัส" : "กรอกรหัสที่ได้รับ"}</h2>
                                            <p className="text-[11px] font-bold text-zinc-500">{outlet.station.name} · ID {outlet.outletCode}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5 p-4 sm:p-5">
                                    <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300">
                                        CSR ID
                                        <input
                                            required
                                            inputMode="numeric"
                                            pattern="[0-9]{1,32}"
                                            maxLength={32}
                                            aria-label="CSR ID"
                                            className={`${fieldClass} font-mono text-xl tracking-[0.12em]`}
                                            value={csrId}
                                            onChange={(event) => setCsrId(event.target.value)}
                                            placeholder="เช่น 039401"
                                        />
                                        <span className="mt-1.5 block text-[10px] font-medium text-zinc-400">กรอกตัวเลขตามบัตรทุกหลัก รวมเลข 0 ด้านหน้า</span>
                                    </label>

                                    <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300">
                                        เหตุผล
                                        <input
                                            required
                                            maxLength={500}
                                            className={fieldClass}
                                            value={reason}
                                            onChange={(event) => setReason(event.target.value)}
                                        />
                                    </label>

                                    <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300">
                                        รูปบัตร 1–2 รูป (รูปละไม่เกิน 5 MB)
                                        <div className="mt-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-white/65 p-4 transition hover:border-red-300 hover:bg-red-50/40 dark:border-zinc-700 dark:bg-zinc-950/45 dark:hover:border-red-800 dark:hover:bg-red-950/15">
                                            <div className="flex items-center gap-3">
                                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/45 dark:text-red-300">
                                                    <Camera className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-black">ถ่ายหรือเลือกรูปบัตร</p>
                                                    <p className="mt-0.5 text-[10px] font-medium text-zinc-400">JPG, PNG, WEBP · ส่งได้สูงสุด 2 รูป</p>
                                                </div>
                                                <span className="rounded-xl bg-zinc-950 px-3 py-2 text-[10px] font-black text-white dark:bg-white dark:text-zinc-950">เลือกไฟล์</span>
                                            </div>
                                            <input
                                                key={fileInputKey}
                                                required
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                multiple
                                                aria-label="รูปบัตร 1–2 รูป (รูปละไม่เกิน 5 MB)"
                                                className="mt-3 block w-full text-[11px] font-semibold text-zinc-500 file:hidden"
                                                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                                            />
                                        </div>
                                    </label>

                                    {files.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {files.map((file) => (
                                                <span key={`${file.name}-${file.size}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                                                    <FileImage className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                                    <span className="truncate">{file.name}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-[11px] font-semibold leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/45 dark:text-zinc-400">
                                        <p>บัตร LINE และ Kebdao ที่มี CSR ID เดียวกัน ให้ส่งในคำขอเดียว</p>
                                        <p className="mt-1">ยอดสมัครและเงินรางวัล: ยังไม่มีข้อมูลจากบริษัท จึงยังไม่แสดงยอดเงินในระบบ</p>
                                    </div>

                                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-white/60 p-3.5 text-xs font-bold leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/35 dark:text-zinc-300">
                                        <input
                                            type="checkbox"
                                            required
                                            checked={confirmed}
                                            onChange={(event) => setConfirmed(event.target.checked)}
                                            className="mt-0.5 h-4 w-4 accent-red-600"
                                        />
                                        <span>ฉันตรวจแล้วว่า ID สาขาตรงกับบัตรและเป็นบัตรที่ได้รับ</span>
                                    </label>

                                    <button disabled={busy} className={`${primaryButton} w-full bg-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-700`}>
                                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                        {busy ? "กำลังบันทึก…" : "ส่งให้ตรวจสอบ"}
                                    </button>
                                </div>
                            </form>
                        )}

                        <section className="overflow-hidden rounded-[24px] border border-zinc-700/20 bg-white/75 shadow-sm dark:border-white/10 dark:bg-zinc-900/75">
                            <div className="flex items-center justify-between gap-3 border-b border-zinc-200/70 px-4 py-3.5 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <History className="h-4 w-4 text-zinc-500" />
                                    <h2 className="text-sm font-black">ประวัติการลงทะเบียน</h2>
                                </div>
                                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">{data.registrations.length} รายการ</span>
                            </div>

                            {data.registrations.length === 0 ? (
                                <div className="grid min-h-36 place-items-center p-6 text-center">
                                    <div>
                                        <QrCode className="mx-auto h-7 w-7 text-zinc-300" />
                                        <p className="mt-2 text-xs font-bold text-zinc-400">ยังไม่มีรายการ</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                                    {data.registrations.map((row) => (
                                        <article key={row.id} className="space-y-3 p-4 sm:p-5">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[9px] font-black tracking-[0.14em] text-zinc-400">CSR ID</p>
                                                    <p className="mt-0.5 font-mono text-lg font-black tracking-[0.09em]">{row.csrId}</p>
                                                    <p className="mt-0.5 text-[10px] font-bold text-zinc-500">{row.station.name} · ID {row.outletCode}</p>
                                                </div>
                                                <StatusBadge status={row.status} />
                                            </div>

                                            <div className="grid gap-1 text-[11px] font-medium leading-relaxed text-zinc-500">
                                                <p>ส่งเมื่อ {formatBangkok(row.createdAt)} · {row.reason}</p>
                                                {row.reviewedAt && (
                                                    <p>บันทึกสถานะโดย {row.reviewedBy?.name ?? "ผู้ดูแล"} · {formatBangkok(row.reviewedAt)}</p>
                                                )}
                                            </div>

                                            {row.reviewNote && (
                                                <div className="rounded-2xl bg-zinc-100 px-3.5 py-3 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                    หมายเหตุ: {row.reviewNote}
                                                </div>
                                            )}

                                            <EvidenceGrid assets={row.assets} />

                                            {row.status === "PENDING" && (
                                                <button
                                                    disabled={busy}
                                                    className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                                    onClick={() => void run(() => mutate({ action: "withdraw", id: row.id }))}
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                    ยกเลิกคำขอเพื่อแก้ไข
                                                </button>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
