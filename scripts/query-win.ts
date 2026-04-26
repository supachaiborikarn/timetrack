import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { OR: [ { nickName: { contains: "วิน", mode: "insensitive" } }, { name: { contains: "วิน", mode: "insensitive" } } ] }
    });
    console.log("Users:", users.map(u => ({ id: u.id, name: u.name, nickName: u.nickName })));
    
    if (users.length > 0) {
        const attendances = await prisma.attendance.findMany({
            where: { userId: users[0].id },
            orderBy: { date: 'desc' },
            take: 10
        });
        console.log("Attendances:", attendances.map(a => ({
            id: a.id,
            date: a.date,
            checkIn: a.checkInTime,
            checkOut: a.checkOutTime,
            actualHours: a.actualHours
        })));
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
