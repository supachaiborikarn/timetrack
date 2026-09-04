"use client";

import { useCallback, useEffect, useState } from "react";
import { Bath, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionBreakdown {
    key: string;
    label: { th: string; en: string };
    answeredCount: number;
    yesCount: number;
    noCount: number;
    unsureCount: number;
    yesRate: number | null;
}

interface HousekeeperScore {
    employeeId: string;
    label: string;
    stationLabel: string | null;
    latestResponseAt: string | null;
    responseCount: number;
    minimumSample: number;
    meetsMinimumSample: boolean;
    score: number | null;
    overallPoints: number | null;
    overallPointsMax: number;
    checklistPoints: number | null;
    checklistPointsMax: number;
    questions: QuestionBreakdown[];
}

interface RestroomScoresPayload {
    from: string;
    toExclusive: string;
    unattributedCount: number;
    housekeepers: HousekeeperScore[];
}

export function RestroomScoresTab() {
    const [data, setData] = useState<RestroomScoresPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/admin/customer-feedback/restroom-scores", { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "โหลดคะแนนไม่สำเร็จ");
            setData(payload as RestroomScoresPayload);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "โหลดคะแนนไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    if (loading && !data) {
        return <div className="grid min-h-56 place-items-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <Card className="border-zinc-800/20 dark:border-white/15">
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg"><Bath className="h-5 w-5 text-amber-500" />คะแนนความสะอาดห้องน้ำ / แม่บ้าน</CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">คะแนน 100 = ความพึงพอใจ 40 + checklist ความสะอาด 60 · ใช้เฉพาะคำตอบ VALID ที่ผูกแม่บ้านจากการลงเวลาจริง</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />รีเฟรช
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <p>ถ้าช่วงเวลาที่ลูกค้าส่งไม่มีแม่บ้านที่ลงเวลาทำงานอยู่เพียงคนเดียว ระบบจะเก็บเป็นคะแนนห้องน้ำของสถานี แต่ไม่โยนคะแนนให้พนักงานคนใด</p>
                    {data && data.unattributedCount > 0 ? <p className="font-semibold text-amber-700">มีคำตอบ VALID ที่ยังผูกแม่บ้านไม่ได้ {data.unattributedCount} รายการในช่วงที่แสดง</p> : null}
                    {error ? <p className="font-semibold text-red-600">{error}</p> : null}
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
                {data?.housekeepers.map((employee) => (
                    <Card key={employee.employeeId} className="overflow-hidden border-zinc-800/20 dark:border-white/15">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base">{employee.label}</CardTitle>
                                    <p className="text-xs text-muted-foreground">{employee.stationLabel ?? "ไม่ระบุสถานี"}</p>
                                </div>
                                {employee.meetsMinimumSample && employee.score !== null ? (
                                    <div className="rounded-2xl bg-[#fbbf24] px-3 py-2 text-center text-zinc-950">
                                        <p className="text-2xl font-black tabular-nums">{employee.score.toFixed(1)}</p>
                                        <p className="text-[9px] font-black">/ 100</p>
                                    </div>
                                ) : (
                                    <Badge variant="secondary">ข้อมูลยังไม่เพียงพอ</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="rounded-xl bg-muted p-2"><p className="text-muted-foreground">แบบ VALID</p><p className="font-black">{employee.responseCount}</p></div>
                                <div className="rounded-xl bg-muted p-2"><p className="text-muted-foreground">คะแนนรวม</p><p className="font-black">{employee.overallPoints === null ? "-" : `${employee.overallPoints.toFixed(1)}/40`}</p></div>
                                <div className="rounded-xl bg-muted p-2"><p className="text-muted-foreground">Checklist</p><p className="font-black">{employee.checklistPoints === null ? "-" : `${employee.checklistPoints.toFixed(1)}/60`}</p></div>
                            </div>
                            <div className="space-y-1.5">
                                {employee.questions.map((question) => (
                                    <div key={question.key} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs">
                                        <span className="min-w-0 flex-1">{question.label.th}</span>
                                        <span className="shrink-0 font-black">{question.yesRate === null ? "-" : `${question.yesRate.toFixed(0)}% ผ่าน`}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground">ตัวเลขคะแนนจะแสดงเมื่อมีอย่างน้อย {employee.minimumSample} แบบ VALID; คำตอบ “ไม่แน่ใจ” ไม่ถูกนับเป็น 0 ใน checklist</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {data && data.housekeepers.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">ยังไม่พบพนักงานแผนกแม่บ้านที่ active ในขอบเขตนี้</CardContent></Card>
            ) : null}
        </div>
    );
}
