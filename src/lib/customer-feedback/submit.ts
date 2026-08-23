import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { verifyVisitToken, extractBearerToken } from "./form-token";
import { sha256Hex } from "./token";
import { isStationFeedbackEnabled, isEmployeeFeedbackStationEligible } from "./station-context";
import { computeAbuseScore, ABUSE_SUSPECT_THRESHOLD } from "./anti-abuse";
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
    | { code: "ALREADY_SUBMITTED"; status: 409 };

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

export function canonicalPayloadHash(parts: (string | number | boolean | null | undefined)[]): string {
    return sha256Hex(parts.map((p) => String(p ?? "")).join("|"));
}

export async function loadVisitFromHeaders(headers: Headers) {
    const token = extractBearerToken(headers);
    const verified = verifyVisitToken(token);
    if (!verified.valid) return { error: "TOKEN_INVALID" };
    const visit = await prisma.customerFeedbackVisit.findUnique({
        where: { sessionTokenHash: sha256Hex(token!) },
        include: { qrCode: true },
    });
    if (!visit) return { error: "VISIT_NOT_FOUND" };
    return { visit, qr: visit.qrCode, tokenPayload: verified.payload! };
}

function effectiveDisposition(visit: { disposition: string; formExpiresAt: Date; startedAt: Date | null | undefined; submittedAt?: Date | null }): string {
    if (visit.disposition !== "OPEN") return visit.disposition;
    if (visit.formExpiresAt.getTime() < Date.now()) return visit.startedAt ? "ABANDONED" : "EXPIRED";
    return "OPEN";
}

function checkVisitState(visit: { disposition: string; formExpiresAt: Date; startedAt: Date | null | undefined }): SubmitFailure | null {
    const eff = effectiveDisposition(visit);
    if (eff === "SUBMITTED" || eff === "TARGET_REJECTED" || eff === "SWITCHED_TO_INCIDENT" || eff === "ABANDONED" || eff === "EXPIRED" || eff === "BOT_BLOCKED") {
        return { code: "VISIT_NOT_OPEN", status: 409 };
    }
    if (visit.formExpiresAt.getTime() < Date.now()) return { code: "FORM_EXPIRED", status: 410 };
    return null;
}

async function findAlertRecipients(stationId: string | null): Promise<string[]> {
    const userIds = new Set<string>();
    if (stationId) {
        const managers = await prisma.user.findMany({
            where: { role: "MANAGER", stationId, isActive: true },
            select: { id: true },
        });
        managers.forEach((m) => userIds.add(m.id));
    }
    if (userIds.size === 0) {
        // fallback: ADMIN และ HR
        const admins = await prisma.user.findMany({
            where: { role: { in: ["ADMIN", "HR"] }, isActive: true },
            select: { id: true },
        });
        admins.forEach((a) => userIds.add(a.id));
    }
    return [...userIds];
}

async function createCaseWithNotifications(
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
    const recipients = await findAlertRecipients(params.stationId);
    if (recipients.length > 0) {
        await tx.notification.createMany({
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
    }
    return createdCase.id;
}

async function sameNetworkSameQrCount(qrCodeId: string | null, networkHash: string | null, sinceHours: number): Promise<number> {
    if (!qrCodeId || !networkHash) return 0;
    return prisma.customerFeedbackResponse.count({
        where: {
            qrCodeId,
            submittedAt: { gte: new Date(Date.now() - sinceHours * 3600 * 1000) },
            visit: { networkHashDaily: networkHash },
        },
    });
}

export interface SubmitStandardArgs {
    headers: Headers;
    idempotencyKey: string;
    payload: StandardPayload;
}

export async function submitStandardResponse(args: SubmitStandardArgs) {
    const loaded = await loadVisitFromHeaders(args.headers);
    if ("error" in loaded) return { failure: loaded.error, status: 401 } as const;

    const { visit, qr, tokenPayload } = loaded;
    const stateError = checkVisitState(visit);
    if (stateError) return { failure: stateError.code, status: stateError.status } as const;
    if (visit.visitKind !== "STANDARD" || !qr) return { failure: "VISIT_NOT_OPEN", status: 409 } as const;

    // surveyVersion ใน token ต้องตรงกับ visit
    if (tokenPayload.surveyVersion !== visit.surveyVersion) return { failure: "TOKEN_INVALID", status: 401 } as const;

    // idempotency: คืนผลเดิมเมื่อ key + payload hash เดิม
    const idempotencyKeyHash = sha256Hex(args.idempotencyKey);
    const payloadHash = canonicalPayloadHash([qr.id, visit.id, args.payload.overallRating, args.payload.reasonKeys.join(","), args.payload.comment ?? ""]);
    const existing = await prisma.customerFeedbackResponse.findUnique({
        where: { idempotencyKeyHash },
        select: { id: true, refCode: true, idempotencyPayloadHash: true },
    });
    if (existing) {
        if (existing.idempotencyPayloadHash !== payloadHash) {
            return { conflict: true, status: 409 } as const;
        }
        return { refCode: existing.refCode, caseRef: null, duplicate: true } as const;
    }

    const now = new Date();
    const isEmployee = qr.targetType === "EMPLOYEE";
    const surveyVersion = (isEmployee ? "employee-v1" : "station-v1") as SurveyVersion;

    // สถานี: EMPLOYEE ใช้ selected หรือ at-open, STATION ใช้ QR.stationId เท่านั้น
    let stationId: string | null;
    let stationContextSource: string;
    if (isEmployee) {
        stationId = args.payload.selectedStationId ?? visit.stationIdAtOpen;
        if (!stationId) return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        const eligible = await isEmployeeFeedbackStationEligible(stationId);
        if (!eligible) return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        stationContextSource = args.payload.selectedStationId ? "CUSTOMER_SELECTED" : visit.stationContextSource;
    } else {
        if (args.payload.selectedStationId && args.payload.selectedStationId !== qr.stationId) {
            return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        }
        stationId = qr.stationId;
        if (!stationId) return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        const enabled = await isStationFeedbackEnabled(stationId);
        if (!enabled) return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        stationContextSource = "TOKEN";
    }

    // เป้าหมาย EMPLOYEE ต้องยัง active
    if (isEmployee) {
        const target = await prisma.user.findUnique({
            where: { id: qr.employeeId! },
            select: { isActive: true },
        });
        if (!target?.isActive) return { failure: "TARGET_INACTIVE", status: 410 } as const;
    }

    const durationSeconds = args.payload.durationSeconds ?? Math.max(3, Math.floor((now.getTime() - visit.openedAt.getTime()) / 1000));
    const networkCount = await sameNetworkSameQrCount(qr.id, visit.networkHashDaily, 24);
    const abuse = computeAbuseScore({ durationSeconds, sameNetworkSameQrCount: networkCount });
    const validity = visit.isTestAtOpen ? ("TEST" as const) : abuse.score >= ABUSE_SUSPECT_THRESHOLD ? ("SUSPECTED" as const) : ("VALID" as const);

    const [station, employeeUser] = await Promise.all([
        stationId ? prisma.station.findUnique({ where: { id: stationId }, select: { name: true } }) : null,
        isEmployee && qr.employeeId ? prisma.user.findUnique({ where: { id: qr.employeeId }, select: { departmentId: true, stationId: true } }) : null,
    ]);

    const severity = validity === "VALID" || validity === "SUSPECTED"
        ? standardCaseSeverity({
            overallRating: args.payload.overallRating,
            reasonKeys: args.payload.reasonKeys,
            wantsFollowUp: args.payload.wantsFollowUp,
        })
        : null;

    const refCode = generateRefCode();

    const result = await prisma.$transaction(async (tx) => {
        // conditional transition OPEN -> SUBMITTED: ผู้ชนะคนเดียว
        const claimed = await tx.customerFeedbackVisit.updateMany({
            where: { id: visit.id, disposition: "OPEN" },
            data: { disposition: "SUBMITTED", submittedAt: now, targetConfirmation: "YES" },
        });
        if (claimed.count === 0) throw new Error("VISIT_NOT_OPEN");

        // rotate ชน submit: เทียบ version ตอน insert ภายใน transaction เดียวกัน
        const currentQr = await tx.customerFeedbackQr.findUnique({
            where: { id: qr.id },
            select: { version: true, isActive: true },
        });
        if (!currentQr || currentQr.version !== tokenPayload.qrVersion || !currentQr.isActive) {
            throw new Error("QR_ROTATED");
        }

        const created = await tx.customerFeedbackResponse.create({
            data: {
                refCode,
                visitId: visit.id,
                qrCodeId: qr.id,
                qrVersionAtSubmit: currentQr.version,
                kind: "STANDARD",
                targetType: qr.targetType,
                employeeId: isEmployee ? qr.employeeId : null,
                stationId,
                departmentIdAtSubmit: employeeUser?.departmentId ?? null,
                stationContextSource,
                employeeLabelSnapshot: isEmployee ? qr.publicLabel : null,
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
                reportDate: bangkokReportDate(now),
                submittedAt: now,
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
                    consentAt: now,
                    purgeAfter: contactPurgeAfter(now),
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

        return { responseId: created.id, caseId };
    });

    return { refCode, caseId: result.caseId, severity } as const;
}

export interface SubmitIncidentArgs {
    headers: Headers;
    idempotencyKey: string;
    payload: IncidentPayload;
}

export async function submitIncidentResponse(args: SubmitIncidentArgs) {
    const loaded = await loadVisitFromHeaders(args.headers);
    if ("error" in loaded) return { failure: loaded.error, status: 401 } as const;

    const { visit, tokenPayload } = loaded;
    const stateError = checkVisitState(visit);
    if (stateError) return { failure: stateError.code, status: stateError.status } as const;
    if (visit.visitKind !== "INCIDENT") return { failure: "VISIT_NOT_OPEN", status: 409 } as const;
    if (tokenPayload.surveyVersion !== visit.surveyVersion) return { failure: "TOKEN_INVALID", status: 401 } as const;

    const idempotencyKeyHash = sha256Hex(args.idempotencyKey);
    const payloadHash = canonicalPayloadHash([visit.id, args.payload.incidentKey, args.payload.dangerStatus, args.payload.comment ?? "", args.payload.noDetail]);
    const existing = await prisma.customerFeedbackResponse.findUnique({
        where: { idempotencyKeyHash },
        select: { refCode: true, idempotencyPayloadHash: true },
    });
    if (existing) {
        if (existing.idempotencyPayloadHash !== payloadHash) return { conflict: true, status: 409 } as const;
        return { refCode: existing.refCode, duplicate: true } as const;
    }

    const now = new Date();
    let stationId = args.payload.selectedStationId ?? visit.stationIdAtOpen ?? null;
    let stationContextSource = "UNKNOWN";
    if (stationId) {
        const eligible = await isEmployeeFeedbackStationEligible(stationId);
        if (!eligible) return { failure: "STATION_NOT_ELIGIBLE", status: 409 } as const;
        stationContextSource = args.payload.selectedStationId ? "CUSTOMER_SELECTED" : visit.stationContextSource;
    }

    const severity = incidentCaseSeverity(args.payload.incidentKey, args.payload.dangerStatus);
    const durationSeconds = args.payload.durationSeconds ?? Math.max(3, Math.floor((now.getTime() - visit.openedAt.getTime()) / 1000));
    const abuse = computeAbuseScore({ durationSeconds, sameNetworkSameQrCount: 0 });
    const validity = visit.isTestAtOpen ? ("TEST" as const) : abuse.score >= ABUSE_SUSPECT_THRESHOLD ? ("SUSPECTED" as const) : ("VALID" as const);

    const station = stationId ? await prisma.station.findUnique({ where: { id: stationId }, select: { name: true } }) : null;
    if (args.payload.selectedStationId && !station) {
        stationId = null;
        stationContextSource = "UNKNOWN";
    }
    const refCode = generateRefCode();
    const occurredAt = new Date(args.payload.occurredAt);

    const result = await prisma.$transaction(async (tx) => {
        const claimed = await tx.customerFeedbackVisit.updateMany({
            where: { id: visit.id, disposition: "OPEN" },
            data: { disposition: "SUBMITTED", submittedAt: now, stationIdSelected: args.payload.selectedStationId ?? null },
        });
        if (claimed.count === 0) throw new Error("VISIT_NOT_OPEN");

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
                reportDate: bangkokReportDate(now),
                submittedAt: now,
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
                    consentAt: now,
                    purgeAfter: contactPurgeAfter(now),
                },
            });
        }

        // เคส URGENT ต้องมี AlertLog ด้วย
        const caseId = await createCaseWithNotifications(tx, {
            responseId: created.id,
            stationId,
            severity,
            category: args.payload.incidentKey,
        });
        if (severity === "URGENT") {
            await tx.customerFeedbackAlertLog.create({
                data: {
                    ruleCode: "urgent_incident",
                    targetType: "STATION",
                    targetId: stationId ?? "GLOBAL",
                    windowStart: now,
                    windowEnd: new Date(now.getTime() + 3600 * 1000),
                    details: { caseId } as never,
                },
            }).catch(() => undefined);
        }

        // parent ที่ยัง OPEN เปลี่ยนเป็น SWITCHED_TO_INCIDENT ใน transaction เดียวกัน
        if (visit.parentVisitId) {
            await tx.customerFeedbackVisit.updateMany({
                where: { id: visit.parentVisitId, disposition: "OPEN" },
                data: { disposition: "SWITCHED_TO_INCIDENT" },
            });
        }

        return { responseId: created.id, caseId };
    });

    return { refCode, caseId: result.caseId, severity } as const;
}

export { visitPurgeAfter, FORM_EXPIRY_MS };
