import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT - Update special income record (edit or change status)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const existing = await prisma.specialIncome.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};

        // Allow field updates if status is PENDING
        if (existing.status === "PENDING" || ["ADMIN", "HR"].includes(session.user.role)) {
            if (body.date !== undefined) updateData.date = new Date(body.date + "T00:00:00+07:00");
            if (body.shiftId !== undefined) updateData.shiftId = body.shiftId || null;
            if (body.stationId !== undefined) updateData.stationId = body.stationId || null;
            if (body.type !== undefined) updateData.type = body.type;
            if (body.description !== undefined) updateData.description = body.description || null;
            if (body.salesAmount !== undefined) updateData.salesAmount = body.salesAmount ? parseFloat(body.salesAmount) : null;
            if (body.percentage !== undefined) updateData.percentage = body.percentage ? parseFloat(body.percentage) : null;
            if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
        }

        // Handle status changes
        if (body.status && body.status !== existing.status) {
            updateData.status = body.status;

            if (body.status === "APPROVED") {
                updateData.approvedBy = session.user.id;
                updateData.approvedAt = new Date();

                // Notify employee about approval
                await prisma.notification.create({
                    data: {
                        userId: existing.userId,
                        type: "SPECIAL_INCOME",
                        title: "รายได้พิเศษได้รับอนุมัติ",
                        message: `รายได้พิเศษ ฿${Number(existing.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ได้รับการอนุมัติแล้ว`,
                        link: "/history",
                    },
                });
            }
        }

        const updated = await prisma.specialIncome.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: { id: true, name: true, employeeId: true },
                },
            },
        });

        // Log audit
        await prisma.auditLog.create({
            data: {
                action: "UPDATE",
                entity: "SpecialIncome",
                entityId: id,
                details: JSON.stringify({
                    changes: Object.keys(updateData),
                    newStatus: body.status,
                }),
                userId: session.user.id,
            },
        });

        return NextResponse.json({ success: true, record: updated });
    } catch (error) {
        console.error("Failed to update special income:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Delete special income record
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const existing = await prisma.specialIncome.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        // Only allow deletion of PENDING records (unless ADMIN/HR)
        if (existing.status !== "PENDING" && !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json(
                { error: "Cannot delete approved/paid records" },
                { status: 403 }
            );
        }

        await prisma.specialIncome.delete({ where: { id } });

        // Log audit
        await prisma.auditLog.create({
            data: {
                action: "DELETE",
                entity: "SpecialIncome",
                entityId: id,
                details: `Deleted special income: ${existing.type} ฿${existing.amount} for user ${existing.userId}`,
                userId: session.user.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete special income:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
