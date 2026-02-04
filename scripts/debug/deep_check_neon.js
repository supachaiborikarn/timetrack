const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function deepCheck() {
    const neonUrl = "postgresql://neondb_owner:npg_EVuC0MZ6wyIJ@ep-curly-queen-a10lx9c6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

    console.log("🔍 DEEP CHECK: Neon Database for 'benz'...\n");

    const client = new Client({ connectionString: neonUrl });
    await client.connect();

    // Find all users that could match 'benz'
    const res = await client.query(`
        SELECT id, "employeeId", username, name, email, phone, password, pin, role, "isActive"
        FROM "User" 
        WHERE 
            name ILIKE '%benz%' OR 
            username ILIKE '%benz%' OR
            email ILIKE '%benz%' OR
            "employeeId" ILIKE '%benz%'
        ORDER BY name
    `);

    console.log(`Found ${res.rows.length} users matching 'benz':\n`);

    const testPass = '123456';

    for (const user of res.rows) {
        console.log(`=== ${user.name} ===`);
        console.log(`  ID: ${user.id}`);
        console.log(`  EmployeeID: ${user.employeeId}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Phone: ${user.phone}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.isActive}`);

        // Test password
        const passOk = user.password ? await bcrypt.compare(testPass, user.password) : false;
        const pinOk = user.pin ? await bcrypt.compare(testPass, user.pin) : false;

        console.log(`  Password '123456': ${passOk ? '✅' : '❌'}`);
        console.log(`  PIN '123456': ${pinOk ? '✅' : '❌'}`);
        console.log('');
    }

    // Now check the exact query the auth system would use
    console.log("\n--- Simulating AUTH Query ---\n");

    const authQuery = await client.query(`
        SELECT id, "employeeId", username, name, password, pin, role, "isActive"
        FROM "User"
        WHERE (email = $1 OR username = $1 OR "employeeId" = $1 OR name = $1)
          AND "isActive" = true
        LIMIT 1
    `, ['benz']);

    if (authQuery.rows.length > 0) {
        const u = authQuery.rows[0];
        console.log(`Auth would find: ${u.name} (${u.employeeId})`);
        const passOk = await bcrypt.compare(testPass, u.password);
        console.log(`Password match: ${passOk ? '✅ YES' : '❌ NO'}`);
    } else {
        console.log("❌ AUTH QUERY RETURNED NO RESULTS!");
    }

    await client.end();
}

deepCheck().catch(console.error);
