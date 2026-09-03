import Link from "next/link";
import { MapPin, Briefcase, Wallet, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPayrollDocumentSettings } from "@/lib/server/payroll-document-settings";
import { EMPLOYMENT_TYPE_LABELS, formatSalaryRange } from "@/lib/job-opening";

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ closed?: string }> }) {
    const { closed } = await searchParams;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [openings, documentSettings] = await Promise.all([
        prisma.jobOpening.findMany({
            where: {
                isActive: true,
                OR: [{ closesAt: null }, { closesAt: { gte: today } }],
            },
            orderBy: { createdAt: "desc" },
            include: {
                station: { select: { name: true } },
                department: { select: { name: true } },
            },
        }),
        getPayrollDocumentSettings(),
    ]);

    const companyName = documentSettings.legalName || documentSettings.displayName;

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-16 font-sans text-zinc-950 dark:text-zinc-50">
            <div className="max-w-2xl mx-auto p-4 space-y-4">
                {/* Careers Header */}
                <header className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 p-5 shadow-[0_3px_0_rgba(0,0,0,0.06)] bg-zinc-950 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbf24]">CALTEX CAREERS</p>
                            <h1 className="text-xl font-black text-white mt-0.5">ร่วมงานกับเรา</h1>
                            <p className="text-xs text-zinc-400 mt-1">{companyName}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner">
                            <Briefcase className="w-6 h-6" />
                        </div>
                    </div>
                </header>

                {closed === "1" && (
                    <div className="tt-paper-card rounded-2xl border border-amber-500/40 bg-amber-500/15 p-3.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                        ตำแหน่งที่คุณเปิดมาปิดรับสมัครแล้ว — ด้านล่างคือตำแหน่งงานอื่นที่ยังเปิดรับอยู่
                    </div>
                )}

                {openings.length === 0 ? (
                    <div className="tt-paper-card tt-instrument-frame rounded-[22px] border border-dashed border-zinc-700/30 p-10 text-center">
                        <Users className="w-10 h-10 mx-auto text-zinc-400 mb-2" />
                        <p className="font-black text-sm text-zinc-800 dark:text-zinc-200">ขณะนี้ยังไม่มีตำแหน่งที่เปิดรับสมัคร</p>
                        <p className="text-xs text-zinc-500 mt-1">กรุณากลับมาตรวจสอบอีกครั้งในภายหลัง</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                                ตำแหน่งที่เปิดรับสมัคร ({openings.length} ตำแหน่ง)
                            </p>
                        </div>

                        {openings.map((o) => (
                            <Link key={o.id} href={`/jobs/${o.slug}`} className="block group">
                                <div className="tt-paper-card tt-instrument-frame rounded-[20px] border border-zinc-700/30 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all">
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="font-black text-base text-zinc-900 dark:text-zinc-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                                            {o.title}
                                        </h2>
                                        {o.positionsAvailable && (
                                            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shrink-0">
                                                <Users className="size-3" />รับ {o.positionsAvailable} อัตรา
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="size-3.5 text-zinc-400" />
                                            {o.station?.name ?? "ทุกสาขา"}{o.department ? ` · ${o.department.name}` : ""}
                                        </span>
                                        {o.employmentType && (
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="size-3.5 text-zinc-400" />
                                                {EMPLOYMENT_TYPE_LABELS[o.employmentType] ?? o.employmentType}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-mono">
                                            <Wallet className="size-3.5 text-[#fbbf24]" />
                                            {formatSalaryRange(
                                                o.salaryMin ? Number(o.salaryMin) : null,
                                                o.salaryMax ? Number(o.salaryMax) : null,
                                                o.salaryNote,
                                            )}
                                        </span>
                                    </div>

                                    {o.description && (
                                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed font-medium">
                                            {o.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-end mt-3 pt-2.5 border-t border-zinc-700/10 dark:border-white/5">
                                        <span className="text-xs font-black text-amber-700 dark:text-amber-400 group-hover:underline">
                                            ดูรายละเอียดและสมัคร →
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="pt-2 text-center">
                    <Link href="/apply/status" className="tt-retro-control inline-flex items-center gap-1.5 px-4 h-9 rounded-xl border border-zinc-700/20 bg-white/50 dark:bg-zinc-900/50 text-xs font-black text-zinc-700 dark:text-zinc-300 hover:border-zinc-700/40">
                        🔍 ตรวจสอบสถานะใบสมัครที่ส่งไปแล้ว
                    </Link>
                </div>
            </div>
        </div>
    );
}
