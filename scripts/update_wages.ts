import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

function parseNumber(val: string): number | null {
    if (!val || val === 'nan' || val.trim() === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

async function main() {
    try {
        console.log("=== WAGE UPDATE SCRIPT ===\n");

        // Read CSV
        const csvPath = path.join(process.cwd(), 'cleaned_staff.csv');
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);

        // Skip header
        const dataLines = lines.slice(1);
        console.log(`Found ${dataLines.length} records in CSV\n`);

        // Fetch existing users
        const users = await prisma.user.findMany();

        // Create name lookup
        const userByName: Record<string, typeof users[0]> = {};
        for (const u of users) {
            const lowerName = u.name.toLowerCase();
            userByName[lowerName] = u;
            // Also add base name without suffix
            const baseName = u.name.split(' (')[0].toLowerCase();
            if (!userByName[baseName]) {
                userByName[baseName] = u;
            }
        }

        let updated = 0;
        let skipped = 0;

        // Track duplicates
        const processedNames: Record<string, number> = {};

        for (const line of dataLines) {
            try {
                const parts = line.split(',');
                if (parts.length < 10) continue;

                const nickname = parts[1]?.trim();
                const dailyRateRaw = parts[5];    // เงินรายวัน
                const monthlyRateRaw = parts[6];  // เงินรายเดือน
                const specialPayRaw = parts[7];   // เงินพิเศษ
                const workHoursRaw = parts[8];    // ชม ทำงาน

                if (!nickname || nickname === 'nan') continue;

                // Track duplicates
                processedNames[nickname] = (processedNames[nickname] || 0) + 1;

                let lookupKey = nickname.toLowerCase();
                if (processedNames[nickname] > 1) {
                    const possibleKeys = Object.keys(userByName).filter(k =>
                        k.startsWith(nickname.toLowerCase()) && k.includes('(')
                    );
                    if (possibleKeys.length > 0) {
                        lookupKey = possibleKeys[processedNames[nickname] - 2] || lookupKey;
                    }
                }

                const user = userByName[lookupKey];
                if (!user) {
                    console.log(`SKIP: User not found: ${nickname}`);
                    skipped++;
                    continue;
                }

                const dailyRate = parseNumber(dailyRateRaw);
                const monthlyRate = parseNumber(monthlyRateRaw);
                const specialPay = parseNumber(specialPayRaw);
                const workHours = parseNumber(workHoursRaw) || 12; // Default 12 hrs

                // Calculate rates
                let newDailyRate = 0;
                let newBaseSalary = 0;
                let newHourlyRate = 0;

                if (dailyRate && dailyRate > 0) {
                    // Daily worker
                    newDailyRate = dailyRate;
                    newHourlyRate = dailyRate / workHours;
                    console.log(`DAILY: ${user.name} -> ฿${dailyRate}/day (${workHours}hr) = ฿${newHourlyRate.toFixed(2)}/hr`);
                } else if (monthlyRate && monthlyRate > 0) {
                    // Monthly worker
                    newBaseSalary = monthlyRate;
                    if (specialPay) {
                        newBaseSalary += specialPay; // Include special pay in base
                    }
                    // Calculate hourly from monthly: monthly / 26 days / workHours
                    newHourlyRate = monthlyRate / 26 / workHours;
                    console.log(`MONTHLY: ${user.name} -> ฿${monthlyRate}/mo${specialPay ? ` +${specialPay}` : ''} (${workHours}hr) = ฿${newHourlyRate.toFixed(2)}/hr`);
                } else {
                    console.log(`SKIP: No rate for ${user.name}`);
                    skipped++;
                    continue;
                }

                // Update user
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        dailyRate: newDailyRate,
                        baseSalary: newBaseSalary,
                        hourlyRate: newHourlyRate
                    }
                });

                updated++;

            } catch (err) {
                console.error(`ERROR:`, err);
            }
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped: ${skipped}`);

    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
