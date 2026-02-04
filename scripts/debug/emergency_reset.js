const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await client.connect();

    console.log("🔒 Emergency Reset: Resetting ALL Admin/Manager passwords to '555555'...");

    const targetRoles = ['ADMIN', 'HR', 'MANAGER'];
    const newHash = await bcrypt.hash('555555', 10);

    // Update Password and PIN for all target roles
    const res = await client.query(`
        UPDATE "User" 
        SET "password" = $1, "pin" = $1 
        WHERE role = ANY($2)
        RETURNING "employeeId", "name", "role"
    `, [newHash, targetRoles]);

    console.log(`✅ Updated ${res.rows.length} users:`);
    res.rows.forEach(u => {
        console.log(`  - [${u.role}] ${u.name} (${u.employeeId})`);
    });

    await client.end();
}

main().catch(console.error);
