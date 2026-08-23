import { NextRequest, NextResponse } from "next/server";
import { isCustomerFeedbackPublicEnabled } from "@/lib/customer-feedback/feature-flags";
import { loadVisitFromHeaders } from "@/lib/customer-feedback/submit";
import { searchEligibleStations } from "@/lib/customer-feedback/station-context";
import { checkRateLimit } from "@/lib/customer-feedback/anti-abuse";
import { sha256Hex } from "@/lib/customer-feedback/token";

/**
 * GET /api/public/customer-feedback/stations?q=...
 * ค้นหาสถานีขั้นต่ำตามสิทธิ์ของ signed Visit — คืนเฉพาะ id, name,
 * publicEmergencyPhone ไม่เกิน 20 รายการ
 */

export async function GET(request: NextRequest) {
    try {
        if (!isCustomerFeedbackPublicEnabled()) {
            return NextResponse.json({ error: "ระบบยังไม่เปิดรับความคิดเห็น" }, { status: 404 });
        }

        const loaded = await loadVisitFromHeaders(request.headers);
        if ("error" in loaded) {
            return NextResponse.json({ error: "เซสชันหมดอายุ กรุณาสแกน QR อีกครั้ง" }, { status: 401 });
        }
        const { visit } = loaded;

        // STATION STANDARD Visit ล็อกสถานีจาก QR — ไม่เปิด station search
        if (visit.visitKind === "STANDARD" && visit.targetType === "STATION") {
            return NextResponse.json({ stations: [] });
        }

        const limit = await checkRateLimit("station-search", sha256Hex(visit.id), 30, 60 * 1000);
        if (!limit.allowed) {
            return NextResponse.json({ error: "ค้นหาบ่อยเกินไป" }, { status: 429, headers: { "Retry-After": "60" } });
        }

        const q = request.nextUrl.searchParams.get("q") ?? "";
        if (q.trim().length < 2) {
            return NextResponse.json({ stations: [] });
        }

        // EMPLOYEE STANDARD และ INCIDENT ใช้ isEmployeeFeedbackStationEligible
        const stations = await searchEligibleStations(q, 20);
        // เติม emergency phone สำหรับสถานีที่เปิด station feedback
        const result = stations.map((s) => ({
            id: s.id,
            name: s.name,
            publicEmergencyPhone: s.publicEmergencyPhone,
        }));
        return NextResponse.json({ stations: result });
    } catch (error) {
        console.error("Error searching stations:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
