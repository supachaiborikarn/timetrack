const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await client.connect();

    console.log('=== ตรวจสอบ Stations ===\n');

    const res = await client.query('SELECT "id", "code", "name" FROM "Station" ORDER BY "name"');

    console.log(`พบ ${res.rows.length} stations:\n`);

    for (const s of res.rows) {
        console.log(`ID: ${s.id}`);
        console.log(`  Code: ${s.code}`);
        console.log(`  Name: ${s.name}`);

        // Count users
        const users = await client.query('SELECT "id", "name" FROM "User" WHERE "stationId" = $1', [s.id]);
        console.log(`  Users: ${users.rows.length}`);
        if (users.rows.length > 0) {
            console.log(`    - ${users.rows.map(u => u.name).join(', ')}`);
        }

        // Count departments
        const depts = await client.query('SELECT "id", "name" FROM "Department" WHERE "stationId" = $1', [s.id]);
        console.log(`  Departments: ${depts.rows.length}`);

        console.log('');
    }

    await client.end();
}

main().catch(console.error);
