import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { decryptField } from "@/lib/crypto-field";
import { logActivity } from "@/lib/logger";
import { copyApplicationFilesToEmployee } from "@/lib/employee-onboarding";
import type { Role } from "@prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "application.hire"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const application = await prisma.jobApplication.findUnique({ where: { id } });
        if (!application) return NextResponse.json({ error: "ไม่พบใบสมัคร" }, { status: 404 });
        if (application.status === "HIRED") return NextResponse.json({ error: "จ้างงานไปแล้ว" }, { status: 400 });
        if (application.status === "WITHDRAWN") return NextResponse.json({ error: "ผู้สมัครถอนใบสมัครแล้ว" }, { status: 400 });

        const body = await request.json();
        const {
            employeeId,
            role: newRole,
            stationId,
            departmentId,
            hourlyRate,
            dailyRate,
            baseSalary,
            otRateMultiplier,
            startDate,
            probationEndDate,
            probationDailyRate,
            pin,
        } = body;

        if (!employeeId || !pin || !newRole) {
            return NextResponse.json({ error: "กรุณากรอกรหัสพนักงาน, PIN และตำแหน่งระดับ" }, { status: 400 });
        }

        const name = `${application.firstName} ${application.lastName}`.trim();
        const username = employeeId;

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { employeeId },
                    ...(application.phone ? [{ phone: application.phone }] : []),
                    { username },
                    ...(application.email ? [{ email: application.email }] : []),
                ],
            },
        });
        if (existing) {
            return NextResponse.json({ error: "รหัสพนักงาน, เบอร์โทร หรืออีเมลซ้ำกับพนักงานที่มีอยู่" }, { status: 400 });
        }

        const parsedHourlyRate = Number(hourlyRate || 0);
        const parsedDailyRate = Number(dailyRate || 0);
        const parsedBaseSalary = Number(baseSalary || 0);
        const parsedOtRateMultiplier = Number(otRateMultiplier || 1.5);
        if ([parsedHourlyRate, parsedDailyRate, parsedBaseSalary, parsedOtRateMultiplier].some((v) => !Number.isFinite(v) || v < 0)) {
            return NextResponse.json({ error: "ค่าแรง เงินเดือน และอัตรา OT ต้องเป็นตัวเลขตั้งแต่ศูนย์ขึ้นไป" }, { status: 400 });
        }

        // Null (not 0) means "no separate probation rate" — payroll then uses the normal daily
        // rate for every day, so an omitted value must not be coerced into a zero-baht wage.
        const parsedProbationDailyRate = probationDailyRate == null || probationDailyRate === ""
            ? null
            : Number(probationDailyRate);
        if (parsedProbationDailyRate !== null && (!Number.isFinite(parsedProbationDailyRate) || parsedProbationDailyRate < 0)) {
            return NextResponse.json({ error: "ค่าแรงช่วงทดลองงานต้องเป็นตัวเลขตั้งแต่ศูนย์ขึ้นไป" }, { status: 400 });
        }

        const hashedPin = await bcrypt.hash(String(pin), 10);
        const defaultPassword = await bcrypt.hash("123456", 10);
        const citizenId = application.citizenIdEnc ? decryptField(application.citizenIdEnc) : null;

        // Interactive transaction so the application can reference the new user id in the same
        // atomic unit. The earlier array form needed a follow-up update for hiredUserId, which
        // could fail on its own and leave an application marked HIRED with no employee linked —
        // a state that could neither be deleted nor corrected from the UI.
        const user = await prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: {
                    employeeId,
                    name,
                    username,
                    phone: application.phone || null,
                    email: application.email || null,
                    pin: hashedPin,
                    password: defaultPassword,
                    role: newRole as Role,
                    stationId: stationId || application.stationId || null,
                    departmentId: departmentId || application.departmentId || null,
                    hourlyRate: parsedHourlyRate,
                    dailyRate: parsedDailyRate,
                    baseSalary: parsedBaseSalary,
                    otRateMultiplier: parsedOtRateMultiplier,
                    nickName: application.nickName || null,
                    gender: application.gender || null,
                    birthDate: application.birthDate,
                    address: application.addressCurrent || application.addressRegistered || null,
                    citizenId,
                    startDate: startDate ? new Date(startDate) : new Date(),
                    probationEndDate: probationEndDate ? new Date(probationEndDate) : null,
                    probationDailyRate: parsedProbationDailyRate,
                    registeredStationId: stationId || application.stationId || null,
                    emergencyContactName: application.emergencyName || null,
                    emergencyContactPhone: application.emergencyPhone || null,
                    emergencyContactRelation: application.emergencyRelation || null,
                },
            });

            await tx.jobApplication.update({
                where: { id },
                data: { status: "HIRED", hiredAt: new Date(), hiredUserId: created.id },
            });

            return created;
        });

        await logActivity(session.user.id, "HIRE", "JobApplication", `จ้างงาน ${application.refCode} เป็นพนักงาน ${employeeId}`, id);

        // Copy the applicant's attachments into the employee record — the photo becomes
        // the avatar, the rest becomes the start of their document vault. Deliberately
        // after the transaction and never fatal: a hire that already created the User
        // must not be rolled back because one image failed to copy.
        const fileCopy = await copyApplicationFilesToEmployee(id, user.id, session.user.id).catch((error) => {
            console.error("Error copying application files to employee:", error);
            return { copied: 0, failed: 0 };
        });

        return NextResponse.json({ success: true, userId: user.id, filesCopied: fileCopy.copied, filesFailed: fileCopy.failed });
    } catch (error) {
        console.error("Error hiring applicant:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
