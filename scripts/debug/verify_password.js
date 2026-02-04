const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB_URLS = [
    {
        name: "SUPABASE",
        url: "postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
    },
    {
        name: "NEON",
        url: "postgresql://neondb_owner:npg_EVuC0MZ6wyIJ@ep-curly-queen-a10lx9c6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    }
];

async function verifyAll() {
    console.log("🔍 VERIFICATION: Checking password '123456' on ALL Databases...\n");

    const testPassword = '123456';

    for (const db of DB_URLS) {
        console.log(`\n=== ${db.name} ===`);
        const client = new Client({ connectionString: db.url });

        try {
            await client.connect();

            // Get benz user
            const res = await client.query(`
                SELECT "employeeId", "name", "password", "pin", "isActive", "role"
                FROM "User" 
                WHERE name = 'benz' OR username = 'benz'
                LIMIT 1
            `);

            if (res.rows.length === 0) {
                console.log("❌ User 'benz' NOT FOUND!");
                continue;
            }

            const user = res.rows[0];
            console.log(`User: ${user.name} (${user.employeeId})`);
            console.log(`Role: ${user.role}`);
            console.log(`Active: ${user.isActive}`);

            // Test password
            const passOk = await bcrypt.compare(testPassword, user.password);
            const pinOk = await bcrypt.compare(testPassword, user.pin);

            console.log(`Password '${testPassword}' valid: ${passOk ? '✅ YES' : '❌ NO'}`);
            console.log(`PIN '${testPassword}' valid: ${pinOk ? '✅ YES' : '❌ NO'}`);

            // If NOT valid, show what the hash looks like
            if (!passOk) {
                console.log(`\n⚠️ Hash in DB: ${user.password.substring(0, 30)}...`);
                const freshHash = await bcrypt.hash(testPassword, 10);
                console.log(`Fresh bcrypt of '${testPassword}': ${freshHash.substring(0, 30)}...`);
            }

        } catch (e) {
            console.error(`❌ Error on ${db.name}:`, e.message);
        } finally {
            await client.end();
        }
    }
}

verifyAll().catch(console.error);
