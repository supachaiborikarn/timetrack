import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.auditLog.findMany({
        where: { entityId: "cmo2sr0pc00018y7c911mofu0" }, // The attendance ID
        orderBy: { createdAt: 'desc' }
    });
    console.log("Audit Logs for this attendance:");
    for (const log of logs) {
        console.log(log.createdAt, log.action, log.details);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
