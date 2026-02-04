"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/date-utils";
import { ReviewPeriod, ReviewSubmission } from "@/types/performance";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export default function PerformancePage() {
    const { data: session } = useSession();
    const [periods, setPeriods] = useState<ReviewPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<ReviewPeriod | null>(null);
    const [submission, setSubmission] = useState<ReviewSubmission | null>(null);
    const [selfReview, setSelfReview] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) {
            fetchSubmission(selectedPeriod.id);
        }
    }, [selectedPeriod]);

    const fetchPeriods = async () => {
        try {
            const res = await fetch("/api/performance/periods?active=true");
            if (res.ok) {
                const data = await res.json();
                setPeriods(data.periods);
                if (data.periods.length > 0) {
                    setSelectedPeriod(data.periods[0]);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSubmission = async (periodId: string) => {
        try {
            const res = await fetch(`/api/performance/submissions?periodId=${periodId}`);
            if (res.ok) {
                const data = await res.json();
                setSubmission(data.submission);
                if (data.submission) {
                    setSelfReview(data.submission.selfReview);
                } else {
                    setSelfReview("");
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedPeriod || !selfReview.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/performance/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    periodId: selectedPeriod.id,
                    selfReview
                }),
            });

            if (res.ok) {
                toast.success("ส่งแบบประเมินเรียบร้อยแล้ว");
                fetchSubmission(selectedPeriod.id);
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-24">
            <div className="p-4 border-b bg-white">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">หน้าหลัก</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>การประเมินผลงาน</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900">การประเมินผลงาน</h1>
                    <p className="text-slate-500">แบบประเมินตนเองตามรอบการประเมิน</p>
                </div>

                {periods.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6 text-center text-slate-500">
                            ไม่มีรอบการประเมินที่เปิดอยู่ขณะนี้
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Period Selector (if multiple) - Simplified to assume latest for now */}
                        {selectedPeriod && (
                            <Card className="border-indigo-100 shadow-md overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-bold">{selectedPeriod.title}</h2>
                                            <p className="opacity-90 text-sm mt-1">
                                                {formatThaiDate(new Date(selectedPeriod.startDate), "d MMM")} - {formatThaiDate(new Date(selectedPeriod.endDate), "d MMM yyyy")}
                                            </p>
                                        </div>
                                        {submission?.status === "SUBMITTED" || submission?.status === "COMPLETED" ? (
                                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> ส่งแล้ว
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border-none">
                                                <AlertCircle className="w-3 h-3 mr-1" /> รอการส่ง
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="font-semibold text-slate-700">
                                            ส่วนที่ 1: ประเมินตนเอง (Self Assessment)
                                        </label>
                                        <p className="text-sm text-slate-500">
                                            อธิบายผลงานความสำเร็จ จุดแข็ง และสิ่งที่ควรปรับปรุงในช่วงเวลาที่ผ่านมา
                                        </p>
                                        <Textarea
                                            value={selfReview}
                                            onChange={(e) => setSelfReview(e.target.value)}
                                            placeholder="พิมพ์รายละเอียดผลงาน..."
                                            className="min-h-[200px] text-base leading-relaxed"
                                            disabled={!!submission}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t">
                                    <p className="text-xs text-slate-500">
                                        * กรุณาตรวจสอบความถูกต้องก่อนกดส่ง
                                    </p>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !selfReview.trim() || !!submission}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {submission ? "ส่งแบบประเมินแล้ว" : "ส่งแบบประเมิน"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {submission?.managerReview && (
                            <Card className="border-green-100 shadow-sm">
                                <CardHeader className="bg-green-50 border-b border-green-100">
                                    <CardTitle className="text-lg text-green-800">ความคิดเห็นจากหัวหน้างาน</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <p className="text-slate-700 whitespace-pre-wrap">{submission.managerReview}</p>
                                    {submission.rating && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <span className="font-semibold text-slate-700">คะแนนประเมิน:</span>
                                            <Badge variant="secondary" className="text-lg px-3 py-1 bg-green-100 text-green-700 border-green-200">
                                                {submission.rating} / 5
                                            </Badge>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
