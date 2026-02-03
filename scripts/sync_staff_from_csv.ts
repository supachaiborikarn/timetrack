
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Staff Sync...');

    // 1. Fetch Stations dynamically
    console.log('Fetching stations from DB...');
    const stations = await prisma.station.findMany();
    const STATION_MAP: Record<string, string> = {};

    for (const s of stations) {
        // Map Code or Name to ID
        // CSV uses Thai names: "ศุภชัยบริการ", "พงษ์อนันต์", "วัชรเกียรติ"
        // We need to match these to what is in DB.
        // If DB has "ศุภชัยบริการ" as name, great.
        console.log(`Station: ${s.name} (${s.code}) -> ${s.id}`);
        STATION_MAP[s.name] = s.id;
        // Also map simplified names just in case
        if (s.name.includes("ศุภชัย")) STATION_MAP["ศุภชัยบริการ"] = s.id;
        if (s.name.includes("พงษ์อนันต์")) STATION_MAP["พงษ์อนันต์"] = s.id;
        if (s.name.includes("วัชรเกียรติ")) STATION_MAP["วัชรเกียรติ"] = s.id;
    }

    const csvPath = path.join(process.cwd(), 'cleaned_staff.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`Found ${records.length} records in CSV.`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const row of records) {
        const r = row as any;
        const stationName = r['สถานี'];
        const nickname = r['ชื่อเล่น']?.trim();
        const realName = r['ชื่อจริง']?.trim();
        const phoneRaw = r['เบอร์โทร']?.trim();

        // Financials
        const position = r['ตำแหน่ง']?.trim();
        const dailyRateStr = r['เงินรายวัน']?.trim();
        const salaryStr = r['เงินรายเดือน']?.trim();
        const specialPayStr = r['เงินพิเศษ']?.trim();
        const workHoursStr = r['ชม ทำงาน']?.trim();
        const bankAccount = r['เลขที่บัญชี']?.trim();
        const housingCostStr = r['คชจ ที่พัก']?.trim();
        const ssoStation = r['ประกันสังคม']?.trim();

        // Cleaning data
        const phone = (phoneRaw && phoneRaw !== 'nan' && phoneRaw !== '-') ? phoneRaw.replace(/-/g, '') : null;
        const dailyRate = (dailyRateStr && dailyRateStr !== 'nan' && dailyRateStr !== '') ? parseFloat(dailyRateStr) : 0;
        const baseSalary = (salaryStr && salaryStr !== 'nan' && salaryStr !== '') ? parseFloat(salaryStr) : 0;
        const specialPay = (specialPayStr && specialPayStr !== 'nan' && specialPayStr !== '') ? parseFloat(specialPayStr) : 0;
        const housingCost = (housingCostStr && housingCostStr !== 'nan' && housingCostStr !== '') ? parseFloat(housingCostStr) : 0;
        const workHours = (workHoursStr && workHoursStr !== 'nan' && workHoursStr !== '') ? parseFloat(workHoursStr) : 10.5;
        const cleanBankAccount = (bankAccount && bankAccount !== 'nan' && bankAccount !== '-') ? bankAccount : null;
        const cleanSSO = (ssoStation && ssoStation !== 'nan' && ssoStation !== '-') ? ssoStation : null;

        const stationId = STATION_MAP[stationName];

        // Matching Logic
        let user = null;

        // 1. Try by Real Name (if exists)
        if (realName && realName !== 'nan') {
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { realName: realName },
                        { name: realName } // Sometimes name is used as realname
                    ]
                }
            });
        }

        // 2. Try by Phone (if exists and not matched)
        if (!user && phone) {
            user = await prisma.user.findUnique({
                where: { phone: phone }
            });
        }

        // 3. Try by Nickname + Station (Context aware)
        if (!user && nickname && stationId) {
            // Find matches by nickname in that station
            user = await prisma.user.findFirst({
                where: {
                    nickname: nickname,
                    stationId: stationId
                }
            });

            // Fallback: Try name field as nickname
            if (!user) {
                user = await prisma.user.findFirst({
                    where: {
                        name: nickname,
                        stationId: stationId
                    }
                });
            }
        }

        // Update or Log Missing
        if (user) {
            console.log(`✅ Updating: ${user.name} (${user.nickname || '-'}) - ${realName}`);

            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        realName: (realName && realName !== 'nan') ? realName : undefined,
                        position: (position && position !== 'nan') ? position : undefined,
                        phone: (phone && phone.length >= 9) ? phone : undefined,
                        baseSalary: baseSalary,
                        dailyRate: dailyRate,
                        specialPay: specialPay,
                        housingCost: housingCost,
                        workHours: (workHours > 0) ? workHours : undefined,
                        bankAccountNumber: cleanBankAccount,
                        socialSecurityStation: cleanSSO,
                        stationId: stationId || undefined // Will fail if stationId is valid string but invalid FK
                    }
                });
                updatedCount++;
            } catch (err: any) {
                console.error(`❌ Failed to update ${user.name}: ${err.message}`);
            }

        } else {
            console.warn(`❌ Not Found: ${nickname} (${realName}) - Station: ${stationName}`);
            notFoundCount++;
        }
    }

    console.log(`\nSync Complete.`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Not Found: ${notFoundCount}`);
    console.log(`Total Processed: ${records.length}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
