const { PrismaClient } = require("@prisma/client");
const { startOfDay, addDays } = require("date-fns");
const prisma = new PrismaClient();

// Exact replica of API logic
function getBangkokNow() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 7 * 60 * 60000);
}

async function testForUser(userName) {
    const user = await prisma.user.findFirst({
        where: { name: { contains: userName } },
        select: { id: true, name: true },
    });

    if (!user) {
        console.log("User not found:", userName);
        return;
    }

    console.log("\n=== Testing for:", user.name, "===");

    const now = getBangkokNow();
    const today = startOfDay(now);
    const tomorrow = startOfDay(addDays(now, 1));

    console.log("Bangkok now:", now.toISOString());
    console.log("Today query date:", today.toISOString());
    console.log("Tomorrow query date:", tomorrow.toISOString());

    // Query exactly like API does
    const shiftAssignment = await prisma.shiftAssignment.findFirst({
        where: {
            userId: user.id,
            date: today,
        },
        include: { shift: true },
    });

    const tomorrowShiftAssignment = await prisma.shiftAssignment.findFirst({
        where: {
            userId: user.id,
            date: tomorrow,
        },
        include: { shift: true },
    });

    console.log("Today shift:", shiftAssignment?.shift?.name || "NULL");
    console.log("Tomorrow shift:", tomorrowShiftAssignment?.shift?.name || "NULL");

    // Also check what dates exist
    const allDates = await prisma.shiftAssignment.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
        take: 3,
        select: { date: true },
    });
    console.log(
        "First 3 dates in DB:",
        allDates.map((d) => d.date.toISOString()).join(", ")
    );
}

async function main() {
    await testForUser("จิรวัฒน์");
    await testForUser("ศิริพร");
}

main().finally(() => prisma.$disconnect());
