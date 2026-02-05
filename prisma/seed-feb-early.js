const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // Get all users with their latest shift assignment as a template
    const users = await prisma.user.findMany({
        where: { isActive: true },
        include: {
            shiftAssignments: {
                orderBy: { date: "desc" },
                take: 1,
                include: { shift: true },
            },
        },
    });

    console.log("Found", users.length, "active users");

    // Generate dates for Feb 1-17 (in UTC, stored as Feb X-1 17:00 = Feb X 00:00 Thai time)
    const datesToCreate = [];
    for (let day = 1; day <= 17; day++) {
        // Feb 5 Thai time = Feb 4 17:00 UTC
        const date = new Date(Date.UTC(2026, 1, day - 1, 17, 0, 0, 0)); // Feb is month 1
        datesToCreate.push(date);
    }
    console.log(
        "Dates to create:",
        datesToCreate.map((d) => d.toISOString())
    );

    let created = 0;
    for (const user of users) {
        if (user.shiftAssignments.length === 0) continue;

        const templateShiftId = user.shiftAssignments[0].shiftId;

        for (const date of datesToCreate) {
            // Check if already exists
            const existing = await prisma.shiftAssignment.findFirst({
                where: { userId: user.id, date: date },
            });

            if (!existing) {
                await prisma.shiftAssignment.create({
                    data: {
                        userId: user.id,
                        shiftId: templateShiftId,
                        date: date,
                        isDayOff: false,
                    },
                });
                created++;
            }
        }
    }

    console.log("Created", created, "new shift assignments");
}

main().finally(() => prisma.$disconnect());
