import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Export user's schedule as CSV
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const format = searchParams.get("format") || "csv";

        if (!startDate || !endDate) {
            return NextResponse.json({ error: "Missing date parameters" }, { status: 400 });
        }

        // Fetch assignments
        const assignments = await prisma.shiftAssignment.findMany({
            where: {
                userId: session.user.id,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            include: {
                shift: true,
            },
            orderBy: { date: "asc" },
        });

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, employeeId: true },
        });

        if (format === "csv") {
            // Generate CSV
            const headers = ["วันที่", "วัน", "กะ", "เวลาเข้า", "เวลาออก", "สถานะ"];
            const rows = assignments.map((a) => {
                const date = new Date(a.date);
                const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
                return [
                    date.toISOString().split("T")[0],
                    dayNames[date.getDay()],
                    a.isDayOff ? "วันหยุด" : a.shift.name,
                    a.isDayOff ? "-" : a.shift.startTime,
                    a.isDayOff ? "-" : a.shift.endTime,
                    a.isDayOff ? "หยุด" : "ทำงาน",
                ];
            });

            // Add BOM for Excel UTF-8 compatibility
            const BOM = "\uFEFF";
            const csvContent = BOM + [headers, ...rows].map((row) => row.join(",")).join("\n");

            return new NextResponse(csvContent, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="schedule_${user?.employeeId || "export"}_${startDate}_${endDate}.csv"`,
                },
            });
        }

        // Fallback: return JSON
        return NextResponse.json({ assignments });
    } catch (error) {
        console.error("Error exporting schedule:", error);
        return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
}
