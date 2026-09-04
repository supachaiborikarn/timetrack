import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Briefcase, Wallet, Users, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPayrollDocumentSettings } from "@/lib/server/payroll-document-settings";
import { EMPLOYMENT_TYPE_LABELS, decodeSlugParam, formatSalaryRange, isOpeningOpen } from "@/lib/job-opening";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/** Renders newline-separated text as a bullet list, since HR types these as free-form lines. */
function TextBlock({ title, body }: { title: string; body: string | null }) {
    if (!body?.trim()) return null;
    const lines = body.split("\n").map((line) => line.trim()).filter(Boolean);

    return (
        <section className="space-y-2">
            <h2 className="font-semibold">{title}</h2>
            {lines.length > 1 ? (
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {lines.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{body}</p>
            )}
        </section>
    );
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug: rawSlug } = await params;
    const slug = decodeSlugParam(rawSlug);

    const [opening, documentSettings] = await Promise.all([
        prisma.jobOpening.findUnique({
            where: { slug },
            include: {
                station: { select: { name: true, address: true } },
                department: { select: { name: true } },
            },
        }),
        getPayrollDocumentSettings(),
    ]);

    if (!opening) notFound();

    const companyName = documentSettings.legalName || documentSettings.displayName;
    const open = isOpeningOpen(opening);

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50">
            <div className="max-w-2xl mx-auto p-4 space-y-4">
                <Link href="/jobs" className="tt-retro-control inline-flex items-center gap-1 text-xs font-black text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 pt-2">
                    <ArrowLeft className="size-4" /> ดูตำแหน่งงานทั้งหมด
                </Link>

                <header className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-5 shadow-[0_3px_0_rgba(0,0,0,0.06)] text-zinc-950 dark:text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">CALTEX CAREERS</p>
                    <h1 className="text-2xl font-black text-zinc-950 dark:text-white mt-1">{opening.title}</h1>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{companyName}</p>
                </header>

                <div className="tt-paper-card tt-instrument-frame rounded-[22px] border border-zinc-700/35 dark:border-white/15 p-5 space-y-5 shadow-[0_2px_0_rgba(0,0,0,0.05)]">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-start gap-2 p-2.5 rounded-xl border border-zinc-700/15 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40">
                            <MapPin className="size-4 mt-0.5 text-zinc-400 shrink-0" />
                            <div>
                                <p className="text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase">สถานที่ทำงาน</p>
                                <p className="font-bold text-zinc-900 dark:text-zinc-100">{opening.station?.name ?? "ทุกสาขา"}{opening.department ? ` · ${opening.department.name}` : ""}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-2.5 rounded-xl border border-zinc-700/15 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40">
                            <Wallet className="size-4 mt-0.5 text-[#fbbf24] shrink-0" />
                            <div>
                                <p className="text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase">ค่าตอบแทน</p>
                                <p className="font-black text-amber-700 dark:text-amber-400 font-mono">{formatSalaryRange(
                                    opening.salaryMin ? Number(opening.salaryMin) : null,
                                    opening.salaryMax ? Number(opening.salaryMax) : null,
                                    opening.salaryNote,
                                )}</p>
                            </div>
                        </div>
                        {opening.employmentType && (
                            <div className="flex items-start gap-2 p-2.5 rounded-xl border border-zinc-700/15 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40">
                                <Briefcase className="size-4 mt-0.5 text-zinc-400 shrink-0" />
                                <div>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase">ประเภทการจ้าง</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{EMPLOYMENT_TYPE_LABELS[opening.employmentType] ?? opening.employmentType}</p>
                                </div>
                            </div>
                        )}
                        {opening.positionsAvailable && (
                            <div className="flex items-start gap-2 p-2.5 rounded-xl border border-zinc-700/15 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40">
                                <Users className="size-4 mt-0.5 text-zinc-400 shrink-0" />
                                <div>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase">จำนวนที่รับ</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{opening.positionsAvailable} อัตรา</p>
                                </div>
                            </div>
                        )}
                        {opening.closesAt && (
                            <div className="flex items-start gap-2 p-2.5 rounded-xl border border-zinc-700/15 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 col-span-2">
                                <CalendarClock className="size-4 mt-0.5 text-zinc-400 shrink-0" />
                                <div>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase">ปิดรับสมัคร</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{new Date(opening.closesAt).toLocaleDateString("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric" })}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-zinc-700/15 dark:border-white/10 pt-4 space-y-4">
                        <TextBlock title="รายละเอียดงาน" body={opening.description} />
                        <TextBlock title="หน้าที่รับผิดชอบ" body={opening.responsibilities} />
                        <TextBlock title="คุณสมบัติผู้สมัคร" body={opening.requirements} />
                        <TextBlock title="สวัสดิการ" body={opening.benefits} />
                    </div>

                    {opening.station?.address && (
                        <div className="border-t border-zinc-700/15 dark:border-white/10 pt-4">
                            <h2 className="font-black text-xs uppercase tracking-wider text-zinc-500 mb-1">ที่อยู่สาขา</h2>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">{opening.station.address}</p>
                        </div>
                    )}
                </div>

                <p className="text-[11px] text-zinc-500 text-center font-medium">
                    กรุณาตรวจสอบคุณสมบัติให้ครบถ้วนก่อนส่งใบสมัคร
                </p>
            </div>

            <div className="fixed bottom-0 inset-x-0 bg-[#eee8db]/90 dark:bg-zinc-950/90 backdrop-blur border-t border-zinc-700/20 dark:border-white/10 p-3 z-30">
                <div className="max-w-2xl mx-auto">
                    {open ? (
                        <Link href={`/apply?opening=${encodeURIComponent(opening.slug)}`} className="block">
                            <Button className="w-full tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black h-12 text-base rounded-xl border border-black/20 shadow-md">
                                สมัครตำแหน่งนี้
                            </Button>
                        </Link>
                    ) : (
                        <Button className="w-full h-12 rounded-xl text-base font-bold" disabled>
                            ปิดรับสมัครแล้ว
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
