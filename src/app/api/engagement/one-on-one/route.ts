import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        // Logic: 
        // If Admin/Manager: can view all or filter by userId.
        // If Employee: can only view own logs.

        const where: any = {};
        if (session.user.role === "EMPLOYEE") {
            where.userId = session.user.id;
        } else if (userId) {
            where.userId = userId;
        }

        const logs = await prisma.oneOnOneLog.findMany({
            where,
            include: {
                user: { select: { name: true, employeeId: true, photoUrl: true } },
                supervisor: { select: { name: true } },
            },
            orderBy: { date: "desc" },
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error("Error fetching one-on-one logs:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    // Only Admin, HR, Manager can create logs?
    // Assuming role check is sufficient.
    if (!session || session.user.role === "EMPLOYEE") {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, date, topic, note, actionItems } = body;

        if (!userId || !date || !topic || !note) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const log = await prisma.oneOnOneLog.create({
            data: {
                userId,
                supervisorId: session.user.id,
                date: new Date(date),
                topic,
                note,
                actionItems,
            },
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error("Error creating one-on-one log:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
