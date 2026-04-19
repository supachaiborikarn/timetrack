import { prisma } from './src/lib/prisma';

async function main() {
  // Check what dates look like in DB
  const records = await prisma.attendance.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    select: { id: true, date: true, checkInTime: true, userId: true },
  });
  console.log("Recent attendance records:");
  for (const r of records) {
    console.log(` date=${r.date.toISOString()} checkIn=${r.checkInTime?.toISOString()} user=${r.userId}`);
  }

  // Also test what the frontend sends
  const startDate = "2026-04-01";
  const endDate = "2026-04-30";
  console.log("\nnew Date(startDate):", new Date(startDate).toISOString());
  console.log("new Date(endDate):", new Date(endDate).toISOString());

  // Test with timezone
  console.log("\nWith +07:00 offset:");
  console.log("start:", new Date(startDate + "T00:00:00+07:00").toISOString());
  console.log("end:", new Date(endDate + "T23:59:59+07:00").toISOString());
}
main().catch(console.error).finally(() => prisma.$disconnect());
