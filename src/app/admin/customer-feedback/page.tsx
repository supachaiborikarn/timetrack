"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { OverviewTab } from "@/components/customer-feedback/admin/overview-tab";
import { ResponsesTab } from "@/components/customer-feedback/admin/responses-tab";
import { CasesTab } from "@/components/customer-feedback/admin/cases-tab";
import { QrCodesTab } from "@/components/customer-feedback/admin/qr-codes-tab";
import { QuestionsTab } from "@/components/customer-feedback/admin/questions-tab";

export default function CustomerFeedbackAdminPage() {
    const { data: session, status } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    // ปิดฟีเจอร์ (404) กับ ไม่มีสิทธิ์ (403) เป็นคนละเรื่อง ต้องบอกผู้ใช้ให้ตรงกับสาเหตุ
    const [gate, setGate] = useState<"ok" | "disabled" | "denied">("ok");

    useEffect(() => {
        fetch("/api/admin/customer-feedback/summary")
            .then((res) => {
                if (res.status === 404) setGate("disabled");
                else if (res.status === 403) setGate("denied");
                return res.json();
            })
            .catch(() => undefined)
            .finally(() => setIsLoading(false));
    }, []);

    if (status === "loading" || isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        redirect("/dashboard");
    }

    if (gate === "disabled") {
        return (
            <div className="p-6">
                <h1 className="mb-2 text-2xl font-bold">เสียงลูกค้า</h1>
                <p className="text-muted-foreground">
                    ระบบเสียงลูกค้ายังไม่เปิดใช้งาน — ตั้งค่า CUSTOMER_FEEDBACK_ENABLED=true เพื่อเริ่มใช้งาน
                </p>
            </div>
        );
    }

    if (gate === "denied") {
        return (
            <div className="p-6">
                <h1 className="mb-2 text-2xl font-bold">เสียงลูกค้า</h1>
                <p className="text-muted-foreground">
                    คุณยังไม่มีสิทธิ์ดูข้อมูลส่วนนี้ — ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ &quot;ดูภาพรวมเสียงลูกค้า&quot;
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <h1 className="mb-1 text-2xl font-bold">เสียงลูกค้า</h1>
            <p className="mb-4 text-sm text-muted-foreground">
                คะแนนจากลูกค้าที่เลือกตอบผ่าน QR — ใช้เป็นหลักฐานประกอบรอบประเมินเท่านั้น ไม่ใช้ตัดสินโบนัสหรือโทษอัตโนมัติ
            </p>
            <Tabs defaultValue="overview">
                <TabsList className="flex-wrap">
                    <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
                    <TabsTrigger value="responses">คำตอบ</TabsTrigger>
                    <TabsTrigger value="cases">เคส</TabsTrigger>
                    <TabsTrigger value="qr">QR Codes</TabsTrigger>
                    <TabsTrigger value="questions">คำถาม</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <OverviewTab />
                </TabsContent>
                <TabsContent value="responses">
                    <ResponsesTab />
                </TabsContent>
                <TabsContent value="cases">
                    <CasesTab />
                </TabsContent>
                <TabsContent value="qr">
                    <QrCodesTab />
                </TabsContent>
                <TabsContent value="questions">
                    <QuestionsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
