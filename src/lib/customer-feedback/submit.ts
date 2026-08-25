import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createHmac } from "crypto";
import { auth } from "@/lib/auth";
import { bangkokCalendarDayRange } from "@/lib/customer-feedback/calendar-day";
import { verifyVisitToken, extractBearerToken, type VisitTokenPayload } from "./form-token";
import { sha256Hex } from "./token";
import {
    computeAbuseScore,
    ABUSE_SUSPECT_THRESHOLD,
    isKnownSelfEvaluation,
    serverDerivedDurationSeconds,
} from "./anti-abuse";
import { standardCaseSeverity, incidentCaseSeverity, caseDueAt, caseNotificationEventKey } from "./cases";
import { visitPurgeAfter, contactPurgeAfter, FORM_EXPIRY_MS } from "./retention";
import { PRIVACY_NOTICE_VERSION, type SurveyVersion } from "./questions";
import type { StandardPayload, IncidentPayload } from "./validation";
import { encryptField } from "@/lib/crypto-field";

/**
 * Server-side submission service ของระบบเสียงลูกค้า
 * ทุกอย่างที่ client ห้ามกำหนด (kind, validity, ids, เวลา) derive ที่นี่
 */

export type SubmitFailure =
    | { code: "TOKEN_INVALID"; status: 401 }
    | { code: "VISIT_NOT_FOUND"; status: 404 }
    | { code: "VISIT_NOT_OPEN"; status: 409 }
    | { code: "FORM_EXPIRED"; status: 410 }
    | { code: "QR_ROTATED"; status: 409 }
    | { code: "QR_INACTIVE"; status: 410 }
    | { code: "TARGET_INACTIVE"; status: 410 }
    | { code: "STATION_NOT_ELIGIBLE"; status: 409 }
    | { code: "ALREADY_SUBMITTED"; status: 409 }
    | { code: "FORM_TOO_FAST"; status: 429 }
    | { code: "SELF_EVALUATION"; status: 403 }
    | { code: "ALERT_RECIPIENT_UNAVAILABLE"; status: 503 };

type SubmitFailureCode = SubmitFailure["code"];

export class SubmitDomainError extends Error {
    constructor(
        readonly code: SubmitFailureCode,
        readonly status: SubmitFailure["status"]
    ) {
        super(code);
        this.name = "SubmitDomainError";
    }
}

export function shouldCreateOperationalFeedbackCase(validity: "VALID" | "SUSPECTED" | "TEST" | "HIDDEN"): boolean {
    return validity === "VALID" || validity === "SUSPECTED";
}

const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateRefCode(): string {
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
    }
    return `FB-${code}`;
}

function bangkokReportDate(now: Date): Date {
    const str = new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const [y, m, d] = str.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function stableCanonicalJson(value: unknown): string {
    if (value === null) return "null";
    if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("Canonical payload contains a non-finite number");
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(stableCanonicalJson).join(",")}]`;
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, child]) => child !== undefined)
            .sort(([a], [b]) => a.localeCompare(b));
        return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableCanonicalJson(child)}`).join(",")}}`;
    }
    return JSON.stringify(String(value));
}

/** HMAC ป้องกันการเดาเบอร์โทร/อีเมลจาก digest ในฐานข้อมูล */
export function canonicalPayloadHash(payload: unknown): string {
    const key = process.env.CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY;
    if (!key) throw new Error("CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY is not set");
    return createHmac("sha256", key).update(stableCanonicalJson(payload)).digest("hex");
}

export function standardIdempotencyPayload(
    visitId: string,
    qrCodeId: string,
    payload: StandardPayload
): Record<string, unknown> {
    return {
        kind: "STANDARD",
        qrCodeId,
        visitId,
        payload: {
            targetConfirmation: payload.targetConfirmation,
            selectedStationId: payload.selectedStationId ?? null,
            overallRating: payload.overallRating,
            reasonKeys: [...payload.reasonKeys].sort(),
            serviceAreas: [...payload.serviceAreas].sort(),
            comment: payload.comment ?? null,
            wantsFollowUp: payload.wantsFollowUp,
            contact: payload.contact ?? null,
            language: payload.language,
        },
    };
}

export function incidentIdempotencyPayload(
    visitId: string,
    payload: IncidentPayload
): Record<string, unknown> {
    return {
        kind: "INCIDENT",
        visitId,
        payload: {
            selectedStationId: payload.selectedStationId ?? null,
            incidentKey: payload.incidentKey,
            dangerStatus: payload.dangerStatus,
            occurredAt: payload.occurredAt,
            noDetail: payload.noDetail,
            comment: payload.comment ?? null,
            wantsFollowUp: payload.wantsFollowUp,
            contact: payload.contact ?? null,
            language: payload.language,
        },
    };
}

export function knownSelfEvaluationFailure(
    authenticatedUserId: string | null | undefined,
    targetEmployeeUserId: string | null | undefined
): { failure: "SELF_EVALUATION"; status: 403 } | null {
    return isKnownSelfEvaluation(authenticatedUserId, targetEmployeeUserId)
        ? { failure: "SELF_EVALUATION", status: 403 }
        : null;
}

const VISIT_INCLUDE = { qrCode: true } satisfies Prisma.CustomerFeedbackVisitInclude;
type FeedbackVisitWithQr = Prisma.CustomerFeedbackVisitGetPayload<{ include: typeof VISIT_INCLUDE }>;

export interface LoadedVisitContext {
    visit: FeedbackVisitWithQr;
    qr: FeedbackVisitWithQr["qrCode"];
    tokenPayload: VisitTokenPayload;
    minimumFillVerified: boolean;
}

export async function loadVisitFromHeaders(
    headers: Headers,
    options: { enforceMinimumFill?: boolean } = {}
): Promise<LoadedVisitContext | { error: "TOKEN_INVALID" | "VISIT_NOT_FOUND" | "FORM_TOO_FAST" }> {
    const token = extractBearerToken(headers);
    const verified = verifyVisitToken(token, { enforceMinimumFill: options.enforceMinimumFill });
    if (!verified.valid) {
        return { error: verified.reason === "too-fast" ? "FORM_TOO_FAST" : "TOKEN_INVALID" };
    }
    const visit = await prisma.customerFeedbackVisit.findUnique({
        where: { sessionTokenHash: sha256Hex(token!) },
        include: VISIT_INCLUDE,
    });
    if (!visit) return { error: "VISIT_NOT_FOUND" };
    const payload = verified.payload!;
    if (
        payload.visitId !== visit.id ||
        payload.visitKind !== visit.visitKind ||
        payload.targetType !== visit.targetType ||
        payload.surveyVersion !== visit.surveyVersion ||
        payload.qrCodeId !== visit.qrCodeId ||
        payload.qrVersion !== visit.qrVersionAtOpen
    ) {
        return { error: "TOKEN_INVALID" };
    }
    return {
        visit,
        qr: visit.qrCode,
        tokenPayload: payload,
        minimumFillVerified: options.enforceMinimumFill === true,
    };
}

function checkVisitState(visit: { disposition: string; formExpiresAt: Date; startedAt: Date | null | undefined }): SubmitFailure | null {
    if (visit.formExpiresAt.getTime() < Date.now()) return { code: "FORM_EXPIRED", status: 410 };
    if (visit.disposition !== "OPEN") return { code: "VISIT_NOT_OPEN", status: 409 };
    return null;
}

/**
 * ผู้รับ escalation ของเคส URGENT
 *
 * ตั้งเป็นรหัสพนักงานคั่นด้วยจุลภาคใน `CUSTOMER_FEEDBACK_URGENT_ALERT_EMPLOYEE_IDS`
 * ไม่ตั้ง = ADMIN ที่ยัง active ทุกคน
 */
async function findUrgentEscalationRecipients(tx: Prisma.TransactionClient): Promise<string[]> {
    const configured = (process.env.CUSTOMER_FEEDBACK_URGENT_ALERT_EMPLOYEE_IDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (configured.length > 0) {
        const users = await tx.user.findMany({
            where: { employeeId: { in: configured }, isActive: true },
            select: { id: true },
        });
        if (users.length > 0) return users.map((u) => u.id);
        // ตั้งรหัสไว้แต่หาไม่เจอ (ลาออก/พิมพ์ผิด) — ห้ามเงียบ ตกไปใช้ ADMIN แทน
        console.error(
            "CUSTOMER_FEEDBACK_URGENT_ALERT_EMPLOYEE_IDS ไม่ตรงกับพนักงานที่ active คนใดเลย — ส่งให้ ADMIN แทน"
        );
    }

    const admins = await tx.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
    });
    return admins.map((a) => a.id);
}

async function findAlertRecipients(
    tx: Prisma.TransactionClient,
    stationId: string | null,
    severity: "NORMAL" | "HIGH" | "URGENT"
): Promise<string[]> {
    const userIds = new Set<string>();
    if (stationId) {
        const managers = await tx.user.findMany({
            where: { role: "MANAGER", stationId, isActive: true },
            select: { id: true },
        });
        managers.forEach((m) => userIds.add(m.id));
    }
    if (userIds.size === 0 || severity === "HIGH" || severity === "URGENT") {
        // HIGH/URGENT ต้องถึงส่วนกลางด้วย ส่วน NORMAL ใช้เป็น fallback เมื่อไม่มี manager
        const admins = await tx.user.findMany({
            where: { role: { in: ["ADMIN", "HR"] }, isActive: true },
            select: { id: true },
        });
        admins.forEach((a) => userIds.add(a.id));
    }

    // เหตุอันตราย SLA 2 ชม. ต้องถึงผู้รับผิดชอบเสมอ ไม่ใช่แค่ผู้จัดการสถานี
    // (สถานีที่มีผู้จัดการอยู่แล้วจะไม่เข้า fallback ข้างบน ผู้บริหารจึงไม่เคยรู้)
    if (severity === "URGENT") {
        const escalation = await findUrgentEscalationRecipients(tx);
        escalation.forEach((id) => userIds.add(id));
    }

    return [...userIds];
}

export async function createCaseWithNotifications(
    tx: Prisma.TransactionClient,
    params: {
        responseId: string;
        stationId: string | null;
        severity: "NORMAL" | "HIGH" | "URGENT";
        category: string;
    }
): Promise<string> {
    const createdCase = await tx.customerFeedbackCase.create({
        data: {
            responseId: params.responseId,
            stationId: params.stationId,
            severity: params.severity,
            category: params.category,
            status: "OPEN",
            dueAt: caseDueAt(params.severity),
        },
        select: { id: true },
    });
    const recipients = await findAlertRecipients(tx, params.stationId, params.severity);
    if (params.severity === "URGENT" && recipients.length === 0) {
        throw new SubmitDomainError("ALERT_RECIPIENT_UNAVAILABLE", 503);
    }
    if (recipients.length > 0) {
        const notificationResult = await tx.notification.createMany({
            data: recipients.map((userId) => ({
                userId,
                type: "CUSTOMER_FEEDBACK",
                title: `เคสเสียงลูกค้าระดับ ${params.severity}`,
                message: params.severity === "URGENT"
                    ? "มีเหตุเร่งด่วนจากลูกค้าที่ต้องรับทราบภายใน 2 ชั่วโมง"
                    : params.severity === "HIGH"
                        ? "มีคำตอบลูกค้าเชิงลบที่ต้องรับทราบภายใน 24 ชั่วโมง"
                        : "ลูกค้าขอให้ติดต่อกลับ",
                link: "/admin/customer-feedback?tab=cases",
                eventKey: caseNotificationEventKey(createdCase.id, "created"),
            })),
            skipDuplicates: true,
        });
        if (params.severity === "URGENT" && notificationResult.count === 0) {
            throw new SubmitDomainError("ALERT_RECIPIENT_UNAVAILABLE", 503);
        }
    }
    return createdCase.id;
}

export async function recordUrgentIncidentAlert(
    tx: Prisma.TransactionClient,
    params: { caseId: string; stationId: string | null; now: Date }
): Promise<void> {
    await tx.customerFeedbackAlertLog.create({
        data: {
            ruleCode: "urgent_incident",
            targetType: params.stationId ? "STATION" : "UNKNOWN",
            targetId: params.stationId ?? "GLOBAL",
            windowStart: params.now,
            windowEnd: new Date(params.now.getTime() + 3600 * 1000),
            details: { caseId: params.caseId } as never,
        },
    });
}

interface AbuseCountParams {
    kind: "STANDARD" | "INCIDENT";
    qrCodeId: string | null;
    signal: "networkHashDaily" | "clientHashWeekly";
    signalHash: string | null;
    sinceHours: number;
    now: Date;
}

export function abuseResponseWhere(params: AbuseCountParams): Prisma.CustomerFeedbackResponseWhereInput {
    return {
        kind: params.kind,
        qrCodeId: params.qrCodeId,
        validity: { not: "TEST" },
        submittedAt: { gte: new Date(params.now.getTime() - params.sinceHours * 3600 * 1000) },
        visit: { [params.signal]: params.signalHash },
    };
}

export function abuseSignalLockKeys(params: {
    kind: "STANDARD" | "INCIDENT";
    qrCodeId: string | null;
    networkHashDaily: string | null;
    clientHashWeekly: string | null;
}): string[] {
    const target = params.qrCodeId ?? "NO_QR";
    return [
        params.networkHashDaily ? `feedback-abuse:${params.kind}:${target}:network:${params.networkHashDaily}` : null,
        params.clientHashWeekly ? `feedback-abuse:${params.kind}:${target}:client:${params.clientHashWeekly}` : null,
    ].filter((key): key is string => key !== null).sort();
}

async function lockAbuseSignals(
    tx: Prisma.TransactionClient,
    params: Parameters<typeof abuseSignalLockKeys>[0]
): Promise<void> {
    for (const key of abuseSignalLockKeys(params)) {
        // PostgreSQL คืนชนิด void จาก advisory lock ซึ่ง Prisma แปลงค่าไม่ได้
        // cast เป็น text เพื่อให้ query รอ lock ตามเดิมและอ่านผลลัพธ์ได้ทุก runtime
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`);
    }
}

async function sameSignalTargetCount(tx: Prisma.TransactionClient, params: AbuseCountParams): Promise<number> {
    if (!params.signalHash) return 0;
    return tx.customerFeedbackResponse.count({ where: abuseResponseWhere(params) });
}

async function authenticatedUserIdBestEffort(): Promise<string | null> {
    try {
        const session = await auth();
        return session?.user?.id ?? null;
    } catch {
        // public feedback ใช้ได้โดยไม่ login; session ที่อ่านไม่ได้ห้ามทำให้ลูกค้าส่งไม่ได้
        return null;
    }
}

type DuplicateResult =
    | { conflict: true; status: 409 }
    | { refCode: string; caseId: string | null; severity: "NORMAL" | "HIGH" | "URGENT" | null; duplicate: true };

async function findIdempotentResponse(
    idempotencyKeyHash: string,
    payloadHash: string
): Promise<DuplicateResult | null> {
    const existing = await prisma.customerFeedbackResponse.findUnique({
        where: { idempotencyKeyHash },
        select: {
            refCode: true,
            idempotencyPayloadHash: true,
            case: { select: { id: true, severity: true } },
        },
    });
    if (!existing) return null;
    if (existing.idempotencyPayloadHash !== payloadHash) return { conflict: true, status: 409 };
    return {
        refCode: existing.refCode,
        caseId: existing.case?.id ?? null,
        severity: existing.case?.severity ?? null,
        duplicate: true,
    };
}

function failureStatus(error: "TOKEN_INVALID" | "VISIT_NOT_FOUND" | "FORM_TOO_FAST"): 401 | 404 | 429 {
    if (error === "VISIT_NOT_FOUND") return 404;
    if (error === "FORM_TOO_FAST") return 429;
    return 401;
}

export interface SubmitStandardArgs {
    headers: Headers;
    idempotencyKey: string;
    payload: StandardPayload;
    loaded?: LoadedVisitContext;
}

export async function submitStandardResponse(args: SubmitStandardArgs) {
    const loaded = args.loaded?.minimumFillVerified
        ? args.loaded
        : await loadVisitFromHeaders(args.headers, { enforceMinimumFill: true });
    if ("error" in loaded) return { failure: loaded.error, status: failureStatus(loaded.error) } as const;

    const { visit, qr, tokenPayload } = loaded;
    if (visit.visitKind !== "STANDARD" || !qr) return { failure: "VISIT_NOT_OPEN", status: 409 } as const;

    const isEmployee = qr.targetType === "EMPLOYEE";
    const surveyVersion = (isEmployee ? "employee-v1" : "station-v1") as SurveyVersion;
    if (tokenPayload.surveyVersion !== surveyVersion || visit.surveyVersion !== surveyVersion) {
        return { failure: "TOKEN_INVALID", status: 401 } as const;
    }

    // idempotency: คืนผลเดิมเมื่อ key + payload hash เดิม
    const idempotencyKeyHash = sha256Hex(args.idempotencyKey);
    const payloadHash = canonicalPayloadHash(standardIdempotencyPayload(visit.id, qr.id, args.payload));
    const existing = await findIdempotentResponse(idempotencyKeyHash, payloadHash);
    if (existing) return existing;

    const stateError = checkVisitState(visit);
    if (stateError) return { failure: stateError.code, status: stateError.status } as const;

    const selfEvaluation = isEmployee
        ? knownSelfEvaluationFailure(await authenticatedUserIdBestEffort(), qr.employeeId)
        : null;
    if (selfEvaluation) {
        await prisma.customerFeedbackVisit.updateMany({
            where: { id: visit.id, disposition: "OPEN" },
            data: { disposition: "BOT_BLOCKED", blockedReason: "KNOWN_SELF_EVALUATION" },
        });
        return selfEvaluation;
    }

    // สถานี: EMPLOYEE ใช้ selected หรือ at-open, STATION ใช้ QR.stationId เท่านั้น
    let stationId: string | null;
    let stationContextSource: string;
    if (isEmployee) {
        stationId = args.payload.selectedStationId ?? visit.stationIdAtOpen;
        if (!stationId) return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        stationContextSource = args.payload.selectedStationId ? "CUSTOMER_SELECTED" : visit.stationContextSource;
    } else {
        if (args.payload.selectedStationId && args.payload.selectedStationId !== qr.stationId) {
            return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        }
        stationId = qr.stationId;
        if (!stationId) return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        stationContextSource = "TOKEN";
    }

    const refCode = generateRefCode();

    try {
        const result = await prisma.$transaction(async (tx) => {
            // ลำดับ lock กลาง: User -> Station -> QR -> Visit -> abuse signal
            // route ปิดพนักงาน/สถานีและ promote QR ต้องใช้ลำดับเดียวกันเพื่อไม่ให้รอกันเป็นวง
            if (isEmployee && qr.employeeId) {
                await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${qr.employeeId} FOR UPDATE`);
            }
            await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${stationId} FOR UPDATE`);
            if (isEmployee) {
                await tx.$queryRaw(Prisma.sql`
                    SELECT "id" FROM "CustomerFeedbackQr"
                    WHERE "id" = ${qr.id}
                    ORDER BY "id"
                    FOR UPDATE
                `);
            } else {
                // ล็อกทั้ง QR ปัจจุบันและ QR หลักทุกใบในคำสั่งเดียวตาม id
                // ป้องกัน secondary submit ชน promote/activate ของ primary
                await tx.$queryRaw(Prisma.sql`
                    SELECT "id" FROM "CustomerFeedbackQr"
                    WHERE "id" = ${qr.id}
                       OR ("stationId" = ${stationId} AND "targetType" = 'STATION' AND "isPrimary" = true)
                    ORDER BY "id"
                    FOR UPDATE
                `);
            }

            const currentQr = await tx.customerFeedbackQr.findUnique({
                where: { id: qr.id },
                select: {
                    version: true,
                    isActive: true,
                    isPrimary: true,
                    targetType: true,
                    employeeId: true,
                    stationId: true,
                    publicLabel: true,
                },
            });
            if (
                !currentQr ||
                currentQr.version !== tokenPayload.qrVersion ||
                !currentQr.isActive ||
                currentQr.targetType !== qr.targetType ||
                currentQr.employeeId !== qr.employeeId ||
                currentQr.stationId !== qr.stationId
            ) {
                throw new SubmitDomainError("QR_ROTATED", 409);
            }

            const station = await tx.station.findUnique({
                where: { id: stationId },
                select: { name: true, isActive: true, publicEmergencyPhone: true },
            });
            if (!station?.isActive) throw new SubmitDomainError("STATION_NOT_ELIGIBLE", 409);
            if (!isEmployee) {
                const activePrimary = await tx.customerFeedbackQr.findFirst({
                    where: { stationId, targetType: "STATION", isPrimary: true, isActive: true },
                    select: { id: true },
                });
                if (!station.publicEmergencyPhone || currentQr.stationId !== stationId || !activePrimary) {
                    throw new SubmitDomainError("STATION_NOT_ELIGIBLE", 409);
                }
            }

            await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerFeedbackVisit" WHERE "id" = ${visit.id} FOR UPDATE`);
            const currentVisit = await tx.customerFeedbackVisit.findUnique({
                where: { id: visit.id },
                select: { disposition: true, formExpiresAt: true },
            });
            const claimNow = new Date();
            if (!currentVisit) throw new SubmitDomainError("VISIT_NOT_OPEN", 409);
            if (currentVisit.formExpiresAt.getTime() < claimNow.getTime()) {
                throw new SubmitDomainError("FORM_EXPIRED", 410);
            }
            if (currentVisit.disposition !== "OPEN") throw new SubmitDomainError("VISIT_NOT_OPEN", 409);

            // Snapshot โครงสร้างพนักงานและกะด้วยวันเดียวกับเวลาที่ claim แบบฟอร์ม
            const employeeUser = isEmployee && currentQr.employeeId ? await tx.user.findUnique({
                where: { id: currentQr.employeeId },
                select: {
                    isActive: true,
                    departmentId: true,
                    department: { select: { name: true } },
                    shiftAssignments: {
                        where: { date: bangkokCalendarDayRange(claimNow), isDayOff: false },
                        take: 1,
                        select: { shiftId: true, shift: { select: { name: true } } },
                    },
                },
            }) : null;
            if (isEmployee && !employeeUser?.isActive) throw new SubmitDomainError("TARGET_INACTIVE", 410);

            // conditional transition OPEN -> SUBMITTED: ผู้ชนะคนเดียว
            const claimed = await tx.customerFeedbackVisit.updateMany({
                where: { id: visit.id, disposition: "OPEN", formExpiresAt: { gte: claimNow } },
                data: {
                    disposition: "SUBMITTED",
                    submittedAt: claimNow,
                    targetConfirmation: "YES",
                    stationIdSelected: stationId,
                },
            });
            if (claimed.count === 0) throw new SubmitDomainError("VISIT_NOT_OPEN", 409);

            const durationSeconds = serverDerivedDurationSeconds(visit.openedAt, visit.startedAt, claimNow);

            await lockAbuseSignals(tx, {
                kind: "STANDARD",
                qrCodeId: qr.id,
                networkHashDaily: visit.networkHashDaily,
                clientHashWeekly: visit.clientHashWeekly,
            });
            const [networkCount, clientCount] = visit.isTestAtOpen ? [0, 0] : await Promise.all([
                sameSignalTargetCount(tx, {
                    kind: "STANDARD",
                    qrCodeId: qr.id,
                    signal: "networkHashDaily",
                    signalHash: visit.networkHashDaily,
                    sinceHours: 24,
                    now: claimNow,
                }),
                sameSignalTargetCount(tx, {
                    kind: "STANDARD",
                    qrCodeId: qr.id,
                    signal: "clientHashWeekly",
                    signalHash: visit.clientHashWeekly,
                    sinceHours: 24,
                    now: claimNow,
                }),
            ]);
            const abuse = computeAbuseScore({
                durationSeconds,
                sameNetworkSameQrCount: networkCount,
                sameClientSameTargetCount: clientCount,
            });
            const validity = visit.isTestAtOpen
                ? ("TEST" as const)
                : abuse.score >= ABUSE_SUSPECT_THRESHOLD ? ("SUSPECTED" as const) : ("VALID" as const);
            const severity = validity === "TEST" ? null : standardCaseSeverity({
                overallRating: args.payload.overallRating,
                reasonKeys: args.payload.reasonKeys,
                wantsFollowUp: args.payload.wantsFollowUp,
            });
            const shiftAtSubmit = employeeUser?.shiftAssignments[0] ?? null;

            const created = await tx.customerFeedbackResponse.create({
            data: {
                refCode,
                visitId: visit.id,
                qrCodeId: qr.id,
                qrVersionAtSubmit: currentQr.version,
                kind: "STANDARD",
                targetType: qr.targetType,
                employeeId: isEmployee ? currentQr.employeeId : null,
                stationId,
                departmentIdAtSubmit: employeeUser?.departmentId ?? null,
                shiftIdAtSubmit: shiftAtSubmit?.shiftId ?? null,
                departmentLabelSnapshot: employeeUser?.department?.name ?? null,
                shiftLabelSnapshot: shiftAtSubmit?.shift.name ?? null,
                stationContextSource,
                employeeLabelSnapshot: isEmployee ? currentQr.publicLabel : null,
                stationLabelSnapshot: station?.name ?? null,
                surveyVersion,
                privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
                language: args.payload.language,
                serviceAreas: args.payload.serviceAreas,
                overallRating: args.payload.overallRating,
                reasonKeys: args.payload.reasonKeys,
                comment: args.payload.comment ?? null,
                wantsFollowUp: args.payload.wantsFollowUp,
                validity,
                abuseScore: abuse.score,
                abuseReasons: abuse.reasons,
                idempotencyKeyHash,
                idempotencyPayloadHash: payloadHash,
                durationSeconds,
                reportDate: bangkokReportDate(claimNow),
                submittedAt: claimNow,
            },
            select: { id: true },
        });

            // normalized answers
        const answers: { surveyVersion: string; questionKey: string; state: "ANSWERED" | "SKIPPED" | "NOT_SHOWN"; numberValue?: number; textValue?: string; choiceValues?: string[] }[] = [
            { surveyVersion, questionKey: "target_confirmation", state: "ANSWERED", choiceValues: ["YES"] },
            { surveyVersion, questionKey: "overall_rating", state: "ANSWERED", numberValue: args.payload.overallRating },
            {
                surveyVersion,
                questionKey: "reason_keys",
                state: args.payload.reasonKeys.length > 0 ? "ANSWERED" : args.payload.overallRating <= 2 ? "ANSWERED" : "SKIPPED",
                choiceValues: args.payload.reasonKeys,
            },
            { surveyVersion, questionKey: "service_areas", state: args.payload.serviceAreas.length > 0 ? "ANSWERED" : "SKIPPED", choiceValues: args.payload.serviceAreas },
            { surveyVersion, questionKey: "comment", state: args.payload.comment ? "ANSWERED" : "SKIPPED", textValue: args.payload.comment },
        ];
        await tx.customerFeedbackAnswer.createMany({
            data: answers.map((a) => ({
                responseId: created.id,
                surveyVersion: a.surveyVersion,
                questionKey: a.questionKey,
                state: a.state,
                numberValue: a.numberValue ?? null,
                textValue: a.textValue ?? null,
                choiceValues: a.choiceValues ?? [],
            })),
        });

        if (args.payload.wantsFollowUp && args.payload.contact) {
            await tx.customerFeedbackContact.create({
                data: {
                    responseId: created.id,
                    channel: args.payload.contact.channel,
                    nameEncrypted: args.payload.contact.name ? encryptField(args.payload.contact.name) : null,
                    valueEncrypted: encryptField(args.payload.contact.value),
                    preferredTime: args.payload.contact.preferredTime ?? null,
                    consentAt: claimNow,
                    purgeAfter: contactPurgeAfter(claimNow),
                },
            });
        }

        let caseId: string | null = null;
        if (severity) {
            caseId = await createCaseWithNotifications(tx, {
                responseId: created.id,
                stationId,
                severity,
                category: severity === "NORMAL" ? "follow-up" : "negative-feedback",
            });
        }

            return { responseId: created.id, caseId, severity };
        }, { maxWait: 5_000, timeout: 20_000 });

        return { refCode, caseId: result.caseId, severity: result.severity } as const;
    } catch (error) {
        // transaction อาจแพ้ concurrent request หลังอีกคำขอ commit แล้ว จึง re-read key ก่อนตัดสิน state
        const duplicate = await findIdempotentResponse(idempotencyKeyHash, payloadHash);
        if (duplicate) return duplicate;
        if (error instanceof SubmitDomainError) {
            return { failure: error.code, status: error.status } as const;
        }
        throw error;
    }
}

export interface SubmitIncidentArgs {
    headers: Headers;
    idempotencyKey: string;
    payload: IncidentPayload;
    loaded?: LoadedVisitContext;
}

export async function submitIncidentResponse(args: SubmitIncidentArgs) {
    const loaded = args.loaded?.minimumFillVerified
        ? args.loaded
        : await loadVisitFromHeaders(args.headers, { enforceMinimumFill: true });
    if ("error" in loaded) return { failure: loaded.error, status: failureStatus(loaded.error) } as const;

    const { visit, tokenPayload } = loaded;
    if (visit.visitKind !== "INCIDENT") return { failure: "VISIT_NOT_OPEN", status: 409 } as const;
    if (tokenPayload.surveyVersion !== "incident-v1" || visit.surveyVersion !== "incident-v1") {
        return { failure: "TOKEN_INVALID", status: 401 } as const;
    }

    const idempotencyKeyHash = sha256Hex(args.idempotencyKey);
    const payloadHash = canonicalPayloadHash(incidentIdempotencyPayload(visit.id, args.payload));
    const existing = await findIdempotentResponse(idempotencyKeyHash, payloadHash);
    if (existing) return existing;

    const stateError = checkVisitState(visit);
    if (stateError) return { failure: stateError.code, status: stateError.status } as const;

    let stationId = args.payload.selectedStationId ?? visit.stationIdAtOpen ?? null;
    let stationContextSource = "UNKNOWN";
    if (stationId) {
        stationContextSource = args.payload.selectedStationId ? "CUSTOMER_SELECTED" : visit.stationContextSource;
    }

    const severity = incidentCaseSeverity(args.payload.incidentKey, args.payload.dangerStatus);
    const refCode = generateRefCode();
    const occurredAt = new Date(args.payload.occurredAt);

    try {
        const result = await prisma.$transaction(async (tx) => {
            // INCIDENT ยังรับเหตุได้หลัง QR/เป้าหมายถูกปิด แต่ต้องล็อกแถวอ้างอิงตามลำดับกลาง
            // เพื่อให้ hard delete ที่เริ่มพร้อมกันไม่รอกับ Visit เป็นวง
            if (visit.employeeId) {
                await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${visit.employeeId} FOR UPDATE`);
            }
            if (stationId) {
                await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${stationId} FOR UPDATE`);
            }
            if (visit.qrCodeId) {
                await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerFeedbackQr" WHERE "id" = ${visit.qrCodeId} FOR UPDATE`);
            }

            // ล็อก child และ parent ตาม id หลัง User/Station/QR ให้ submission ทุกแบบเรียง lock เหมือนกัน
            const visitIds = [visit.id, visit.parentVisitId].filter((id): id is string => Boolean(id)).sort();
            await tx.$queryRaw(Prisma.sql`
                SELECT "id" FROM "CustomerFeedbackVisit"
                WHERE "id" IN (${Prisma.join(visitIds)})
                ORDER BY "id"
                FOR UPDATE
            `);

            const station = stationId
                ? await tx.station.findUnique({ where: { id: stationId }, select: { name: true, isActive: true } })
                : null;
            if (args.payload.selectedStationId && !station?.isActive) {
                throw new SubmitDomainError("STATION_NOT_ELIGIBLE", 409);
            }
            if (!station) {
                stationId = null;
                stationContextSource = "UNKNOWN";
            }

            const currentVisit = await tx.customerFeedbackVisit.findUnique({
                where: { id: visit.id },
                select: { disposition: true, formExpiresAt: true },
            });
            const claimNow = new Date();
            if (!currentVisit) throw new SubmitDomainError("VISIT_NOT_OPEN", 409);
            if (currentVisit.formExpiresAt.getTime() < claimNow.getTime()) {
                throw new SubmitDomainError("FORM_EXPIRED", 410);
            }
            if (currentVisit.disposition !== "OPEN") throw new SubmitDomainError("VISIT_NOT_OPEN", 409);

            const claimed = await tx.customerFeedbackVisit.updateMany({
                where: { id: visit.id, disposition: "OPEN", formExpiresAt: { gte: claimNow } },
                data: { disposition: "SUBMITTED", submittedAt: claimNow, stationIdSelected: stationId },
            });
            if (claimed.count === 0) throw new SubmitDomainError("VISIT_NOT_OPEN", 409);

            const durationSeconds = serverDerivedDurationSeconds(visit.openedAt, visit.startedAt, claimNow);

            await lockAbuseSignals(tx, {
                kind: "INCIDENT",
                qrCodeId: visit.qrCodeId,
                networkHashDaily: visit.networkHashDaily,
                clientHashWeekly: visit.clientHashWeekly,
            });
            const [networkCount, clientCount] = visit.isTestAtOpen ? [0, 0] : await Promise.all([
                sameSignalTargetCount(tx, {
                    kind: "INCIDENT",
                    qrCodeId: visit.qrCodeId,
                    signal: "networkHashDaily",
                    signalHash: visit.networkHashDaily,
                    sinceHours: 24,
                    now: claimNow,
                }),
                sameSignalTargetCount(tx, {
                    kind: "INCIDENT",
                    qrCodeId: visit.qrCodeId,
                    signal: "clientHashWeekly",
                    signalHash: visit.clientHashWeekly,
                    sinceHours: 24,
                    now: claimNow,
                }),
            ]);
            const abuse = computeAbuseScore({
                durationSeconds,
                sameNetworkSameQrCount: networkCount,
                sameClientSameTargetCount: clientCount,
            });
            const validity = visit.isTestAtOpen
                ? ("TEST" as const)
                : abuse.score >= ABUSE_SUSPECT_THRESHOLD ? ("SUSPECTED" as const) : ("VALID" as const);

            // INCIDENT ไม่ปฏิเสธเพราะ QR ถูก rotate หรือเป้าหมายถูกปิดหลังเริ่มแจ้ง
            const created = await tx.customerFeedbackResponse.create({
            data: {
                refCode,
                visitId: visit.id,
                qrCodeId: visit.qrCodeId,
                qrVersionAtSubmit: visit.qrVersionAtOpen,
                kind: "INCIDENT",
                targetType: visit.targetType,
                employeeId: visit.employeeId,
                stationId,
                stationContextSource,
                stationLabelSnapshot: station?.name ?? null,
                surveyVersion: "incident-v1",
                privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
                language: args.payload.language,
                incidentKey: args.payload.incidentKey,
                dangerStatus: args.payload.dangerStatus,
                occurredAt,
                noDetail: args.payload.noDetail,
                comment: args.payload.comment ?? null,
                wantsFollowUp: args.payload.wantsFollowUp,
                validity,
                abuseScore: abuse.score,
                abuseReasons: abuse.reasons,
                idempotencyKeyHash,
                idempotencyPayloadHash: payloadHash,
                durationSeconds,
                reportDate: bangkokReportDate(claimNow),
                submittedAt: claimNow,
            },
            select: { id: true },
        });

        await tx.customerFeedbackAnswer.createMany({
            data: [
                { responseId: created.id, surveyVersion: "incident-v1", questionKey: "incident_type", state: "ANSWERED", choiceValues: [args.payload.incidentKey] },
                { responseId: created.id, surveyVersion: "incident-v1", questionKey: "danger_status", state: "ANSWERED", choiceValues: [args.payload.dangerStatus] },
                { responseId: created.id, surveyVersion: "incident-v1", questionKey: "comment", state: args.payload.comment ? "ANSWERED" : "SKIPPED", textValue: args.payload.comment },
            ],
        });

        if (args.payload.wantsFollowUp && args.payload.contact) {
            await tx.customerFeedbackContact.create({
                data: {
                    responseId: created.id,
                    channel: args.payload.contact.channel,
                    nameEncrypted: args.payload.contact.name ? encryptField(args.payload.contact.name) : null,
                    valueEncrypted: encryptField(args.payload.contact.value),
                    preferredTime: args.payload.contact.preferredTime ?? null,
                    consentAt: claimNow,
                    purgeAfter: contactPurgeAfter(claimNow),
                },
            });
        }

        // QR ทดสอบเก็บ Response ไว้ตรวจ flow แต่ไม่สร้างเคสหรือรบกวนผู้รับแจ้งเตือนจริง
        let caseId: string | null = null;
        if (shouldCreateOperationalFeedbackCase(validity)) {
            caseId = await createCaseWithNotifications(tx, {
                responseId: created.id,
                stationId,
                severity,
                category: args.payload.incidentKey,
            });
            if (severity === "URGENT") {
                // fail closed: AlertLog ล้มต้อง rollback Response + Case + Notification ทั้งชุด
                await recordUrgentIncidentAlert(tx, { caseId, stationId, now: claimNow });
            }
        }

        // parent ที่ยัง OPEN เปลี่ยนเป็น SWITCHED_TO_INCIDENT ใน transaction เดียวกัน
        if (visit.parentVisitId) {
            await tx.customerFeedbackVisit.updateMany({
                where: { id: visit.parentVisitId, disposition: { in: ["OPEN", "TARGET_REJECTED"] } },
                data: { disposition: "SWITCHED_TO_INCIDENT" },
            });
        }

            return { responseId: created.id, caseId, validity };
        }, { maxWait: 5_000, timeout: 20_000 });

        return { refCode, caseId: result.caseId, severity: result.validity === "TEST" ? null : severity } as const;
    } catch (error) {
        const duplicate = await findIdempotentResponse(idempotencyKeyHash, payloadHash);
        if (duplicate) return duplicate;
        if (error instanceof SubmitDomainError) {
            return { failure: error.code, status: error.status } as const;
        }
        throw error;
    }
}

export { visitPurgeAfter, FORM_EXPIRY_MS };
