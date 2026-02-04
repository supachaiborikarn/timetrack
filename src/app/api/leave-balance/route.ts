import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get leave balance for user
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || session.user.id;
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

        // Only admins can view other users' balance
        if (userId !== session.user.id && !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find or create balance for the year
        let balance = await prisma.leaveBalance.findUnique({
            where: { userId_year: { userId, year } },
        });

        if (!balance) {
            balance = await prisma.leaveBalance.create({
                data: {
                    userId,
                    year,
                    sickLeave: 30,
                    annualLeave: 6,
                    personalLeave: 3,
                },
            });
        }

        return NextResponse.json({
            balance: {
                ...balance,
                remainingSick: balance.sickLeave - balance.usedSick,
                remainingAnnual: balance.annualLeave - balance.usedAnnual,
                remainingPersonal: balance.personalLeave - balance.usedPersonal,
            },
        });
    } catch (error) {
        console.error("Get leave balance error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Admin adjust leave balance
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId, year, sickLeave, annualLeave, personalLeave } = await request.json();

        if (!userId || !year) {
            return NextResponse.json({ error: "User ID and year required" }, { status: 400 });
        }

        const balance = await prisma.leaveBalance.upsert({
            where: { userId_year: { userId, year } },
            update: {
                ...(sickLeave !== undefined && { sickLeave }),
                ...(annualLeave !== undefined && { annualLeave }),
                ...(personalLeave !== undefined && { personalLeave }),
            },
            create: {
                userId,
                year,
                sickLeave: sickLeave ?? 30,
                annualLeave: annualLeave ?? 6,
                personalLeave: personalLeave ?? 3,
            },
        });

        return NextResponse.json({ balance });
    } catch (error) {
        console.error("Update leave balance error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
