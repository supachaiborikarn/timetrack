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
        <div className="min-h-dvh bg-muted/30">
            <div className="max-w-2xl mx-auto p-4 pb-16">
                <header className="pt-6 pb-4">
                    <h1 className="text-2xl font-bold">ตำแหน่งงานที่เปิดรับ</h1>
                    <p className="text-sm text-muted-foreground mt-1">{companyName}</p>
                </header>

                {closed === "1" && (
                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 mb-4">
                        <p className="text-sm">
                            ตำแหน่งที่คุณเปิดมาปิดรับสมัครแล้ว — ด้านล่างคือตำแหน่งที่ยังเปิดรับอยู่
                        </p>
                    </div>
                )}

                {openings.length === 0 ? (
                    <div className="rounded-lg border bg-background p-8 text-center">
                        <p className="text-muted-foreground">ขณะนี้ยังไม่มีตำแหน่งที่เปิดรับสมัคร</p>
                        <p className="text-sm text-muted-foreground mt-2">กรุณากลับมาตรวจสอบอีกครั้งภายหลัง</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {openings.map((o) => (
                            <Link key={o.id} href={`/jobs/${o.slug}`} className="block">
                                <div className="rounded-lg border bg-background p-4 hover:border-primary transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="font-semibold text-base">{o.title}</h2>
                                        {o.positionsAvailable && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                                <Users className="size-3.5" />รับ {o.positionsAvailable} อัตรา
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="size-3.5" />
                                            {o.station?.name ?? "ทุกสาขา"}{o.department ? ` · ${o.department.name}` : ""}
                                        </span>
                                        {o.employmentType && (
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="size-3.5" />
                                                {EMPLOYMENT_TYPE_LABELS[o.employmentType] ?? o.employmentType}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Wallet className="size-3.5" />
                                            {formatSalaryRange(
                                                o.salaryMin ? Number(o.salaryMin) : null,
                                                o.salaryMax ? Number(o.salaryMax) : null,
                                                o.salaryNote,
                                            )}
                                        </span>
                                    </div>

                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{o.description}</p>
                                    <p className="text-sm text-primary font-medium mt-3">ดูรายละเอียด →</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="mt-6 text-center">
                    <Link href="/apply/status" className="text-sm text-muted-foreground underline">
                        ตรวจสอบสถานะใบสมัครที่ส่งไปแล้ว
                    </Link>
                </div>
            </div>
        </div>
    );
}
