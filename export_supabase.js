const { Client } = require('pg');

async function exportData() {
    // Connect to Supabase
    const supabase = new Client({
        connectionString: 'postgresql://postgres.knrqdfawnrehqvkczogm:Bigbcoffee2010!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
    });

    await supabase.connect();
    console.log('✅ Connected to Supabase');

    // Export all tables
    const tables = ['Station', 'Department', 'User', 'ShiftType', 'Shift', 'Attendance', 'TimeRequest', 'SwapRequest', 'Availability', 'QRCode'];
    const data = {};

    for (const table of tables) {
        try {
            const result = await supabase.query(`SELECT * FROM "${table}"`);
            data[table] = result.rows;
            console.log(`📦 ${table}: ${result.rows.length} records`);
        } catch (err) {
            console.log(`⚠️ ${table}: table not found or empty`);
            data[table] = [];
        }
    }

    await supabase.end();

    // Save to JSON file
    require('fs').writeFileSync('supabase_export.json', JSON.stringify(data, null, 2));
    console.log('\n✅ Exported to supabase_export.json');

    return data;
}

exportData().catch(console.error);
