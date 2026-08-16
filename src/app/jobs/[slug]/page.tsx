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
        <div className="min-h-dvh bg-muted/30">
            <div className="max-w-2xl mx-auto p-4 pb-28">
                <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground pt-4 hover:text-foreground">
                    <ArrowLeft className="size-4" />ตำแหน่งงานทั้งหมด
                </Link>

                <header className="pt-4 pb-4">
                    <h1 className="text-2xl font-bold">{opening.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{companyName}</p>
                </header>

                <div className="rounded-lg border bg-background p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                            <MapPin className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">สถานที่ทำงาน</p>
                                <p>{opening.station?.name ?? "ทุกสาขา"}{opening.department ? ` · ${opening.department.name}` : ""}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <Wallet className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-muted-foreground text-xs">ค่าตอบแทน</p>
                                <p>{formatSalaryRange(
                                    opening.salaryMin ? Number(opening.salaryMin) : null,
                                    opening.salaryMax ? Number(opening.salaryMax) : null,
                                    opening.salaryNote,
                                )}</p>
                            </div>
                        </div>
                        {opening.employmentType && (
                            <div className="flex items-start gap-2">
                                <Briefcase className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-muted-foreground text-xs">ประเภทการจ้าง</p>
                                    <p>{EMPLOYMENT_TYPE_LABELS[opening.employmentType] ?? opening.employmentType}</p>
                                </div>
                            </div>
                        )}
                        {opening.positionsAvailable && (
                            <div className="flex items-start gap-2">
                                <Users className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-muted-foreground text-xs">จำนวนที่รับ</p>
                                    <p>{opening.positionsAvailable} อัตรา</p>
                                </div>
                            </div>
                        )}
                        {opening.closesAt && (
                            <div className="flex items-start gap-2">
                                <CalendarClock className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-muted-foreground text-xs">ปิดรับสมัคร</p>
                                    <p>{new Date(opening.closesAt).toLocaleDateString("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric" })}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4 space-y-4">
                        <TextBlock title="รายละเอียดงาน" body={opening.description} />
                        <TextBlock title="หน้าที่รับผิดชอบ" body={opening.responsibilities} />
                        <TextBlock title="คุณสมบัติผู้สมัคร" body={opening.requirements} />
                        <TextBlock title="สวัสดิการ" body={opening.benefits} />
                    </div>

                    {opening.station?.address && (
                        <div className="border-t pt-4">
                            <h2 className="font-semibold mb-1">ที่อยู่</h2>
                            <p className="text-sm text-muted-foreground">{opening.station.address}</p>
                        </div>
                    )}
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                    กรุณาอ่านรายละเอียดให้ครบก่อนกดสมัคร เพื่อไม่ต้องเสียเวลากรอกข้อมูลหากไม่ตรงกับที่ต้องการ
                </p>
            </div>

            <div className="fixed bottom-0 inset-x-0 bg-background border-t p-3">
                <div className="max-w-2xl mx-auto">
                    {open ? (
                        <Link href={`/apply?opening=${encodeURIComponent(opening.slug)}`} className="block">
                            <Button className="w-full" size="lg">สมัครตำแหน่งนี้</Button>
                        </Link>
                    ) : (
                        <Button className="w-full" size="lg" disabled>ปิดรับสมัครแล้ว</Button>
                    )}
                </div>
            </div>
        </div>
    );
}
