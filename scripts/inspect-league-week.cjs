// Read-only diagnosis of a Monday-Sunday League period; never finalizes or awards points.
require('dotenv').config({ quiet: true });
const { Client, types } = require('pg');
// Prisma stores DateTime as UTC in PostgreSQL timestamp-without-time-zone columns.
types.setTypeParser(1114, (value) => new Date(`${value.replace(' ', 'T')}Z`));

async function main() {
    const weekKey = process.argv[2];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey || '')) throw new Error('Usage: node scripts/inspect-league-week.cjs YYYY-MM-DD');
    const from = new Date(`${weekKey}T00:00:00+07:00`);
    if (!Number.isFinite(from.getTime()) || from.getUTCDay() !== 0) throw new Error('Expected a Monday in Asia/Bangkok');
    const to = new Date(from.getTime() + 7 * 86400000);
    const url = process.env.DATABASE_URL;
    console.log(JSON.stringify({ host: new URL(url).hostname, mode: 'READ ONLY', weekKey, from, to }));
    const connection = new URL(url);
    if (connection.searchParams.get('sslmode') === 'require') connection.searchParams.set('sslmode', 'verify-full');
    const client = new Client({ connectionString: connection.toString(), connectionTimeoutMillis: 15000 });
    await client.connect();
    try {
        await client.query('BEGIN READ ONLY');
        await client.query("SET LOCAL statement_timeout = '20s'");
        const periods = await client.query(`
            SELECT p.id, p."periodKey", s.code, p.status, p."finalizedAt",
                   COUNT(c.id)::int AS standings,
                   COUNT(c.id) FILTER (WHERE c."isEligible")::int AS eligible,
                   COUNT(c.id) FILTER (WHERE c."isEligible" AND c."fairPlayStatus" = 'REVIEW')::int AS awaiting_review,
                   MAX(c."employeeLabelSnapshot") FILTER (WHERE c."finalRank" = 1) AS champion
            FROM "CompetitionPeriod" p
            LEFT JOIN "Station" s ON s.id = p."stationId"
            LEFT JOIN "CompetitionStanding" c ON c."periodId" = p.id
            WHERE p.type = 'WEEKLY_STATION' AND p."endDate" <= $1
            GROUP BY p.id, s.code ORDER BY p."endDate" DESC, s.code LIMIT 30`, [to]);
        const standings = await client.query(`
            SELECT s.code, c."employeeLabelSnapshot" AS employee, c."totalScore", c."workPoints",
                   c."customerPoints", c."missionPoints", c."eligibleCustomerCount", c."requiredDays",
                   c."isEligible", c."fairPlayStatus", c."fairPlayReasons", c."finalRank"
            FROM "CompetitionStanding" c
            JOIN "CompetitionPeriod" p ON p.id = c."periodId"
            LEFT JOIN "Station" s ON s.id = p."stationId"
            WHERE p.type = 'WEEKLY_STATION' AND p."periodKey" = $1
            ORDER BY s.code, c."totalScore" DESC`, [weekKey]);
        const feedback = await client.query(`
            SELECT s.code, r."surveyVersion", r.validity, COUNT(*)::int AS responses
            FROM "CustomerFeedbackResponse" r
            LEFT JOIN "Station" s ON s.id = r."stationId"
            WHERE r."targetType" = 'EMPLOYEE' AND r."submittedAt" >= $1 AND r."submittedAt" < $2
            GROUP BY s.code, r."surveyVersion", r.validity ORDER BY s.code, r."surveyVersion", r.validity`, [from, to]);
        const awards = await client.query(`
            SELECT s.code, c."employeeLabelSnapshot" AS champion, a.status, a."rewardLabel", a."rewardValueBaht"
            FROM "CompetitionAward" a
            JOIN "CompetitionPeriod" p ON p.id = a."periodId"
            JOIN "CompetitionStanding" c ON c."periodId" = p.id AND c."userId" = a."userId" AND c."finalRank" = 1
            LEFT JOIN "Station" s ON s.id = p."stationId"
            WHERE p.type = 'WEEKLY_STATION' AND p."periodKey" = $1 AND a."awardType" = 'WEEKLY_CHAMPION'
            ORDER BY s.code`, [weekKey]);
        console.log(JSON.stringify({ periods: periods.rows, standings: standings.rows, sourceFeedback: feedback.rows, awards: awards.rows }, null, 2));
        await client.query('ROLLBACK');
    } finally {
        await client.end();
    }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
