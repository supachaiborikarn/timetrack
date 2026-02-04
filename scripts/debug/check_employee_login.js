require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('=== ตรวจสอบพนักงานทั้งหมด ===\n');

    const users = await prisma.user.findMany({
        select: {
            id: true,
            employeeId: true,
            name: true,
            username: true,
            phone: true,
            email: true,
            password: true,
            pin: true,
            role: true,
            isActive: true,
        },
        orderBy: { name: 'asc' }
    });

    console.log(`พบพนักงาน ${users.length} คน\n`);

    for (const user of users) {
        const hasPassword = !!user.password;
        const hasPin = !!user.pin;

        // ทดสอบว่า password 123456 ใช้ได้ไหม
        let canLoginWith123456 = false;
        if (user.password) {
            canLoginWith123456 = await bcrypt.compare('123456', user.password);
        }

        console.log(`รหัส: ${user.employeeId}`);
        console.log(`  ชื่อ: ${user.name}`);
        console.log(`  username: ${user.username || '(ไม่มี)'}`);
        console.log(`  phone: ${user.phone}`);
        console.log(`  role: ${user.role}`);
        console.log(`  active: ${user.isActive}`);
        console.log(`  มี password: ${hasPassword ? 'ใช่' : 'ไม่มี!'}`);
        console.log(`  มี PIN: ${hasPin ? 'ใช่' : 'ไม่มี!'}`);
        console.log(`  login ด้วย 123456 ได้: ${canLoginWith123456 ? '✅ ใช่' : '❌ ไม่ได้'}`);
        console.log('');
    }

    // แนะนำวิธีแก้
    console.log('\n=== วิธีใช้งาน Login ===');
    console.log('1. เข้าหน้า login');
    console.log('2. ใส่ ชื่อ, username, หรือ รหัสพนักงาน ในช่อง Username');
    console.log('3. ใส่ 123456 ในช่อง Password');
    console.log('4. กดปุ่ม Login');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
