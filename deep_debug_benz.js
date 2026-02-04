const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await client.connect();

    console.log("Deep check for user 'benz'...");

    const res = await client.query(`
        SELECT id, "employeeId", username, name, password, pin, role, "isActive"
        FROM "User" 
        WHERE name = 'benz'
    `);

    if (res.rows.length === 0) {
        console.log("❌ User 'benz' not found!");
        await client.end();
        return;
    }

    const user = res.rows[0];
    console.log("User details:", {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        hasPassword: !!user.password,
        hasPin: !!user.pin
    });

    // Test password '555555' against the hash in DB
    const testPass = '555555';
    const isPassValid = await bcrypt.compare(testPass, user.password);
    const isPinValid = await bcrypt.compare(testPass, user.pin);

    console.log(`\nTesting '555555' against stored hash:`);
    console.log(`Password valid? ${isPassValid ? '✅ YES' : '❌ NO'}`);
    console.log(`PIN valid? ${isPinValid ? '✅ YES' : '❌ NO'}`);

    if (!isPassValid) {
        console.log("⚠️ Password hash mismatch! Re-hashing...");
        const newHash = await bcrypt.hash(testPass, 10);
        await client.query('UPDATE "User" SET password = $1 WHERE id = $2', [newHash, user.id]);
        console.log("✅ Re-hashed and updated password.");
    }

    if (!isPinValid) {
        console.log("⚠️ PIN hash mismatch! Re-hashing...");
        const newHash = await bcrypt.hash(testPass, 10);
        await client.query('UPDATE "User" SET pin = $1 WHERE id = $2', [newHash, user.id]);
        console.log("✅ Re-hashed and updated PIN.");
    }

    await client.end();
}

main().catch(console.error);
