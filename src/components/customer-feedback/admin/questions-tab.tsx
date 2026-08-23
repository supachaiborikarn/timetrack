"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface QuestionsData {
    surveys: {
        version: string;
        maxReasons: number;
        commentMaxLength: number;
        questions: { key: string; required: string | boolean; label: { th: string; en: string }; branching: string }[];
        reasonOptions: { key: string; label: { th: string; en: string }; owner: string }[];
    }[];
    note: string;
}

export function QuestionsTab() {
    const [data, setData] = useState<QuestionsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/customer-feedback/questions")
            .then((r) => (r.ok ? r.json() : null))
            .then(setData)
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (!data) return <p className="text-muted-foreground">โหลดข้อมูลไม่สำเร็จ</p>;

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{data.note}</p>
            {data.surveys.map((s) => (
                <Card key={s.version}>
                    <CardHeader>
                        <CardTitle className="text-base">{s.version}</CardTitle>
                        <CardDescription>
                            เลือกสาเหตุได้สูงสุด {s.maxReasons} ข้อ · ข้อความยาวสูงสุด {s.commentMaxLength} ตัวอักษร
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1">
                            {s.questions.map((q) => (
                                <div key={q.key} className="flex flex-wrap items-center gap-2 text-sm">
                                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{q.key}</code>
                                    <span>{q.label.th}</span>
                                    <Badge variant="outline">{typeof q.required === "boolean" ? (q.required ? "บังคับ" : "ไม่บังคับ") : q.required}</Badge>
                                    <span className="text-xs text-muted-foreground">{q.branching}</span>
                                </div>
                            ))}
                        </div>
                        {s.reasonOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {s.reasonOptions.map((o) => (
                                    <Badge key={o.key} variant={o.owner === "EMPLOYEE" ? "default" : o.owner === "SYSTEM" ? "secondary" : "outline"}>
                                        {o.key}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
