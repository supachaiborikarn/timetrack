import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Get all stations with QR codes
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admin/hr can access
        if (!["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const stations = await prisma.station.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                code: true,
                qrCode: true,
                address: true,
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ stations });
    } catch (error) {
        console.error("Error fetching stations:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT: Update station QR code
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { stationId, qrCode } = body;

        if (!stationId || !qrCode) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const station = await prisma.station.update({
            where: { id: stationId },
            data: { qrCode },
        });

        return NextResponse.json({ station });
    } catch (error) {
        console.error("Error updating QR code:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Generate new QR code for station
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { stationId } = body;

        if (!stationId) {
            return NextResponse.json({ error: "Missing station ID" }, { status: 400 });
        }

        const station = await prisma.station.findUnique({
            where: { id: stationId },
        });

        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        // Generate new unique QR code
        const timestamp = Date.now().toString(36).toUpperCase();
        const newQrCode = `${station.code || station.name.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${timestamp}`;

        const updatedStation = await prisma.station.update({
            where: { id: stationId },
            data: { qrCode: newQrCode },
        });

        return NextResponse.json({ station: updatedStation, qrCode: newQrCode });
    } catch (error) {
        console.error("Error generating QR code:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
