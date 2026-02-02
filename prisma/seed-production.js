const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding employees...\n');

    // Get first station
    const station = await prisma.station.findFirst();
    if (!station) {
        console.log('❌ No station found!');
        return;
    }
    console.log('📍 Using station:', station.name, `(${station.id})`);

    // Get department
    const dept = await prisma.department.findFirst({ where: { code: 'FY' } });
    const deptId = dept?.id || null;

    // Create Sample Employees
    console.log('\n👤 Creating sample employees...');
    const password = await bcrypt.hash('1234', 10);
    const pin = await bcrypt.hash('1234', 10);

    const employees = [
        { employeeId: 'EMP001', name: 'สมชาย ใจดี', role: 'MANAGER', phone: '0801111111' },
        { employeeId: 'EMP002', name: 'สมหญิง รักงาน', role: 'CASHIER', phone: '0802222222' },
        { employeeId: 'EMP003', name: 'สมศักดิ์ ขยัน', role: 'EMPLOYEE', phone: '0803333333' },
        { employeeId: 'EMP004', name: 'สมหมาย พร้อมใจ', role: 'EMPLOYEE', phone: '0804444444' },
        { employeeId: 'EMP005', name: 'สมปอง ตั้งใจ', role: 'EMPLOYEE', phone: '0805555555' },
    ];

    for (const e of employees) {
        try {
            await prisma.user.upsert({
                where: { employeeId: e.employeeId },
                update: {},
                create: {
                    employeeId: e.employeeId,
                    name: e.name,
                    phone: e.phone,
                    password: password,
                    pin: pin,
                    role: e.role,
                    isActive: true,
                    stationId: station.id,
                    departmentId: deptId,
                },
            });
            console.log('  ✅ Employee:', e.name, `(${e.employeeId})`);
        } catch (err) {
            console.log('  ⚠️ Skipped:', e.name, '- already exists');
        }
    }

    console.log('\n🎉 Done!');
    console.log('\n📋 Login credentials:');
    console.log('   Password: 1234');
    console.log('   PIN: 1234');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
