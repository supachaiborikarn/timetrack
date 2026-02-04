const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await client.connect();

    console.log("Searching for user 'benz'...");

    // Search by name, username, or employeeId containing 'benz'
    const query = `
        SELECT id, "employeeId", username, name, role, "isActive"
        FROM "User"
        WHERE name ILIKE '%benz%' OR username ILIKE '%benz%'
    `;

    const res = await client.query(query);

    if (res.rows.length === 0) {
        console.log("❌ No user found matching 'benz'");
    } else {
        console.log(`Found ${res.rows.length} users:`);
        res.rows.forEach(u => {
            console.log("--------------------------------");
            console.log(`Name: ${u.name}`);
            console.log(`Username: ${u.username}`);
            console.log(`EmployeeID: ${u.employeeId}`);
            console.log(`Role: ${u.role}`);
            console.log(`Active: ${u.isActive}`);
        });
    }

    await client.end();
}

main().catch(console.error);
