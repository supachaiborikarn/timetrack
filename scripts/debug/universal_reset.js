const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB_URLS = [
    {
        name: "SUPABASE (Local/Dev)",
        url: "postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
    },
    {
        name: "NEON (Production/Online)",
        url: "postgresql://neondb_owner:npg_EVuC0MZ6wyIJ@ep-curly-queen-a10lx9c6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    }
];

async function resetAll() {
    console.log("🔒 UNIVERSAL RESET: Setting ALL passwords/PINs to '123456' on ALL Databases...");

    const newHash = await bcrypt.hash('123456', 10);

    for (const db of DB_URLS) {
        console.log(`\nConnecting to ${db.name}...`);
        const client = new Client({ connectionString: db.url });

        try {
            await client.connect();

            // Reset ALL users
            const res = await client.query(`
                UPDATE "User" 
                SET "password" = $1, "pin" = $1, "isActive" = true
                RETURNING "employeeId", "name"
            `, [newHash]);

            console.log(`✅ Reset SUCCESS on ${db.name}`);
            console.log(`   Updated ${res.rows.length} users.`);

        } catch (e) {
            console.error(`❌ FAILED on ${db.name}:`, e.message);
        } finally {
            await client.end();
        }
    }
}

resetAll().catch(console.error);
