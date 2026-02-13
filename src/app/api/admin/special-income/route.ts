import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List special income records with filters
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const stationId = searchParams.get("stationId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const type = searchParams.get("type");
        const status = searchParams.get("status");
        const userId = searchParams.get("userId");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (stationId && stationId !== "all") {
            where.stationId = stationId;
        }

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate + "T00:00:00+07:00"),
                lte: new Date(endDate + "T23:59:59+07:00"),
            };
        }

        if (type && type !== "all") {
            where.type = type;
        }

        if (status && status !== "all") {
            where.status = status;
        }

        if (userId) {
            where.userId = userId;
        }

        const records = await prisma.specialIncome.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeId: true,
                        nickName: true,
                        station: { select: { id: true, name: true } },
                        department: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });

        // Calculate summary
        const summary = {
            totalRecords: records.length,
            totalAmount: records.reduce((sum: number, r) => sum + Number(r.amount), 0),
            totalSalesCommission: records.filter(r => r.type === "SALES_COMMISSION").reduce((sum: number, r) => sum + Number(r.amount), 0),
            totalBonus: records.filter(r => r.type === "BONUS").reduce((sum: number, r) => sum + Number(r.amount), 0),
            totalTip: records.filter(r => r.type === "TIP").reduce((sum: number, r) => sum + Number(r.amount), 0),
            totalOther: records.filter(r => r.type === "OTHER").reduce((sum: number, r) => sum + Number(r.amount), 0),
            uniqueEmployees: new Set(records.map(r => r.userId)).size,
            pendingCount: records.filter(r => r.status === "PENDING").length,
            approvedCount: records.filter(r => r.status === "APPROVED").length,
            paidCount: records.filter(r => r.status === "PAID").length,
        };

        return NextResponse.json({ records, summary });
    } catch (error) {
        console.error("Failed to fetch special income:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create new special income record(s)
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { entries } = body; // Can be a single or array of entries

        const entriesToCreate = Array.isArray(entries) ? entries : [body];

        const createdRecords = [];
        const notifications = [];

        for (const entry of entriesToCreate) {
            const {
                userId,
                date,
                shiftId,
                stationId,
                type,
                description,
                salesAmount,
                percentage,
                amount,
            } = entry;

            if (!userId || !date || !type || amount === undefined) {
                return NextResponse.json(
                    { error: "Missing required fields: userId, date, type, amount" },
                    { status: 400 }
                );
            }

            const record = await prisma.specialIncome.create({
                data: {
                    userId,
                    date: new Date(date + "T00:00:00+07:00"),
                    shiftId: shiftId || null,
                    stationId: stationId || null,
                    type,
                    description: description || null,
                    salesAmount: salesAmount ? parseFloat(salesAmount) : null,
                    percentage: percentage ? parseFloat(percentage) : null,
                    amount: parseFloat(amount),
                    status: "PENDING",
                    createdBy: session.user.id,
                },
                include: {
                    user: {
                        select: { id: true, name: true, employeeId: true },
                    },
                },
            });

            createdRecords.push(record);

            // Create notification for the employee
            const typeLabels: Record<string, string> = {
                SALES_COMMISSION: "เปอร์เซ็นต์ขาย",
                BONUS: "โบนัส",
                TIP: "ทิป",
                OTHER: "รายได้พิเศษอื่นๆ",
            };

            const formattedAmount = new Intl.NumberFormat("th-TH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(parseFloat(amount));

            const formattedDate = new Date(date).toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
            });

            notifications.push({
                userId,
                type: "SPECIAL_INCOME",
                title: "คุณได้รับรายได้พิเศษ!",
                message: `${typeLabels[type] || type} ฿${formattedAmount} วันที่ ${formattedDate}`,
                link: "/history",
            });
        }

        // Create all notifications
        if (notifications.length > 0) {
            await prisma.notification.createMany({
                data: notifications,
            });
        }

        // Log audit
        await prisma.auditLog.create({
            data: {
                action: "CREATE",
                entity: "SpecialIncome",
                entityId: createdRecords.length === 1 ? createdRecords[0].id : null,
                details: `Created ${createdRecords.length} special income record(s)`,
                userId: session.user.id,
            },
        });

        return NextResponse.json({
            success: true,
            records: createdRecords,
            count: createdRecords.length,
        });
    } catch (error) {
        console.error("Failed to create special income:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
