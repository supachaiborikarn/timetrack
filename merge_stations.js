const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await client.connect();

    const OLD_STATION = 'cml5g1npv0000ua47e8fgfjj4'; // วัชรเกียรติ (VAC001)
    const NEW_STATION = 'cml5by818000014m683rzadum'; // วัชรเกียรติออยล์ (WKO)

    console.log('=== รวม Station วัชรเกียรติ เข้ากับ วัชรเกียรติออยล์ ===\n');

    // 1. Move all users from old station to new station
    const userResult = await client.query(
        'UPDATE "User" SET "stationId" = $1 WHERE "stationId" = $2 RETURNING "id", "name"',
        [NEW_STATION, OLD_STATION]
    );
    console.log(`ย้าย users ${userResult.rowCount} คน:`);
    for (const u of userResult.rows) {
        console.log(`  - ${u.name}`);
    }

    // 2. Move all departments from old station to new station
    const deptResult = await client.query(
        'UPDATE "Department" SET "stationId" = $1 WHERE "stationId" = $2 RETURNING "id", "name"',
        [NEW_STATION, OLD_STATION]
    );
    console.log(`\nย้าย departments ${deptResult.rowCount} แผนก:`);
    for (const d of deptResult.rows) {
        console.log(`  - ${d.name}`);
    }

    // 3. Delete old station
    await client.query('DELETE FROM "Station" WHERE "id" = $1', [OLD_STATION]);
    console.log('\n✅ ลบ station เก่า "วัชรเกียรติ" แล้ว');

    // 4. Show updated station
    console.log('\n=== ผลลัพธ์ ===');
    const station = await client.query('SELECT * FROM "Station" WHERE "id" = $1', [NEW_STATION]);
    console.log(`Station: ${station.rows[0].name} (${station.rows[0].code})`);

    const users = await client.query('SELECT "name" FROM "User" WHERE "stationId" = $1', [NEW_STATION]);
    console.log(`Users: ${users.rows.length} คน`);

    const depts = await client.query('SELECT "name" FROM "Department" WHERE "stationId" = $1', [NEW_STATION]);
    console.log(`Departments: ${depts.rows.length} แผนก`);

    await client.end();
    console.log('\n✅ เสร็จสิ้น!');
}

main().catch(console.error);
