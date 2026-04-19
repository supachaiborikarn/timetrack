import { prisma } from './src/lib/prisma';
async function main() {
  const result = await prisma.department.updateMany({
    where: { 
      OR: [
        { name: 'หน้าลาน' },
        { code: 'FUEL' },
        { name: 'แก๊ส' },
        { code: 'GAS' }
      ]
    },
    data: { isFrontYard: true }
  });
  console.log(`Updated ${result.count} departments to be front yard.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
