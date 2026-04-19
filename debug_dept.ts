import { prisma } from './src/lib/prisma';
async function main() {
  const depts = await prisma.department.findMany();
  console.log(depts);
}
main();
