import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { action, ids, data } = await request.json();

        if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        let result;

        switch (action) {
            case "assign-station":
                if (!data?.stationId) {
                    return NextResponse.json({ error: "Station ID required" }, { status: 400 });
                }
                result = await prisma.user.updateMany({
                    where: { id: { in: ids } },
                    data: { stationId: data.stationId },
                });
                break;

            case "assign-department":
                if (!data?.departmentId) {
                    return NextResponse.json({ error: "Department ID required" }, { status: 400 });
                }
                result = await prisma.user.updateMany({
                    where: { id: { in: ids } },
                    data: { departmentId: data.departmentId },
                });
                break;

            case "change-status":
                if (typeof data?.isActive !== "boolean") {
                    return NextResponse.json({ error: "Status required" }, { status: 400 });
                }
                result = await prisma.user.updateMany({
                    where: { id: { in: ids } },
                    data: { isActive: data.isActive },
                });
                break;

            case "change-role":
                if (!data?.role) {
                    return NextResponse.json({ error: "Role required" }, { status: 400 });
                }
                result = await prisma.user.updateMany({
                    where: { id: { in: ids } },
                    data: { role: data.role },
                });
                break;

            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `Updated ${result.count} employee(s)`
        });
    } catch (error) {
        console.error("Bulk action error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
