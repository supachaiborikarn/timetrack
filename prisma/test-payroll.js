const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const userId = "cml5g289u003uua47ulssk26x";
    const startDate = "2026-01-26";
    const endDate = "2026-02-25";

    try {
        const employee = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                employeeId: true,
                dailyRate: true,
                hourlyRate: true,
                otRateMultiplier: true,
                stationId: true,
                station: { select: { name: true } },
                department: { select: { name: true } },
            },
        });

        if (!employee) {
            console.log("Employee not found");
            return;
        }

        const attendances = await prisma.attendance.findMany({
            where: {
                userId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            orderBy: { date: "asc" },
        });

        const overrides = await prisma.dailyPayrollOverride.findMany({
            where: {
                userId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
        });

        let colleagueAttendanceMap = new Map();
        let colleagueNameMap = new Map();
        if (employee.stationId) {
            const colleagues = await prisma.user.findMany({
                where: {
                    stationId: employee.stationId,
                    id: { not: userId },
                    isActive: true,
                },
                select: { id: true, name: true, nickName: true },
            });

            for (const c of colleagues) {
                colleagueNameMap.set(c.id, { name: c.name, nickName: c.nickName });
            }

            console.log("colleagues.length", colleagues.length);

            const colleagueAttendances = await prisma.attendance.findMany({
                where: {
                    userId: { in: colleagues.map(c => c.id) },
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                },
                select: { userId: true, date: true },
            });

            for (const ca of colleagueAttendances) {
                const dk = ca.date.toISOString().split("T")[0];
                if (!colleagueAttendanceMap.has(dk)) {
                    colleagueAttendanceMap.set(dk, new Set());
                }
                colleagueAttendanceMap.get(dk).add(ca.userId);
            }
        }

        console.log("Done without error!");
    } catch (e) {
        console.error("ERROR!!", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
