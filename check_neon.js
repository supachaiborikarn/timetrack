const { Client } = require('pg');

async function checkNeon() {
    const neonUrl = "postgresql://neondb_owner:npg_EVuC0MZ6wyIJ@ep-curly-queen-a10lx9c6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

    console.log("Checking Neon DB...");
    const client = new Client({ connectionString: neonUrl });

    try {
        await client.connect();
        const res = await client.query('SELECT count(*) FROM "User"');
        console.log(`✅ Neon Connection Success. User count: ${res.rows[0].count}`);

        const benz = await client.query('SELECT * FROM "User" WHERE name = \'benz\'');
        if (benz.rows.length > 0) {
            console.log("Found benz in Neon:", benz.rows[0].password ? "Has Password" : "No Password");
        } else {
            console.log("❌ 'benz' NOT found in Neon");
        }

    } catch (e) {
        console.error("❌ Neon Connection Failed:", e.message);
    } finally {
        await client.end();
    }
}

checkNeon();
