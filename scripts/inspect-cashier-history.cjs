require('dotenv').config({ quiet: true });
const { Client } = require('pg');
async function main() {
    const url = new URL(process.env.DATABASE_URL);
    console.log('READ ONLY host:', url.hostname, 'week: 2026-08-31; no writes');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        await client.query('BEGIN READ ONLY');
        const result = await client.query(`
            SELECT s.code, count(*)::int AS employees,
                   round(avg(cs."totalScore"), 1) AS team_score,
                   round(round(avg(cs."totalScore"), 1) * 0.6, 1) + 40 AS cashier_score
            FROM "CompetitionPeriod" p JOIN "CompetitionStanding" cs ON cs."periodId" = p.id
            JOIN "User" u ON u.id = cs."userId" JOIN "Station" s ON s.id = p."stationId"
            WHERE p.type = 'WEEKLY_STATION' AND p.status = 'FINALIZED' AND p."periodKey" = '2026-08-31'
              AND cs."requiredDays" > 0 AND u.role = 'EMPLOYEE'
            GROUP BY s.code ORDER BY s.code`);
        console.log(JSON.stringify(result.rows, null, 2));
        await client.query('ROLLBACK');
    } finally { await client.end(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
