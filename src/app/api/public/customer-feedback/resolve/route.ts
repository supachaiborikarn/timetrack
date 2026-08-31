import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { bangkokCalendarDayRange } from "@/lib/customer-feedback/calendar-day";
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
    isRateLimitExceeded,
    GLOBAL_LIMITS,
    PER_QR_RESOLVE_PER_HOUR,
    PER_NETWORK_RESOLVE_PER_HOUR,
    PER_NETWORK_MANUAL_CODE_PER_MINUTE,
} from "@/lib/customer-feedback/anti-abuse";
import { isStationFeedbackEnabled, resolveEmployeeCurrentStation } from "@/lib/customer-feedback/station-context";
import { shuffledOptionOrder, getSurvey } from "@/lib/customer-feedback/questions";
import { visitPurgeAfter, FORM_EXPIRY_MS } from "@/lib/customer-feedback/retention";
import { publicError } from "@/lib/customer-feedback/public-errors";
import { tryRecordAlert } from "@/lib/customer-feedback/alerts";
import { isJsonRequest, isSameOriginRequest, readJsonBody } from "../_request";

/**
 * POST /api/public/customer-feedback/resolve
 * รับ token หรือรหัสกรอกเองใน body (ไม่ใช่ URL) สร้าง Visit และคืน signed form token
 * พร้อมข้อมูลสาธารณะขั้นต่ำ
 */

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
        const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
        const windowEnd = new Date(windowStart.getTime() + 60_000);
        const shouldNotify = await tryRecordAlert({
            ruleCode: "INVALID_RESOLVE_GLOBAL_BREAKER",
            targetType: "UNKNOWN",
            targetId: "GLOBAL",
            windowStart,
            windowEnd,
            details: { limit: GLOBAL_LIMITS.invalidResolvePerMinute },
        });
        if (!shouldNotify) return;

        const admins = await prisma.user.findMany({
            where: { role: "ADMIN", isActive: true },
            select: { id: true },
        });
        const windowKey = `${Math.floor(windowStart.getTime() / 60_000)}`;
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
            return publicError("PUBLIC_DISABLED", 404);
        }
        assertPublicSecrets();

        if (!isSameOriginRequest(request)) {
            return noStore(NextResponse.json({ error: "Invalid origin" }, { status: 403 }));
        }
        if (!isJsonRequest(request)) {
            return noStore(NextResponse.json({ error: "Unsupported content type" }, { status: 415 }));
        }

        const parsedBody = await readJsonBody(request);
        if (!parsedBody.ok) {
            return parsedBody.reason === "PAYLOAD_TOO_LARGE"
                ? publicError("PAYLOAD_TOO_LARGE", 413)
                : publicError("INVALID_QR", 400);
        }
        if (typeof parsedBody.value !== "object" || parsedBody.value === null) {
            return publicError("INVALID_QR", 400);
        }
        const { token, manualCode } = parsedBody.value as { token?: unknown; manualCode?: unknown };
        if (typeof token !== "string" && typeof manualCode !== "string") {
            return publicError("INVALID_QR", 400);
        }

        const resolverType: "TOKEN" | "MANUAL_CODE" = typeof token === "string" ? "TOKEN" : "MANUAL_CODE";
        const ip = clientIp(request);
        const userAgent = request.headers.get("user-agent") ?? "";
        const now = new Date();

        // header นี้ client ส่งมาเอง จึงใช้ได้แค่ idempotency ห้ามใช้เป็นคีย์ rate limit
        const rawIdempotencyHeader = request.headers.get("resolve-idempotency-key");
        if (rawIdempotencyHeader && rawIdempotencyHeader.length > 200) {
            return publicError("INVALID_QR", 400);
        }
        const idempotencyHeader = rawIdempotencyHeader || null;
        const nonceKey = idempotencyHeader ? resolveNonceHash(idempotencyHeader, ip, now) : null;

        // คีย์ที่ client หมุนเองไม่ได้
        const networkKey = networkRateKey(ip, now);

        if (await isRateLimitExceeded(
            "global-invalid-resolve",
            "GLOBAL",
            GLOBAL_LIMITS.invalidResolvePerMinute,
            60 * 1000,
            now
        )) {
            await alertInvalidResolveBreaker(now);
            return publicError("SERVER_BUSY", 429, { "Retry-After": "60" });
        }

        const tooManyRequests = (retryAfterSec: number) => {
            void recordResolve(resolverType, "RATE_LIMITED");
            return publicError("RESOLVE_RATE_LIMITED", 429, { "Retry-After": String(retryAfterSec) });
        };

        // ชั้นที่ 1 — เพดานต่อเครือข่าย (กว้าง เพราะ CGNAT)
        const networkLimit = await checkRateLimit(
            "resolve-visit-network", networkKey, PER_NETWORK_RESOLVE_PER_HOUR, 3600 * 1000
        );
        if (!networkLimit.allowed) return tooManyRequests(networkLimit.retryAfterSec);

        // ชั้นที่ 2 — เพดานต่อ idempotency key ช่วยเฉพาะ client ที่ส่ง header มาตรง ๆ
        if (nonceKey) {
            const nonceLimit = await checkRateLimit("resolve-visit", nonceKey, 30, 3600 * 1000);
            if (!nonceLimit.allowed) return tooManyRequests(nonceLimit.retryAfterSec);
        }

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
                return publicError("MANUAL_CODE_RATE_LIMITED", 429, { "Retry-After": "60" });
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
                return publicError("SERVER_BUSY", 429, { "Retry-After": String(breaker.retryAfterSec) });
            }
            return publicError("INVALID_QR", 404);
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
        let departmentIdAtOpen: string | null = null;
        let shiftIdAtOpen: string | null = null;
        if (qr.targetType === "EMPLOYEE") {
            const target = await prisma.user.findUnique({
                where: { id: qr.employeeId! },
                select: {
                    isActive: true,
                    departmentId: true,
                    shiftAssignments: {
                        // ตารางกะรุ่นเก่าบางรายการเก็บ UTC midnight ส่วนรุ่นใหม่เก็บ Bangkok midnight
                        // ใช้ช่วงวันเพื่อให้พบทั้งสองรูปแบบโดยยังไม่ข้ามวันตามเวลาประเทศไทย
                        where: { date: bangkokCalendarDayRange(now), isDayOff: false },
                        take: 1,
                        select: { shiftId: true },
                    },
                },
            });
            if (!target?.isActive) {
                await recordResolve(resolverType, "INACTIVE");
                return publicError("INVALID_QR", 404);
            }
            departmentIdAtOpen = target.departmentId;
            shiftIdAtOpen = target.shiftAssignments[0]?.shiftId ?? null;
            stationContext = await resolveEmployeeCurrentStation(qr.employeeId!);
        } else if (qr.targetType === "STATION") {
            const station = await prisma.station.findUnique({
                where: { id: qr.stationId! },
                select: { isActive: true, publicEmergencyPhone: true },
            });
            const stationFeedbackEnabled = station?.isActive && station.publicEmergencyPhone
                ? await isStationFeedbackEnabled(qr.stationId!)
                : false;
            if (!stationFeedbackEnabled) {
                await recordResolve(resolverType, "INACTIVE");
                return publicError("INVALID_QR", 404);
            }
            stationContext = { stationId: qr.stationId!, source: "TOKEN" };
        }

        const newSurveyVersion = qr.targetType === "EMPLOYEE" ? "employee-v4" : "station-v1";
        const formExpiresAt = new Date(now.getTime() + FORM_EXPIRY_MS);

        // ส่ง Resolve-Idempotency-Key เดิมซ้ำ = คำขอเดิม ไม่สร้าง Visit ใหม่
        // ทำเฉพาะเมื่อมี header จริง — คำขอที่ไม่มี nonce ต้องสร้าง Visit ใหม่และเก็บค่า null
        const existingVisit = idempotencyHeader
            ? await prisma.customerFeedbackVisit.findFirst({
                where: {
                    resolveNonceHash: nonceKey,
                    qrCodeId: qr.id,
                    visitKind: "STANDARD",
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

        // จุดออกสิทธิ์เข้าแบบประเมินต้องเรียงลำดับกับ activate/deactivate/rotate ให้ชัดเจน
        // ล็อกเป้าหมายก่อน QR ตามลำดับกลาง แล้วตรวจสถานะและสร้าง/reuse Visit ใน transaction เดียว
        const issuedVisit = await prisma.$transaction(async (tx) => {
            if (qr.targetType === "EMPLOYEE") {
                await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${qr.employeeId} FOR UPDATE`);
            } else {
                await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${qr.stationId} FOR UPDATE`);
            }
            await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerFeedbackQr" WHERE "id" = ${qr.id} FOR UPDATE`);

            const currentQr = await tx.customerFeedbackQr.findUnique({
                where: { id: qr.id },
                select: { version: true, isActive: true, isTest: true },
            });
            if (!currentQr?.isActive || currentQr.version !== qr.version) {
                return { status: "INACTIVE" as const };
            }

            if (qr.targetType === "EMPLOYEE") {
                const currentTarget = await tx.user.findUnique({
                    where: { id: qr.employeeId! },
                    select: {
                        isActive: true,
                        departmentId: true,
                        shiftAssignments: {
                            where: { date: bangkokCalendarDayRange(now), isDayOff: false },
                            take: 1,
                            select: { shiftId: true },
                        },
                    },
                });
                if (!currentTarget?.isActive) return { status: "INACTIVE" as const };
                departmentIdAtOpen = currentTarget.departmentId;
                shiftIdAtOpen = currentTarget.shiftAssignments[0]?.shiftId ?? null;
            } else {
                const currentStation = await tx.station.findUnique({
                    where: { id: qr.stationId! },
                    select: { isActive: true, publicEmergencyPhone: true },
                });
                if (!currentStation?.isActive || !currentStation.publicEmergencyPhone) {
                    return { status: "INACTIVE" as const };
                }
                const activePrimary = await tx.customerFeedbackQr.findFirst({
                    where: {
                        stationId: qr.stationId,
                        targetType: "STATION",
                        isPrimary: true,
                        isActive: true,
                    },
                    select: { id: true },
                });
                if (!activePrimary) return { status: "INACTIVE" as const };
            }

            const visitId = randomUUID();
            const initialToken = createVisitToken({
                visitId,
                visitKind: "STANDARD",
                targetType: qr.targetType,
                surveyVersion: newSurveyVersion,
                qrCodeId: qr.id,
                qrVersion: currentQr.version,
            }, now.getTime());
            const createData = {
                id: visitId,
                qrCodeId: qr.id,
                qrVersionAtOpen: currentQr.version,
                visitKind: "STANDARD" as const,
                surveyVersion: newSurveyVersion,
                disposition: "OPEN" as const,
                isTestAtOpen: currentQr.isTest,
                sessionTokenHash: initialToken.tokenHash,
                networkHashDaily: networkHashDaily(ip, now),
                clientHashWeekly: clientHashWeekly(ip, userAgent, now),
                resolveNonceHash: nonceKey,
                hashKeyVersion: currentHashKeyVersion(),
                targetType: qr.targetType,
                employeeId: qr.employeeId,
                stationIdAtOpen: stationContext.stationId,
                stationContextSource: stationContext.source,
                departmentIdAtOpen,
                shiftIdAtOpen,
                deviceClass: deviceClassOf(userAgent),
                language: "th",
                openedAt: now,
                formExpiresAt,
                purgeAfter: visitPurgeAfter(now),
            };
            const visit = nonceKey
                ? await tx.customerFeedbackVisit.upsert({
                    where: {
                        resolveNonceHash_qrCodeId_visitKind: {
                            resolveNonceHash: nonceKey,
                            qrCodeId: qr.id,
                            visitKind: "STANDARD",
                        },
                    },
                    update: {},
                    create: createData,
                })
                : await tx.customerFeedbackVisit.create({ data: createData });

            if (visit.formExpiresAt.getTime() <= now.getTime()) {
                return { status: "EXPIRED" as const };
            }

            const { token: signedToken, tokenHash } = createVisitToken({
                visitId: visit.id,
                visitKind: "STANDARD",
                targetType: visit.targetType,
                surveyVersion: visit.surveyVersion,
                qrCodeId: qr.id,
                qrVersion: visit.qrVersionAtOpen ?? currentQr.version,
            }, visit.openedAt.getTime());
            if (visit.sessionTokenHash !== tokenHash) {
                await tx.customerFeedbackVisit.update({
                    where: { id: visit.id },
                    data: { sessionTokenHash: tokenHash },
                });
            }
            await tx.customerFeedbackQr.update({
                where: { id: qr.id },
                data: { lastResolvedAt: now },
            });
            return { status: "ISSUED" as const, visit, signedToken };
        });

        if (issuedVisit.status === "INACTIVE") {
            return rejectInvalid("INACTIVE");
        }
        if (issuedVisit.status === "EXPIRED") {
            return publicError("FORM_EXPIRED", 410);
        }
        const { visit, signedToken } = issuedVisit;
        await recordResolve(resolverType, "SUCCESS");

        // idempotent resolve อาจ reuse Visit รุ่นเก่า จึงต้องคืน registry/version ของ Visit เดิม
        // ให้ตรงกับ signed token และกติกาที่ใช้ตอนส่งคำตอบ
        const resolvedSurveyVersion = visit.surveyVersion;
        const survey = getSurvey(resolvedSurveyVersion);
        if (!survey || resolvedSurveyVersion === "incident-v1") {
            return publicError("SESSION_EXPIRED", 401);
        }
        const stationName = visit.stationIdAtOpen
            ? (await prisma.station.findUnique({ where: { id: visit.stationIdAtOpen }, select: { name: true, publicEmergencyPhone: true } }))
            : null;
        const stationNeedsSelection = qr.targetType === "EMPLOYEE" && !visit.stationIdAtOpen;

        return noStore(NextResponse.json({
            visitToken: signedToken,
            surveyVersion: resolvedSurveyVersion,
            targetType: qr.targetType,
            target: {
                label: qr.publicLabel,
                position: qr.targetType === "EMPLOYEE" ? (qr.publicPosition ?? "พนักงานบริการ") : null,
            },
            station: stationName ? { id: visit.stationIdAtOpen, name: stationName.name, emergencyPhone: stationName.publicEmergencyPhone } : null,
            stationNeedsSelection,
            reasonOptionOrder: shuffledOptionOrder(survey.reasonOptions.map((o) => o.key), visit.id),
            maxReasons: survey.maxReasons,
            commentMaxLength: survey.commentMaxLength,
            serviceAreaKey: qr.serviceAreaKey ?? null,
            formExpiresAt: visit.formExpiresAt.toISOString(),
            isTest: visit.isTestAtOpen,
            language: "th",
        }));
    } catch (error) {
        console.error("Error resolving customer feedback QR:", error);
        return publicError("SERVER_ERROR", 500);
    }
}
