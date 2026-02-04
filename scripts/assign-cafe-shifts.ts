
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Assigning Coffee Shop Shifts ---');

    // 1. Find or create the shift
    let shift = await prisma.shift.findUnique({
        where: { code: 'CAFE' }
    });

    if (!shift) {
        shift = await prisma.shift.create({
            data: {
                code: 'CAFE',
                name: 'กะร้านกาแฟ',
                startTime: '07:00',
                endTime: '17:00',
                breakMinutes: 60,
                sortOrder: 10
            }
        });
        console.log(`Created new shift: ${shift.name} (${shift.startTime}-${shift.endTime})`);
    } else {
        console.log(`Found existing shift: ${shift.name}`);
    }

    // 2. Find all Coffee Shop departments
    const departments = await prisma.department.findMany({
        where: { name: { contains: 'กาแฟ' } }
    });

    console.log(`Linking shift to ${departments.length} departments...`);

    for (const dept of departments) {
        await prisma.departmentShift.upsert({
            where: {
                departmentId_shiftId: {
                    departmentId: dept.id,
                    shiftId: shift.id
                }
            },
            update: {},
            create: {
                departmentId: dept.id,
                shiftId: shift.id
            }
        });
    }

    // 3. Find all coffee shop employees and assign the shift to them
    const cafeEmployees = await prisma.user.findMany({
        where: {
            departmentId: {
                in: departments.map((d: any) => d.id)
            },
            isActive: true
        }
    });

    console.log(`Assigning shift to ${cafeEmployees.length} active employees...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const emp of cafeEmployees) {
        // Current date assignment (for immediate effect)
        await prisma.shiftAssignment.upsert({
            where: {
                userId_date: {
                    userId: emp.id,
                    date: today
                }
            },
            update: {
                shiftId: shift.id,
                isDayOff: false
            },
            create: {
                userId: emp.id,
                date: today,
                shiftId: shift.id,
                isDayOff: false
            }
        });
        process.stdout.write('.');
    }

    console.log('\n--- Assignment Done ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
