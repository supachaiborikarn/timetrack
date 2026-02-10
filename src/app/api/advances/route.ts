import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Employee's own advances
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month");
        const year = searchParams.get("year");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            userId: session.user.id,
        };

        if (month && year) {
            where.month = parseInt(month);
            where.year = parseInt(year);
        }

        const advances = await prisma.advance.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ advances });
    } catch (error) {
        console.error("Error fetching employee advances:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Employee requests an advance
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { amount, reason } = body;

        if (!amount || parseFloat(amount) <= 0) {
            return NextResponse.json({ error: "กรุณาระบุจำนวนเงินที่ต้องการเบิก" }, { status: 400 });
        }

        const now = new Date();

        const advance = await prisma.advance.create({
            data: {
                userId: session.user.id,
                amount: parseFloat(amount),
                date: now,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                reason: reason || null,
                status: "PENDING",
            },
        });

        return NextResponse.json(advance, { status: 201 });
    } catch (error) {
        console.error("Error creating advance request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
