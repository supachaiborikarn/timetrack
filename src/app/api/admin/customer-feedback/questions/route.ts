import { NextResponse } from "next/server";
import { getFeedbackAccessContext, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { SURVEYS, SERVICE_AREAS, INCIDENT_TYPES, RATING_OPTIONS } from "@/lib/customer-feedback/questions";

/**
 * GET /api/admin/customer-feedback/questions — อ่าน question registry แบบอ่านอย่างเดียว
 */

export async function GET() {
    const access = await getFeedbackAccessContext();
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.view_dashboard");
    if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
    if (!isCustomerFeedbackEnabled()) {
        return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
    }

    return NextResponse.json({
        surveys: Object.values(SURVEYS).map((s) => ({
            version: s.version,
            maxReasons: s.maxReasons,
            commentMaxLength: s.commentMaxLength,
            questions: [
                { key: "target_confirmation", required: true, label: { th: "ยืนยันว่าเป็นผู้ให้บริการวันนี้", en: "Confirm target" }, branching: "YES -> continue; NO/UNSURE -> end" },
                ...(s.version === "incident-v1" ? [] : [{ key: "overall_rating", required: true, label: { th: "คะแนนรวม 1–5", en: "Overall rating 1-5" }, branching: "1-2 -> reasons required" }]),
                ...(s.version === "incident-v1"
                    ? [{ key: "incident_type", required: true, label: { th: "ประเภทเหตุ", en: "Incident type" }, branching: "always" }]
                    : [{ key: "reason_keys", required: "rating <= 2", label: { th: "สาเหตุ", en: "Reasons" }, branching: `max ${s.maxReasons}; unspecified singleton` }]),
                ...(s.version === "station-v1" ? [{ key: "service_areas", required: false, label: { th: "ส่วนบริการที่ใช้", en: "Service areas" }, branching: "unsure singleton" }] : []),
                { key: "comment", required: false, label: { th: "ข้อความเพิ่มเติม", en: "Comment" }, branching: "optional" },
            ],
            reasonOptions: s.reasonOptions,
        })),
        serviceAreas: SERVICE_AREAS,
        incidentTypes: INCIDENT_TYPES,
        ratingOptions: RATING_OPTIONS,
        note: "การแก้คำถามต้องทำใน source code พร้อมเพิ่ม survey version ใหม่และ test — MVP ไม่มีปุ่มแก้ข้อความใน production",
    });
}
