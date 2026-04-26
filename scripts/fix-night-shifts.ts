import { PrismaClient } from "@prisma/client";
import { differenceInMinutes } from "date-fns";

const prisma = new PrismaClient();

function calculateWorkHours(checkIn: Date, checkOut: Date, breakMinutes: number = 60) {
    const totalMinutes = differenceInMinutes(checkOut, checkIn) - breakMinutes;
    const regularMinutes = 8 * 60;
    const totalHours = Math.max(0, totalMinutes / 60);
    const overtimeHours = Math.max(0, (totalMinutes - regularMinutes) / 60);
    return {
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
    };
}

async function main() {
    const attendances = await prisma.attendance.findMany({
        where: {
            checkInTime: { not: null },
            checkOutTime: { not: null },
            actualHours: 0
        },
        include: {
            user: { select: { name: true, nickName: true } }
        }
    });

    let fixedCount = 0;
    
    for (const att of attendances) {
        if (!att.checkInTime || !att.checkOutTime) continue;
        
        // Is checkout before checkin?
        if (att.checkOutTime < att.checkInTime) {
            console.log(`Found bugged attendance for ${att.user.name} on ${att.date.toISOString()}`);
            console.log(`  CheckIn: ${att.checkInTime.toISOString()}`);
            console.log(`  CheckOut: ${att.checkOutTime.toISOString()}`);
            
            const newCheckOut = new Date(att.checkOutTime.getTime() + 24 * 60 * 60 * 1000);
            
            const { totalHours, overtimeHours } = calculateWorkHours(att.checkInTime, newCheckOut);
            
            console.log(`  Fixing... New CheckOut: ${newCheckOut.toISOString()} | Hours: ${totalHours}`);
            
            await prisma.attendance.update({
                where: { id: att.id },
                data: {
                    checkOutTime: newCheckOut,
                    actualHours: totalHours,
                    overtimeHours: overtimeHours
                }
            });
            fixedCount++;
        }
    }
    
    console.log(`\nFixed ${fixedCount} attendances.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
