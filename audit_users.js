const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await client.connect();

    console.log("Auditing ALL users...");

    const res = await client.query(`
        SELECT id, "employeeId", username, name, role, "isActive", password, pin
        FROM "User" 
        ORDER BY role, name
    `);

    console.log(`Found ${res.rows.length} users.`);

    let activeCount = 0;
    let adminCount = 0;
    let hasPassCount = 0;

    res.rows.forEach(u => {
        if (u.isActive) activeCount++;
        if (u.role === 'ADMIN') adminCount++;
        if (u.password) hasPassCount++;

        console.log(`[${u.role}] ${u.name} (ID: ${u.employeeId}) - Active: ${u.isActive} - Pass: ${!!u.password} - PIN: ${!!u.pin}`);
    });

    console.log("\nSummary:");
    console.log(`Total: ${res.rows.length}`);
    console.log(`Active: ${activeCount}`);
    console.log(`Admins: ${adminCount}`);
    console.log(`With Password: ${hasPassCount}`);

    await client.end();
}

main().catch(console.error);
