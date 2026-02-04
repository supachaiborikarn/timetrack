import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all templates
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get("stationId");

        const templates = await prisma.shiftTemplate.findMany({
            where: stationId ? { stationId } : {},
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ templates });
    } catch (error) {
        console.error("Get templates error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create new template
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, description, shifts, stationId } = await request.json();

        if (!name || !shifts) {
            return NextResponse.json({ error: "Name and shifts required" }, { status: 400 });
        }

        const template = await prisma.shiftTemplate.create({
            data: {
                name,
                description,
                shifts,
                stationId,
                createdById: session.user.id,
            },
        });

        return NextResponse.json({ template }, { status: 201 });
    } catch (error) {
        console.error("Create template error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Delete template
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        await prisma.shiftTemplate.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete template error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
