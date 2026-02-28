const { format, endOfMonth } = require("date-fns");
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
function parseDateStringToBangkokMidnight(dateStr) {
    const simpleDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [year, month, day] = simpleDate.split("-").map(Number);
    const midnightBangkokInUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

const startDate = parseDateStringToBangkokMidnight("2026-03-01");
const endDate = endOfMonth(startDate);
console.log("startDate:", startDate.toISOString());
console.log("endDate:", endDate.toISOString());
