const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await client.connect();

    console.log('=== ตรวจสอบพนักงาน ===\n');

    const res = await client.query('SELECT "employeeId", "name", "phone", "role", "isActive" FROM "User" ORDER BY "role", "name"');

    console.log(`พบ ${res.rows.length} users:\n`);

    for (const u of res.rows) {
        console.log(`${u.employeeId} | ${u.name} | ${u.phone} | ${u.role} | Active: ${u.isActive}`);
    }

    await client.end();
}

main().catch(console.error);
