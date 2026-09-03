"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageSquareHeart } from "lucide-react";
import { OverviewTab } from "@/components/customer-feedback/admin/overview-tab";
import { EmployeeScoresTab } from "@/components/customer-feedback/admin/employee-scores-tab";
import { ResponsesTab } from "@/components/customer-feedback/admin/responses-tab";
import { CasesTab } from "@/components/customer-feedback/admin/cases-tab";
import { QrCodesTab } from "@/components/customer-feedback/admin/qr-codes-tab";
import { QuestionsTab } from "@/components/customer-feedback/admin/questions-tab";
import { ReviewRequestsTab } from "@/components/customer-feedback/admin/review-requests-tab";

type FeedbackTab = "overview" | "employee-scores" | "responses" | "cases" | "qr" | "questions" | "reviews";

const TAB_DEFINITIONS: { id: FeedbackTab; label: string; permission: string; probe: string }[] = [
    { id: "overview", label: "ภาพรวม", permission: "customer_feedback.view_dashboard", probe: "/api/admin/customer-feedback/summary" },
    { id: "employee-scores", label: "คะแนนพนักงาน", permission: "customer_feedback.view_dashboard", probe: "/api/admin/customer-feedback/employee-scores" },
    { id: "responses", label: "คำตอบ", permission: "customer_feedback.view_response", probe: "/api/admin/customer-feedback/responses?pageSize=1" },
    { id: "cases", label: "เคส", permission: "customer_feedback.case_manage", probe: "/api/admin/customer-feedback/cases?pageSize=1" },
    { id: "qr", label: "QR Codes", permission: "customer_feedback.manage", probe: "/api/admin/customer-feedback/qr-codes" },
    { id: "questions", label: "คำถาม", permission: "customer_feedback.view_dashboard", probe: "/api/admin/customer-feedback/questions" },
    { id: "reviews", label: "คำขอทบทวน", permission: "customer_feedback.review_request_manage", probe: "/api/admin/customer-feedback/review-requests" },
];

const ADMIN_PERMISSION_CODES = [
    ...new Set(TAB_DEFINITIONS.map((tab) => tab.permission)),
    "customer_feedback.export",
    "customer_feedback.view_contact",
    "customer_feedback.moderate",
    "customer_feedback.view_incident",
];

export default function CustomerFeedbackAdminPage() {
    const { data: session, status } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [gate, setGate] = useState<"ok" | "disabled" | "denied">("ok");
    const [permissions, setPermissions] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<FeedbackTab>("overview");

    useEffect(() => {
        if (status === "unauthenticated") {
            setIsLoading(false);
            return;
        }
        if (status !== "authenticated" || !session?.user) return;
        let cancelled = false;

        const loadAccess = async () => {
            try {
                const permissionResponse = await fetch("/api/user/permissions", { cache: "no-store" });
                if (!permissionResponse.ok) {
                    if (!cancelled) setGate("denied");
                    return;
                }
                const data = (await permissionResponse.json()) as { permissions?: string[] };
                const granted = new Set(data.permissions ?? []);
                if (session.user.role === "ADMIN") ADMIN_PERMISSION_CODES.forEach((code) => granted.add(code));
                const allowedTabs = TAB_DEFINITIONS.filter((tab) => granted.has(tab.permission));
                if (allowedTabs.length === 0) {
                    if (!cancelled) setGate("denied");
                    return;
                }

                const requested = new URLSearchParams(window.location.search).get("tab") as FeedbackTab | null;
                const initial = allowedTabs.some((tab) => tab.id === requested) ? requested! : allowedTabs[0].id;
                const probe = allowedTabs.find((tab) => tab.id === initial)!.probe;
                const probeResponse = await fetch(probe, { cache: "no-store" });
                if (cancelled) return;
                if (probeResponse.status === 404) setGate("disabled");
                else if (probeResponse.status === 401 || probeResponse.status === 403) setGate("denied");
                else setGate("ok");
                setPermissions(granted);
                setActiveTab(initial);
            } catch {
                if (!cancelled) setGate("denied");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void loadAccess();
        return () => {
            cancelled = true;
        };
    }, [session, status]);

    const visibleTabs = useMemo(
        () => TAB_DEFINITIONS.filter((tab) => permissions.has(tab.permission)),
        [permissions]
    );

    const changeTab = (value: string) => {
        const next = value as FeedbackTab;
        if (!visibleTabs.some((tab) => tab.id === next)) return;
        setActiveTab(next);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", next);
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center" role="status" aria-label="กำลังโหลด">
                <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" />
            </div>
        );
    }

    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) redirect("/dashboard");

    if (gate === "disabled") {
        return (
            <div className="p-6">
                <h1 className="mb-2 text-2xl font-bold">เสียงลูกค้า</h1>
                <p className="text-muted-foreground">ระบบเสียงลูกค้ายังไม่เปิดใช้งาน</p>
            </div>
        );
    }

    if (gate === "denied" || visibleTabs.length === 0) {
        return (
            <div className="p-6">
                <h1 className="mb-2 text-2xl font-bold">เสียงลูกค้า</h1>
                <p className="text-muted-foreground">คุณยังไม่มีสิทธิ์ดูหรือจัดการข้อมูลส่วนนี้</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="tt-paper-card tt-instrument-frame rounded-[24px] border border-zinc-700/35 dark:border-white/15 bg-zinc-950 text-white p-6 sm:p-7 shadow-[0_3px_0_rgba(0,0,0,0.2)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-zinc-950 grid place-items-center font-black shadow-inner shrink-0">
                            <MessageSquareHeart className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbf24]">SERVICE EXCELLENCE & VOC</p>
                            <h1 className="text-xl sm:text-2xl font-black text-white">เสียงลูกค้า & คุณภาพบริการ</h1>
                            <p className="text-zinc-400 text-xs mt-0.5">
                                คะแนนตอบรับผ่าน QR code สำหรับประกอบรอบประเมินและการกำกับคุณภาพบริการ
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={changeTab} className="space-y-4">
                <div className="overflow-x-auto pb-1">
                    <TabsList className="tt-retro-control inline-flex min-w-max p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-700/20 dark:border-white/15 h-auto">
                        {visibleTabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="rounded-lg px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-[#fbbf24] data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm transition-all"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                {permissions.has("customer_feedback.view_dashboard") && <TabsContent value="overview"><OverviewTab /></TabsContent>}
                {permissions.has("customer_feedback.view_dashboard") && <TabsContent value="employee-scores"><EmployeeScoresTab /></TabsContent>}
                {permissions.has("customer_feedback.view_response") && (
                    <TabsContent value="responses">
                        <ResponsesTab
                            canExport={permissions.has("customer_feedback.export")}
                            canViewContact={permissions.has("customer_feedback.view_contact")}
                            canModerate={permissions.has("customer_feedback.moderate")}
                            canViewIncident={permissions.has("customer_feedback.view_incident")}
                        />
                    </TabsContent>
                )}
                {permissions.has("customer_feedback.case_manage") && (
                    <TabsContent value="cases">
                        <CasesTab
                            currentUserId={session.user.id}
                            canSetStation={session.user.role === "ADMIN" || session.user.role === "HR"}
                            canViewContact={permissions.has("customer_feedback.view_contact")}
                        />
                    </TabsContent>
                )}
                {permissions.has("customer_feedback.manage") && <TabsContent value="qr"><QrCodesTab /></TabsContent>}
                {permissions.has("customer_feedback.view_dashboard") && <TabsContent value="questions"><QuestionsTab /></TabsContent>}
                {permissions.has("customer_feedback.review_request_manage") && <TabsContent value="reviews"><ReviewRequestsTab /></TabsContent>}
            </Tabs>
        </div>
    );
}
