import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/date-utils";

// GET: Get availability for current user or specified user
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || session.user.id;
        const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

        // Only admin/hr/manager can view other users' availability
        if (userId !== session.user.id && !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get start and end of month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const availability = await prisma.employeeAvailability.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { date: "asc" },
        });

        // Transform to record format for easy lookup
        const availabilityMap: Record<string, { status: string; note: string | null }> = {};
        availability.forEach((a) => {
            const dateKey = a.date.toISOString().split("T")[0];
            availabilityMap[dateKey] = { status: a.status, note: a.note };
        });

        return NextResponse.json({
            userId,
            month,
            year,
            availability: availabilityMap,
        });
    } catch (error) {
        console.error("Error fetching availability:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Set availability for a date or range
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { date, dates, status, note } = body;

        // Validate status
        const validStatuses = ["AVAILABLE", "UNAVAILABLE", "PREFERRED_OFF"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: "Invalid status. Must be AVAILABLE, UNAVAILABLE, or PREFERRED_OFF" },
                { status: 400 }
            );
        }

        // Handle single date
        if (date) {
            const dateObj = startOfDay(new Date(date));

            const result = await prisma.employeeAvailability.upsert({
                where: {
                    userId_date: {
                        userId: session.user.id,
                        date: dateObj,
                    },
                },
                create: {
                    userId: session.user.id,
                    date: dateObj,
                    status,
                    note,
                },
                update: {
                    status,
                    note,
                },
            });

            return NextResponse.json({ success: true, availability: result });
        }

        // Handle multiple dates
        if (dates && Array.isArray(dates)) {
            const results = await Promise.all(
                dates.map(async (d: string) => {
                    const dateObj = startOfDay(new Date(d));
                    return prisma.employeeAvailability.upsert({
                        where: {
                            userId_date: {
                                userId: session.user.id,
                                date: dateObj,
                            },
                        },
                        create: {
                            userId: session.user.id,
                            date: dateObj,
                            status,
                            note,
                        },
                        update: {
                            status,
                            note,
                        },
                    });
                })
            );

            return NextResponse.json({
                success: true,
                message: `บันทึก ${results.length} วันสำเร็จ`,
                count: results.length,
            });
        }

        return NextResponse.json({ error: "date or dates is required" }, { status: 400 });
    } catch (error) {
        console.error("Error saving availability:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Remove availability entry
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { date } = body;

        if (!date) {
            return NextResponse.json({ error: "date is required" }, { status: 400 });
        }

        const dateObj = startOfDay(new Date(date));

        await prisma.employeeAvailability.delete({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: dateObj,
                },
            },
        });

        return NextResponse.json({ success: true, message: "ลบสำเร็จ" });
    } catch (error) {
        console.error("Error deleting availability:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
