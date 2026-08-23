import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCustomerFeedbackPublicEnabled, assertPublicSecrets } from "@/lib/customer-feedback/feature-flags";
import { sha256Hex, hashManualCode } from "@/lib/customer-feedback/token";
import { createVisitToken } from "@/lib/customer-feedback/form-token";
import {
    networkHashDaily,
    clientHashWeekly,
    resolveNonceHash,
    networkRateKey,
    deviceClassOf,
    currentHashKeyVersion,
    checkRateLimit,
    checkGlobalLimit,
    GLOBAL_LIMITS,
    PER_QR_RESOLVE_PER_HOUR,
    PER_NETWORK_RESOLVE_PER_HOUR,
    PER_NETWORK_MANUAL_CODE_PER_MINUTE,
} from "@/lib/customer-feedback/anti-abuse";
import { resolveEmployeeCurrentStation } from "@/lib/customer-feedback/station-context";
import { shuffledOptionOrder, getSurvey } from "@/lib/customer-feedback/questions";
import { visitPurgeAfter, FORM_EXPIRY_MS } from "@/lib/customer-feedback/retention";

/**
 * POST /api/public/customer-feedback/resolve
 * รับ token หรือรหัสกรอกเองใน body (ไม่ใช่ URL) สร้าง Visit และคืน signed form token
 * พร้อมข้อมูลสาธารณะขั้นต่ำ
 */

const GENERIC_INVALID_MESSAGE = "ไม่พบแบบประเมินนี้ โปรดสแกน QR ที่จุดบริการอีกครั้ง";

function clientIp(request: NextRequest): string {
    // Vercel ให้ x-forwarded-for ที่ platform เท่านั้นที่เขียนได้
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip") ?? "unknown";
}

function noStore(response: NextResponse): NextResponse {
    response.headers.set("Cache-Control", "no-store");
    return response;
}

async function recordResolve(resolverType: "TOKEN" | "MANUAL_CODE", result: "SUCCESS" | "INVALID" | "INACTIVE" | "RATE_LIMITED") {
    const now = new Date();
    const str = new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const [y, m, d] = str.split("-").map(Number);
    const reportDate = new Date(Date.UTC(y, m - 1, d));
    await prisma.customerFeedbackResolveDailyAggregate.upsert({
        where: { reportDate_resolverType_result: { reportDate, resolverType, result } },
        update: { count: { increment: 1 } },
        create: { reportDate, resolverType, result, count: 1 },
    }).catch(() => undefined);
}

/**
 * แจ้ง ADMIN ครั้งเดียวต่อหน้าต่างนาทีที่ invalid-resolve breaker ทำงาน
 * กันซ้ำด้วย Notification.eventKey (partial unique) + AlertLog (unique ต่อ window)
 */
async function alertInvalidResolveBreaker(now: Date): Promise<void> {
    try {
        const admins = await prisma.user.findMany({
            where: { role: "ADMIN", isActive: true },
            select: { id: true },
        });
        const windowKey = `${Math.floor(now.getTime() / 60_000)}`;
        if (admins.length > 0) {
            await prisma.notification.createMany({
                data: admins.map((a) => ({
                    userId: a.id,
                    type: "CUSTOMER_FEEDBACK",
                    title: "พบจำนวนการ resolve ที่ไม่สำเร็จผิดปกติ",
                    message: "ระบบตรวจพบความพยายามเปิดแบบประเมินเกินเพดานของทั้งระบบ — อาจมีการสแกน/ทดลองรหัสแบบอัตโนมัติ",
                    link: "/admin/customer-feedback",
                    eventKey: `feedback-breaker:invalid-resolve:${windowKey}`,
                })),
                skipDuplicates: true,
            }).catch(() => undefined);
        }
    } catch {
        // แจ้งเตือนพังไม่ควรทำให้ request หลักพัง — log ไว้ที่ server เท่านั้น
        console.error("Failed to alert invalid-resolve breaker");
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackPublicEnabled()) {
            return noStore(NextResponse.json({ error: "ระบบยังไม่เปิดรับความคิดเห็น" }, { status: 404 }));
        }
        assertPublicSecrets();

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            return noStore(NextResponse.json({ error: "Unsupported content type" }, { status: 415 }));
        }

        const body = await request.json().catch(() => null);
        if (typeof body !== "object" || body === null) {
            return noStore(NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 400 }));
        }
        const { token, manualCode } = body as { token?: unknown; manualCode?: unknown };
        if (typeof token !== "string" && typeof manualCode !== "string") {
            return noStore(NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 400 }));
        }

        const resolverType: "TOKEN" | "MANUAL_CODE" = typeof token === "string" ? "TOKEN" : "MANUAL_CODE";
        const ip = clientIp(request);
        const userAgent = request.headers.get("user-agent") ?? "";
        const now = new Date();

        // header นี้ client ส่งมาเอง จึงใช้ได้แค่ idempotency ห้ามใช้เป็นคีย์ rate limit
        const idempotencyHeader = request.headers.get("resolve-idempotency-key");
        const nonceKey = resolveNonceHash(String(idempotencyHeader ?? "anonymous"), ip, now);

        // คีย์ที่ client หมุนเองไม่ได้
        const networkKey = networkRateKey(ip, now);

        const tooManyRequests = (retryAfterSec: number) => {
            void recordResolve(resolverType, "RATE_LIMITED");
            return noStore(NextResponse.json(
                { error: "เปิดแบบประเมินบ่อยเกินไป กรุณารอสักครู่" },
                { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
            ));
        };

        // ชั้นที่ 1 — เพดานต่อเครือข่าย (กว้าง เพราะ CGNAT)
        const networkLimit = await checkRateLimit(
            "resolve-visit-network", networkKey, PER_NETWORK_RESOLVE_PER_HOUR, 3600 * 1000
        );
        if (!networkLimit.allowed) return tooManyRequests(networkLimit.retryAfterSec);

        // ชั้นที่ 2 — เพดานต่อ idempotency key ช่วยเฉพาะ client ที่ส่ง header มาตรง ๆ
        const nonceLimit = await checkRateLimit("resolve-visit", nonceKey, 30, 3600 * 1000);
        if (!nonceLimit.allowed) return tooManyRequests(nonceLimit.retryAfterSec);

        // ค้นหา QR
        let qr: import("@prisma/client").CustomerFeedbackQr | null = null;
        if (typeof token === "string") {
            qr = await prisma.customerFeedbackQr.findUnique({ where: { tokenHash: sha256Hex(token) } });
        } else {
            const code = (manualCode as string).toUpperCase();
            // เดารหัสกรอกเอง — จำกัดต่อเครือข่าย ไม่ใช่ต่อ header ที่ปลอมได้
            const guessLimit = await checkRateLimit(
                "manual-code-guess", networkKey, PER_NETWORK_MANUAL_CODE_PER_MINUTE, 60 * 1000
            );
            if (!guessLimit.allowed) {
                await recordResolve("MANUAL_CODE", "RATE_LIMITED");
                return noStore(NextResponse.json(
                    { error: "ลองรหัสบ่อยเกินไป กรุณารอ 1 นาที" },
                    { status: 429, headers: { "Retry-After": "60" } }
                ));
            }
            qr = await prisma.customerFeedbackQr.findUnique({
                where: { manualCodeHash: hashManualCode(code) },
            });
        }

        // circuit breaker ชั้นนอกสุด — คำขอที่ resolve ไม่ผ่านทั้งระบบต่อนาที
        // §14.1: เมื่อ breaker ทำงานต้องแจ้งผู้ดูแล — eventKey กันส่งซ้ำต่อหน้าต่างเดียวกัน
        const rejectInvalid = async (result: "INVALID" | "INACTIVE") => {
            await recordResolve(resolverType, result);
            const breaker = await checkGlobalLimit(
                "global-invalid-resolve", GLOBAL_LIMITS.invalidResolvePerMinute, 60 * 1000
            );
            if (!breaker.allowed) {
                await alertInvalidResolveBreaker(now);
            }
            return noStore(NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 404 }));
        };

        if (!qr) return rejectInvalid("INVALID");
        if (!qr.isActive) return rejectInvalid("INACTIVE");

        // ชั้นที่ 3 — เพดานต่อ QR หนึ่งใบ ป้ายเดียวไม่ควรถูกเปิดถี่กว่านี้
        const qrLimit = await checkRateLimit(
            "resolve-visit-qr", qr.id, PER_QR_RESOLVE_PER_HOUR, 3600 * 1000
        );
        if (!qrLimit.allowed) return tooManyRequests(qrLimit.retryAfterSec);

        // เป้าหมายต้องยัง active
        let stationContext: { stationId: string | null; source: string } = { stationId: null, source: "UNKNOWN" };
        if (qr.targetType === "EMPLOYEE") {
            const target = await prisma.user.findUnique({
                where: { id: qr.employeeId! },
                select: { isActive: true },
            });
            if (!target?.isActive) {
                await recordResolve(resolverType, "INACTIVE");
                return noStore(NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 404 }));
            }
            stationContext = await resolveEmployeeCurrentStation(qr.employeeId!);
        } else if (qr.targetType === "STATION") {
            const station = await prisma.station.findUnique({
                where: { id: qr.stationId! },
                select: { isActive: true, publicEmergencyPhone: true },
            });
            if (!station?.isActive || !station.publicEmergencyPhone) {
                await recordResolve(resolverType, "INACTIVE");
                return noStore(NextResponse.json({ error: GENERIC_INVALID_MESSAGE }, { status: 404 }));
            }
            stationContext = { stationId: qr.stationId!, source: "TOKEN" };
        }

        const surveyVersion = qr.targetType === "EMPLOYEE" ? "employee-v1" : "station-v1";
        const formExpiresAt = new Date(now.getTime() + FORM_EXPIRY_MS);

        // ส่ง Resolve-Idempotency-Key เดิมซ้ำ = คำขอเดิม ไม่สร้าง Visit ใหม่
        // ทำเฉพาะเมื่อมี header จริง — ถ้าไม่มี nonce จะเป็น "anonymous" ซึ่งชนกันข้ามคนได้
        const existingVisit = idempotencyHeader
            ? await prisma.customerFeedbackVisit.findFirst({
                where: {
                    resolveNonceHash: nonceKey,
                    qrCodeId: qr.id,
                    visitKind: "STANDARD",
                    disposition: "OPEN",
                    formExpiresAt: { gt: now },
                },
                orderBy: { openedAt: "desc" },
            })
            : null;

        if (!existingVisit) {
            // circuit breaker ชั้นนอกสุด — จำนวน Visit ที่สร้างได้ทั้งระบบต่อนาที
            const globalLimit = await checkGlobalLimit(
                "global-visit-create", GLOBAL_LIMITS.visitCreatePerMinute, 60 * 1000
            );
            if (!globalLimit.allowed) return tooManyRequests(globalLimit.retryAfterSec);
        }

        const visit = existingVisit ?? await prisma.customerFeedbackVisit.create({
            data: {
                qrCodeId: qr.id,
                qrVersionAtOpen: qr.version,
                visitKind: "STANDARD",
                surveyVersion,
                disposition: "OPEN",
                isTestAtOpen: qr.isTest,
                sessionTokenHash: "pending",
                networkHashDaily: networkHashDaily(ip, now),
                clientHashWeekly: clientHashWeekly(ip, userAgent, now),
                resolveNonceHash: nonceKey,
                hashKeyVersion: currentHashKeyVersion(),
                targetType: qr.targetType,
                employeeId: qr.employeeId,
                stationIdAtOpen: stationContext.stationId,
                stationContextSource: stationContext.source,
                deviceClass: deviceClassOf(userAgent),
                language: "th",
                formExpiresAt,
                purgeAfter: visitPurgeAfter(now),
            },
        });

        const { token: signedToken, tokenHash } = createVisitToken({
            visitId: visit.id,
            visitKind: "STANDARD",
            targetType: qr.targetType,
            surveyVersion,
            qrCodeId: qr.id,
            qrVersion: visit.qrVersionAtOpen ?? qr.version,
        });
        await prisma.customerFeedbackVisit.update({
            where: { id: visit.id },
            data: { sessionTokenHash: tokenHash },
        });
        await prisma.customerFeedbackQr.update({
            where: { id: qr.id },
            data: { lastResolvedAt: now },
        }).catch(() => undefined);
        await recordResolve(resolverType, "SUCCESS");

        const survey = getSurvey(surveyVersion)!;
        const stationName = stationContext.stationId
            ? (await prisma.station.findUnique({ where: { id: stationContext.stationId }, select: { name: true, publicEmergencyPhone: true } }))
            : null;
        const stationNeedsSelection = qr.targetType === "EMPLOYEE" && !stationContext.stationId;

        return noStore(NextResponse.json({
            visitToken: signedToken,
            surveyVersion,
            targetType: qr.targetType,
            target: {
                label: qr.publicLabel,
                position: qr.targetType === "EMPLOYEE" ? (qr.publicPosition ?? "พนักงานบริการ") : null,
            },
            station: stationName ? { id: stationContext.stationId, name: stationName.name, emergencyPhone: stationName.publicEmergencyPhone } : null,
            stationNeedsSelection,
            reasonOptionOrder: shuffledOptionOrder(survey.reasonOptions.map((o) => o.key), visit.id),
            maxReasons: survey.maxReasons,
            commentMaxLength: survey.commentMaxLength,
            serviceAreaKey: qr.serviceAreaKey ?? null,
            formExpiresAt: visit.formExpiresAt.toISOString(),
            language: "th",
        }));
    } catch (error) {
        console.error("Error resolving customer feedback QR:", error);
        return noStore(NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" }, { status: 500 }));
    }
}
