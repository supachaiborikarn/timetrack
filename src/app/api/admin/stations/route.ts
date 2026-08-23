import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all stations
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const stations = await prisma.station.findMany({
            orderBy: { name: "asc" },
            include: {
                departments: {
                    select: { id: true, name: true, code: true },
                },
                _count: {
                    select: { employees: true },
                },
            },
        });

        return NextResponse.json({
            stations: stations.map((s) => ({
                id: s.id,
                name: s.name,
                code: s.code,
                type: s.type,
                address: s.address,
                latitude: Number(s.latitude),
                longitude: Number(s.longitude),
                radius: s.radius,
                qrCode: s.qrCode,
                wifiSSID: s.wifiSSID,
                isActive: s.isActive,
                publicEmergencyPhone: s.publicEmergencyPhone,
                departments: s.departments,
                employeeCount: s._count.employees,
            })),
        });
    } catch (error) {
        console.error("Error fetching stations:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Update station
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, code, address, latitude, longitude, radius, qrCode, wifiSSID, isActive, publicEmergencyPhone, deactivateFeedbackQr } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing station ID" }, { status: 400 });
        }

        // Check if code exists on another station
        if (code) {
            const existing = await prisma.station.findFirst({
                where: { code, id: { not: id } },
            });
            if (existing) {
                return NextResponse.json({ error: "รหัสสถานีนี้มีอยู่แล้ว" }, { status: 400 });
            }
        }

        // กติกา customer feedback (§12.1): ห้ามล้าง publicEmergencyPhone หรือปิดสถานี
        // ที่มี feedback QR ที่ยัง active จนกว่าจะส่ง deactivateFeedbackQr = true
        const clearingPhone = publicEmergencyPhone !== undefined && !publicEmergencyPhone;
        const deactivating = isActive === false;
        if (clearingPhone || deactivating) {
            const activeQrCount = await prisma.customerFeedbackQr.count({
                where: { stationId: id, isActive: true },
            });
            if (activeQrCount > 0 && !deactivateFeedbackQr) {
                return NextResponse.json(
                    { error: "สถานีนี้ยังมี QR เสียงลูกค้าที่เปิดใช้งานอยู่ ต้องยืนยันการปิด QR ทุกใบก่อน" },
                    { status: 400 }
                );
            }
            if (activeQrCount > 0 && deactivateFeedbackQr) {
                await prisma.$transaction([
                    prisma.customerFeedbackQr.updateMany({
                        where: { stationId: id, isActive: true },
                        data: { isActive: false, revokedAt: new Date() },
                    }),
                    prisma.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_DEACTIVATED",
                            entity: "Station",
                            entityId: id,
                            details: `Closed ${activeQrCount} active feedback QR(s) while updating station`,
                            userId: session.user.id,
                        },
                    }),
                ]);
            }
        }

        const station = await prisma.station.update({
            where: { id },
            data: {
                name,
                code,
                address,
                latitude: latitude ? Number(latitude) : undefined,
                longitude: longitude ? Number(longitude) : undefined,
                radius: radius ? Number(radius) : undefined,
                qrCode,
                wifiSSID,
                isActive: isActive ?? undefined,
                publicEmergencyPhone: publicEmergencyPhone === undefined ? undefined : (publicEmergencyPhone || null),
            },
        });

        return NextResponse.json({
            station: {
                id: station.id,
                name: station.name,
                code: station.code,
                latitude: Number(station.latitude),
                longitude: Number(station.longitude),
                radius: station.radius,
            },
            message: "อัปเดตสถานีสำเร็จ"
        });
    } catch (error) {
        console.error("Error updating station:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create new station
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, code, type, address, latitude, longitude, radius, publicEmergencyPhone } = body;

        if (!name || !code) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if code exists
        const existing = await prisma.station.findUnique({ where: { code } });
        if (existing) {
            return NextResponse.json({ error: "รหัสสถานีนี้มีอยู่แล้ว" }, { status: 400 });
        }

        const station = await prisma.station.create({
            data: {
                name,
                code,
                type: type || "GAS_STATION",
                address: address || "",
                latitude: latitude || 0,
                longitude: longitude || 0,
                radius: radius || 100,
                qrCode: `${code}-${new Date().getFullYear()}`,
                publicEmergencyPhone: publicEmergencyPhone || null,
            },
        });

        return NextResponse.json({ station, message: "สร้างสถานีสำเร็จ" });
    } catch (error) {
        console.error("Error creating station:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
