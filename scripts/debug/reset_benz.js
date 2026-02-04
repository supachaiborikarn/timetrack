const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await client.connect();

    // Hash password 555555
    const newPassword = await bcrypt.hash('555555', 10);
    const newPin = await bcrypt.hash('555555', 10);

    // Update benz user
    const result = await client.query(
        'UPDATE "User" SET "password" = $1, "pin" = $2 WHERE "name" = $3 RETURNING "employeeId", "name", "phone", "role"',
        [newPassword, newPin, 'benz']
    );

    if (result.rows.length > 0) {
        console.log('✅ Reset password สำเร็จสำหรับ:');
        console.log(`  ID: ${result.rows[0].employeeId}`);
        console.log(`  Name: ${result.rows[0].name}`);
        console.log(`  Phone: ${result.rows[0].phone}`);
        console.log(`  Role: ${result.rows[0].role}`);
        console.log('\n  Password/PIN ใหม่: 555555');
    } else {
        console.log('❌ ไม่พบ user "benz"');
    }

    await client.end();
}

main().catch(console.error);
