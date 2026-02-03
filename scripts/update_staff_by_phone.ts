import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Syncing Full CSV Data Matching by Phone ===\n');

    // Read CSV
    const csvPath = path.join(process.cwd(), 'cleaned_staff.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);

    // Fetch Stations to map names
    const stations = await prisma.station.findMany();
    const stationMap: Record<string, string> = {};
    stations.forEach(s => {
        // Map "วัชรเกียรติ", "พงษ์อนันต์", "ศุภชัยบริการ"
        // Database names might handle fuzzy matching, but let's assume direct map or partial
        if (s.name.includes('วัชร')) stationMap['วัชรเกียรติ'] = s.id;
        if (s.name.includes('พงษ์')) stationMap['พงษ์อนันต์'] = s.id;
        if (s.name.includes('ศุภ')) stationMap['ศุภชัยบริการ'] = s.id;
    });
    console.log('Station Map:', stationMap);

    let updatedCount = 0;
    let notFoundCount = 0;
    let noPhoneCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 12) continue;

        const [
            stationName,
            nickname,
            realName,
            phoneRaw,
            position,
            dailyRateStr,
            monthlySalaryStr,
            specialPayStr,
            workHoursStr,
            bankAccount,
            houseCostStr,
            socialSecurity
        ] = parts.map(p => p.trim());

        // Skip if no matchable phone
        if (!phoneRaw || phoneRaw === 'nan' || phoneRaw === '-') {
            noPhoneCount++;
            continue;
        }

        // Normalize CSV phone
        const cleanPhone = phoneRaw.replace(/-/g, '');

        // Find user by phone
        const user = await prisma.user.findFirst({
            where: { phone: cleanPhone }
        });

        if (!user) {
            console.log(`NOT FOUND BY PHONE: ${cleanPhone} (${nickname})`);
            notFoundCount++;
            continue;
        }

        // Prepare update data
        // Use 'any' type to avoid strict type checking for now since schema might not have types updated in client yet
        const updateData: any = {};

        // --- Basic Info ---
        if (nickname && nickname !== 'nan') {
            updateData.nickname = nickname;
            // Also update main name to be nickname
            updateData.name = nickname;
        }
        if (realName && realName !== 'nan') updateData.realName = realName;

        // --- Position ---
        if (position && position !== 'nan') updateData.position = position;

        // --- Station ---
        // Only update station if mapped
        if (stationName && stationMap[stationName]) {
            updateData.stationId = stationMap[stationName];
        } else if (stationName && stationName !== 'nan') {
            // Try dynamic map if not found
            const matched = stations.find(s => s.name.includes(stationName));
            if (matched) updateData.stationId = matched.id;
        }

        // --- Bank ---
        if (bankAccount && bankAccount !== 'nan' && bankAccount !== '') {
            let accountNum = bankAccount.replace('.0', '').trim();
            updateData.bankAccountNumber = accountNum;
            updateData.bankName = 'TTB';
        }

        // --- Social Security ---
        if (socialSecurity && socialSecurity !== 'nan') {
            updateData.socialSecurityStation = socialSecurity;
        }

        // --- Financials (Decimals) ---
        // Helper to parse float or null
        const parseMoney = (str: string) => {
            if (!str || str === 'nan' || str === '') return null;
            return parseFloat(str);
        };

        const dailyRate = parseMoney(dailyRateStr);
        if (dailyRate !== null) updateData.dailyRate = dailyRate;

        const monthlySalary = parseMoney(monthlySalaryStr);
        if (monthlySalary !== null) updateData.baseSalary = monthlySalary;

        const specialPay = parseMoney(specialPayStr);
        if (specialPay !== null) updateData.specialPay = specialPay;

        const housingCost = parseMoney(houseCostStr);
        if (housingCost !== null) updateData.housingCost = housingCost;

        // --- Work Hours ---
        let workHours = parseMoney(workHoursStr);

        // "Na Lan" Logic: 10.5 hours
        const isNaLan = position && (
            position.includes('เติมน้ำมัน') ||
            position.includes('เติมแก๊ส') ||
            position.includes('ล้างรถ')
        );

        if (isNaLan) {
            workHours = 10.5;
            // console.log(`Na Lan logic applied for ${nickname}: 10.5 hrs`);
        } else if (workHours === null) {
            // Default if missing
            workHours = 12; // Or keep existing? For new script, default to 12 if not set.
        }

        if (workHours !== null) updateData.workHours = workHours;

        // Execute update
        await prisma.user.update({
            where: { id: user.id },
            data: updateData
        });

        // console.log(`UPDATED: ${nickname} -> Pos: ${position}, Work: ${workHours}, Special: ${specialPay || 0}, House: ${housingCost || 0}`);
        updatedCount++;
    }

    console.log('\n=== Summary ===');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Not Found (by phone match): ${notFoundCount}`);
    console.log(`Skipped (no phone): ${noPhoneCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
