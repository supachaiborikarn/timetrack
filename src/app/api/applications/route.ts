import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRate, getClientIp } from "@/lib/rate-limit";
import { verifyFormToken } from "@/lib/form-token";
import { isValidThaiCitizenId } from "@/lib/thai-citizen-id";
import { encryptField } from "@/lib/crypto-field";
import { createNotifications } from "@/lib/notifications";
import { getAttendanceDiscordWebhookUrl, sendDiscordWebhook } from "@/lib/discord";
import { isOpeningOpen } from "@/lib/job-opening";

export const runtime = "nodejs";

const SUBMIT_LIMIT_PER_HOUR = 3;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CONSENT_VERSION = "2569-08-v1";

const EMPLOYMENT_TYPES = new Set(["FULL_TIME", "PART_TIME", "DAILY"]);
const PREFERRED_SHIFTS = new Set(["MORNING", "AFTERNOON", "NIGHT"]);
const REQUIRED_FILE_KINDS = ["PROFILE_PHOTO", "CITIZEN_ID"] as const;
const MAX_FILES = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function cleanString(value: unknown, maxLength: number): string {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalString(value: unknown, maxLength: number): string | null {
    const cleaned = cleanString(value, maxLength);
    return cleaned || null;
}

function parseDate(value: unknown): Date | null {
    if (typeof value !== "string" || !value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function generateRefCode(): Promise<string> {
    const beYear = new Date().getFullYear() + 543;
    const yy = String(beYear).slice(-2);
    const prefix = `APP-${yy}-`;
    const count = await prisma.jobApplication.count({ where: { refCode: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request.headers);
    const rate = checkRate(`applications:submit:${ip}`, SUBMIT_LIMIT_PER_HOUR, SUBMIT_WINDOW_MS);
    if (!rate.allowed) {
        return NextResponse.json(
            { error: "ส่งใบสมัครบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
            { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
        );
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return badRequest("รูปแบบคำขอไม่ถูกต้อง");
    }

    // --- anti-bot ---
    if (cleanString(body.website, 200)) {
        // Honeypot tripped — pretend success so the bot doesn't learn anything, but save nothing.
        return NextResponse.json({ refCode: "APP-0000-0000" });
    }
    const tokenCheck = verifyFormToken(body.formToken);
    if (!tokenCheck.valid) {
        return badRequest(
            tokenCheck.reason === "too-fast" ? "กรุณากรอกข้อมูลอีกครั้ง" : "แบบฟอร์มหมดอายุ กรุณาโหลดหน้าใหม่"
        );
    }

    // --- step 1: position ---
    const positionTitle = cleanString(body.positionTitle, 120);
    const stationId = cleanString(body.stationId, 60);
    const departmentId = optionalString(body.departmentId, 60);
    const employmentType = EMPLOYMENT_TYPES.has(String(body.employmentType)) ? String(body.employmentType) : null;
    const expectedSalary = typeof body.expectedSalary === "number" && body.expectedSalary >= 0 ? body.expectedSalary : null;
    const availableFrom = parseDate(body.availableFrom);
    const preferredShifts = Array.isArray(body.preferredShifts)
        ? body.preferredShifts.filter((s): s is string => typeof s === "string" && PREFERRED_SHIFTS.has(s))
        : [];

    if (!positionTitle) return badRequest("กรุณาระบุตำแหน่งที่สมัคร");
    if (!stationId) return badRequest("กรุณาเลือกสาขา");

    const station = await prisma.station.findFirst({ where: { id: stationId, isActive: true } });
    if (!station) return badRequest("ไม่พบสาขาที่เลือก");

    if (departmentId) {
        const department = await prisma.department.findFirst({ where: { id: departmentId, stationId } });
        if (!department) return badRequest("แผนกที่เลือกไม่ตรงกับสาขา");
    }

    // --- step 2: personal info ---
    const prefix = optionalString(body.prefix, 20);
    const firstName = cleanString(body.firstName, 100);
    const lastName = cleanString(body.lastName, 100);
    const nickName = optionalString(body.nickName, 60);
    const birthDate = parseDate(body.birthDate);
    const gender = optionalString(body.gender, 30);
    const nationality = optionalString(body.nationality, 60);
    const religion = optionalString(body.religion, 60);
    const maritalStatus = optionalString(body.maritalStatus, 30);
    const militaryStatus = optionalString(body.militaryStatus, 60);
    const citizenId = cleanString(body.citizenId, 20).replace(/\D/g, "");
    const phone = cleanString(body.phone, 20).replace(/[^\d+]/g, "");
    const lineId = optionalString(body.lineId, 60);
    const email = optionalString(body.email, 120);
    const addressRegistered = optionalString(body.addressRegistered, 500);
    const addressCurrent = optionalString(body.addressCurrent, 500);
    const emergencyName = optionalString(body.emergencyName, 100);
    const emergencyPhone = optionalString(body.emergencyPhone, 20);
    const emergencyRelation = optionalString(body.emergencyRelation, 60);

    if (!firstName || !lastName) return badRequest("กรุณากรอกชื่อ-นามสกุล");
    if (!phone || phone.replace(/\D/g, "").length < 9) return badRequest("กรุณากรอกเบอร์โทรให้ถูกต้อง");
    if (email && !EMAIL_RE.test(email)) return badRequest("รูปแบบอีเมลไม่ถูกต้อง");
    if (!birthDate) return badRequest("กรุณาระบุวันเกิด");
    const ageYears = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 15 || ageYears > 75) return badRequest("วันเกิดไม่ถูกต้อง");
    if (!citizenId || !isValidThaiCitizenId(citizenId)) return badRequest("เลขบัตรประชาชนไม่ถูกต้อง");

    // --- step 3: history ---
    const educations = Array.isArray(body.educations) ? body.educations.slice(0, 10) : [];
    const workExperiences = Array.isArray(body.workExperiences) ? body.workExperiences.slice(0, 10) : [];
    const skills = body.skills && typeof body.skills === "object" ? body.skills : null;
    const hasDrivingLicense = Boolean(body.hasDrivingLicense);
    const licenseTypes = optionalString(body.licenseTypes, 100);
    const screeningAnswers = body.screeningAnswers && typeof body.screeningAnswers === "object" ? body.screeningAnswers : null;
    const applicantNote = optionalString(body.applicantNote, 1000);
    const source = optionalString(body.source, 30);

    // Only accept an opening that actually exists and is still open, so a hand-crafted request
    // can't attach an application to a closed or bogus posting.
    const requestedOpeningId = optionalString(body.jobOpeningId, 60);
    let jobOpeningId: string | null = null;
    if (requestedOpeningId) {
        const opening = await prisma.jobOpening.findUnique({
            where: { id: requestedOpeningId },
            select: { id: true, isActive: true, closesAt: true },
        });
        if (opening && isOpeningOpen(opening)) jobOpeningId = opening.id;
    }

    // --- step 4: files ---
    const fileIds = Array.isArray(body.fileIds)
        ? body.fileIds.filter((f): f is string => typeof f === "string").slice(0, MAX_FILES)
        : [];
    if (fileIds.length === 0) return badRequest("กรุณาแนบรูปถ่ายและสำเนาบัตรประชาชน");

    const files = await prisma.jobApplicationFile.findMany({ where: { id: { in: fileIds } } });
    if (files.length !== fileIds.length) return badRequest("ไฟล์แนบบางไฟล์ไม่พบ กรุณาแนบใหม่");
    const now = new Date();
    const invalidFile = files.find((f) => f.applicationId !== null || (f.expiresAt && f.expiresAt < now));
    if (invalidFile) return badRequest("ไฟล์แนบหมดอายุ กรุณาแนบใหม่อีกครั้ง");
    for (const requiredKind of REQUIRED_FILE_KINDS) {
        if (!files.some((f) => f.kind === requiredKind)) {
            return badRequest(requiredKind === "PROFILE_PHOTO" ? "กรุณาแนบรูปถ่าย" : "กรุณาแนบสำเนาบัตรประชาชน");
        }
    }

    // --- step 5: consent ---
    if (body.consentAccepted !== true) return badRequest("กรุณายอมรับเงื่อนไขการเก็บข้อมูล");

    // --- duplicate guard ---
    const duplicate = await prisma.jobApplication.findFirst({
        where: { phone, positionTitle, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
        orderBy: { createdAt: "desc" },
    });
    if (duplicate) {
        return NextResponse.json(
            { error: "คุณเพิ่งสมัครตำแหน่งนี้ไปแล้วภายใน 30 วันที่ผ่านมา", refCode: duplicate.refCode },
            { status: 409 }
        );
    }

    const citizenIdEnc = encryptField(citizenId);
    const citizenIdLast4 = citizenId.slice(-4);
    const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

    let application;
    for (let attempt = 0; attempt < 5; attempt++) {
        const refCode = await generateRefCode();
        try {
            application = await prisma.jobApplication.create({
                data: {
                    refCode,
                    status: "SUBMITTED",
                    positionTitle,
                    employmentType,
                    stationId,
                    departmentId,
                    expectedSalary,
                    availableFrom,
                    preferredShifts,
                    prefix,
                    firstName,
                    lastName,
                    nickName,
                    birthDate,
                    gender,
                    nationality,
                    religion,
                    maritalStatus,
                    militaryStatus,
                    citizenIdEnc,
                    citizenIdLast4,
                    phone,
                    lineId,
                    email,
                    addressRegistered,
                    addressCurrent,
                    emergencyName,
                    emergencyPhone,
                    emergencyRelation,
                    educations: educations as Prisma.InputJsonValue,
                    workExperiences: workExperiences as Prisma.InputJsonValue,
                    skills: skills as Prisma.InputJsonValue,
                    hasDrivingLicense,
                    licenseTypes,
                    screeningAnswers: screeningAnswers as Prisma.InputJsonValue,
                    applicantNote,
                    source,
                    jobOpeningId,
                    consentAcceptedAt: new Date(),
                    consentVersion: CONSENT_VERSION,
                    submittedIp: ip,
                    userAgent,
                    // purgeAfter is intentionally NOT set here — it's only set when an application
                    // is actually rejected or withdrawn (see PATCH .../[id] and withdraw route).
                    // Setting it at submission would auto-delete active or even HIRED applications
                    // 180 days later regardless of outcome.
                },
            });
            break;
        } catch (error) {
            const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
            if (isUniqueViolation && attempt < 4) continue;
            console.error("Error creating job application:", error);
            return NextResponse.json({ error: "ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
        }
    }
    if (!application) {
        return NextResponse.json({ error: "ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
    }

    try {
        await prisma.jobApplicationFile.updateMany({
            where: { id: { in: fileIds } },
            data: { applicationId: application.id, expiresAt: null },
        });
    } catch (error) {
        console.error("Error linking files to application:", application.id, error);
    }

    notifyNewApplication(application.id, application.refCode, positionTitle, station.name).catch((error) => {
        console.error("Error notifying new application:", error);
    });

    return NextResponse.json({ refCode: application.refCode });
}

async function notifyNewApplication(applicationId: string, refCode: string, positionTitle: string, stationName: string) {
    const rolePerms = await prisma.rolePermission.findMany({
        where: { permission: { code: "application.review" } },
        select: { role: true },
    });
    const roles = rolePerms.map((rp) => rp.role);
    if (roles.length > 0) {
        const recipients = await prisma.user.findMany({
            where: { role: { in: roles }, isActive: true },
            select: { id: true },
        });
        await createNotifications(
            recipients.map((r) => r.id),
            "APPLICATION_SUBMITTED",
            "มีใบสมัครงานใหม่",
            `${positionTitle} — ${stationName} (${refCode})`,
            "/admin/applications"
        );
    }

    const webhookUrl = getAttendanceDiscordWebhookUrl(undefined);
    if (webhookUrl) {
        await sendDiscordWebhook(webhookUrl, {
            username: "TimeTrack",
            embeds: [
                {
                    title: "มีใบสมัครงานใหม่",
                    description: `ตำแหน่ง: ${positionTitle}\nสาขา: ${stationName}\nรหัสอ้างอิง: ${refCode}`,
                    color: 0x3b82f6,
                    timestamp: new Date().toISOString(),
                },
            ],
        });
    }
}
