import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, type CustomerFeedbackVisit } from "@prisma/client";
import { randomUUID } from "crypto";
import { isCustomerFeedbackPublicEnabled, assertPublicSecrets } from "@/lib/customer-feedback/feature-flags";
import {
    canStartIncidentFromParentDisposition,
    createVisitToken,
    isStandardIncidentParent,
} from "@/lib/customer-feedback/form-token";
import { loadVisitFromHeaders } from "@/lib/customer-feedback/submit";
import { publicError } from "@/lib/customer-feedback/public-errors";
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
import { isJsonRequest, isSameOriginRequest, readJsonBody } from "../../_request";
import { checkPublicVisitRateLimit } from "../../_visit-rate-limit";

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

function issueIncidentToken(visit: CustomerFeedbackVisit) {
    return createVisitToken({
        visitId: visit.id,
        visitKind: "INCIDENT",
        targetType: visit.targetType,
        surveyVersion: "incident-v1",
        qrCodeId: visit.qrCodeId,
        qrVersion: visit.qrVersionAtOpen,
    }, visit.openedAt.getTime());
}

async function tokenForIncidentVisit(visit: CustomerFeedbackVisit): Promise<string> {
    const issued = issueIncidentToken(visit);
    if (visit.sessionTokenHash !== issued.tokenHash) {
        // รองรับแถว legacy ก่อน deterministic issuance; รอบถัดไปจะได้ token เดิมเสมอ
        await prisma.customerFeedbackVisit.update({
            where: { id: visit.id },
            data: { sessionTokenHash: issued.tokenHash },
        });
    }
    return issued.token;
}

async function enforceIncidentCreateLimits(networkKey: string): Promise<NextResponse | null> {
    const networkLimit = await checkRateLimit(
        "incident-create-network",
        networkKey,
        PER_NETWORK_STANDALONE_INCIDENT_PER_HOUR,
        3600 * 1000
    );
    if (!networkLimit.allowed) {
        return publicError("RESOLVE_RATE_LIMITED", 429, { "Retry-After": String(networkLimit.retryAfterSec) });
    }
    const globalLimit = await checkGlobalLimit(
        "global-visit-create",
        GLOBAL_LIMITS.visitCreatePerMinute,
        60 * 1000
    );
    if (!globalLimit.allowed) {
        return publicError("SERVER_BUSY", 429, { "Retry-After": String(globalLimit.retryAfterSec) });
    }
    return null;
}

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackPublicEnabled()) {
            return publicError("PUBLIC_DISABLED", 404);
        }
        assertPublicSecrets();

        if (!isSameOriginRequest(request)) {
            return noStore(NextResponse.json({ error: "Invalid origin" }, { status: 403 }));
        }
        if (!isJsonRequest(request)) {
            return noStore(NextResponse.json({ error: "Unsupported content type" }, { status: 415 }));
        }
        const body = await readJsonBody(request);
        if (!body.ok) {
            return body.reason === "PAYLOAD_TOO_LARGE"
                ? publicError("PAYLOAD_TOO_LARGE", 413)
                : noStore(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
        }
        if (typeof body.value !== "object" || body.value === null) {
            return noStore(NextResponse.json({ error: "Invalid body" }, { status: 400 }));
        }

        const ip = clientIp(request);
        const userAgent = request.headers.get("user-agent") ?? "";
        const now = new Date();
        const rawNonce = request.headers.get("resolve-idempotency-key");
        if (rawNonce && rawNonce.length > 200) {
            return noStore(NextResponse.json({ error: "Invalid Resolve-Idempotency-Key" }, { status: 400 }));
        }
        const nonceKey = rawNonce ? resolveNonceHash(rawNonce, ip, now) : null;
        const networkKey = networkRateKey(ip, now);

        // มี parent STANDARD visit -> สร้าง/คืน child INCIDENT
        if (request.headers.has("authorization")) {
            const loaded = await loadVisitFromHeaders(request.headers);
            if ("error" in loaded) {
                return publicError("SESSION_EXPIRED", 401);
            }
            const parent = loaded.visit;
            if (!isStandardIncidentParent(loaded.tokenPayload, parent)) {
                return publicError("SESSION_EXPIRED", 401);
            }
            if (parent.formExpiresAt.getTime() < now.getTime()) {
                return publicError("FORM_EXPIRED", 410);
            }
            const parentVisitLimit = await checkPublicVisitRateLimit("incident-start", parent.id);
            if (!parentVisitLimit.allowed) {
                return publicError("REQUEST_RATE_LIMITED", 429, {
                    "Retry-After": String(parentVisitLimit.retryAfterSec),
                });
            }

            // คืน child เดิมถ้ามี
            let child = await prisma.customerFeedbackVisit.findUnique({
                where: { parentVisitId: parent.id },
            });
            if (child) {
                if (child.formExpiresAt.getTime() < now.getTime()) {
                    return publicError("INCIDENT_FORM_EXPIRED", 410);
                }
                const childToken = await tokenForIncidentVisit(child);
                return noStore(NextResponse.json({ visitToken: childToken, surveyVersion: "incident-v1", targetType: child.targetType }));
            }

            if (!canStartIncidentFromParentDisposition(parent.disposition)) {
                return publicError("ALREADY_SUBMITTED", 409);
            }
            const limited = await enforceIncidentCreateLimits(networkKey);
            if (limited) return limited;

            const childId = randomUUID();
            const issued = createVisitToken({
                visitId: childId,
                visitKind: "INCIDENT",
                targetType: parent.targetType,
                surveyVersion: "incident-v1",
                qrCodeId: parent.qrCodeId,
                qrVersion: parent.qrVersionAtOpen,
            }, now.getTime());
            try {
                child = await prisma.customerFeedbackVisit.create({
                    data: {
                        id: childId,
                        parentVisitId: parent.id,
                        qrCodeId: parent.qrCodeId,
                        qrVersionAtOpen: parent.qrVersionAtOpen,
                        visitKind: "INCIDENT",
                        surveyVersion: "incident-v1",
                        disposition: "OPEN",
                        isTestAtOpen: parent.isTestAtOpen,
                        sessionTokenHash: issued.tokenHash,
                        networkHashDaily: networkHashDaily(ip, now),
                        clientHashWeekly: clientHashWeekly(ip, userAgent, now),
                        // child กันซ้ำด้วย parentVisitId @unique; ไม่ copy nonce เพื่อไม่ชน child ของ parent อื่น
                        resolveNonceHash: null,
                        hashKeyVersion: currentHashKeyVersion(),
                        targetType: parent.targetType,
                        employeeId: parent.employeeId,
                        stationIdAtOpen: parent.stationIdAtOpen,
                        stationContextSource: parent.stationContextSource,
                        departmentIdAtOpen: parent.departmentIdAtOpen,
                        shiftIdAtOpen: parent.shiftIdAtOpen,
                        deviceClass: deviceClassOf(userAgent),
                        language: parent.language,
                        openedAt: now,
                        formExpiresAt: new Date(now.getTime() + FORM_EXPIRY_MS),
                        purgeAfter: visitPurgeAfter(now),
                    },
                });
            } catch (error) {
                if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
                child = await prisma.customerFeedbackVisit.findUnique({ where: { parentVisitId: parent.id } });
                if (!child) throw error;
            }
            const childToken = await tokenForIncidentVisit(child);
            return noStore(NextResponse.json({
                visitToken: childToken,
                surveyVersion: "incident-v1",
                targetType: child.targetType,
                inheritedStation: child.stationIdAtOpen ? { id: child.stationIdAtOpen } : null,
            }));
        }

        // standalone: targetType UNKNOWN — เส้นนี้ไม่ต้องมี QR หรือ token ใด ๆ
        // ส่ง nonce เดิมซ้ำให้คืน Visit เดิมแบบ best effort; no-header เก็บ null ไม่ชนข้ามคน
        let visit = nonceKey ? await prisma.customerFeedbackVisit.findFirst({
            where: {
                resolveNonceHash: nonceKey,
                qrCodeId: null,
                parentVisitId: null,
                visitKind: "INCIDENT",
                targetType: "UNKNOWN",
            },
            orderBy: { openedAt: "desc" },
        }) : null;
        if (visit) {
            if (visit.formExpiresAt.getTime() <= now.getTime()) {
                return publicError("INCIDENT_FORM_EXPIRED", 410);
            }
            const visitToken = await tokenForIncidentVisit(visit);
            return noStore(NextResponse.json({ visitToken, surveyVersion: "incident-v1", targetType: "UNKNOWN" }));
        }

        const limited = await enforceIncidentCreateLimits(networkKey);
        if (limited) return limited;

        const visitId = randomUUID();
        const issued = createVisitToken({
            visitId,
            visitKind: "INCIDENT",
            targetType: "UNKNOWN",
            surveyVersion: "incident-v1",
            qrCodeId: null,
            qrVersion: null,
        }, now.getTime());
        try {
            visit = await prisma.customerFeedbackVisit.create({
                data: {
                    id: visitId,
                    qrCodeId: null,
                    visitKind: "INCIDENT",
                    surveyVersion: "incident-v1",
                    disposition: "OPEN",
                    sessionTokenHash: issued.tokenHash,
                    networkHashDaily: networkHashDaily(ip, now),
                    clientHashWeekly: clientHashWeekly(ip, userAgent, now),
                    resolveNonceHash: nonceKey,
                    hashKeyVersion: currentHashKeyVersion(),
                    targetType: "UNKNOWN",
                    stationContextSource: "UNKNOWN",
                    deviceClass: deviceClassOf(userAgent),
                    language: "th",
                    openedAt: now,
                    formExpiresAt: new Date(now.getTime() + FORM_EXPIRY_MS),
                    purgeAfter: visitPurgeAfter(now),
                },
            });
        } catch (error) {
            // partial unique index ใน migration ทำให้ standalone retry ที่ชนพร้อมกันเหลือ Visit เดียว
            if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || !nonceKey) throw error;
            visit = await prisma.customerFeedbackVisit.findFirst({
                where: {
                    resolveNonceHash: nonceKey,
                    qrCodeId: null,
                    parentVisitId: null,
                    visitKind: "INCIDENT",
                    targetType: "UNKNOWN",
                },
                orderBy: { openedAt: "desc" },
            });
            if (!visit) throw error;
            if (visit.formExpiresAt.getTime() <= now.getTime()) {
                return publicError("INCIDENT_FORM_EXPIRED", 410);
            }
        }
        const visitToken = await tokenForIncidentVisit(visit);
        return noStore(NextResponse.json({ visitToken: visitToken, surveyVersion: "incident-v1", targetType: "UNKNOWN" }));
    } catch (error) {
        console.error("Error starting incident visit:", error);
        return publicError("SERVER_ERROR", 500);
    }
}
