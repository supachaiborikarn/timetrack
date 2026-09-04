"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useLanguage } from "@/lib/language-context";
import { EMPLOYMENT_TYPE_LABELS, formatSalaryRange } from "@/lib/job-opening";

type StatusResult = {
    refCode: string;
    status: string;
    positionTitle: string;
    stationName: string | null;
    createdAt: string;
    interviewAt: string | null;
    rejectReason: string | null;
    /** Null for applications submitted before job postings existed. */
    jobOpening: {
        slug: string;
        title: string;
        employmentType: string | null;
        salaryMin: number | null;
        salaryMax: number | null;
        salaryNote: string | null;
    } | null;
};

const WITHDRAWABLE_STATUSES = new Set(["SUBMITTED", "SCREENING", "INTERVIEW", "OFFERED"]);

export default function ApplyStatusPage() {
    const { t } = useLanguage();
    const [ref, setRef] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<StatusResult | null>(null);

    async function handleCheck() {
        // Validate on press rather than disabling the button: a disabled button with no
        // explanation leaves the applicant stuck, especially since the ref-code placeholder
        // looks like a filled-in value.
        if (!ref.trim()) {
            setError(t("applyStatus.errRefRequired"));
            setResult(null);
            return;
        }
        if (!phone.trim()) {
            setError(t("applyStatus.errPhoneRequired"));
            setResult(null);
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const params = new URLSearchParams({ ref: ref.trim(), phone: phone.trim() });
            const res = await fetch(`/api/applications/status?${params.toString()}`);
            const json = await res.json();
            if (!res.ok) {
                setError(json.error || t("applyStatus.notFound"));
                return;
            }
            setResult(json);
        } catch {
            setError(t("applyStatus.errGeneric"));
        } finally {
            setLoading(false);
        }
    }

    async function handleWithdraw() {
        setWithdrawing(true);
        try {
            const res = await fetch("/api/applications/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ref: ref.trim(), phone: phone.trim() }),
            });
            const json = await res.json();
            if (!res.ok) {
                setError(json.error || t("applyStatus.errGeneric"));
                return;
            }
            await handleCheck();
        } finally {
            setWithdrawing(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#eee8db] dark:bg-zinc-950 p-4 font-sans text-zinc-950 dark:text-zinc-50">
            <div className="max-w-md mx-auto pt-6 pb-12 space-y-4">
                <Link href="/jobs" className="tt-retro-control inline-flex items-center gap-1 text-xs font-black text-zinc-600 dark:text-zinc-400 hover:text-zinc-900">
                    ← ดูตำแหน่งงานทั้งหมด
                </Link>

                <header className="tt-paper-card tt-instrument-frame rounded-[22px] border border-zinc-700/35 dark:border-white/15 p-4 text-zinc-950 dark:text-white shadow-[0_2px_0_rgba(0,0,0,0.06)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-[#fbbf24]">APPLICATION STATUS</p>
                    <h1 className="text-lg font-black text-zinc-950 dark:text-white mt-0.5">{t("applyStatus.pageTitle")}</h1>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{t("applyStatus.pageDesc")}</p>
                </header>

                <div className="tt-paper-card tt-instrument-frame rounded-[22px] border border-zinc-700/35 dark:border-white/15 p-5 shadow-[0_2px_0_rgba(0,0,0,0.06)] space-y-3.5">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            {t("applyStatus.refCode")}
                            <span className="text-rose-600"> *</span>
                        </Label>
                        <Input
                            value={ref}
                            onChange={(e) => setRef(e.target.value.toUpperCase())}
                            placeholder={t("applyStatus.refCodePlaceholder")}
                            className="font-mono text-sm font-bold h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-700/30"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            {t("applyStatus.phone")}
                            <span className="text-rose-600"> *</span>
                        </Label>
                        <Input
                            inputMode="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="08XXXXXXXX"
                            className="font-mono text-sm font-bold h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-700/30"
                        />
                    </div>
                    <Button
                        type="button"
                        className="w-full tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black h-11 rounded-xl border border-black/20 text-sm flex items-center justify-center gap-1.5 shadow-sm"
                        onClick={handleCheck}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                        {t("applyStatus.checkButton")}
                    </Button>
                    {error && <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/25 text-center">{error}</p>}
                </div>

                {result && (
                    <div className="tt-paper-card tt-instrument-frame rounded-[22px] border border-zinc-700/35 dark:border-white/15 p-5 shadow-[0_2px_0_rgba(0,0,0,0.06)] space-y-3.5">
                        <div className="flex items-center justify-between border-b border-zinc-700/15 dark:border-white/10 pb-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">REF CODE</p>
                                <span className="font-mono text-base font-black text-zinc-900 dark:text-zinc-100">{result.refCode}</span>
                            </div>
                            <Badge className="font-black text-xs px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/20 text-amber-900 dark:text-amber-300">
                                {t(`applyStatus.status.${result.status}`)}
                            </Badge>
                        </div>
                        <div className="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
                            <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">{result.positionTitle} {result.stationName ? `— ${result.stationName}` : ""}</p>
                            <p>{t("applyStatus.submittedAt")}: <span className="font-mono">{new Date(result.createdAt).toLocaleDateString("th-TH-u-ca-buddhist")}</span></p>
                            {result.interviewAt && <p className="text-blue-700 dark:text-blue-400 font-bold">{t("applyStatus.interviewAt")}: <span className="font-mono">{new Date(result.interviewAt).toLocaleString("th-TH-u-ca-buddhist")}</span></p>}
                            {result.rejectReason && <p className="text-rose-600 dark:text-rose-400 font-bold">{t("applyStatus.rejectReason")}: {result.rejectReason}</p>}
                        </div>

                            {/* Show the terms of the role up front — pay is the thing most likely to
                                change someone's mind, and they shouldn't first hear it at the interview. */}
                            {result.jobOpening ? (
                                <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                                    <p className="text-sm font-medium">{t("applyStatus.jobDetailsTitle")}</p>
                                    <div className="text-sm space-y-1">
                                        <div className="flex justify-between gap-3">
                                            <span className="text-muted-foreground">{t("applyStatus.jobSalary")}</span>
                                            <span className="font-medium text-right">
                                                {formatSalaryRange(result.jobOpening.salaryMin, result.jobOpening.salaryMax, result.jobOpening.salaryNote)}
                                            </span>
                                        </div>
                                        {result.jobOpening.employmentType && (
                                            <div className="flex justify-between gap-3">
                                                <span className="text-muted-foreground">{t("applyStatus.jobEmploymentType")}</span>
                                                <span className="font-medium text-right">
                                                    {EMPLOYMENT_TYPE_LABELS[result.jobOpening.employmentType] ?? result.jobOpening.employmentType}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <Link
                                        href={`/jobs/${encodeURIComponent(result.jobOpening.slug)}`}
                                        className="inline-flex items-center gap-1 text-sm text-primary underline"
                                    >
                                        <FileText className="size-3.5" />
                                        {t("applyStatus.viewFullJobDetails")}
                                    </Link>
                                </div>
                            ) : (
                                <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                                    <p className="text-sm">{t("applyStatus.noLinkedJob")}</p>
                                    <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-primary underline">
                                        <FileText className="size-3.5" />
                                        {t("applyStatus.browseOpenJobs")}
                                    </Link>
                                </div>
                            )}

                            {WITHDRAWABLE_STATUSES.has(result.status) && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="outline" className="w-full" disabled={withdrawing}>
                                            {t("applyStatus.withdrawButton")}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t("applyStatus.withdrawConfirmTitle")}</AlertDialogTitle>
                                            <AlertDialogDescription>{t("applyStatus.withdrawConfirmDesc")}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t("applyStatus.withdrawCancel")}</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleWithdraw}>{t("applyStatus.withdrawConfirm")}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                    </div>
                )}

                <div className="pt-2 text-center">
                    <Link href="/jobs" className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline">
                        {t("applyStatus.backToApply")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
