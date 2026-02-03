require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importData() {
    // Load exported data
    const data = JSON.parse(fs.readFileSync('supabase_export.json', 'utf-8'));

    console.log('🚀 Starting import to Neon...\n');

    // Import Stations with required defaults
    console.log('📦 Importing Stations...');
    for (const row of data.Station) {
        await prisma.station.create({
            data: {
                id: row.id,
                name: row.name,
                code: row.code,
                type: 'GAS_STATION', // Default type
                address: row.address || 'ไม่ระบุ',
                latitude: row.latitude || 0,
                longitude: row.longitude || 0,
                radius: row.radius || 100,
                isActive: row.isActive !== false,
            }
        }).catch(() => console.log(`   ⚠️ Station ${row.name} already exists`));
    }
    console.log(`   ✅ ${data.Station.length} stations processed`);

    // Import Departments
    console.log('📦 Importing Departments...');
    for (const row of data.Department) {
        await prisma.department.create({
            data: {
                id: row.id,
                name: row.name,
                code: row.code,
                stationId: row.stationId,
            }
        }).catch(() => console.log(`   ⚠️ Department ${row.name} already exists`));
    }
    console.log(`   ✅ ${data.Department.length} departments processed`);

    // Import Users
    console.log('📦 Importing Users...');
    for (const row of data.User) {
        await prisma.user.create({
            data: {
                id: row.id,
                employeeId: row.employeeId,
                name: row.name,
                email: row.email,
                username: row.username,
                phone: row.phone,
                password: row.password,
                pin: row.pin,
                role: row.role,
                stationId: row.stationId,
                departmentId: row.departmentId,
                isActive: row.isActive !== false,
            }
        }).catch(() => console.log(`   ⚠️ User ${row.name} already exists`));
    }
    console.log(`   ✅ ${data.User.length} users processed`);

    await prisma.$disconnect();
    console.log('\n🎉 Import completed successfully!');
}

importData().catch(console.error);
