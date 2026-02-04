import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Field labels for display
const fieldLabels: Record<string, string> = {
    phone: "เบอร์โทร",
    email: "อีเมล",
    nickName: "ชื่อเล่น",
    address: "ที่อยู่",
    bankAccountNumber: "เลขบัญชีธนาคาร",
    bankName: "ชื่อธนาคาร",
    emergencyContactName: "ชื่อผู้ติดต่อฉุกเฉิน",
    emergencyContactPhone: "เบอร์ผู้ติดต่อฉุกเฉิน",
    emergencyContactRelation: "ความสัมพันธ์ผู้ติดต่อฉุกเฉิน",
};

// POST: Employee submits an edit request
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fieldName, newValue } = body;

        if (!fieldName || newValue === undefined) {
            return NextResponse.json({ error: "กรุณาระบุข้อมูลให้ครบ" }, { status: 400 });
        }

        // Get current user data to store old value
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 404 });
        }

        const oldValue = (user as any)[fieldName]?.toString() || null;
        const fieldLabel = fieldLabels[fieldName] || fieldName;

        // Check if there's already a pending request for this field
        const existingRequest = await prisma.profileEditRequest.findFirst({
            where: {
                userId: session.user.id,
                fieldName,
                status: "PENDING",
            },
        });

        if (existingRequest) {
            // Update existing request
            await prisma.profileEditRequest.update({
                where: { id: existingRequest.id },
                data: { newValue, createdAt: new Date() },
            });
        } else {
            // Create new request
            await prisma.profileEditRequest.create({
                data: {
                    userId: session.user.id,
                    fieldName,
                    fieldLabel,
                    oldValue,
                    newValue,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: `ส่งคำขอแก้ไข${fieldLabel}เรียบร้อย รอแอดมินอนุมัติ`,
        });

    } catch (error) {
        console.error("Profile edit request error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}

// GET: Get employee's pending edit requests
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requests = await prisma.profileEditRequest.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({ requests });

    } catch (error) {
        console.error("Get edit requests error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
