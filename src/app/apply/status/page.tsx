"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

type StatusResult = {
    refCode: string;
    status: string;
    positionTitle: string;
    stationName: string | null;
    createdAt: string;
    interviewAt: string | null;
    rejectReason: string | null;
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
        <div className="min-h-dvh bg-muted/30 p-4">
            <div className="max-w-md mx-auto pt-8 space-y-4">
                <header>
                    <h1 className="text-lg font-bold">{t("applyStatus.pageTitle")}</h1>
                    <p className="text-sm text-muted-foreground">{t("applyStatus.pageDesc")}</p>
                </header>

                <Card>
                    <CardContent className="pt-6 space-y-3">
                        <div className="space-y-1.5">
                            <Label>{t("applyStatus.refCode")}</Label>
                            <Input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="APP-69-0001" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("applyStatus.phone")}</Label>
                            <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <Button type="button" className="w-full" onClick={handleCheck} disabled={loading || !ref.trim() || !phone.trim()}>
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                            {t("applyStatus.checkButton")}
                        </Button>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </CardContent>
                </Card>

                {result && (
                    <Card>
                        <CardContent className="pt-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-sm">{result.refCode}</span>
                                <Badge>{t(`applyStatus.status.${result.status}`)}</Badge>
                            </div>
                            <div className="text-sm space-y-1 text-muted-foreground">
                                <p>{result.positionTitle} {result.stationName ? `— ${result.stationName}` : ""}</p>
                                <p>{t("applyStatus.submittedAt")}: {new Date(result.createdAt).toLocaleDateString("th-TH-u-ca-buddhist")}</p>
                                {result.interviewAt && <p>{t("applyStatus.interviewAt")}: {new Date(result.interviewAt).toLocaleString("th-TH-u-ca-buddhist")}</p>}
                                {result.rejectReason && <p className="text-destructive">{t("applyStatus.rejectReason")}: {result.rejectReason}</p>}
                            </div>

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
                        </CardContent>
                    </Card>
                )}

                <a href="/apply" className="block text-center text-sm text-muted-foreground underline">
                    {t("applyStatus.backToApply")}
                </a>
            </div>
        </div>
    );
}
