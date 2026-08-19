import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDayBangkok } from "@/lib/date-utils";
import { claimUploadedAsset } from "@/lib/assets";
import { assetUrl } from "@/lib/asset-kinds";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requests = await prisma.timeCorrection.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({
            requests: requests.map((r) => ({
                id: r.id,
                date: r.date.toISOString(),
                requestType: r.requestType,
                requestedTime: r.requestedTime.toISOString(),
                reason: r.reason,
                status: r.status,
                attachmentUrl: r.attachmentId ? assetUrl(r.attachmentId) : null,
                createdAt: r.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Error fetching time corrections:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { date, requestType, requestedTime, reason, attachmentId } = body;

        if (!date || !requestType || !requestedTime || !reason) {
            return NextResponse.json(
                { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
                { status: 400 }
            );
        }

        // Get original attendance for that date
        // Normalize date to match Attendance table (Bangkok Midnight)
        const attendanceDate = startOfDayBangkok(new Date(date));

        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: attendanceDate,
            },
        });

        // Claim the evidence photo before the request row is written — a bad or
        // already-used attachment should fail the whole request, not create a
        // correction that silently lost its evidence.
        let claimedAttachmentId: string | null;
        try {
            claimedAttachmentId = await claimUploadedAsset(attachmentId, session.user.id, "REQUEST_ATTACHMENT");
        } catch (error) {
            return NextResponse.json({ error: error instanceof Error ? error.message : "ไฟล์แนบไม่ถูกต้อง" }, { status: 400 });
        }

        // Create time correction request
        const correction = await prisma.timeCorrection.create({
            data: {
                userId: session.user.id,
                date: new Date(date),
                requestType,
                requestedTime: new Date(requestedTime),
                reason,
                originalCheckIn: attendance?.checkInTime,
                originalCheckOut: attendance?.checkOutTime,
                attachmentId: claimedAttachmentId,
            },
        });

        return NextResponse.json({ success: true, id: correction.id });
    } catch (error) {
        console.error("Error creating time correction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
