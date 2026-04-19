import { prisma } from './src/lib/prisma';
import { getPayrollPeriod } from './src/lib/date-utils';

async function main() {
  const users = await prisma.user.findMany({
    take: 5,
    include: { department: true }
  });
  console.log("Users and Frontyard status:");
  for (const u of users) {
    console.log(`- ${u.name} (Role: ${u.role}) -> Dept: ${u.department?.name || 'None'} / isFY: ${u.department?.isFrontYard}`);
  }

  const now = new Date(2026, 3, 1); // April 1st
  console.log("\nPayroll for Frontyard (April 2026):");
  console.log(getPayrollPeriod(now, true));

  console.log("\nPayroll for Non-Frontyard (April 2026):");
  console.log(getPayrollPeriod(now, false));
}
main();
