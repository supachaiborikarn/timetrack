import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const stationId = url.searchParams.get("stationId");
        const departmentId = url.searchParams.get("departmentId");

        // Default: last 30 days
        const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dateTo = to ? new Date(to + "T23:59:59") : new Date();

        // Build user filter
        const userFilter: Record<string, string> = {};
        if (stationId) userFilter.stationId = stationId;
        if (departmentId) userFilter.departmentId = departmentId;

        const whereClause = {
            date: { gte: dateFrom, lte: dateTo },
            ...(Object.keys(userFilter).length > 0 ? { user: userFilter } : {}),
        };

        // 1. Summary counts
        const [happyCount, neutralCount, sadCount] = await Promise.all([
            prisma.happinessLog.count({ where: { ...whereClause, mood: "HAPPY" } }),
            prisma.happinessLog.count({ where: { ...whereClause, mood: "NEUTRAL" } }),
            prisma.happinessLog.count({ where: { ...whereClause, mood: "SAD" } }),
        ]);

        const total = happyCount + neutralCount + sadCount;

        // 2. All logs for daily chart + employee trend analysis
        const allLogs = await prisma.happinessLog.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        nickName: true,
                        station: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: { date: "desc" },
        });

        // 3. Daily chart data
        const dailyMap = new Map<string, { happy: number; neutral: number; sad: number }>();
        for (const log of allLogs) {
            const dayKey = log.date.toISOString().split("T")[0];
            if (!dailyMap.has(dayKey)) {
                dailyMap.set(dayKey, { happy: 0, neutral: 0, sad: 0 });
            }
            const entry = dailyMap.get(dayKey)!;
            if (log.mood === "HAPPY") entry.happy++;
            else if (log.mood === "NEUTRAL") entry.neutral++;
            else if (log.mood === "SAD") entry.sad++;
        }

        const dailyChart = Array.from(dailyMap.entries())
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 4. Per-employee trend analysis
        const employeeMap = new Map<string, {
            id: string;
            name: string;
            nickName: string | null;
            station: string;
            department: string;
            moods: { date: string; mood: string }[];
            counts: { happy: number; neutral: number; sad: number };
        }>();

        for (const log of allLogs) {
            if (!employeeMap.has(log.userId)) {
                employeeMap.set(log.userId, {
                    id: log.user.id,
                    name: log.user.name,
                    nickName: log.user.nickName,
                    station: log.user.station?.name || "-",
                    department: log.user.department?.name || "-",
                    moods: [],
                    counts: { happy: 0, neutral: 0, sad: 0 },
                });
            }
            const emp = employeeMap.get(log.userId)!;
            emp.moods.push({
                date: log.date.toISOString().split("T")[0],
                mood: log.mood,
            });
            if (log.mood === "HAPPY") emp.counts.happy++;
            else if (log.mood === "NEUTRAL") emp.counts.neutral++;
            else if (log.mood === "SAD") emp.counts.sad++;
        }

        // Calculate trend for each employee
        const employeeTrends = Array.from(employeeMap.values()).map((emp) => {
            const totalMoods = emp.counts.happy + emp.counts.neutral + emp.counts.sad;
            const happyPct = totalMoods > 0 ? Math.round((emp.counts.happy / totalMoods) * 100) : 0;
            const sadPct = totalMoods > 0 ? Math.round((emp.counts.sad / totalMoods) * 100) : 0;

            // Trend: compare last 7 entries vs earlier entries
            const sorted = [...emp.moods].sort((a, b) => b.date.localeCompare(a.date));
            const recent = sorted.slice(0, 7);
            const earlier = sorted.slice(7);

            let trend: "improving" | "declining" | "stable" | "watch" = "stable";
            let trendLabel = "คงที่";

            if (recent.length >= 3 && earlier.length >= 3) {
                const recentScore = recent.reduce((s, m) => s + (m.mood === "HAPPY" ? 1 : m.mood === "SAD" ? -1 : 0), 0) / recent.length;
                const earlierScore = earlier.reduce((s, m) => s + (m.mood === "HAPPY" ? 1 : m.mood === "SAD" ? -1 : 0), 0) / earlier.length;
                const diff = recentScore - earlierScore;

                if (diff > 0.3) { trend = "improving"; trendLabel = "ดีขึ้น 📈"; }
                else if (diff < -0.3) { trend = "declining"; trendLabel = "แย่ลง 📉"; }
            }

            // Flag if consistently sad recently
            if (recent.length >= 3) {
                const recentSadPct = recent.filter(m => m.mood === "SAD").length / recent.length;
                if (recentSadPct >= 0.5) {
                    trend = "watch";
                    trendLabel = "⚠️ ควรดูแล";
                }
            }

            return {
                id: emp.id,
                name: emp.name,
                nickName: emp.nickName,
                station: emp.station,
                department: emp.department,
                totalLogs: totalMoods,
                counts: emp.counts,
                happyPct,
                sadPct,
                trend,
                trendLabel,
                recentMoods: sorted.slice(0, 10).map(m => m.mood),
            };
        });

        // Sort: "watch" first, then "declining", then by sadPct descending
        const trendOrder = { watch: 0, declining: 1, stable: 2, improving: 3 };
        employeeTrends.sort((a, b) => {
            const orderDiff = trendOrder[a.trend] - trendOrder[b.trend];
            if (orderDiff !== 0) return orderDiff;
            return b.sadPct - a.sadPct;
        });

        // 5. Recent logs with notes
        const recentLogs = allLogs.slice(0, 20).map((log) => ({
            id: log.id,
            userName: log.user.name,
            nickName: log.user.nickName,
            mood: log.mood,
            note: log.note,
            date: log.date.toISOString(),
            station: log.user.station?.name || "-",
        }));

        return NextResponse.json({
            summary: {
                total,
                happy: happyCount,
                neutral: neutralCount,
                sad: sadCount,
                happyPct: total > 0 ? Math.round((happyCount / total) * 100) : 0,
                neutralPct: total > 0 ? Math.round((neutralCount / total) * 100) : 0,
                sadPct: total > 0 ? Math.round((sadCount / total) * 100) : 0,
            },
            dailyChart,
            employeeTrends,
            recentLogs,
        });
    } catch (error) {
        console.error("Error fetching happiness data:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
