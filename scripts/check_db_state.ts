import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Get all stations
        const stations = await prisma.station.findMany({
            select: { id: true, name: true, code: true }
        });
        console.log("=== STATIONS ===");
        stations.forEach(s => console.log(`ID: ${s.id} | Name: ${s.name} | Code: ${s.code}`));
        console.log(`Total: ${stations.length}\n`);

        // Get all departments
        const departments = await prisma.department.findMany({
            select: { id: true, name: true, code: true }
        });
        console.log("=== DEPARTMENTS ===");
        departments.forEach(d => console.log(`ID: ${d.id} | Name: ${d.name} | Code: ${d.code}`));
        console.log(`Total: ${departments.length}\n`);

        // Get all users with their station
        const users = await prisma.user.findMany({
            include: {
                station: { select: { name: true } },
                department: { select: { name: true } }
            },
            orderBy: { name: 'asc' }
        });
        console.log("=== USERS ===");
        users.forEach(u => {
            console.log(`Name: ${u.name} | EmpID: ${u.employeeId} | Station: ${u.station?.name || 'N/A'} | Dept: ${u.department?.name || 'N/A'} | Role: ${u.role}`);
        });
        console.log(`Total: ${users.length}\n`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
