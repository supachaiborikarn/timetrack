import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCustomerFeedbackPublicEnabled, assertPublicSecrets } from "@/lib/customer-feedback/feature-flags";
import { createVisitToken, verifyVisitToken, extractBearerToken } from "@/lib/customer-feedback/form-token";
import { sha256Hex } from "@/lib/customer-feedback/token";
import {
    networkHashDaily,
    clientHashWeekly,
    deviceClassOf,
    currentHashKeyVersion,
    checkRateLimit,
    checkGlobalLimit,
    resolveNonceHash,
    networkRateKey,
    GLOBAL_LIMITS,
    PER_NETWORK_STANDALONE_INCIDENT_PER_HOUR,
} from "@/lib/customer-feedback/anti-abuse";
import { visitPurgeAfter, FORM_EXPIRY_MS } from "@/lib/customer-feedback/retention";

/**
 * POST /api/public/customer-feedback/incidents/start
 * สร้าง INCIDENT Visit จาก parent STANDARD token หรือเริ่มแบบ UNKNOWN
 * หนึ่ง STANDARD Visit มี child ได้หนึ่งรายการ — เรียกซ้ำคืน child เดิม
 */

function clientIp(request: NextRequest): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip") ?? "unknown";
}

function noStore(response: NextResponse): NextResponse {
    response.headers.set("Cache-Control", "no-store");
    return response;
}

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackPublicEnabled()) {
            return NextResponse.json({ error: "ระบบยังไม่เปิดรับความคิดเห็น" }, { status: 404 });
        }
        assertPublicSecrets();

        const ip = clientIp(request);
        const userAgent = request.headers.get("user-agent") ?? "";
        const now = new Date();
        const nonceKey = resolveNonceHash(String(request.headers.get("resolve-idempotency-key") ?? "anonymous"), ip, now);

        const bearer = extractBearerToken(request.headers);

        // มี parent STANDARD visit -> สร้าง/คืน child INCIDENT
        if (bearer) {
            const verified = verifyVisitToken(bearer);
            if (!verified.valid) {
                return NextResponse.json({ error: "เซสชันหมดอายุ กรุณาสแกน QR อีกครั้ง" }, { status: 401 });
            }
            const parent = await prisma.customerFeedbackVisit.findUnique({
                where: { sessionTokenHash: sha256Hex(bearer) },
            });
            if (!parent || parent.formExpiresAt.getTime() < now.getTime()) {
                return NextResponse.json({ error: "แบบประเมินหมดอายุ" }, { status: 410 });
            }

            // คืน child เดิมถ้ามี
            const existingChild = await prisma.customerFeedbackVisit.findUnique({
                where: { parentVisitId: parent.id },
            });
            if (existingChild) {
                // child ต้องยังใช้ได้ — ถ้าหมดอายุแล้วให้สร้างใหม่ไม่ได้ (หนึ่ง parent หนึ่ง child)
                const { token: childToken } = createVisitToken({
                    visitId: existingChild.id,
                    visitKind: "INCIDENT",
                    targetType: existingChild.targetType,
                    surveyVersion: "incident-v1",
                    qrCodeId: existingChild.qrCodeId,
                    qrVersion: existingChild.qrVersionAtOpen,
                });
                // token ใหม่แต่ sessionTokenHash ต้องผูกกับ visit เดิม — อัปเดต hash
                await prisma.customerFeedbackVisit.update({
                    where: { id: existingChild.id },
                    data: { sessionTokenHash: sha256Hex(childToken) },
                });
                return NextResponse.json({ visitToken: childToken, surveyVersion: "incident-v1", targetType: existingChild.targetType });
            }

            const child = await prisma.customerFeedbackVisit.create({
                data: {
                    parentVisitId: parent.id,
                    qrCodeId: parent.qrCodeId,
                    qrVersionAtOpen: parent.qrVersionAtOpen,
                    visitKind: "INCIDENT",
                    surveyVersion: "incident-v1",
                    disposition: "OPEN",
                    isTestAtOpen: parent.isTestAtOpen,
                    sessionTokenHash: "pending",
                    networkHashDaily: networkHashDaily(ip, now),
                    clientHashWeekly: clientHashWeekly(ip, userAgent, now),
                    resolveNonceHash: parent.resolveNonceHash,
                    hashKeyVersion: currentHashKeyVersion(),
                    targetType: parent.targetType,
                    employeeId: parent.employeeId,
                    stationIdAtOpen: parent.stationIdAtOpen,
                    stationContextSource: parent.stationContextSource,
                    deviceClass: deviceClassOf(userAgent),
                    language: parent.language,
                    formExpiresAt: new Date(now.getTime() + FORM_EXPIRY_MS),
                    purgeAfter: visitPurgeAfter(now),
                },
            });
            const { token: childToken } = createVisitToken({
                visitId: child.id,
                visitKind: "INCIDENT",
                targetType: child.targetType,
                surveyVersion: "incident-v1",
                qrCodeId: child.qrCodeId,
                qrVersion: child.qrVersionAtOpen,
            });
            await prisma.customerFeedbackVisit.update({
                where: { id: child.id },
                data: { sessionTokenHash: sha256Hex(childToken) },
            });
            return NextResponse.json({
                visitToken: childToken,
                surveyVersion: "incident-v1",
                targetType: child.targetType,
                inheritedStation: child.stationIdAtOpen ? { id: child.stationIdAtOpen } : null,
            });
        }

        // standalone: targetType UNKNOWN — เส้นนี้ไม่ต้องมี QR หรือ token ใด ๆ
        // จึงต้องจำกัดด้วยคีย์ที่ client ปลอมไม่ได้ ไม่ใช่ header ของตัวเอง
        const networkKey = networkRateKey(ip, now);
        const limit = await checkRateLimit(
            "standalone-incident-network", networkKey, PER_NETWORK_STANDALONE_INCIDENT_PER_HOUR, 3600 * 1000
        );
        if (!limit.allowed) {
            return noStore(NextResponse.json(
                { error: "เปิดแบบประเมินบ่อยเกินไป กรุณารอสักครู่" },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
            ));
        }

        const globalLimit = await checkGlobalLimit(
            "global-visit-create", GLOBAL_LIMITS.visitCreatePerMinute, 60 * 1000
        );
        if (!globalLimit.allowed) {
            return noStore(NextResponse.json(
                { error: "ระบบมีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้ง" },
                { status: 429, headers: { "Retry-After": String(globalLimit.retryAfterSec) } }
            ));
        }

        const visit = await prisma.customerFeedbackVisit.create({
            data: {
                qrCodeId: null,
                visitKind: "INCIDENT",
                surveyVersion: "incident-v1",
                disposition: "OPEN",
                sessionTokenHash: "pending",
                networkHashDaily: networkHashDaily(ip, now),
                clientHashWeekly: clientHashWeekly(ip, userAgent, now),
                resolveNonceHash: nonceKey,
                hashKeyVersion: currentHashKeyVersion(),
                targetType: "UNKNOWN",
                stationContextSource: "UNKNOWN",
                deviceClass: deviceClassOf(userAgent),
                language: "th",
                formExpiresAt: new Date(now.getTime() + FORM_EXPIRY_MS),
                purgeAfter: visitPurgeAfter(now),
            },
        });
        const { token: visitToken } = createVisitToken({
            visitId: visit.id,
            visitKind: "INCIDENT",
            targetType: "UNKNOWN",
            surveyVersion: "incident-v1",
            qrCodeId: null,
            qrVersion: null,
        });
        await prisma.customerFeedbackVisit.update({
            where: { id: visit.id },
            data: { sessionTokenHash: sha256Hex(visitToken) },
        });
        return NextResponse.json({ visitToken: visitToken, surveyVersion: "incident-v1", targetType: "UNKNOWN" });
    } catch (error) {
        console.error("Error starting incident visit:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" }, { status: 500 });
    }
}
