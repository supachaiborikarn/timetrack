import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const body = await req.json();
        const { mood, note } = body;

        if (!mood) {
            return new NextResponse("Mood is required", { status: 400 });
        }

        const log = await prisma.happinessLog.create({
            data: {
                userId: session.user.id,
                mood,
                note,
            },
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error("Error creating happiness log:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
