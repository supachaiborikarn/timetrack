require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('=== รีเซ็ต Password พนักงานทั้งหมดเป็น 123456 ===\n');

    // Hash password 123456
    const newPassword = await bcrypt.hash('123456', 10);
    const newPin = await bcrypt.hash('123456', 10);

    // Get all users
    const users = await prisma.user.findMany({
        select: { id: true, employeeId: true, name: true, role: true }
    });

    console.log(`พบพนักงาน ${users.length} คน\n`);

    for (const user of users) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: newPassword,
                pin: newPin
            }
        });
        console.log(`✅ รีเซ็ตแล้ว: ${user.name} (${user.employeeId}) - ${user.role}`);
    }

    console.log('\n=== เสร็จสิ้น! ===');
    console.log('Password ใหม่: 123456');
    console.log('PIN ใหม่: 123456');
    console.log('\nวิธี Login:');
    console.log('1. ใส่ ชื่อ, รหัสพนักงาน, หรือ phone ในช่อง Username');
    console.log('2. ใส่ 123456 ในช่อง Password');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
