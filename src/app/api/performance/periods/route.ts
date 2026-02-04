import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") === "true";

        const where: any = {};
        if (activeOnly) {
            where.isActive = true;
        }

        const periods = await prisma.reviewPeriod.findMany({
            where,
            orderBy: { startDate: "desc" },
        });

        return NextResponse.json({ periods });
    } catch (error) {
        console.error("Get review periods error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        // Check if admin/HR
        const role = session?.user?.role;
        if (!role || !["ADMIN", "HR"].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { title, startDate, endDate } = body;

        if (!title || !startDate || !endDate) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const period = await prisma.reviewPeriod.create({
            data: {
                title,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: true,
            },
        });

        return NextResponse.json({ period }, { status: 201 });
    } catch (error) {
        console.error("Create review period error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
