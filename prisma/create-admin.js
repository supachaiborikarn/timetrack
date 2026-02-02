const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('admin123', 10);
    const pin = await bcrypt.hash('1234', 10);

    const admin = await prisma.user.upsert({
        where: { employeeId: 'ADMIN001' },
        update: {},
        create: {
            employeeId: 'ADMIN001',
            name: 'Admin',
            email: 'admin@timetrack.com',
            phone: '0000000000',
            password: password,
            pin: pin,
            role: 'ADMIN',
            isActive: true,
        },
    });

    console.log('✅ Created admin user:', admin.name);
    console.log('   Employee ID:', admin.employeeId);
    console.log('   Password: admin123');
    console.log('   PIN: 1234');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
