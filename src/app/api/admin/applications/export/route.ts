import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ApplicationStatus, type Prisma, type Role } from "@prisma/client";

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "ร่าง",
    SUBMITTED: "ใหม่",
    SCREENING: "คัดกรอง",
    INTERVIEW: "สัมภาษณ์",
    OFFERED: "เสนองาน",
    HIRED: "จ้างแล้ว",
    REJECTED: "ไม่ผ่าน",
    WITHDRAWN: "ถอนแล้ว",
};

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "report.export")) || !(await hasPermission(role, "application.view"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = request.nextUrl;
        const status = searchParams.get("status");
        const stationId = searchParams.get("stationId");

        const where: Prisma.JobApplicationWhereInput = {};
        if (role === "MANAGER" && session.user.stationId) {
            where.stationId = session.user.stationId;
        } else if (stationId) {
            where.stationId = stationId;
        }
        if (status && status !== "ALL" && status in ApplicationStatus) {
            where.status = status as ApplicationStatus;
        }

        const applications = await prisma.jobApplication.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { station: { select: { name: true } }, department: { select: { name: true } } },
        });

        const data = applications.map((a, index) => ({
            "ลำดับ": index + 1,
            "รหัสอ้างอิง": a.refCode,
            "สถานะ": STATUS_LABELS[a.status] ?? a.status,
            "ตำแหน่งที่สมัคร": a.positionTitle,
            "สาขา": a.station?.name ?? "-",
            "แผนก": a.department?.name ?? "-",
            "ชื่อ-สกุล": `${a.firstName} ${a.lastName}`.trim(),
            "ชื่อเล่น": a.nickName ?? "-",
            "เบอร์โทร": a.phone,
            "อีเมล": a.email ?? "-",
            "เลขบัตร ปชช. (4 ตัวท้าย)": a.citizenIdLast4 ?? "-",
            "วันเกิด": a.birthDate ? new Date(a.birthDate).toLocaleDateString("th-TH") : "-",
            "คะแนน": a.ratingScore ?? "-",
            "วันที่สมัคร": new Date(a.createdAt).toLocaleDateString("th-TH"),
            "วันนัดสัมภาษณ์": a.interviewAt ? new Date(a.interviewAt).toLocaleString("th-TH") : "-",
            "เหตุผลปฏิเสธ": a.rejectReason ?? "-",
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws["!cols"] = [
            { wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 14 },
            { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 12 },
            { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 25 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "job_applications");
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="job_applications_${new Date().toISOString().slice(0, 10)}.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Error exporting applications:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
