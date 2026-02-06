// Compare the two functions
// Run with: npx ts-node prisma/compare-dates.ts

const BANGKOK_OFFSET = 7 * 60;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function getBangkokNow(): Date {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + BANGKOK_OFFSET * 60000);
}

function startOfDayBangkok(inputDate?: Date): Date {
    const now = new Date();
    const utcTimestamp = now.getTime();
    const bangkokTimestamp = utcTimestamp + BANGKOK_OFFSET_MS;
    const tempDate = new Date(bangkokTimestamp);
    const year = tempDate.getUTCFullYear();
    const month = tempDate.getUTCMonth();
    const day = tempDate.getUTCDate();
    const midnightBangkokInUTC = Date.UTC(year, month, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

// Simulate date-fns startOfDay behavior
function startOfDayDateFns(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Simulate Vercel (UTC timezone) by setting TZ=UTC essentially
console.log('=== Current machine (Bangkok timezone) ===');
console.log('Now:', new Date().toISOString());
console.log('getBangkokNow():', getBangkokNow().toISOString());

const bangkokNow = getBangkokNow();
console.log('\nstartOfDayBangkok():', startOfDayBangkok(bangkokNow).toISOString());
console.log('startOfDay(bangkokNow):', startOfDayDateFns(bangkokNow).toISOString());

console.log('\n=== Simulating Vercel UTC server ===');
// On Vercel, getTimezoneOffset() returns 0
const vercelNow = new Date();
console.log('Server now:', vercelNow.toISOString());

// getBangkokNow on Vercel (getTimezoneOffset = 0)
const vercelUtc = vercelNow.getTime() + 0 * 60000; // getTimezoneOffset = 0 on UTC server
const vercelBangkokNow = new Date(vercelUtc + BANGKOK_OFFSET * 60000);
console.log('getBangkokNow() on Vercel:', vercelBangkokNow.toISOString());

// startOfDay(bangkokNow) on Vercel - this uses local timezone which is UTC
const vercelStartOfDay = new Date(vercelBangkokNow);
vercelStartOfDay.setUTCHours(0, 0, 0, 0); // On UTC server, setHours affects UTC time
console.log('startOfDay(bangkokNow) on Vercel (using setHours):', startOfDayDateFns(vercelBangkokNow).toISOString());

// startOfDayBangkok always calculates from current UTC
console.log('startOfDayBangkok() on Vercel:', startOfDayBangkok().toISOString());

console.log('\n=== Database attendance date ===');
console.log('Expected date in DB: 2026-02-05T17:00:00.000Z');
