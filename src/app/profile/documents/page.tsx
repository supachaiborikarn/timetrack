"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import {
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CircleCheck,
    Clock3,
    Download,
    FileText,
    Landmark,
    Loader2,
    ReceiptText,
} from "lucide-react";
import {
    type CompanyInfo,
    type PayslipPdfData,
} from "@/lib/pdf-generator";
import { formatPayrollDate } from "@/lib/payroll-document-format";
import { generatePaymentReceiptPDF, generatePayslipPDF } from "@/lib/payroll-pdf-download";
import { DEFAULT_PAYROLL_DOCUMENT_SETTINGS } from "@/lib/payroll-document-settings";
import { EmployeePageHeader } from "@/components/layout/EmployeePageHeader";

interface Payslip extends PayslipPdfData {
    id: string;
}

function formatCurrency(value: number | string | null | undefined) {
    return Number(value ?? 0).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getPayslipTotals(slip: Payslip) {
    const adjustment = Number(slip.adjustment ?? 0);
    const earnings = Number(slip.basePay)
        + Number(slip.overtimePay)
        + Math.max(0, adjustment)
        + Number(slip.specialIncome ?? 0);
    const deductions = Number(slip.latePenalty)
        + Number(slip.advanceDeduct)
        + Number(slip.otherDeduct)
        + Number(slip.socialSecurity ?? 0)
        + Number(slip.taxWithheld ?? 0)
        + Math.max(0, -adjustment);
    return { earnings, deductions };
}

function PaymentBadge({ status }: { status?: string | null }) {
    if (status === "PAID") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                <CircleCheck className="h-3 w-3" /> ชำระแล้ว
            </span>
        );
    }
    if (status === "FAILED") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-600/30 bg-red-500/15 px-2.5 py-0.5 text-[10px] font-black text-red-700 dark:text-red-400">
                ชำระไม่สำเร็จ
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-400">
            <Clock3 className="h-3 w-3" /> รอชำระ
        </span>
    );
}

export default function EmployeeDocumentsPage() {
    const { data: session, status } = useSession();
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_PAYROLL_DOCUMENT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingKey, setDownloadingKey] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!session?.user?.id) return;

        const fetchPayslips = async () => {
            try {
                const response = await fetch("/api/payslip");
                if (!response.ok) throw new Error("โหลดเอกสารไม่สำเร็จ");
                const data = await response.json();
                setPayslips(data.payslips || []);
                setCompanyInfo(data.companyInfo || DEFAULT_PAYROLL_DOCUMENT_SETTINGS);
            } catch (error) {
                console.error("Failed to fetch payslips:", error);
                toast.error("โหลดเอกสารเงินเดือนไม่สำเร็จ");
            } finally {
                setIsLoading(false);
            }
        };

        void fetchPayslips();
    }, [session?.user?.id]);

    const handlePayslipDownload = async (slip: Payslip) => {
        setDownloadingKey(`payslip-${slip.id}`);
        try {
            await generatePayslipPDF(slip, companyInfo);
            toast.success("ดาวน์โหลดสลิปเงินเดือนเรียบร้อย");
        } catch (error) {
            console.error("Generate payslip error:", error);
            toast.error("สร้างสลิปเงินเดือนไม่สำเร็จ");
        } finally {
            setDownloadingKey("");
        }
    };

    const handleReceiptDownload = async (slip: Payslip) => {
        setDownloadingKey(`receipt-${slip.id}`);
        try {
            await generatePaymentReceiptPDF(slip, companyInfo);
            toast.success("ดาวน์โหลดหลักฐานการจ่ายเงินเรียบร้อย");
        } catch (error) {
            console.error("Generate payment receipt error:", error);
            toast.error("หลักฐานการจ่ายจะดาวน์โหลดได้หลังบันทึกว่าชำระแล้ว");
        } finally {
            setDownloadingKey("");
        }
    };

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#eee8db] dark:bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-[#fbbf24]" />
            </div>
        );
    }
    if (!session) redirect("/login");

    const paidCount = payslips.filter((slip) => slip.paymentStatus === "PAID").length;
    const latestSlip = payslips[0] ?? null;

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#eee8db] pb-28 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
            <EmployeePageHeader
                eyebrow="PAYROLL DOCUMENTS"
                title="เอกสารเงินเดือนของฉัน"
                subtitle="สลิปเงินเดือนและหลักฐานการจ่าย"
                backHref="/profile"
            />

            <main className="mx-auto max-w-[470px] space-y-3 px-3 pb-8 pt-3">
                {/* Summary Instrument Panel */}
                <section className="tt-retro-enter overflow-hidden rounded-[20px] border-2 border-zinc-800/80 bg-zinc-950 text-white shadow-[0_4px_0_rgba(0,0,0,0.16)] dark:border-white/20">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div>
                            <p className="font-mono text-[9px] font-black tracking-[0.2em] text-[#fbbf24]">PAYSLIP SUMMARY</p>
                            <h2 className="mt-0.5 text-[15px] font-black">ประวัติเอกสารเงินเดือน</h2>
                        </div>
                        {payslips.length > 0 && (
                            paidCount === payslips.length ? (
                                <span className="flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> จ่ายครบทุกงวด
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-300">
                                    <Clock3 className="h-3 w-3" /> รอชำระ {payslips.length - paidCount} งวด
                                </span>
                            )
                        )}
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-white/10">
                        <div className="px-2 py-3 text-center">
                            <p className="font-mono text-[20px] font-black leading-none text-[#fbbf24]">{payslips.length}</p>
                            <p className="mt-1 text-[8px] font-black text-zinc-400">งวดทั้งหมด</p>
                            <p className="text-[7px] font-bold text-zinc-500">รอบที่ปิดแล้ว</p>
                        </div>
                        <div className="px-2 py-3 text-center">
                            <p className="font-mono text-[20px] font-black leading-none text-emerald-400">{paidCount}</p>
                            <p className="mt-1 text-[8px] font-black text-zinc-400">ชำระแล้ว</p>
                            <p className="text-[7px] font-bold text-zinc-500">มีหลักฐานจ่าย</p>
                        </div>
                        <div className="px-2 py-3 text-center">
                            <p className="font-mono text-[16px] font-black leading-none text-white truncate">
                                {latestSlip ? `฿${formatCurrency(latestSlip.netPay)}` : "-"}
                            </p>
                            <p className="mt-1 text-[8px] font-black text-zinc-400">สุทธิล่าสุด</p>
                            <p className="text-[7px] font-bold text-zinc-500 truncate">{latestSlip?.period.name || "ไม่มีข้อมูล"}</p>
                        </div>
                    </div>

                    <div className="border-t border-white/10 bg-white/[0.02] px-4 py-2 text-[10px] font-bold text-zinc-400 flex items-center justify-between">
                        <span>พร้อมดาวน์โหลดสลิปและใบรับเงิน</span>
                        <span className="text-[9px] text-[#fbbf24] font-mono">PDF ARCHIVE</span>
                    </div>
                </section>

                {/* Section Title */}
                <div className="flex items-center justify-between px-1 pt-1">
                    <div>
                        <p className="font-mono text-[9px] font-black tracking-[0.18em] text-zinc-500">PAYROLL SLIPS</p>
                        <h2 className="text-[15px] font-black">รายการสลิปเงินเดือน</h2>
                    </div>
                    {payslips.length > 0 && (
                        <span className="text-[10px] font-bold text-zinc-500">{payslips.length} รายการ</span>
                    )}
                </div>

                {/* Content Area */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-[#fbbf24]" />
                    </div>
                ) : payslips.length === 0 ? (
                    <section className="tt-paper-card tt-instrument-frame rounded-[20px] border-2 border-zinc-800/70 p-8 text-center dark:border-white/25">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-zinc-700/30 bg-[#fbbf24]/15">
                            <FileText className="h-7 w-7 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <p className="mt-3 text-[15px] font-black">ยังไม่มีเอกสารเงินเดือน</p>
                        <p className="mt-1 text-[11px] font-bold text-zinc-500">
                            เอกสารสลิปและใบรับเงินจะแสดงหลังจากผู้ดูแลระบบประมวลผลและปิดงวดเงินเดือน
                        </p>
                    </section>
                ) : (
                    <div className="space-y-3">
                        {payslips.map((slip) => {
                            const totals = getPayslipTotals(slip);
                            const isPaid = slip.paymentStatus === "PAID";
                            const isExpanded = expandedId === slip.id;

                            return (
                                <section
                                    key={slip.id}
                                    className="tt-paper-card tt-instrument-frame overflow-hidden rounded-[20px] border-2 border-zinc-800/70 dark:border-white/25"
                                >
                                    {/* Card Header */}
                                    <div className="border-b border-zinc-700/20 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4 text-[#fbbf24] shrink-0" />
                                                    <h3 className="truncate text-[15px] font-black">{slip.period.name || "งวดเงินเดือน"}</h3>
                                                </div>
                                                <p className="mt-0.5 text-[11px] font-bold text-zinc-500">
                                                    {formatPayrollDate(slip.period.startDate)} — {formatPayrollDate(slip.period.endDate)}
                                                </p>
                                            </div>

                                            <div className="shrink-0">
                                                <PaymentBadge status={slip.paymentStatus} />
                                            </div>
                                        </div>

                                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                            <div className="flex items-center gap-1.5 font-mono text-zinc-600 dark:text-zinc-400">
                                                <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-bold dark:bg-zinc-800 text-[9px]">DOC</span>
                                                <span>{slip.documentNumber || "-"}</span>
                                            </div>

                                            <div className="flex items-center gap-1 font-bold text-zinc-500">
                                                <Clock3 className="h-3.5 w-3.5 text-zinc-400" />
                                                <span>
                                                    {isPaid ? "ชำระเมื่อ: " : "กำหนดจ่าย: "}
                                                    <strong className="text-zinc-800 dark:text-zinc-200">
                                                        {formatPayrollDate(isPaid ? slip.paidAt : slip.period.payDate)}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial 3-Box Strip */}
                                    <div className="grid grid-cols-3 divide-x divide-zinc-700/15 border-b border-zinc-700/20 bg-white/40 p-2.5 dark:divide-white/10 dark:border-white/10 dark:bg-zinc-900/40">
                                        <div className="text-center px-1">
                                            <p className="text-[9px] font-black uppercase text-zinc-500">รายได้</p>
                                            <p className="mt-0.5 font-mono text-[13px] font-black text-blue-600 dark:text-blue-400 truncate">
                                                ฿{formatCurrency(totals.earnings)}
                                            </p>
                                        </div>
                                        <div className="text-center px-1">
                                            <p className="text-[9px] font-black uppercase text-zinc-500">รายการหัก</p>
                                            <p className="mt-0.5 font-mono text-[13px] font-black text-red-500 dark:text-red-400 truncate">
                                                -฿{formatCurrency(totals.deductions)}
                                            </p>
                                        </div>
                                        <div className="text-center px-1">
                                            <p className="text-[9px] font-black uppercase text-zinc-500">สุทธิ</p>
                                            <p className="mt-0.5 font-mono text-[14px] font-black text-emerald-600 dark:text-emerald-400 truncate">
                                                ฿{formatCurrency(slip.netPay)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Expandable Breakdown Toggle */}
                                    <div className="border-b border-zinc-700/15 px-3.5 py-2 dark:border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(isExpanded ? null : slip.id)}
                                            className="tt-retro-control flex w-full items-center justify-between text-[11px] font-black text-zinc-600 dark:text-zinc-400"
                                        >
                                            <span>{isExpanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียดรายได้และรายการหัก"}</span>
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Expanded Details Panel */}
                                    {isExpanded && (
                                        <div className="space-y-3 bg-zinc-100/70 p-3.5 text-[11px] dark:bg-zinc-950/70">
                                            <div>
                                                <p className="font-mono text-[8px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                    EARNINGS / รายได้
                                                </p>
                                                <div className="mt-1 space-y-1 divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
                                                    <div className="flex justify-between py-1 font-bold">
                                                        <span className="text-zinc-600 dark:text-zinc-400">
                                                            ค่าจ้างพื้นฐาน {slip.workDays ? `(${slip.workDays} วัน)` : ""}
                                                        </span>
                                                        <span>฿{formatCurrency(slip.basePay)}</span>
                                                    </div>
                                                    {Number(slip.overtimePay) > 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">
                                                                ค่าล่วงเวลา (OT) {slip.overtimeHours ? `(${slip.overtimeHours} ชม.)` : ""}
                                                            </span>
                                                            <span>฿{formatCurrency(slip.overtimePay)}</span>
                                                        </div>
                                                    )}
                                                    {Number(slip.specialIncome ?? 0) > 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">รายได้พิเศษ</span>
                                                            <span>฿{formatCurrency(slip.specialIncome)}</span>
                                                        </div>
                                                    )}
                                                    {Number(slip.adjustment ?? 0) > 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">เงินเพิ่มพิเศษ</span>
                                                            <span>฿{formatCurrency(slip.adjustment)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="font-mono text-[8px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                                                    DEDUCTIONS / รายการหัก
                                                </p>
                                                <div className="mt-1 space-y-1 divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
                                                    {Number(slip.latePenalty) > 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">หักมาสาย / ออกก่อน</span>
                                                            <span className="text-red-500">-฿{formatCurrency(slip.latePenalty)}</span>
                                                        </div>
                                                    )}
                                                    {Number(slip.advanceDeduct) > 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">หักเบิกค่าแรงล่วงหน้า</span>
                                                            <span className="text-red-500">-฿{formatCurrency(slip.advanceDeduct)}</span>
                                                        </div>
                                                    )}
                                                    {Number(slip.socialSecurity ?? 0) > 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">หักประกันสังคม</span>
                                                            <span className="text-red-500">-฿{formatCurrency(slip.socialSecurity)}</span>
                                                        </div>
                                                    )}
                                                    {Number(slip.taxWithheld ?? 0) > 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">หักภาษี ณ ที่จ่าย</span>
                                                            <span className="text-red-500">-฿{formatCurrency(slip.taxWithheld)}</span>
                                                        </div>
                                                    )}
                                                    {Number(slip.otherDeduct) > 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">หักอื่นๆ</span>
                                                            <span className="text-red-500">-฿{formatCurrency(slip.otherDeduct)}</span>
                                                        </div>
                                                    )}
                                                    {Number(slip.adjustment ?? 0) < 0 && (
                                                        <div className="flex justify-between py-1 font-bold">
                                                            <span className="text-zinc-600 dark:text-zinc-400">รายการปรับลดยอด</span>
                                                            <span className="text-red-500">-฿{formatCurrency(Math.abs(Number(slip.adjustment)))}</span>
                                                        </div>
                                                    )}
                                                    {totals.deductions === 0 && (
                                                        <div className="py-1 text-center font-bold text-zinc-400">
                                                            ไม่มีรายการหักในงวดนี้
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 p-3">
                                        <button
                                            type="button"
                                            disabled={Boolean(downloadingKey)}
                                            onClick={() => void handlePayslipDownload(slip)}
                                            className="tt-retro-control flex-1 h-11 rounded-xl border border-zinc-700/35 bg-[#f5ecdc] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black text-[12px] flex items-center justify-center gap-2 shadow-[0_2px_0_rgba(0,0,0,0.12)] disabled:opacity-60"
                                        >
                                            {downloadingKey === `payslip-${slip.id}` ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-[#fbbf24]" />
                                            ) : (
                                                <Download className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                                            )}
                                            <span>สลิปเงินเดือน</span>
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!isPaid || Boolean(downloadingKey)}
                                            onClick={() => void handleReceiptDownload(slip)}
                                            title={isPaid ? "ดาวน์โหลดหลักฐานการจ่ายเงิน" : "หลักฐานการจ่ายจะดาวน์โหลดได้หลังบันทึกว่าชำระแล้ว"}
                                            className={
                                                isPaid
                                                    ? "tt-retro-control flex-1 h-11 rounded-xl border border-emerald-600/50 bg-emerald-600 text-white font-black text-[12px] flex items-center justify-center gap-2 shadow-[0_2px_0_rgba(0,0,0,0.18)] hover:bg-emerald-500 disabled:opacity-60"
                                                    : "flex-1 h-11 rounded-xl border border-zinc-400/30 bg-zinc-200/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-600 font-bold text-[12px] flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                                            }
                                        >
                                            {downloadingKey === `receipt-${slip.id}` ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <ReceiptText className="h-4 w-4" />
                                            )}
                                            <span>{isPaid ? "ใบรับเงิน" : "รอชำระเงิน"}</span>
                                        </button>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}

                {/* Annual Tax Certificate (50 ทวิ) Section */}
                <section className="tt-paper-card tt-instrument-frame rounded-[20px] border-2 border-zinc-800/70 p-4 dark:border-white/25">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-500/30 bg-[#fbbf24]/20">
                            <Landmark className="h-5 w-5 text-[#b45309] dark:text-[#fbbf24]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-zinc-500">
                                TAX CERTIFICATE (50 TAWI)
                            </p>
                            <h3 className="text-[14px] font-black">หนังสือรับรองภาษีหัก ณ ที่จ่าย (50 ทวิ)</h3>
                        </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-zinc-700/15 bg-zinc-100/70 p-3 text-[11px] font-bold text-zinc-600 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400 leading-relaxed">
                        ระบบจะประมวลผลข้อมูลภาษีหัก ณ ที่จ่ายสะสมและเปิดให้ออกหนังสือรับรอง 50 ทวิ เมื่อสิ้นสุดปีภาษี หรือสามารถติดต่อฝ่ายบุคคลเพื่อขอเอกสารรับรอง
                    </div>
                </section>
            </main>
        </div>
    );
}
